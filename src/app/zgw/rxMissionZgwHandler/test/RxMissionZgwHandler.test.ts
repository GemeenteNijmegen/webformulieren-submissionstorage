// @ts-ignore: Ignoring unused import
import { AWS, environmentVariables, S3Storage } from '@gemeentenijmegen/utils';
import { MockRxMissionSubmission } from './mocks/RxMissionSubmission.mock';
// @ts-ignore: Ignoring unused import
import { DynamoDBDatabase } from '../../../submission/Database';
import { getFetchMockResponse } from '../../zgwClient/test/testUtils';
import { getRxMissionZgwConfiguration } from '../RxMissionZgwConfiguration';
import { RxMissionZgwHandler } from '../RxMissionZgwHandler';

let envMockRxMissionHandler = {
  CLIENT_ID: 'testclientid',
  CLIENT_SECRET: 'testclientsecret',
  ZGW_CLIENT_SECRET_ARN: 'testclientsecret',
  ZGW_CLIENT_ID: 'testclientid',
  BUCKET_NAME: 'testBucket',
  TABLE_NAME: 'testTable',
  ZAAKTYPE: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/07fea148-1ede-4f39-bd2a-d5f43855e707',
  ROLTYPE: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/5ecbff9a-767b-4684-b158-c2217418054e',
  ZAAKSTATUS: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/257a9236-74e5-4eb3-8556-63ea58980509',
  INFORMATIEOBJECTTYPE: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/47d64918-891c-4653-8237-cd5445fc6543',
  ZAKEN_API_URL: 'https://zaken.preprod-rx-services.nl/api/v1/',
  DOCUMENTEN_API_URL: 'https://documenten.preprod-rx-services.nl/api/v1/',
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
  return {
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
        ZAAKSTATUS: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/257a9236-74e5-4eb3-8556-63ea58980509',
        INFORMATIEOBJECTTYPE: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/47d64918-891c-4653-8237-cd5445fc6543',
        ZAKEN_API_URL: 'https://zaken.preprod-rx-services.nl/api/v1/',
        DOCUMENTEN_API_URL: 'https://documenten.preprod-rx-services.nl/api/v1/',
      },
    ),
  };
});


describe('RxMissionZgwHandler', () => {
  test('Kamerverhuur Aanvraag', async () => {
    const mockSubmission = new MockRxMissionSubmission('KamerverhuurVergunning');
    mockSubmission.logMockInfo();

    mockDBGetSubmission = jest.fn().mockResolvedValue(mockSubmission.mockedDatabaseGetSubmission);
    mockS3Get = jest.fn()
      .mockResolvedValueOnce(mockSubmission.getMockStorageSubmission())
      .mockResolvedValueOnce(mockSubmission.getMockStorageBlob());
    const spyOnFetch = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(getFetchMockResponse({ results: [] }) as any as Response) // GetZaak
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'someurl', zaakinformatieobjecten: [] }) as any as Response) //createZaak
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'someurl' }) as any as Response) //addZaakStatus
      .mockResolvedValueOnce(getFetchMockResponse({ bestandsdelen: [{ url: 'someurl' }], lock: 'bla' }) as any as Response) //documentenApi
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'someurl' }) as any as Response) //uploadfile
      .mockResolvedValueOnce(getFetchMockResponse({ statusCode: 204 }) as any as Response) //unlock
      .mockResolvedValueOnce(getFetchMockResponse({ url: 'someurl' }) as any as Response); //relateToZaak


    const rxMissionZgwHandler = new RxMissionZgwHandler(getRxMissionZgwConfiguration('development'));
    const { key, userId, userType } = mockSubmission.getSubmissionParameters();
    await rxMissionZgwHandler.sendSubmissionToRxMission(key, userId, userType);
    console.log('ALL CALLS MADE TO MAKE Kamerverhuuraanvraag');
    console.dir(spyOnFetch.mock.calls, { depth: null, colors: true, compact: false, showHidden: true });
  });
});

