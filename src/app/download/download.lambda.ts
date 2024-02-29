import { ApiGatewayV2Response } from '@gemeentenijmegen/apigateway-http';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { parsedEvent } from './parsedEvent';
import { S3Storage } from '../submission/Storage';

if (!process.env.BUCKET_NAME) {
  throw Error('No bucket provided');
}
const storage = new S3Storage(process.env.BUCKET_NAME);

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiGatewayV2Response> {
  try {
    const params = parsedEvent(event);
    if (params.key.includes('APV18')) {
      return {
        headers: {
          Location: await storage.getPresignedUrl(params.key),
        },
        statusCode: 301,
      };
    } else {
      return {
        statusCode: 403,
      };
    }
  } catch {
    return {
      statusCode: 500,
    };
  }
}
