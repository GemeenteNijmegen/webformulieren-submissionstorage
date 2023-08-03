import * as snsSample from './samples/sns.sample.json';
import { Submission } from '../Submission';

const messages = snsSample.Records.map(record => record.Sns);
const message = messages.pop();

describe('Submission class', () => {
  test('parsing an SNS message to submission', async () => {
    const submission = new Submission(message);
    expect(submission).toBeTruthy();
  });

  test('Message is not anonymous', async () => {
    const submission = new Submission(message);
    expect(submission.isAnonymous()).toBe(false);
  });

  test('Message without kvk or bsn key is anonymous', async () => {
    const anonMessage = JSON.parse(JSON.stringify(message));
    anonMessage.Message = anonMessage.Message.replace(',\"bsn\":\"900222670\"', '');
    const submission = new Submission(anonMessage);
    expect(submission.isAnonymous()).toBe(true);
  });


  test('Invalid message throws', async () => {
    expect(() => {
      new Submission({ 'invalid SNS message': 'value', 'Message': 'messageTest' });
    }).toThrow();
  });
});
