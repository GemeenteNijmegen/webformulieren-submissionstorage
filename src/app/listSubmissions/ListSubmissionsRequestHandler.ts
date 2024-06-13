import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { EventParameters } from './parsedEvent';
import { Database, DynamoDBDatabase } from '../submission/Database';

export class ListSubmissionsRequestHandler {

  private environment;
  private database: Database;
  constructor() {
    this.environment = this.getEvironmentVariables();
    [this.database] = this.setup(this.environment);
  }

  private getEvironmentVariables() {
    if (process.env.TABLE_NAME == undefined) {
      throw Error('No table NAME provided, retrieving submissions will fail.');
    }
    if (process.env.BUCKET_NAME == undefined) {
      throw Error('No bucket NAME provided, retrieving submissions will fail.');
    }
    if (!process.env.ISSUER || !process.env.YIVI_CLAIM_BSN || !process.env.YIVI_CLAIM_KVK || !process.env.KVK_NUMBER_CLAIM) {
      throw Error('No issuer url or yivi claims defined to validate the authorization tokens');
    }
    return {
      tableName: process.env.TABLE_NAME,
      bucketName: process.env.BUCKET_NAME,
      issuer: process.env.ISSUER,
      yiviClaimBsn: process.env.YIVI_CLAIM_BSN,
      yiviClaimKvk: process.env.YIVI_CLAIM_KVK,
      kvkNumberClaim: process.env.KVK_NUMBER_CLAIM,
    };
  }

  /**
   * Check for required environment variables, and create
   * storage and database objects to pass to handler.
   */
  private setup(environment: { tableName: string }): [Database] {
    return [
      new DynamoDBDatabase(environment.tableName),
    ];
  }

  async handleRequest(parameters: EventParameters): Promise<ApiGatewayV2Response> {
    const userId = parameters.userId;
    let results;
    if (parameters.key) {
      results = await this.database.getSubmission({ userId: userId, key: parameters.key });
    } else {
      results = await this.database.listSubmissions({ userId: userId });
    }
    return Response.json(results);
  }

}
