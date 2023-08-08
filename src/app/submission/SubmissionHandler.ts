import { SNSMessage } from 'aws-lambda';
import { Submission } from './Submission';


export class SubmissionHandler {
  async handleRequest(message: SNSMessage) {
    const submission = new Submission();
    await submission.parse(message);

  }
}
