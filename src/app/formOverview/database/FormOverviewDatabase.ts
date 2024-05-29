import { DynamoDBClient, PutItemCommand, QueryCommand, QueryCommandInput, QueryCommandOutput } from '@aws-sdk/client-dynamodb';

export interface FormOverviewData {
  fileName: string; // filename of csv
  createdDate?: string; // table sortkey
  createdBy?: string;
  formName?: string;
  formTitle?: string;
  queryStartDate?: string;
  queryEndDate?: string;
}

export interface FormOverviewDatabase {
  storeFormOverview(formOverview: any): Promise<boolean>;
  getFormOverviews(): Promise<FormOverviewData[]>;
}

export class DDBFormOverviewDatabase implements FormOverviewDatabase {
  readonly FORMID: string = 'FormOverview';
  private tableName: string;
  private client: DynamoDBClient;

  constructor(tableName: string, config?: { dynamoDBClient?: DynamoDBClient }) {
    this.tableName = tableName;
    this.client = config?.dynamoDBClient ?? new DynamoDBClient({});
  }

  async storeFormOverview(formOverview: FormOverviewData): Promise<boolean> {

    const timestamp = new Date().toISOString();
    const ttl = Date.now() + (1000 * 3600 * 24 * 30 * 6); // 6 months

    await this.client.send(new PutItemCommand({
      Item: {
        id: { S: this.FORMID },
        createdDate: { S: timestamp },
        fileName: { S: formOverview.fileName },
        createdBy: { S: formOverview.createdBy ?? '' },
        formName: { S: formOverview.formName ?? '' },
        formTitle: { S: formOverview.formTitle ?? '' },
        queryStartDate: { S: formOverview.queryStartDate ?? '' },
        queryEndDate: { S: formOverview.queryEndDate ?? '' },
        ttl: { N: ttl.toString() },
      },
      TableName: this.tableName,
    }));
    return true;
  }
  async getFormOverviews(): Promise<FormOverviewData[]> {

    const queryInput: QueryCommandInput = {
      TableName: this.tableName,
      ExpressionAttributeNames: {
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':id': { S: this.FORMID },
      },
      KeyConditionExpression: '#id = :name',
    };
    try {
      const results: QueryCommandOutput = await this.client.send(new QueryCommand(queryInput));
      if (results.Items) {
        console.log(`${results.Items.length} items found`);
        const items = results.Items?.map((item) => {
          return {
            fileName: item?.fileName.S ?? '',
            createdDate: item.createdDate?.S ?? new Date(1970, 0, 0).toISOString(),
            createdBy: item?.createdBy.S ?? '',
            formName: item.formName?.S ?? 'onbekende formuliernaam',
            formTitle: item.formTitle?.S ?? '',
            queryStartDate: item?.queryStartDate.S ?? '',
            queryEndDate: item?.queryEndDate.S ?? '',
          } as FormOverviewData;
        });
        return items;
      } else {return [];}
    } catch (error) {
      throw Error('Listing formOverviews from database failed');
    }
  }
}