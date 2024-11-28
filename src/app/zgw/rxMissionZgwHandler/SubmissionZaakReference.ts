import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { Duration } from 'aws-cdk-lib';
import { z } from 'zod';

export class SubmissionZaakReference {
  private client: DynamoDBClient;
  private table: string;
  constructor(table: string, dynamoDbClient?: DynamoDBClient) {
    this.table = table;
    this.client = dynamoDbClient ?? new DynamoDBClient({});
  }

  async set(submissionKey: string, zaakUrl: string) {
    console.debug(`Adding mapping to DB for ${submissionKey} and ${zaakUrl}`);
    const expire_at = this.timestamp(Duration.days(90));
    const command = new PutItemCommand({
      TableName: this.table,
      Item: {
        pk: { S: submissionKey },
        zaak: { S: zaakUrl },
        expires_at: {
          N: expire_at.toString(),
        },
      },
    });
    try {
      await this.client.send(command);
    } catch (error) {
      console.error('put failed', error);
      throw error;
    }
  }

  async get(submissionKey: string): Promise<{ submissionKey: string; zaakUrl: string }|false> {
    console.debug(`Retrieving mapping for ${submissionKey}`);
    const command = new GetItemCommand({
      TableName: this.table,
      Key: {
        pk: {
          S: submissionKey,
        },
      },
    });
    try {
      const result = await this.client.send(command);

      console.debug('Get item result', result);
      if (result?.Item) {
        const item = DynamoDBItemSchema.parse(result.Item);
        console.debug(`Found mapping for ${submissionKey}, ${item.zaakUrl.S}`);
        return {
          submissionKey: item.pk.S,
          zaak: item.zaakUrl.S,
        };

      }
    } catch (error) {
      console.error('get failed', error);
      throw error;
    }
    console.debug(`Did not find mapping for ${submissionKey}`);
    return false;
  }


  public timestamp(durationFromNow: Duration) {
    return Math.floor((new Date().getTime() + durationFromNow.toDays() * 24 * 60 * 60 * 1000) / 1000);
  }
}

const DynamoDBStringSchema = z.object({
  S: z.string(),
});
const DynamoDBItemSchema = z.object({
  pk: DynamoDBStringSchema,
  zaak: DynamoDBStringSchema,
}).passthrough();
