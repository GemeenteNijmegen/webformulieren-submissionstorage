import { APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.debug(event);
    return {
      statusCode: 200,
      body: 'ok!',
    };
  } catch (Error) {
    console.error('Error handling request: ', Error);
    return {
      statusCode: 500,
      body: '',
    };
  }
}
