import { ListSubmissionsRequestHandler } from '../ListSubmissionsRequestHandler';

const expectedResults = {
  key: 'TDL01.001',
  pdf: 'TDL01.001/submission.pdf',
};
jest.mock('../../submission/Database', () => {

  return {
    DynamoDBDatabase: jest.fn(() => {
      return {
        listSubmissions: async () => {
          return expectedResults;
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
  };
  handler = new ListSubmissionsRequestHandler();
});

describe('Request Handler', () => {
  test('Handler correctly returns', async() => {
    const result = await handler.handleRequest({ userId: '900222670', userType: 'person' });
    expect(result.body).toBe(JSON.stringify(expectedResults));
  });

});
