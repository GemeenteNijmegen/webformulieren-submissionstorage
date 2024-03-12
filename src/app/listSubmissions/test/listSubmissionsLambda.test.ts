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
  },
  queryStringParameters: {
    user_id: '900222670',
    user_type: 'person',
  },
  requestContext: {
    accountId: '123456789012',
    apiId: 'api-id',
    authentication: {
      clientCert: {
        clientCertPem: 'CERT_CONTENT',
        subjectDN: 'www.example.com',
        issuerDN: 'Example issuer',
        serialNumber: 'a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1',
        validity: {
          notBefore: 'May 28 12:30:02 2019 GMT',
          notAfter: 'Aug  5 09:36:04 2021 GMT',
        },
      },
    },
    authorizer: {
      jwt: {
        claims: {
          claim1: 'value1',
          claim2: 'value2',
        },
        scopes: [
          'scope1',
          'scope2',
        ],
      },
    },
    domainName: 'id.execute-api.us-east-1.amazonaws.com',
    domainPrefix: 'id',
    http: {
      method: 'POST',
      path: '/my/path',
      protocol: 'HTTP/1.1',
      sourceIp: '192.0.2.1',
      userAgent: 'agent',
    },
    requestId: 'id',
    routeKey: '$default',
    stage: '$default',
    time: '12/Mar/2020:19:03:58 +0000',
    timeEpoch: 1583348638390,
  },
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
  },
  queryStringParameters: {
    user_id: '69599084',
    user_type: 'organisation',
  },
  requestContext: {
    accountId: '123456789012',
    apiId: 'api-id',
    authentication: {
      clientCert: {
        clientCertPem: 'CERT_CONTENT',
        subjectDN: 'www.example.com',
        issuerDN: 'Example issuer',
        serialNumber: 'a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1',
        validity: {
          notBefore: 'May 28 12:30:02 2019 GMT',
          notAfter: 'Aug  5 09:36:04 2021 GMT',
        },
      },
    },
    authorizer: {
      jwt: {
        claims: {
          claim1: 'value1',
          claim2: 'value2',
        },
        scopes: [
          'scope1',
          'scope2',
        ],
      },
    },
    domainName: 'id.execute-api.us-east-1.amazonaws.com',
    domainPrefix: 'id',
    http: {
      method: 'POST',
      path: '/my/path',
      protocol: 'HTTP/1.1',
      sourceIp: '192.0.2.1',
      userAgent: 'agent',
    },
    requestId: 'id',
    routeKey: '$default',
    stage: '$default',
    time: '12/Mar/2020:19:03:58 +0000',
    timeEpoch: 1583348638390,
  },
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
  requestContext: {
    accountId: '123456789012',
    apiId: 'api-id',
    authentication: {
      clientCert: {
        clientCertPem: 'CERT_CONTENT',
        subjectDN: 'www.example.com',
        issuerDN: 'Example issuer',
        serialNumber: 'a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1',
        validity: {
          notBefore: 'May 28 12:30:02 2019 GMT',
          notAfter: 'Aug  5 09:36:04 2021 GMT',
        },
      },
    },
    authorizer: {
      jwt: {
        claims: {
          claim1: 'value1',
          claim2: 'value2',
        },
        scopes: [
          'scope1',
          'scope2',
        ],
      },
    },
    domainName: 'id.execute-api.us-east-1.amazonaws.com',
    domainPrefix: 'id',
    http: {
      method: 'POST',
      path: '/my/path',
      protocol: 'HTTP/1.1',
      sourceIp: '192.0.2.1',
      userAgent: 'agent',
    },
    requestId: 'id',
    routeKey: '$default',
    stage: '$default',
    time: '12/Mar/2020:19:03:58 +0000',
    timeEpoch: 1583348638390,
  },
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
  };
});

describe('Handler parsing events', () => {
  test('returns 200 with correct query params for person', async() => {
    const result = await handler(personEvent);
    expect(result.statusCode).toBe(200);
  });

  test('returns 200 with correct query params for organisation', async() => {
    const result = await handler(organisationEvent);
    expect(result.statusCode).toBe(200);
  });

  test('returns 400 with incorrect query params', async() => {
    const result = await handler(invalidEvent);
    expect(result.statusCode).toBe(500);
  });

});


