import { ApiGatewayV2Response } from '@gemeentenijmegen/apigateway-http';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { APIGatewayEventRequestContextLambdaAuthorizer, APIGatewayProxyEventV2 } from 'aws-lambda';
import { ListSubmissionsRequestHandler } from './ListSubmissionsRequestHandler';
import { parsedEvent } from './parsedEvent';

export async function handler(
  event: APIGatewayProxyEventV2,
  context: APIGatewayEventRequestContextLambdaAuthorizer<any>,
): Promise<ApiGatewayV2Response> {
  try {
    const params = parsedEvent(event);
    console.log(params);
    const requestHandler = new ListSubmissionsRequestHandler();
    return await requestHandler.handleRequest(params, context);
  } catch (error: any) {
    console.error(error);
    return Response.error(500);
  }
}
