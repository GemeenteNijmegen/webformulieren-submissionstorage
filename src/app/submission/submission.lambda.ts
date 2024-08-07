import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { SNSEvent } from 'aws-lambda';
import { SubmissionHandler } from './SubmissionHandler';

const eventsClient = new EventBridgeClient();
const submissionHandler = new SubmissionHandler(eventsClient);

export async function handler(event: SNSEvent) {
  try {
    const messages = event.Records.map((record) => record.Sns);
    for (let message of messages) {
      await submissionHandler.handleRequest(message);
    }
  } catch (error: any) {
    console.error(error);
  }
}
