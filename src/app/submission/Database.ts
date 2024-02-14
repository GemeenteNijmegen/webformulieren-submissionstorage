import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { hashString } from './hash';
import { s3Object } from './s3Object';

export interface SubmissionData {
  userId: string;
  key: string;
  pdf: string;
  attachments?: s3Object[];
  dateSubmitted?: string;
  formName?: string;
  formTitle?: string;
}

export interface ListSubmissionParameters {
  userId: string;
}

export interface Database {
  storeSubmission(submission: SubmissionData): Promise<boolean>;
  listSubmissions(parameters: ListSubmissionParameters): Promise<SubmissionData[]>;
}

export class DynamoDBDatabase implements Database {
  private table: string;
  private client: DynamoDBClient;

  constructor(tableName: string, config?: { dynamoDBClient?: DynamoDBClient }) {
    this.table = tableName;
    this.client = config?.dynamoDBClient ?? new DynamoDBClient({});
  }

  async storeSubmission(submission: SubmissionData): Promise<any> {
    const hashedId = hashString(submission.userId);
    console.debug(`Storing object to table ${this.table} with primary key USER#${hashedId}`);
    const pk = `USER#${hashedId}`;
    const sk = `${submission.key}`;
    let item: any = dynamoDBItem(pk, sk, submission);
    console.debug(JSON.stringify(item, null, 2));
    const command = new PutItemCommand({
      TableName: this.table,
      Item: item,
    });
    await this.client.send(command);
    console.debug(`Stored object to table ${this.table} with partition key ${pk}`);
    return true;
  }

  async listSubmissions(parameters: ListSubmissionParameters): Promise<SubmissionData[]> {
    const hashedId = hashString(parameters.userId);
    const queryCommand = new QueryCommand({
      TableName: this.table,
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      ExpressionAttributeValues: {
        ':id': {
          S: `USER#${hashedId}`,
        },
      },
      KeyConditionExpression: '#pk = :id',
    });
    try {
      const results = await this.client.send(queryCommand);
      const items = results.Items?.map((item) => {
        return {
          userId: parameters.userId,
          key: item?.sk.S ?? '',
          pdf: item?.pdfKey.S ?? '',
          dateSubmitted: item?.dateSubmitted.S ?? '',
          formName: item?.formName.S ?? '',
          formTitle: item?.formTitle.S ?? '',
        };
      }) ?? [];
      return items;
    } catch (err) {
      console.error('Error getting data from DynamoDB: ' + err);
      throw err;
    }
  }
}

export function dynamoDBItem(pk: string, sk: string, submission: SubmissionData) {
  let item: any = {
    pk: { S: pk },
    sk: { S: sk },
    pdfKey: { S: submission.pdf },
  };
  if (submission.dateSubmitted) {
    item.dateSubmitted = { S: item.dateSubmitted };
  }
  if (submission.formName) {
    item.formName = { S: item.formName };
  }
  if (submission.formTitle) {
    item.formTitle = { S: item.formTitle };
  }
  if (submission.attachments) {
    item.attachments = {
      L: submission.attachments?.map((attachment) => {
        return { S: attachment.originalName };
      }),
    };
  };
  return item;
}
