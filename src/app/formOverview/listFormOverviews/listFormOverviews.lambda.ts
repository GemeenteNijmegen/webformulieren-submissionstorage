import { ApiGatewayV2Response } from '@gemeentenijmegen/apigateway-http';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { ListOverviewsRequestHandler } from './listFormOverviewsRequestHandler';
import { EventParameters, parsedEvent } from './parsedEvent';


export async function handler(event: APIGatewayProxyEventV2): Promise<ApiGatewayV2Response> {
  try {
    const params: EventParameters = parsedEvent(event);
    const listFormOverviewsRequestHandler = new ListOverviewsRequestHandler();
    return await listFormOverviewsRequestHandler.handleRequest(params);
  } catch (error: any) {
    console.error(error);
    return Response.error(500);
  }
}
