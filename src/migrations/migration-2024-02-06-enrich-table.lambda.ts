import { AttributeValue, DynamoDBClient, ScanCommand, ScanCommandOutput, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Storage, Storage } from '../app/submission/Storage';
import { dateArrayToDate } from '../utils/dateArrayToDate';

/**
 * This is a one-time use function to migrate the dynamoDB table used for storing submissions. The following changes need to be performed:
 * - Add the following to each record:
 * - Formname (formTypeId in submission object (S3))
 * - Form title (from form definition (S3))
 * - Submission date (timestamp from submission object (S3))
 *
 * All items in the table are processed, by performing a [scan operation](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html):
 * - Get a batch of results
 * - Retrieve relevant info from s3 for these results
 * - update the items (batch update)
 * - retrieve the next set (using the previous operations `LastEvaluatedKey` as the `ExclusiveStartKey`)
 *
 * Filter the scan on one of the attributes we will add, to make this operation idempotent and to be able to update items added during the scan?
 *
 * TODO:
 * - [x] Grab info from the form definition (in enrichedItems)
 * - [x] Modify the scan to only scan for items not yet updated (check for 'formName' or 'updatedTime')
 * POSSIBLE FAILURE MODES:
 * - Scan returning too many items for the rest of the lambda to process (too many S3 objects, too high memory use). This would be annoying, since it would stall and never complete on retry.
 *   Possible solution: Put items to be updated on a queue, process one by one / in batches. Overkill?
 */

export async function handler(event: any) {
  const dryrun = event?.runlive === 'true' ? false: true; // Only update when the event object contains runlive: 'true'
  const batchSize = event?.batchSize ?? 50; // Only update when the event object contains runlive: 'true'
  console.debug('dry run', dryrun);
  if (!process.env.BUCKET_NAME || !process.env.TABLE_NAME) {
    throw Error('No table name or bucket provided');
  }
  try {
    const client = new DynamoDBClient();
    const storage = new S3Storage(process.env.BUCKET_NAME);
    const migration = new Migration(client, process.env.TABLE_NAME, storage);
    await migration.run(batchSize, dryrun);
  } catch (error: any) {
    console.error(error);
  }
}


export class Migration {
  private lastKey?: Record<string, AttributeValue>;
  private client: DynamoDBClient;
  private tableName: string;
  private storage: Storage;
  private _errors: string = '';
  private _info: string = '';
  private _success: string = '';
  private _failed: string = '';

  constructor(client: DynamoDBClient, tableName: string, storage: Storage) {
    this.client = client;
    this.tableName = tableName;
    this.storage = storage;
  }

  /**
   * This function runs the migration
   *
   * It performs a table scan, recursively to deal with paging
   *
   * After each page, it will call `enrichedItems` to get data
   * from S3.
   *
   * After grabbing the data from S3, it will call `updateItems`
   * to update each item in the database individually (to prevent data loss).
   */
  async run(batchSize: number, dryrun: boolean) {
    try {
      do {
        const command = new ScanCommand({
          TableName: this.tableName,
          ExclusiveStartKey: this.lastKey,
          FilterExpression: 'NOT attribute_exists(formName)',
        });
        this.info('Starting scan');
        const result = await this.client.send(command);
        this.info(`Scan filtered in ${result.Count} of ${result.ScannedCount} scanned items.`);
        await this.batchUpdate(result, batchSize, dryrun);
        this.lastKey = result.LastEvaluatedKey;
      } while (this.lastKey);
    } catch (error: any) {
      this.error(error);
    }
    this.info('Finished run');
    console.log(this._info);
    console.error(this._errors);
    console.log('Successfully updated these items', this._success);
    if (this._failed.length > 0) {
      console.error('FAILED updating these items', this._failed);
    }
    return {
      updated_items: this._success,
      failed_items: this._failed,
    };
  }

  async batchUpdate(scanResults: ScanCommandOutput, batchSize: number, dryrun?: boolean) {
    if (!scanResults.Items) { return; }
    let startIndex = 0;
    let processedItems = 0;
    const totalItems = scanResults.Items.length;
    this.info(`Processing ${totalItems} items in batches of ${batchSize}`);
    for (let i = startIndex; i < scanResults.Items.length; i+=batchSize) {
      const resultsBatch = scanResults.Items.slice(i, i + batchSize);
      const newItems = await this.enrichedItems(resultsBatch);
      if (dryrun) {
        this.info(`Would update ${newItems.length} items in dynamoDB`);
      } else {
        await this.updateItems(newItems);
      }
      processedItems += resultsBatch.length;
    }
    this.info(`Processed ${processedItems} items`);
    if (processedItems != totalItems) {
      this.error(`Mismatch in total and processed items count, processed ${processedItems} of ${totalItems}`);
    }
  }

