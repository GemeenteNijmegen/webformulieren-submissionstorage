import * as jose from 'jose';
import { getContext } from './ContextFixture';
import { handler } from '../listSubmissions.lambda';

const personEvent = {
  version: '2.0',
  routeKey: '$default',
  rawPath: '/my/path',
  rawQueryString: 'parameter1=value1&parameter1=value2&parameter2=value',
  cookies: [
    'cookie1',
    'cookie2',
  ],
  headers: {
    header1: 'value1',
    header2: 'value1,value2',
    Authorization: 'Bearer eyuoirgjweogiejqg',
  },
  queryStringParameters: {
    user_id: '900222670',
    user_type: 'person',
  },
  requestContext: getContext('900222670'),
  body: 'Hello from Lambda',
  pathParameters: {
    parameter1: 'value1',
  },
  isBase64Encoded: false,
  stageVariables: {
    stageVariable1: 'value1',
    stageVariable2: 'value2',
  },
};

const organisationEvent = {
  version: '2.0',
  routeKey: '$default',
  rawPath: '/my/path',
  rawQueryString: 'parameter1=value1&parameter1=value2&parameter2=value',
  cookies: [
    'cookie1',
    'cookie2',
  ],
  headers: {
    header1: 'value1',
    header2: 'value1,value2',
    Authorization: 'Bearer eyuoirgjweogiejqg',
  },
  queryStringParameters: {
    user_id: '69599084',
    user_type: 'organisation',
  },
  requestContext: getContext('900222670'),
  body: 'Hello from Lambda',
  pathParameters: {
    parameter1: 'value1',
  },
  isBase64Encoded: false,
  stageVariables: {
    stageVariable1: 'value1',
    stageVariable2: 'value2',
  },
};

const invalidEvent = {
  version: '2.0',
  routeKey: '$default',
  rawPath: '/my/path',
  rawQueryString: 'parameter1=value1&parameter1=value2&parameter2=value',
  cookies: [
    'cookie1',
    'cookie2',
  ],
  headers: {
    header1: 'value1',
    header2: 'value1,value2',
  },
  queryStringParameters: {
    user_type: 'organisation',
  },
  requestContext: getContext('900222670'),
  body: 'Hello from Lambda',
  pathParameters: {
    parameter1: 'value1',
  },
  isBase64Encoded: false,
  stageVariables: {
    stageVariable1: 'value1',
    stageVariable2: 'value2',
  },
};

jest.mock('../../submission/Database', () => {

  return {
    DynamoDBDatabase: jest.fn(() => {
      return {
        listSubmissions: async () => {
          const results = [{
            userId: '900222670',
            key: 'TDL01.001',
            pdf: 'TDL01.001/submission.pdf',
          }];
          return results;
        },
      };
    }),
  };
});

beforeAll(() => {
  const originalEnv = process.env;
  process.env = {
    ...originalEnv,
    TABLE_NAME: 'mock_table',
    BUCKET_NAME: 'mock_bucket',
    ISSUER: 'https://example.com',
  };
});


jest.spyOn(jose, 'createRemoteJWKSet').mockReturnValue('' as any);
jest.spyOn(jose, 'jwtVerify').mockResolvedValue({ payload: { sub: '900026236' } } as any);

describe('Handler parsing events', () => {
  test('returns 200 with correct query params for person', async() => {
    const result = await handler(personEvent as any);
    expect(result.statusCode).toBe(200);
  });

  test('returns 200 with correct query params for organisation', async() => {
    const result = await handler(organisationEvent as any);
    expect(result.statusCode).toBe(200);
  });

  test('returns 400 with incorrect query params', async() => {
    const result = await handler(invalidEvent as any);
    expect(result.statusCode).toBe(500);
  });

});


