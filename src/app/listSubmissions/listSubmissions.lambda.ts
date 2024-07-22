import { ApiGatewayV2Response } from '@gemeentenijmegen/apigateway-http';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { ListSubmissionsRequestHandler } from './ListSubmissionsRequestHandler';
import { parsedEvent, parsedEventWithAuthorizer } from './parsedEvent';

export async function handler(event: APIGatewayProxyEvent): Promise<ApiGatewayV2Response> {
  try {
    let params;
    if (process.env.USE_GATEWAY_AUTHORIZER == 'true') {
      params = parsedEventWithAuthorizer(event);
    } else {
      params = parsedEvent(event);
    }
    const requestHandler = new ListSubmissionsRequestHandler();
    return await requestHandler.handleRequest(params);
  } catch (error: any) {
    console.error(error);
    return Response.error(500);
  }
}
