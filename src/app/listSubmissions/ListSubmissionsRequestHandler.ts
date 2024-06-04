import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Bsn } from '@gemeentenijmegen/utils';
import * as jose from 'jose';
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
    if (!process.env.ISSUER) {
      throw Error('No issuer url defined to validate the authorization tokens');
    }
    return {
      tableName: process.env.TABLE_NAME,
      bucketName: process.env.BUCKET_NAME,
      issuer: process.env.ISSUER,
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
    const userId = await this.getUserIdFromIdToken(parameters.idToken);
    let results;
    if (parameters.key) {
      results = await this.database.getSubmission({ userId: userId, key: parameters.key });
    } else {
      results = await this.database.listSubmissions({ userId: userId });
    }
    return Response.json(results);
  }

  /**
   * Parse JWT token and check validity
   * @param idToken the jwt id_token
   */
  private async getUserIdFromIdToken(idToken: string) {
    try {
      const jwks = jose.createRemoteJWKSet(new URL(`${this.environment.issuer}/certs`));
      const result = await jose.jwtVerify(idToken, jwks, {
        issuer: this.environment.issuer,
      });
      const bsn = new Bsn(result.payload.sub ?? 'undefined');
      return bsn.bsn;
    } catch (error) {
      console.error(error);
      throw Error('Invalid token!');
    }
  }

}
