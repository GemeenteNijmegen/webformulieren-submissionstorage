import fs from 'fs';
import path from 'path';
// @ts-ignore: Ignoring unused import
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
// @ts-ignore: Ignoring unused import
import { AWS, Bsn, environmentVariables, S3Storage } from '@gemeentenijmegen/utils';
import { mockClient } from 'aws-sdk-client-mock';
import { MockRxMissionSubmission } from './mocks/RxMissionSubmission.mock';
// @ts-ignore: Ignoring unused import
import { DynamoDBDatabase } from '../../../submission/Database';
import { getFetchMockResponse } from '../../zgwClient/test/testUtils';
import { handler } from '../rxmission-zgw.lambda';
import { getRxMissionZgwConfiguration, getSubmissionPropsForFormWithBranch } from '../RxMissionZgwConfiguration';
import { RxMissionZgwHandler } from '../RxMissionZgwHandler';

const DEBUG_OUTPUT = true;
// The ZgwHttpClient still uses process env
let envMockRxMissionHandler = {
  ZGW_CLIENT_SECRET_ARN: 'testclientsecret',
  ZGW_CLIENT_ID: 'testclientid',
};
process.env = { ...process.env, ...envMockRxMissionHandler };

let mockDBGetSubmission = jest.fn().mockResolvedValue({});
jest.mock('../../../submission/Database', () => {
  return {
    DynamoDBDatabase: jest.fn(() => {
      return {
        getSubmission: mockDBGetSubmission,
      };
    }),
  };
});

let mockS3Get = jest.fn().mockResolvedValue({});

jest.mock('@gemeentenijmegen/utils', () => {
  const actualModule = jest.requireActual('@gemeentenijmegen/utils');
  return {
    ...actualModule,
    S3Storage: jest.fn(() => {
      return {
        get: mockS3Get,
      };
    },
    ),
    AWS: {
      getSecret: jest.fn().mockResolvedValue('mockedSecretValue'),
    },
    environmentVariables: jest.fn().mockReturnValue(
      {
        CLIENT_ID: 'testclientid',
        CLIENT_SECRET: 'testclientsecret',
        ZGW_CLIENT_SECRET_ARN: 'testclientsecret',
        ZGW_CLIENT_ID: 'testclientid',
        BUCKET_NAME: 'testBucket',
        TABLE_NAME: 'testTable',
        ZAAKREFERENCE_TABLE_NAME: 'testReferenceTable',
        ZAAKTYPE: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/07fea148-1ede-4f39-bd2a-d5f43855e707',
        ROLTYPE: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/5ecbff9a-767b-4684-b158-c2217418054e',
        ZAKEN_API_URL: 'https://zaken.preprod-rx-services.nl/api/v1/',
        DOCUMENTEN_API_URL: 'https://documenten.preprod-rx-services.nl/api/v1/',
        BRANCH: 'development',
      },
    ),
  };
});


describe('RxMissionZgwHandler', () => {
  test('Kamerverhuur Aanvraag', async () => {
    const mockSubmission = new MockRxMissionSubmission('KamerverhuurVergunning');
    mockSubmission.logMockInfo();
    // Get data from database
    mockDBGetSubmission = jest.fn().mockResolvedValue(mockSubmission.mockedDatabaseGetSubmission());
    // Get submission json and attachment
    mockS3Get = jest.fn()
      .mockResolvedValueOnce(mockSubmission.getMockStorageSubmission())
      .mockResolvedValue(mockSubmission.getMockStorageBlob());

    // Please check the matchers if it fails, not foolproof right now WIP
    const fetchMock: any = getFetchMockImplementation(fetchMockMatchers);
    const spyOnFetch = jest.spyOn(global, 'fetch').mockImplementation(fetchMock);

    // Does not return anything with the get right now, which means getZaakByUrl is not called. Check matcher if you add something here and it fails
    mockClient(DynamoDBClient);
    const rxMissionZgwHandler = new RxMissionZgwHandler(getRxMissionZgwConfiguration('development'), getSubmissionPropsForFormWithBranch('development', { appId: mockSubmission.getAppId() }));
    const { key, userId, userType } = mockSubmission.getSubmissionParameters();
    await rxMissionZgwHandler.sendSubmissionToRxMission(key, userId, userType);

    // console.log('ALL CALLS MADE TO MAKE Kamerverhuuraanvraag');
    // console.dir(spyOnFetch.mock.calls, { depth: null, colors: true, compact: true, showHidden: true, showProxy: true });
    writeOutputToFile('kamerverhuur', spyOnFetch.mock.calls);
  });

  test('Bouwmaterialen from lambda event', async () => {
    //Build mockinformation based on a specific json from a form
    const mockSubmission = new MockRxMissionSubmission('Bouwmaterialen');
    mockSubmission.logMockInfo();

    // Get data from database
    mockDBGetSubmission = jest.fn().mockResolvedValue(mockSubmission.mockedDatabaseGetSubmission());
    // Get submission json and attachment
    mockS3Get = jest.fn()
      .mockResolvedValueOnce(mockSubmission.getMockStorageSubmission())
      .mockResolvedValue(mockSubmission.getMockStorageBlob()); // Laatste calls zijn altijd nepfiles
    // All Zgw API calls

    // Please check the matchers if it fails, not foolproof right now WIP
    const fetchMock: any = getFetchMockImplementation(fetchMockMatchers);
    const spyOnFetch = jest.spyOn(global, 'fetch').mockImplementation(fetchMock);

    await handler(mockSubmission.getEvent());
    writeOutputToFile('bouwmaterialen', spyOnFetch.mock.calls);
  });
});

