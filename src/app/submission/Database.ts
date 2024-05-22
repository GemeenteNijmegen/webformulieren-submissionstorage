import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, QueryCommandInput, QueryCommandOutput } from '@aws-sdk/client-dynamodb';
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
  dateSubmitted: dynamoDBStringSchema.optional(),
  formName: dynamoDBStringSchema.optional(),
  formTitle: dynamoDBStringSchema.optional(),
  attachments: z.object({
    L: z.array(dynamoDBStringSchema),
  }).optional(),
});

const submissionTableItemsSchema = z.object({
  Items: z.array(submissionTableItemSchema),
});

export interface ListSubmissionParameters {
  userId: string;
}

export interface GetSubmissionParameters {
  userId: string;
  key: string;
}
export interface GetSubmissionsByFormNameParameters {
  formName: string;
  // TODO: maybe date range interface and string might not be the best option
  startDate?: string;
  endDate?: string;
}

export interface Database {
  storeSubmission(submission: SubmissionData): Promise<boolean>;
  listSubmissions(parameters: ListSubmissionParameters): Promise<SubmissionData[]|false>;
  getSubmission(parameters: GetSubmissionParameters): Promise<SubmissionData|false>;
  getSubmissionsByFormName(parameters: GetSubmissionsByFormNameParameters): Promise<SubmissionData[]|false>;
}

export class DynamoDBDatabase implements Database {
  private table: string;
  private client: DynamoDBClient;

  constructor(tableName: string, config?: { dynamoDBClient?: DynamoDBClient }) {
    this.table = tableName;
    this.client = config?.dynamoDBClient ?? new DynamoDBClient({});
  }

  async getSubmission(parameters: GetSubmissionParameters): Promise<SubmissionData|false> {
    const hashedId = hashString(parameters.userId);
    const command = new GetItemCommand({
      TableName: this.table,
      Key: {
        pk: {
          S: `USER#${hashedId}`,
        },
        sk: {
          S: parameters.key,
        },
      },
    });
    console.debug(JSON.stringify(command));
    try {
      const result = await this.client.send(command);
      if (result.Item) {
        const item = submissionTableItemSchema.parse(result.Item);
        return {
          userId: parameters.userId,
          key: item?.sk.S ?? '',
          pdf: item?.pdfKey.S ?? '',
          dateSubmitted: item.dateSubmitted?.S ?? '',
          formName: item.formName?.S ?? 'onbekend',
          formTitle: item.formTitle?.S ?? 'Onbekende aanvraag',
          attachments: item.attachments?.L.map(attachment => attachment.S) ?? [],
        };
      } else {
        return false;
      }
    } catch (err) {
      console.error('Error getting data from DynamoDB: ' + err);
      throw err;
    }
  }

  async storeSubmission(submission: SubmissionData): Promise<boolean> {
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

  async listSubmissions(parameters: ListSubmissionParameters): Promise<SubmissionData[]|false> {
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
      if (results.Items) {
        const parsedResults = submissionTableItemsSchema.parse(await this.client.send(queryCommand));
        console.log(`${parsedResults.Items.length} items found`);
        const items = parsedResults.Items?.map((item) => {
          return {
            userId: parameters.userId,
            key: item?.sk.S ?? '',
            pdf: item?.pdfKey.S ?? '',
            dateSubmitted: item.dateSubmitted?.S ?? new Date(1970, 0, 0).toISOString(),
            formName: item.formName?.S ?? 'onbekend',
            formTitle: item.formTitle?.S ?? 'Onbekende aanvraag',
            attachments: item.attachments?.L.map(attachment => attachment.S) ?? [],
          };
        });
        return items;
      }
      console.log('No items found');
      return false;
    } catch (err) {
      console.error('Error getting data from DynamoDB: ' + err);
      throw err;
    }
  }


  async getSubmissionsByFormName(parameters: GetSubmissionsByFormNameParameters): Promise<SubmissionData[] | false> {
    // const { formName, startDate, endDate } = parameters;
    const { formName } = parameters;

    //TODO: check grantRead() on global secondary index if it does not work
    const queryInput: QueryCommandInput = {
      TableName: this.table,
      IndexName: 'formNameIndex', // Use the secondary index name
      ExpressionAttributeNames: {
        '#formName': 'formName',
      },
      ExpressionAttributeValues: {
        ':name': {
          S: `${formName}`,
        },
      },
      KeyConditionExpression: '#formName = :name',
      //FilterExpression: this.buildDateRangeFilterExpression(startDate, endDate), // Optional filter by date range
    };

    try {
      const results: QueryCommandOutput = await this.client.send(new QueryCommand(queryInput));
      if (results.Items) {
        const parsedResults = submissionTableItemsSchema.parse(results);
        // Make unit test
        console.log(`${parsedResults.Items.length} items found`);
        const items = parsedResults.Items?.map((item) => {
          return {
            userId: item?.pk.S ?? '',
            key: item?.sk.S ?? '',
            pdf: item?.pdfKey.S ?? '',
            dateSubmitted: item.dateSubmitted?.S ?? new Date(1970, 0, 0).toISOString(),
            formName: item.formName?.S ?? 'onbekend',
            formTitle: item.formTitle?.S ?? 'Onbekende aanvraag',
            attachments: item.attachments?.L.map(attachment => attachment.S) ?? [],
          };
        });
        return items;
      }
      console.log(`No items found in ${formName} formName query`);
      return false;
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return false;
    }
  }

  buildKeyConditionExpression(formName: string): any {
    return formName;
  }

  buildDateRangeFilterExpression(startDate?: string, endDate?: string): string | undefined {
    if (!startDate && !endDate) {
      return undefined; // No date filter needed
    }
    const conditions: string[] = [];
    if (startDate) {
      conditions.push('#dateSubmitted >= :startDate'); // Filter by start date only
    }

    if (endDate) {
      conditions.push('#dateSubmitted <= :endDate'); // Filter by end date only
    }
    const filterExpression = conditions.join(' AND ');
    return filterExpression.replace('#dateSubmitted', 'dateSubmitted'); // Remove placeholder prefix
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
