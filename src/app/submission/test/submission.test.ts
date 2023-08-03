import * as snsSample from './samples/sns.sample.json';
import { Submission } from '../Submission';

const messages = snsSample.Records.map(record => record.Sns);
const message = messages.pop();
const submission = new Submission();

beforeAll(async () => {
  await submission.parse(message);
});

describe('Submission parsing', () => {
  test('parsing an SNS message to submission', async () => {
    expect(submission).toBeTruthy();
  });

  test('Message is not anonymous', async () => {
    expect(submission.isAnonymous()).toBe(false);
  });

  test('Message without kvk or bsn key is anonymous', async () => {
    const anonMessage = JSON.parse(JSON.stringify(message));
    anonMessage.Message = anonMessage.Message.replace(',\"bsn\":\"900222670\"', '');
    const anonSubmission = new Submission();
    submission.parse(anonMessage);
    expect(anonSubmission.isAnonymous()).toBe(true);
  });

  test('Invalid message throws', async () => {
    const invalidSubmission = new Submission();
    expect(async () => {
      await invalidSubmission.parse({ 'invalid SNS message': 'value', 'Message': 'messageTest' });
    }).rejects.toThrow();
  });
});

describe('Submission s3 locations', () => {
  test('retrieving location of S3 item', async () => {
    expect(submission.pdf?.bucket).toBeTruthy();
    expect(submission.pdf?.key).toBeTruthy();
  });
  
  test('retrieve all attachments', async () => {
    expect(submission.attachments).toHaveLength(2);
    expect(submission.attachments?.[0]).toMatchObject(({ bucket: expect.anything(), key: expect.anything() }))
  });
});
