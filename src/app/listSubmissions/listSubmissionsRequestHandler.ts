import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { EventParameters } from './parsedEvent';
import { Database, DynamoDBDatabase } from '../submission/Database';

export class ListSubmissionsRequestHandler {

  // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html#definite-assignment-assertions
  private database: Database;
  constructor() {
    const environment = this.getEvironmentVariables();
    this.database = this.setup(environment);
  }

  private getEvironmentVariables() {
    if (process.env.TABLE_NAME == undefined) {
      throw Error('No table NAME provided, retrieving submissions will fail.');
    }
    return {
      tableName: process.env.TABLE_NAME,
    };
  }

  /**
   * Check for required environment variables, and create
   * storage and database objects to pass to handler.
   */
  private setup(environment: { tableName: string }): Database {
    return new DynamoDBDatabase(environment.tableName);
  }

  async handleRequest(parameters: EventParameters): Promise<ApiGatewayV2Response> {
    console.debug('params in request', parameters);
    const results = await this.database.listSubmissions({ userId: parameters.userId });
    return Response.json(results);
  }
}
