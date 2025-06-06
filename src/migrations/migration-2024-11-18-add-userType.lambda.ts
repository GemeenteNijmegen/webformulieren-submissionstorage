import { AttributeValue, DynamoDBClient, ScanCommand, ScanCommandOutput, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

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
  if (!process.env.TABLE_NAME) {
    throw Error('No table provided');
  }
  try {
    const client = new DynamoDBClient();
    const migration = new Migration(client, process.env.TABLE_NAME);
    await migration.run(batchSize, dryrun);
  } catch (error: any) {
    console.error(error);
  }
}


export class Migration {
  private lastKey?: Record<string, AttributeValue>;
  private client: DynamoDBClient;
  private tableName: string;
  private _errors: string = '';
  private _info: string = '';
  private _success: string = '';
  private _failed: string = '';

  constructor(client: DynamoDBClient, tableName: string) {
    this.client = client;
    this.tableName = tableName;
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
          FilterExpression: 'NOT attribute_exists(#userType) AND (begins_with(#pk, :PERSON) OR begins_with(#pk, :ORG) OR begins_with(#pk, :ANONYMOUS))',
          ExpressionAttributeNames: {
            '#userType': 'userType',
            '#pk': 'pk',
          },
          ExpressionAttributeValues: {
            ':PERSON': { S: 'PERSON' },
            ':ORG': { S: 'ORG' },
            ':ANONYMOUS': { S: 'ANONYMOUS' },
          },
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
      if (dryrun) {
        this.info(`Would update ${resultsBatch.length} items in dynamoDB`);
      } else {
        await this.updateItems(resultsBatch);
      }
      processedItems += resultsBatch.length;
    }
    this.info(`Processed ${processedItems} items`);
    if (processedItems != totalItems) {
      this.error(`Mismatch in total and processed items count, processed ${processedItems} of ${totalItems}`);
    }
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
        let userType;
        if (item.pk.S.includes('PERSON#')) {
          userType = 'person';
        } else if (item.pk.S.includes('ORG#')) {
          userType = 'organisation';
        } else if (item.pk.S.includes('ANONYMOUS')) {
          userType = 'anonymous';
        } else {
          throw Error(`unexpected pk found, not one of org, person, anonymous: ${item.pk.S}`);
        }

        const updateCommand = new UpdateItemCommand({
          Key: {
            pk: { S: item.pk.S },
            sk: { S: item.sk.S },
          },
          TableName: this.tableName,
          ExpressionAttributeNames: {
            '#migrated20241106': 'migrated20241106',
            '#userType': 'userType',
          },
          ExpressionAttributeValues: {
            ':migrated20241106': { BOOL: true },
            ':userType': { S: userType },
          },
          UpdateExpression: 'SET #migrated20241106 = :migrated20241106, #userType = :userType',
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
