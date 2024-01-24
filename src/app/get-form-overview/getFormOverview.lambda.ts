import { APIGatewayProxyResult } from 'aws-lambda';
import { FormOverviewRequestHandler } from './getFormOverviewRequestHandler';

const formOverviewHandler = new FormOverviewRequestHandler();

export async function handler(): Promise<APIGatewayProxyResult> {
  console.log('Start lambda FormOverviewHandler');
  try {
    return await formOverviewHandler.handleRequest('message');

  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/text',
      },
      body: 'Error retrieving formoverview ',
    };
  }
}
