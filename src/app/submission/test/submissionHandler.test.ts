import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { S3Client } from '@aws-sdk/client-s3';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import { SubmissionHandler } from '../SubmissionHandler';
import * as snsSample from './samples/sns.sample.json';

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
const eventsMock = mockClient(EventBridgeClient);

// TODO: andere test snsobjecten toevoegen zonder bsn of kvk zodra we deze eruit zouden halen.
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
  eventsMock.callsFake(() => {});
});

describe('Submission', () => {
  test('constructing succeeds', async () => {
    expect(new SubmissionHandler()).toBeTruthy();
  });

  test('calling succeeds', async () => {
    const handler = new SubmissionHandler();
    await handler.handleRequest(message);
  });
  test('should call PutEventsCommand with expected details', async () => {
    const handler = new SubmissionHandler(eventsMock as unknown as EventBridgeClient);

    const sendSpy = jest.spyOn(eventsMock, 'send');
    await handler.handleRequest(message);
    expect(sendSpy).toHaveBeenCalledWith(expect.any(PutEventsCommand));

    // Haal het argument op dat met `send` is aangeroepen
    const putEventsCommand = sendSpy.mock.calls[0][0] as PutEventsCommand;
    const commandInput = putEventsCommand.input;

    expect(commandInput).toMatchObject({
      Entries: [
        {
          Source: 'Submissionstorage',
          DetailType: 'New Form Processed',
          Detail: JSON.stringify({
            Reference: 'TDL17.957',
            UserId: '900026236',
            UserType: 'person',
            Key: 'TDL17.957',
          }),
        },
      ],
    });
    sendSpy.mockRestore();
  });
});
