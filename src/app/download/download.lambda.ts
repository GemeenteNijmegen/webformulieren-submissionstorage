import { ApiGatewayV2Response } from '@gemeentenijmegen/apigateway-http';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { parsedEvent } from './parsedEvent';
import { S3Storage } from '../submission/Storage';

if (!process.env.BUCKET_NAME) {
  throw Error('No bucket provided');
}
const storage = new S3Storage(process.env.BUCKET_NAME);

export async function handler(event: APIGatewayProxyEvent): Promise<any> {
  try {
    const params = parsedEvent(event);
    return Response.json({
      downloadUrl: await storage.getPresignedUrl(params.key),
    });
  } catch (error: any) {
    return {
      statusCode: 500,
    };
  }
}
