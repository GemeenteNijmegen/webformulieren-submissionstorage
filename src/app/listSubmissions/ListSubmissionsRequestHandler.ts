import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { EventParameters } from './parsedEvent';
import { Database, DynamoDBDatabase } from '../submission/Database';
import { S3Storage, Storage } from '../submission/Storage';

export class ListSubmissionsRequestHandler {

  private database: Database;
  private storage: Storage;
  constructor() {
    const environment = this.getEvironmentVariables();
    [this.database, this.storage] = this.setup(environment);
  }

  private getEvironmentVariables() {
    if (process.env.TABLE_NAME == undefined) {
      throw Error('No table NAME provided, retrieving submissions will fail.');
    }
    if (process.env.BUCKET_NAME == undefined) {
      throw Error('No bucket NAME provided, retrieving submissions will fail.');
    }
    return {
      tableName: process.env.TABLE_NAME,
      bucketName: process.env.BUCKET_NAME,
    };
  }

  /**
   * Check for required environment variables, and create
   * storage and database objects to pass to handler.
   */
  private setup(environment: { tableName: string; bucketName: string }): [Database, Storage] {
    return [
      new DynamoDBDatabase(environment.tableName),
      new S3Storage(environment.bucketName),
    ];
  }

  async handleRequest(parameters: EventParameters): Promise<ApiGatewayV2Response> {
    const results = await this.database.listSubmissions({ userId: parameters.userId });
    const submissions = await this.getBucketObjects(results.map(result => `${result.key}/submission.json`));
    const resultObjects = results.map((result) => {
      if (submissions[result.key]) {
        return {
          ...result,
          formName: submissions[result.key].formTypeId,
          date: new Date(Date.UTC(...submissions[result.key].metadata.timestamp as [number, number, number, number, number, number, number])),
        };
      } else {
        return results;
      }
    });
    return Response.json(resultObjects);
  }

  async getBucketObjects(keys: string[]) {
    const objects = await this.storage.getBatch(keys);
    const submissions: any = {};
    for (const object of objects) {
      if (object.Body) {
        const bodyString = await object.Body.transformToString();
        const objectJson = JSON.parse(bodyString);
        const submission = JSON.parse(objectJson.Message);
        submissions[submission.reference] = submission;
      }
    }
    return submissions;
  }
}
