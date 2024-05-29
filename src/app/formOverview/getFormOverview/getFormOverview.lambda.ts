import { ApiGatewayV2Response } from '@gemeentenijmegen/apigateway-http';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { FormOverviewRequestHandler } from './getFormOverviewRequestHandler';
import { parsedEvent } from './parsedEvent';


export async function handler(event: APIGatewayProxyEventV2): Promise<ApiGatewayV2Response> {
  try {
    const params = parsedEvent(event);
    const formOverviewHandler = new FormOverviewRequestHandler();
    return await formOverviewHandler.handleRequest(params);
  } catch (error: any) {
    console.error(error);
    return Response.error(500);
  }
}
