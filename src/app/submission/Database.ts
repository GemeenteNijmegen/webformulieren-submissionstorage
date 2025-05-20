import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, QueryCommandInput, QueryCommandOutput, ScanCommand } from '@aws-sdk/client-dynamodb';
import { z } from 'zod';
import { FormNameIndexQueryBuilder } from './FormNameIndexQueryBuilder';
import { getHashedUserId, hashString } from './hash';
import { UserType } from '../shared/UserType';

export interface SubmissionData {
  userId: string;
  userType: UserType;
  key: string;
  pdf: string;
  attachments?: string[];
  dateSubmitted?: string;
  formName?: string;
  formTitle?: string;
  submission?: any;
}
/**
 * Interface with expected results from a query of the secondary formNameIndex
 */
export interface FormNameSubmissionData {
  key: string;
  dateSubmitted: string;
  formName: string;
  formTitle: string;
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
  userType: 'organisation' | 'person';
}

export interface GetSubmissionParameters {
  userId: string;
  userType: UserType;
  key: string;
}
export interface GetSubmissionsByFormNameParameters {
  formName: string;
  startDate?: string;
  endDate?: string;
  appId?: string;
}

export interface Database {
  storeSubmission(submission: SubmissionData): Promise<boolean>;
  listSubmissions(parameters: ListSubmissionParameters): Promise<SubmissionData[]|false>;
  getSubmission(parameters: GetSubmissionParameters): Promise<SubmissionData|false>;
  getSubmissionsByFormName(parameters: GetSubmissionsByFormNameParameters): Promise<FormNameSubmissionData[]|false>;
  getExpiredForms(date: string): Promise<FormNameSubmissionData[] | false>;
}

export class DynamoDBDatabase implements Database {
  private table: string;
  private client: DynamoDBClient;

  constructor(tableName: string, config?: { dynamoDBClient?: DynamoDBClient }) {

    this.table = tableName;
    this.client = config?.dynamoDBClient ?? new DynamoDBClient({});
  }

  async getExpiredForms(date: string): Promise<FormNameSubmissionData[] | false> {
    const command = new ScanCommand({
      FilterExpression: '#dateSubmitted <= :date',
      ExpressionAttributeValues: {
        ':date': { S: date },
      },
      ExpressionAttributeNames: {
        '#dateSubmitted': 'dateSubmitted',
      },
      TableName: this.table,
    });
    console.debug(JSON.stringify(command));

    try {
      const results = await this.client.send(command);
      if (results.Items) {
        const parsedResults = submissionTableItemsSchema.parse(results);
        console.log(`${parsedResults.Items.length} items found`);
        const items = parsedResults.Items?.map((item) => {
          return {
            key: item?.sk.S ?? '',
            dateSubmitted: item.dateSubmitted?.S ?? new Date(1970, 0, 0).toISOString(),
            formName: item.formName?.S ?? 'onbekend',
            formTitle: item.formTitle?.S ?? 'Onbekende aanvraag',
          };
        });
        return items;
      }

    } catch (err) {
      console.error('Error getting data from DynamoDB: ' + err);
      throw err;
    }
    return false;
  }

  async getSubmission(parameters: GetSubmissionParameters): Promise<SubmissionData|false> {
    const pk = getHashedUserId(parameters.userId, parameters.userType);
    const command = new GetItemCommand({
      TableName: this.table,
      Key: {
        pk: {
          S: pk,
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
          userType: parameters.userType,
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
    const pk = getHashedUserId(submission.userId, submission.userType);
    console.debug(`Storing object to table ${this.table} with primary key ${pk}`);
    const sk = `${submission.key}`;
    let item: any = dynamoDBItem(pk, sk, submission.userType, submission);
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
    let prefix;
    if (parameters.userType == 'person') {
      prefix = 'PERSON';
    } else if (parameters.userType == 'organisation') {
      prefix = 'ORG';
    }
    const pk = `${prefix}#${hashedId}`;
    const queryCommand = new QueryCommand({
      TableName: this.table,
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      ExpressionAttributeValues: {
        ':id': {
          S: pk,
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
            userType: parameters.userType,
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


  async getSubmissionsByFormName(parameters: GetSubmissionsByFormNameParameters): Promise<FormNameSubmissionData[] | false> {
    const builder = new FormNameIndexQueryBuilder(this.table);
    const queryInput: QueryCommandInput =
    builder.withFormName(parameters.formName)
      .withDateRange(parameters.startDate, parameters.endDate)
      .withPrefixFilter(parameters.appId)
      .withUserTypeNotEmpty()
      .build();
    try {
      const results: QueryCommandOutput = await this.client.send(new QueryCommand(queryInput));
      if (results.Items) {
        const parsedResults = submissionTableItemsSchema.parse(results);
        console.log(`${parsedResults.Items.length} items found`);
        const items = parsedResults.Items?.map((item) => {
          return {
            key: item?.sk.S ?? '',
            dateSubmitted: item.dateSubmitted?.S ?? new Date(1970, 0, 0).toISOString(),
            formName: item.formName?.S ?? 'onbekend',
            formTitle: item.formTitle?.S ?? 'Onbekende aanvraag',
          };
        });
        return items;
      }
      console.log(`No items found in ${parameters.formName} formName query`);
      return false;
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return false;
    }
  }
}

export function dynamoDBItem(pk: string, sk: string, userType: 'person' | 'organisation' | 'anonymous', submission: SubmissionData) {
  let item: any = {
    pk: { S: pk },
    sk: { S: sk },
    userType: { S: userType },
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
