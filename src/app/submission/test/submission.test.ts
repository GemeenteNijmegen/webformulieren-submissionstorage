import { MockDatabase } from './MockDatabase';
import { MockStorage } from './MockStorage';
import * as snsSampleAnonymous from './samples/sns.sample-anonymous.json';
import * as snsSamplePayment from './samples/sns.sample-payment.json';
import * as snsSample from './samples/sns.sample.json';
import { MockFormConnector } from '../FormConnector';
import { Submission } from '../Submission';

const messages = snsSample.Records.map(record => record.Sns);
const message = messages.pop();
const storage = new MockStorage('mockBucket');
const formConnector = new MockFormConnector();
const database = new MockDatabase();
const submission = new Submission({ storage, formConnector, database });

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
    const messagesAnonymous = snsSampleAnonymous.Records.map(record => record.Sns);
    const messageAnonymous = messagesAnonymous.pop();
    const anonMessage = JSON.parse(JSON.stringify(messageAnonymous));
    const anonSubmission = new Submission({ storage, formConnector, database });
    await anonSubmission.parse(anonMessage);
    expect(anonSubmission.isAnonymous()).toBe(true);
  });

  test('Message for payment is rejected', async () => {
    const messagesPayment = snsSamplePayment.Records.map(record => record.Sns);
    const messagePayment = messagesPayment.pop();
    const paymentMessage = JSON.parse(JSON.stringify(messagePayment));
    const paymentSubmission = new Submission({ storage, formConnector, database });

    await expect(async () => {
      await paymentSubmission.parse(paymentMessage);
    }).rejects.toThrow();
  });

  test('Invalid message throws', async () => {
    const invalidSubmission = new Submission({ storage, formConnector, database });
    await expect(async () => {
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
    expect(submission.attachments?.[0]).toMatchObject(({ bucket: expect.anything(), key: expect.anything() }));
  });
});

describe('Store submission in s3', () => {
  test('Store method returns succesfully', async () => {
    expect(await submission.save()).toBeTruthy();
  });
});
