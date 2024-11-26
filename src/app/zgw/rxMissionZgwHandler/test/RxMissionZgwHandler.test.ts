import fs from 'fs';
import path from 'path';
// @ts-ignore: Ignoring unused import
import { AWS, Bsn, environmentVariables, S3Storage } from '@gemeentenijmegen/utils';
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
      .mockResolvedValueOnce(mockSubmission.getMockStorageBlob())
      .mockResolvedValueOnce(mockSubmission.getMockStorageBlob());

    const spyOnFetch = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(getFetchMockResponse({
        count: 0,
        next: null,
        previous: null,
        results: [],
      }) as any as Response) // getZaak
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl', zaakinformatieobjecten: [], rollen: [] }) as any as Response) //createZaak
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl' }) as any as Response) //addZaakStatus
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl' }) as any as Response) //createRol
      .mockResolvedValueOnce(getFetchMockResponse({ bestandsdelen: [{ url: 'https://someurl' }], lock: 'bla' }) as any as Response) //createInformatieObject
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl' }) as any as Response) //uploadfile
      .mockResolvedValueOnce(getFetchMockResponse({ statusCode: 204 }) as any as Response) //unlock
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl' }) as any as Response) //relateToZaak
      .mockResolvedValueOnce(getFetchMockResponse({ bestandsdelen: [{ url: 'https://someurl' }], lock: 'bla' }) as any as Response) //createInformatieObject
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl' }) as any as Response) //uploadfile
      .mockResolvedValueOnce(getFetchMockResponse({ statusCode: 204 }) as any as Response) //unlock
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl' }) as any as Response); //relateToZaak

    const rxMissionZgwHandler = new RxMissionZgwHandler(getRxMissionZgwConfiguration('development'), getSubmissionPropsForFormWithBranch('development', { appId: mockSubmission.getAppId() }));
    const { key, userId, userType } = mockSubmission.getSubmissionParameters();
    await rxMissionZgwHandler.sendSubmissionToRxMission(key, userId, userType);

    // console.log('ALL CALLS MADE TO MAKE Kamerverhuuraanvraag');
    // console.dir(spyOnFetch.mock.calls, { depth: null, colors: true, compact: true, showHidden: true, showProxy: true });
    writeOutputToFile('kamerverhuur', spyOnFetch.mock.calls);
  });
  test('Bouwmaterialen from lambda event', async () => {
    const mockSubmission = new MockRxMissionSubmission('Bouwmaterialen');
    mockSubmission.logMockInfo();
    // Get data from database
    mockDBGetSubmission = jest.fn().mockResolvedValue(mockSubmission.mockedDatabaseGetSubmission());
    // Get submission json and attachment
    mockS3Get = jest.fn()
      .mockResolvedValueOnce(mockSubmission.getMockStorageSubmission())
      .mockResolvedValueOnce(mockSubmission.getMockStorageBlob())
      .mockResolvedValueOnce(mockSubmission.getMockStorageBlob());
    // All Zgw API calls

    const spyOnFetch = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(getFetchMockResponse({
        count: 0,
        next: null,
        previous: null,
        results: [],
      }) as any as Response) // getZaak
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl', zaakinformatieobjecten: [], rollen: [] }) as any as Response) //createZaak
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl' }) as any as Response) //addZaakStatus
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl' }) as any as Response) //createRol
      .mockResolvedValueOnce(getFetchMockResponse({ bestandsdelen: [{ url: 'https://someurl' }], lock: 'bla' }) as any as Response) //createInformatieObject
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl' }) as any as Response) //uploadfile
      .mockResolvedValueOnce(getFetchMockResponse({ statusCode: 204 }) as any as Response) //unlock
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl' }) as any as Response) //relateToZaak
      .mockResolvedValueOnce(getFetchMockResponse({ bestandsdelen: [{ url: 'https://someurl' }], lock: 'bla' }) as any as Response) //createInformatieObject
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl' }) as any as Response) //uploadfile
      .mockResolvedValueOnce(getFetchMockResponse({ statusCode: 204 }) as any as Response) //unlock
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'https://someurl' }) as any as Response); //relateToZaak

    await handler(mockSubmission.getEvent());
    writeOutputToFile('bouwmaterialen', spyOnFetch.mock.calls);
  });
});


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
