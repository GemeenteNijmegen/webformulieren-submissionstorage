import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { s3Object } from './s3Object';

interface SubmissionData {
  key: string;
  pdf: s3Object;
  attachments?: s3Object[];
}

export interface Database {
  storeSubmission(pk: string, submission: SubmissionData): Promise<boolean>;
}

export class MockDatabase implements Database {
  private table;

  constructor(tableName?: string) {
    this.table = tableName;
  }

  async storeSubmission(pk: string, submission: SubmissionData): Promise<any> {
    console.debug(`would store object to table ${this.table} with primary key ${pk} and contents`, submission);
    let item: any = dynamoDBItem(pk, submission);
    console.debug(JSON.stringify(item, null, 2));

    return true;
  }
}

export class DynamoDBDatabase implements Database {
  private table: string;
  private client: DynamoDBClient;

  constructor(tableName: string) {
    this.table = tableName;
    this.client = new DynamoDBClient({});
  }

  async storeSubmission(pk: string, submission: SubmissionData): Promise<any> {
    console.debug(`Storing object to table ${this.table} with primary key ${pk}`);

    let item: any = dynamoDBItem(pk, submission);
    console.debug(JSON.stringify(item, null, 2));
    const command = new PutItemCommand({
      TableName: process.env.SESSION_TABLE,
      Item: item,
    });
    await this.client.send(command);
    console.debug(`Stored object to table ${this.table} with primary key ${pk}`);
    return true;
  }
}

function dynamoDBItem(pk: string, submission: SubmissionData) {
  let item: any = {
    pk: { S: pk },
    storageKey: { S: submission.key },
    pdfKey: { S: submission.pdf?.key },
  };
  if (submission.attachments) {
    item.attachments = { 
      L: submission.attachments?.map((attachment) => {
        return {
          M: {
            key: { S: attachment.key },
            originalName: { S: attachment.originalName },
            bucket: { S: attachment.bucket },
          },
        };
      })
    }
  };
  return item;
}
