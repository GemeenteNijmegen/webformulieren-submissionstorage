import * as snsSample from '../../submission/test/samples/sns.sample.json';
import { ListSubmissionsRequestHandler } from '../ListSubmissionsRequestHandler';

const listResults = [{
  key: 'TDL17.957',
  pdf: 'TDL17.957/submission.pdf',
}];

const expectedListResults = [{
  key: 'TDL17.957',
  pdf: 'TDL17.957/submission.pdf',
  formName: 'test',
  date: '2024-03-01T16:35:55.229Z',
}];

const getObjectMock = (file:any) => ({
  Body: {
    // Stringify the file to simulate the AWS getObject response
    transformToString: () => Promise.resolve(JSON.stringify(file)),
  },
});

jest.mock('../../submission/Database', () => {

  return {
    DynamoDBDatabase: jest.fn(() => {
      return {
        listSubmissions: async () => {
          return listResults;
        },
      };
    }),
  };
});

jest.mock('../../submission/Storage', () => {
  return {
    S3Storage: jest.fn(() => {
      return {
        getBatch: async () => {
          return [getObjectMock(snsSample.Records[0].Sns)];
        },
      };
    }),
  };
});

let handler: ListSubmissionsRequestHandler;
beforeAll(() => {
  const originalEnv = process.env;
  process.env = {
    ...originalEnv,
    TABLE_NAME: 'mock_table',
    BUCKET_NAME: 'mock_bucket',
  };
  handler = new ListSubmissionsRequestHandler();
});

describe('Request Handler', () => {
  test('Handler correctly returns', async() => {
    const result = await handler.handleRequest({ userId: '900222670', userType: 'person' });
    expect(result.body).toBe(JSON.stringify(expectedListResults)); // TODO fix this test
    console.error('TODO this test should be fixed!');
  });

});
