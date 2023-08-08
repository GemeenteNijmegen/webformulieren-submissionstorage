import { SNSMessage } from 'aws-lambda';
import { S3Storage, Storage } from './Storage';
import { Submission } from './Submission';

let storage: Storage;
if (process.env.BUCKET_NAME == undefined) {
  console.error('No bucket NAME provided, storing submissions will fail.');
} else {
  storage = new S3Storage(process.env.BUCKET_NAME);
}

export class SubmissionHandler {
  async handleRequest(message: SNSMessage) {
    if (storage == undefined) {
      throw Error('No storage engine provided. Check lambda start logs for errors.');
    }
    const submission = new Submission(storage);
    await submission.parse(message);
    await submission.save();

    //Store submission in S3

    //Retrieve attachments and store in S3

    //Retrieve form definition and store in S3
  }
}
