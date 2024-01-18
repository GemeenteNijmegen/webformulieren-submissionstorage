import { FormOverviewRequestHandler } from './getFormOverviewRequestHandler';

const formOverviewHandler = new FormOverviewRequestHandler();

export async function handler() {
  console.log('Start lambda FormOverviewHandler');
  try {
    await formOverviewHandler.handleRequest('message');
  } catch (error: any) {
    console.error(error);
  }
}