/**
 *  Test helper methods and const
 */

function writeOutputToFile(name: string, data: any) {
  if (DEBUG_OUTPUT) {
    const outputDir = path.resolve(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now(); // Epoch in milliseconds
    const fileName = `${name}_${timestamp}.json`;
    const filePath = path.join(outputDir, fileName);
    const formattedData = data.map((item: any) => {
      if (Array.isArray(item) && item[1]?.body) {
        try {
          item[1].body = JSON.parse(item[1].body);
        } catch (e) {}
      }
      return item;
    });

    const jsonData = JSON.stringify(formattedData, null, 2); // Pretty-printed JSON
    fs.writeFileSync(filePath, jsonData, 'utf8');

    console.log(`Output written to ${filePath}`);
  }
}


interface FetchMockMatcher {
  method: string[];
  urlPathMatch: string;
  response: any;
}

export function getFetchMockImplementation(fetchMockMatchers: FetchMockMatcher[]) {
  return async (input: string | URL | Request, options?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = options?.method?.toUpperCase() || 'GET';

    // Extract the relevant full path from the URL
    const pathMatchRegex = new RegExp('^(?:https?://[^/]+)?(/.*)$'); // Captures everything after the domain
    const match = url.match(pathMatchRegex);
    const fullPath = match ? match[1] : '/'; // Full path, including query params

    // Sort matchers: prioritize longer and more specific matches first
    const sortedMatchers = fetchMockMatchers.sort((a, b) => b.urlPathMatch.length - a.urlPathMatch.length);

    // Find the first matching mock
    const matcher = sortedMatchers.find((mock) => {
      const methodMatches = mock.method.includes(method);

      // Flexible matching: Check if the mock path is anywhere in the full path
      const pathMatches = fullPath.includes(mock.urlPathMatch);

      return methodMatches && pathMatches;
    });

    if (matcher) {
      return getFetchMockResponse(matcher.response);
    }

    // If no match is found, throw an error or return a default response
    return Promise.reject(new Error(`No mock found for ${method} ${fullPath} and ${input}`));
  };
}

const fetchMockMatchers = [
  {
    method: ['POST'],
    urlPathMatch: '/zaken',
    response: { url: 'https://someurl', zaakinformatieobjecten: [], rollen: [] }, // createZaak
  },
  {
    method: ['GET'],
    urlPathMatch: '/zaken/', // Of deze goed werkt is even de vraag, want deze wordt nu niet aangeroepen door een lege db call
    response: {
      count: 0,
      next: null,
      previous: null,
      results: [],
    }, // getZaakByUrl empty
  },
  {
    method: ['POST'],
    urlPathMatch: '/statussen',
    response: { url: 'https://someurl' }, // addZaakStatus
  },
  {
    method: ['POST'],
    urlPathMatch: '/rollen',
    response: { url: 'https://someurl' }, // createRol
  },
  {
    method: ['POST'],
    urlPathMatch: '/enkelvoudiginformatieobjecten',
    response: {
      bestandsdelen: [{ url: 'https://somebasedomain.nl/bestandsdeelurl' }],
      lock: 'bla',
    }, // createInformatieObject
  },
  {
    method: ['PUT'],
    urlPathMatch: '/bestandsdeelurl',
    response: { statusCode: 204, url: 'https://somebasedomain.nl/uploadresult' }, // unlock
  },
  {
    method: ['POST'],
    urlPathMatch: '/zaakinformatieobjecten',
    response: { url: 'https://someurl' }, // relateToZaak
  },
  {
    method: ['POST'],
    urlPathMatch: '/unlock',
    response: { statusCode: 204 }, // unlock
  },
];