import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { hashString } from './hash';
import { s3Object } from './s3Object';

interface SubmissionData {
  userId: string;
  key: string;
  pdf: string;
  attachments?: s3Object[];
}

export interface Database {
  storeSubmission(submission: SubmissionData): Promise<boolean>;
}

export class MockDatabase implements Database {
  private table;

  constructor(tableName?: string) {
    this.table = tableName;
  }

  async storeSubmission(submission: SubmissionData): Promise<any> {
    const pk = submission.userId;
    console.debug(`would store object to table ${this.table} with primary key ${pk} and contents`, submission);
    let item: any = dynamoDBItem(pk, pk, submission);
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

  async storeSubmission(submission: SubmissionData): Promise<any> {
    const hashedId = hashString(submission.userId);
    console.debug(`Storing object to table ${this.table} with primary key USER#${hashedId}`);
    const pk = `USER#${hashedId}`;
    const sk = `${submission.key}`;
    let item: any = dynamoDBItem(pk, sk, submission);
    console.debug(JSON.stringify(item, null, 2));
    const command = new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: item,
    });
    await this.client.send(command);
    console.debug(`Stored object to table ${this.table} with primary key ${pk}`);
    return true;
  }
}

function dynamoDBItem(pk: string, sk: string, submission: SubmissionData) {
  let item: any = {
    pk: { S: pk },
    sk: { S: sk },
    pdfKey: { S: submission.pdf },
  };
  if (submission.attachments) {
    item.attachments = {
      L: submission.attachments?.map((attachment) => {
        return { S: attachment.originalName };
      }),
    };
  };
  return item;
}