  /**
   * Grab data from S3 based on the provided dynamoDB items
   *
   * Grabs all data, then merges the necessary information with the provided item,
   * and returns all updated items. Items which fail to update (no bucket object for instance)
   * will be ignored and an error will be logged.
   *
   * Since the amount of data could be large, we split this into manageable batches
   *
   */
  async enrichedItems(results: any) {
    const submissions = await this.getSubmissionObjectsFromBucket(results.map((result: any) => `${result.sk.S}/submission.json`));
    const formdefinitions = await this.getFormDefinitionObjectsFromBucket(results.map((result: any) => `${result.sk.S}/formdefinition.json`));
    const resultObjects = results.map((result: any) => {
      const key = result.sk.S;
      const submission = submissions[key];
      if (submission) {
        const formNameLowerCased = (submission.formTypeId as string).toLowerCase();
        const formTitle = formdefinitions?.[formNameLowerCased]?.title;
        let submissionDate;
        if (submission.metadata.timestamp) {
          submissionDate = dateArrayToDate(submission.metadata.timestamp);
        } else {
          this.info(`submission object for ${key} has no timestamp, using sns timestamp`);
          submissionDate = submission.snsTimeStamp;
        }
        if (!formTitle) {
          this.error(`No title found in form definition for key ${key}, form name: ${formNameLowerCased}`);
        } else {
          return {
            ...result,
            formName: formNameLowerCased,
            date: submissionDate,
            formTitle: formTitle,
          };
        }
      } else {
      }
    }).filter((result: any) => result?.formName);
    return resultObjects;
  }

  /**
   * Batch get form submission objects from S3
   *
   * Gets the JSON from the submission and return it as an array keyed by reference
   * @param keys array of s3 object keys
   * @returns array of submission JSON's, keyed by reference
   */
  async getSubmissionObjectsFromBucket(keys: string[]) {
    this.info('Retrieving submissions from S3');
    const objects = await this.storage.getBatch(keys);
    const submissions: any = {};
    for (const object of objects) {
      try {
        if (object.Body) {
          const bodyString = await object.Body.transformToString();
          const objectJson = JSON.parse(bodyString);
          const submission = JSON.parse(objectJson.Message);
          //Add the sns message timestamp in, we might need it
          submission.snsTimeStamp = objectJson.Timestamp;
          submissions[submission.reference] = submission;
          this.info(`- ${submission.reference}`);
        }
      } catch (error: any) {
        this.error(error);
        this.error(error);
      }
    }
    this.info(`Retrieved ${Object.keys(submissions).length} form submissions from S3`);
    return submissions;
  }

  /**
   * Batch get form definitions from S3
   *
   * Gets the JSON from the submission and return it as an array keyed by reference
   * @param keys array of s3 object keys
   * @returns array of submission JSON's, keyed by reference
   */
  async getFormDefinitionObjectsFromBucket(keys: string[]) {
    this.info('Retrieving form definitions from S3');
    const objects = await this.storage.getBatch(keys);
    const definitions: any = {};
    for (const object of objects) {
      try {
        if (object.Body) {
          const bodyString = await object.Body.transformToString();
          const objectJson = JSON.parse(bodyString);
          const formNameLowerCased = (objectJson.name as string).toLowerCase();
          definitions[formNameLowerCased] = objectJson;
          this.info(`- ${objectJson.name}`);
        }
      } catch (error: any) {
        this.error(error);
        console.error(error);
      }
    }

    this.info(`Retrieved ${Object.keys(definitions).length} form definitions from S3`);
    return definitions;
  }

  /**
   * Actually update items in dynamodb
   *
   * This migration is an 'append only' migration, where we add key/value-pairs to existing
   * objects, but do not modify anything else.
   */
  async updateItems(items: any) {
    this.info(`Updating ${items.length} items in dynamoDB`);
    for (const item of items) {
      try {
        const command = new UpdateItemCommand({
          Key: {
            pk: { S: item.pk.S },
            sk: { S: item.sk.S },
          },
          TableName: this.tableName,
          ExpressionAttributeNames: {
            '#formName': 'formName',
            '#formTitle': 'formTitle',
            '#dateSubmitted': 'dateSubmitted',
          },
          ExpressionAttributeValues: {
            ':formName': { S: item.formName },
            ':formTitle': { S: item.formTitle },
            ':dateSubmitted': { S: item.date },
          },
          UpdateExpression: 'SET #formName = :formName, #formTitle = :formTitle, #dateSubmitted = :dateSubmitted',
        });
        await this.client.send(command);
        this.info(`Updated item ${item.sk.S}`);
        this._success = this._success.concat(`${item.sk.S} \n`);
      } catch (error) {
        this.error(`Failed updating item ${item.sk.S} \n`);
        this._failed = this._failed.concat(`Failed updating item ${item.sk.S} \n`);
        throw (error);
      }
    }
  }

  info(message: string) {
    this._info = this._info.concat(message, '\n');
    console.info(message);
  }

  error(message: string) {
    this._errors = this._errors.concat(message, '\n');
    console.error(message);
  }
}
