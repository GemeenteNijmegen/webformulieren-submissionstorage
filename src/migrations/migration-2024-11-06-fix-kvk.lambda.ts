import { AttributeValue, DynamoDBClient, PutItemCommand, ScanCommand, ScanCommandOutput, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Storage, Storage } from '@gemeentenijmegen/utils';
import { hashString } from '../app/submission/hash';

/**
 * This is a one-time use function to migrate the dynamoDB table used for storing submissions. The following changes need to be performed:
 * - Check the following for each record
 * - was user logged in (kvk or bsn in submission (S3))
 * - was the userId 'anonymous' (stored incorrectly)
 *
 * We then store
 * - userType field: Which type of user (person, organisation or anonymous)
 * - pk formatted like 'PERSON#hashedBSN' or 'ORG#hashedKVK' or 'ANONYMOUS'
 *
 * We create new records, updating PK is not supported in dynamoDB. To ensure idempotency, we add a migrated-flag to
 * each processed entry, AFTER we create the new record.
 *
 * TODO: After this migration, the store and retrieve functionality will need to be modified to use the new PK format.
 *
 * All items in the table are processed, by performing a [scan operation](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html):
 * - Get a batch of results
 * - Retrieve relevant info from s3 for these results
 * - update the items (batch update)
 * - retrieve the next set (using the previous operations `LastEvaluatedKey` as the `ExclusiveStartKey`)
 *
 *
 */

export async function handler(event: any) {
  const dryrun = event?.runlive === 'true' ? false: true; // Only update when the event object contains runlive: 'true'
  const batchSize = event?.batchSize ?? 50; // Only update when the event object contains runlive: 'true'
  console.info('dry run', dryrun);
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
          FilterExpression: 'NOT attribute_exists(userType) AND NOT attribute_exists(migrated20241106)',
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
    const resultObjects = results.map((result: any) => {
      const key = result.sk.S;
      const submission = submissions[key];
      if (submission) {
        let userType, userId;
        if (submission.kvknummer) {
          userType = 'organisation';
          userId = `ORG#${hashString(submission.kvknummer)}`;
        } else if (submission.bsn) {
          userType = 'person';
          userId = `PERSON#${hashString(submission.bsn)}`;
        } else {
          userType = 'anonymous';
          userId = 'ANONYMOUS';
        }
        return {
          ...result,
          newPk: {
            S: userId,
          },
          userType: {
            S: userType,
          },
          migrated20241106: {
            BOOL: true,
          },
        };
      }
    });
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
      }
    }
    this.info(`Retrieved ${Object.keys(submissions).length} form submissions from S3`);
    return submissions;
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
        const newItem = structuredClone(item);
        newItem.pk = newItem.newPk;
        delete newItem.newPk;
        const insertCommand = new PutItemCommand({
          Item: newItem,
          TableName: this.tableName,
        });
        await this.client.send(insertCommand);
      } catch (error) {
        console.error('failed inserting', error);
        this.error(`Failed inserting item ${item.sk.S} \n`);
        this._failed = this._failed.concat(`Failed inserting item ${item.sk.S} \n`);
        throw (error);
      }

      try {
        const updateCommand = new UpdateItemCommand({
          Key: {
            pk: { S: item.pk.S },
            sk: { S: item.sk.S },
          },
          TableName: this.tableName,
          ExpressionAttributeNames: {
            '#migrated20241106': 'migrated20241106',
          },
          ExpressionAttributeValues: {
            ':migrated20241106': { BOOL: true },
          },
          UpdateExpression: 'SET  #migrated20241106 = :migrated20241106',
          ReturnValues: 'ALL_NEW',
        });
        await this.client.send(updateCommand);
        this.info(`Updated item ${item.sk.S}`);
        this._success = this._success.concat(`${item.sk.S} \n`);
      } catch (error) {
        console.error('failed updating', error);
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
