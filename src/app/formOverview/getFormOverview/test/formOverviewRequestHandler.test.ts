import { ApiGatewayV2Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { S3Storage } from '@gemeentenijmegen/utils';
import { DynamoDBDatabase, SubmissionData } from '../../../submission/Database';
import * as formDefinitionMockSportAanmelden from '../formDefinition/test/mockFormDefinitionAanmeldenSport.json';
import * as mockFormVolwassen01 from '../formParser/test/subm_raw_volwassene_01.json';
import { FormOverviewRequestHandler } from '../getFormOverviewRequestHandler';

let mockS3Get = jest.fn().mockResolvedValue({});
let mockS3GetBatch = jest.fn().mockResolvedValue([]);
let mockS3Store = jest.fn().mockResolvedValue(true);
let mockDBGetSubmissionsByFormName = jest.fn().mockResolvedValue([]);
let mockDBStoreFormOverview = jest.fn().mockResolvedValue(true);

jest.mock('@gemeentenijmegen/utils', () => {
  return {
    S3Storage: jest.fn(() => {
      return {
        get: mockS3Get,
        getBatch: mockS3GetBatch,
        store: mockS3Store,
      };
    }),
  };
});
jest.mock('../../../submission/Database', () => {
  return {
    DynamoDBDatabase: jest.fn(() => {
      return {
        getSubmissionsByFormName: mockDBGetSubmissionsByFormName,
      };
    }),
  };
});
jest.mock('../../database/FormOverviewDatabase', () => {
  return {
    DDBFormOverviewDatabase: jest.fn(() => {
      return {
        storeFormOverview: mockDBStoreFormOverview,
      };
    }),
  };
});

const originalEnv = process.env;
describe('FormOverviewRequestHandler Tests', () => {
  describe('env', () => {
    beforeEach(() => {
      jest.resetModules();
      process.env = {
        ...originalEnv,
        TABLE_NAME: 'MockTableName',
        BUCKET_NAME: 'MockBucketname',
        DOWNLOAD_BUCKET_NAME: 'MockDownloadbucketname',
        FORM_OVERVIEW_TABLE_NAME: 'MockFormOverviewTableName',
      };
    });
    afterEach(() => {
      process.env = originalEnv;
    });
    test('should instantiate', () => {
      expect(new FormOverviewRequestHandler()).toBeTruthy();
    });
    test('should setup', () => {
      new FormOverviewRequestHandler();
      expect(S3Storage).toHaveBeenCalledTimes(2);
      expect(DynamoDBDatabase).toHaveBeenCalled();
    });
    test('should throw error without event param', async () => {
      const formOverviewRequestHandler = new FormOverviewRequestHandler();
      await expect(
        formOverviewRequestHandler.handleRequest( { formuliernaam: '' } ),
      )
        .rejects.toThrow({ name: 'Error', message: 'Cannot retrieve formOverview without queryparam formuliernaam' });
    });
    describe('parsing happy flows', () => {
      test('should return 200 csv file without parse mocks', async () => {
        const logSpy = jest.spyOn(global.console, 'log').mockImplementation(() => {});
        mockDBGetSubmissionsByFormName.mockResolvedValue([{ key: 'S10.123123' }] as any as SubmissionData[]);
        // Gets mock from formDefinition test folder
        mockS3Get.mockResolvedValue({ Body: { transformToString: () => { return JSON.stringify(formDefinitionMockSportAanmelden); } } });
        mockS3GetBatch.mockResolvedValue([{ Body: { transformToString: () => { return JSON.stringify(mockFormVolwassen01); } } }]);
        const formOverviewRequestHandler = new FormOverviewRequestHandler();
        await expect(formOverviewRequestHandler.handleRequest({ formuliernaam: 'formuliernaam' })).resolves.toStrictEqual({
          cookies: undefined,
          statusCode: 200,
          body: expect.stringMatching(new RegExp('Csv has been saved in bucket as FormOverview-[0-9]*-aanmeldenSportactiviteit.csv')),
          headers: { 'Content-type': 'application/json' },
        } as ApiGatewayV2Response);
        expect(mockS3Store).toHaveBeenCalledWith(expect.stringContaining('aanmeldenSportactiviteit.csv'), expect.stringContaining('een volwassene (18 jaar of ouder);;;;;;;TestVoornaam01'));
        expect(logSpy).toHaveBeenCalledWith('Done processing csv file. Number of processed rows: 1. Number of failed csv transformations: 0. Number of header and form fields length mismatches:  0.');
        logSpy.mockRestore();
      });
    });
    describe('database non-happy flows', () => {
      test('should return 204 no content without database results', async () => {
        mockDBGetSubmissionsByFormName.mockResolvedValue([] as SubmissionData[]);
        const formOverviewRequestHandler = new FormOverviewRequestHandler();
        await expect(formOverviewRequestHandler.handleRequest({ formuliernaam: 'formuliernaam' })).resolves.toStrictEqual({ statusCode: 204 } as ApiGatewayV2Response);

      });
      test('should throw error when databaseresult is false', async () => {
        mockDBGetSubmissionsByFormName.mockResolvedValue(false);
        const formOverviewRequestHandler = new FormOverviewRequestHandler();
        await expect(formOverviewRequestHandler.handleRequest({ formuliernaam: 'formuliernaam' })).rejects.toThrow({ name: 'error', message: 'Cannot retrieve formOverview. DatabaseResult is false or not the expected array.' });
      });
      test('should throw an error when databaseresult is not an array ', async() => {
        mockDBGetSubmissionsByFormName.mockResolvedValue('weird unexpected response');
        const formOverviewRequestHandler = new FormOverviewRequestHandler();
        await expect(formOverviewRequestHandler.handleRequest({ formuliernaam: 'formuliernaam' })).rejects.toThrow({ name: 'error', message: 'Cannot retrieve formOverview. DatabaseResult is false or not the expected array.' });
      });
    });
  });
  describe('setup errors', () => {
    beforeEach(() => {
      jest.resetModules();
    });
    afterEach(() => {
      process.env = originalEnv;
    });
    test('tablename error', () => {
      process.env = {
        ...originalEnv,
        BUCKET_NAME: 'MockBucketname',
        DOWNLOAD_BUCKET_NAME: 'MockDownloadbucketname',
        FORM_OVERVIEW_TABLE_NAME: 'MockFormOverviewTableName',
      };
      expect(() => {new FormOverviewRequestHandler();}).toThrow({ name: 'error', message: 'No submissions table NAME provided, retrieving submissions will fail.' });
    });
    test('bucketname error', () => {
      process.env = {
        ...originalEnv,
        TABLE_NAME: 'MockTableName',
        DOWNLOAD_BUCKET_NAME: 'MockDownloadbucketname',
        FORM_OVERVIEW_TABLE_NAME: 'MockFormOverviewTableName',
      };
      expect(() => {new FormOverviewRequestHandler();}).toThrow({ name: 'error', message: 'No bucket NAME provided, retrieving submissions will fail.' });
    });
    test('downloadbucketname error', () => {
      process.env = {
        ...originalEnv,
        TABLE_NAME: 'MockTableName',
        BUCKET_NAME: 'MockBucketname',
        FORM_OVERVIEW_TABLE_NAME: 'MockFormOverviewTableName',
      };
      expect(() => {new FormOverviewRequestHandler();}).toThrow({ name: 'error', message: 'No download bucket NAME provided, storing formOverview will fail.' });
    });
    test('formoverviewtable error', () => {
      process.env = {
        ...originalEnv,
        TABLE_NAME: 'MockTableName',
        BUCKET_NAME: 'MockBucketname',
        DOWNLOAD_BUCKET_NAME: 'MockDownloadbucketname',
      };
      expect(() => {new FormOverviewRequestHandler();}).toThrow({ name: 'error', message: 'No form overview table NAME provided, storing formOverview metadata will fail.' });
    });
  });
});
