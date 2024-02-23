import { ListSubmissionsRequestHandler } from '../ListSubmissionsRequestHandler';

const listResults = [{
  userId: '900222670',
  key: 'TDL17.957',
  pdf: 'TDL17.957/submission.pdf',
  formName: 'bingoMeldenOfLoterijvergunningAanvragen',
  dateSubmitted: '2024-03-01T16:35:55.229Z',
  formTitle: 'Bingo melden',
}];

const expectedListResults = [{
  userId: '900222670',
  key: 'TDL17.957',
  pdf: 'TDL17.957/submission.pdf',
  formName: 'bingoMeldenOfLoterijvergunningAanvragen',
  dateSubmitted: '2024-03-01T16:35:55.229Z',
  formTitle: 'Bingo melden',
}];


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
    expect(result.body).toBe(JSON.stringify(expectedListResults));
  });

});
