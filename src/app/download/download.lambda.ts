import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { S3Storage } from '@gemeentenijmegen/utils';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { parsedEvent } from './parsedEvent';

if (!process.env.BUCKET_NAME) {
  throw Error('No bucket provided');
}
const storage = new S3Storage(process.env.BUCKET_NAME);

export async function handler(event: APIGatewayProxyEvent): Promise<any> {
  try {
    const params = parsedEvent(event);
    const response = Response.json({
      downloadUrl: await storage.getPresignedUrl(params.key),
    });
    console.debug(response);
    return response;
  } catch (error: any) {
    return {
      statusCode: 500,
    };
  }
}
