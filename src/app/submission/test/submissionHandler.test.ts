import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import * as snsSample from './samples/sns.sample.json';
import { SubmissionHandler } from '../SubmissionHandler';
let mockDefinition = jest.fn().mockResolvedValue({ title: 'testTitel', name: 'testName' });
jest.mock('../FormConnector', () => {

  return {
    FormIoFormConnector: jest.fn(() => {
      return {
        definition: mockDefinition,
      };
    }),
  };

});
const secretsMock = mockClient(SecretsManagerClient);
const dbMock = mockClient(DynamoDBClient);
const s3Mock = mockClient(S3Client);

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
  s3Mock.callsFake(() => {});
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
