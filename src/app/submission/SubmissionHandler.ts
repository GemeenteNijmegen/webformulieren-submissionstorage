import { SNSMessage } from 'aws-lambda';
import { Submission } from './Submission';
import { validateMessage } from './submission.lambda';


export class SubmissionHandler {
  async handleRequest(message: SNSMessage) {
    await validateMessage(message);
    let returnMessage;
    if (message?.Type == 'SubscriptionConfirmation') {
      returnMessage = 'subscribed';
    } else if (message?.Type == 'Notification') {
      const submission = new Submission(message);
      if (submission.isAnonymous()) {
        returnMessage = 'anonymous submission';
      } else {
        returnMessage = 'message received. ';
      }
    }
    return {
      statusCode: 200,
      body: returnMessage,
    };
  }
}
