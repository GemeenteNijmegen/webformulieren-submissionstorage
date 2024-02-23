import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { z } from 'zod';
import { hashString } from './hash';

export interface SubmissionData {
  userId: string;
  key: string;
  pdf: string;
  attachments?: string[];
  dateSubmitted?: string;
  formName?: string;
  formTitle?: string;
}

const dynamoDBStringSchema = z.object({
  S: z.string(),
});

const submissionTableItemSchema = z.object({
  pk: dynamoDBStringSchema,
  sk: dynamoDBStringSchema,
  pdfKey: dynamoDBStringSchema,
  dateSubmitted: dynamoDBStringSchema,
  formName: dynamoDBStringSchema,
  formTitle: dynamoDBStringSchema,
  attachments: z.object({
    L: z.array(dynamoDBStringSchema),
  }),
});

const submissionTableItemsSchema = z.object({
  Items: z.array(submissionTableItemSchema),
});

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
      const results = submissionTableItemsSchema.parse(await this.client.send(queryCommand));
      const items = results.Items?.map((item) => {
        return {
          userId: parameters.userId,
          key: item?.sk.S ?? '',
          pdf: item?.pdfKey.S ?? '',
          dateSubmitted: item?.dateSubmitted.S ?? '',
          formName: item?.formName.S ?? '',
          formTitle: item?.formTitle.S ?? '',
          attachments: item.attachments.L.map(attachment => attachment.S),
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
    item.dateSubmitted = { S: submission.dateSubmitted };
  }
  if (submission.formName) {
    item.formName = { S: submission.formName };
  }
  if (submission.formTitle) {
    item.formTitle = { S: submission.formTitle };
  }
  if (submission.attachments) {
    item.attachments = {
      L: submission.attachments?.map((attachment) => {
        return { S: attachment };
      }),
    };
  };
  return item;
}
