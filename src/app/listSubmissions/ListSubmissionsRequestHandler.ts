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

      if (result.payload[this.environment.yiviClaimKvk]) { // yivi kvk
        return result.payload[this.environment.yiviClaimKvk] as string;
      } else if (result.payload[this.environment.yiviClaimBsn]) { // yivi bsn
        return new Bsn(result.payload[this.environment.yiviClaimBsn] as string).bsn;
      } else if (result.payload[this.environment.kvkNumberClaim]) { // kvk
        return result.payload[this.environment.kvkNumberClaim] as string;
      } else if (result.payload.sub) { // digid (note sub can be filled more often)
        return new Bsn(result.payload.sub).bsn;
      }
      throw Error('No claim to authenticate the user is found in the JWT');
    } catch (error) {
      console.error(error);
      throw Error('Invalid token!');
    }
  }

}
