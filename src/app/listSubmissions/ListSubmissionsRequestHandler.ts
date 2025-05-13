import { ApiGatewayV1Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V1/Response';
import { environmentVariables, S3Storage, Storage } from '@gemeentenijmegen/utils';
import { Database, DynamoDBDatabase } from '../submission/Database';
import { EventParameters } from './parsedEvent';

export class ListSubmissionsRequestHandler {

  private database: Database;
  private storage: Storage;
  private env = ['BUCKET_NAME', 'TABLE_NAME'];
  constructor() {
    const environment = environmentVariables(this.env);
    [this.database, this.storage] = this.setup(environment.table, environment.bucket);
  }


  /**
   * Check for required environment variables, and create
   * storage and database objects to pass to handler.
   */
  private setup(table: string, bucket: string): [Database, Storage] {
    return [
      new DynamoDBDatabase(table),
      new S3Storage(bucket),
    ];
  }

  async handleRequest(parameters: EventParameters): Promise<ApiGatewayV1Response> {
    let results;
    if (parameters.key) {
      results = await this.database.getSubmission({ userId: parameters.userId, userType: parameters.userType, key: parameters.key });
      if (parameters.fullSubmission && results) {
        const submission = await this.storage.get(`${parameters.key}/submission.json`);
        if(submission?.Body) {
          results.submission = JSON.parse(await submission.Body.transformToString('utf-8'));
        }
      }
    } else {
      results = await this.database.listSubmissions({ userId: parameters.userId, userType: parameters.userType });
    }
    return Response.json(results);
  }

}
