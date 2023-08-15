import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import * as snsSample from './samples/sns.sample.json';
import { SubmissionHandler } from '../SubmissionHandler';
const secretsMock = mockClient(SecretsManagerClient);
const dbMock = mockClient(DynamoDBClient);

const messages = snsSample.Records.map(record => record.Sns);
const message = messages.pop();

beforeAll(() => {
  process.env.BUCKET_NAME = 'mockBucketName';
  process.env.TABLE_NAME = 'mockTableName';
  process.env.FORMIO_API_KEY_ARN = 'arn::fake';
  process.env.FORMIO_BASE_URL = 'https://form-dashboard.webformulieren.auth-prod.csp-nijmegen.nl/ontwikkel/';

  const secretValue = 'Secret test value';
  secretsMock.on(GetSecretValueCommand).resolves({
    SecretString: secretValue,
  });
  dbMock.callsFake(() => {});
});

describe('Submission', () => {
  test('constructing succeeds', async () => {
    expect(new SubmissionHandler()).toBeTruthy();
  });

  test('calling succeeds', async () => {
    const handler = new SubmissionHandler();
    await handler.handleRequest(message);
  });
});
