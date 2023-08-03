import { SNSEvent } from 'aws-lambda';
import { SubmissionHandler } from './SubmissionHandler';

const submissionHandler = new SubmissionHandler();

export async function handler(event: SNSEvent) {
  try {
    console.debug(event);
    const messages = event.Records.map(record => record.Sns);
    for(let message of messages) {
      submissionHandler.handleRequest(message);
    }
  }
}
