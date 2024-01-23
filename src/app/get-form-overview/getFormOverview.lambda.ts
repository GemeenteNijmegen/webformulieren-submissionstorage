import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { FormOverviewRequestHandler } from './getFormOverviewRequestHandler';

const formOverviewHandler = new FormOverviewRequestHandler();

export async function handler() {
  console.log('Start lambda FormOverviewHandler');
  try {
    return await formOverviewHandler.handleRequest('message');

  } catch (error: any) {
    console.error(error);
    return Response.error(400);
  }
}
