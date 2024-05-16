import { ApiGatewayV2Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { DynamoDBDatabase, SubmissionData } from '../../submission/Database';
import { S3Storage } from '../../submission/Storage';
import { FormOverviewRequestHandler } from '../getFormOverviewRequestHandler';

let mockS3GetBatch = jest.fn().mockResolvedValue([]);
let mockS3Store = jest.fn().mockResolvedValue(true);
let mockDBGetSubmissionsByFormName = jest.fn().mockResolvedValue([]);

jest.mock('../../submission/Storage', () => {
  return {
    S3Storage: jest.fn(() => {
      return {
        getBatch: mockS3GetBatch,
        store: mockS3Store,
      };
    }),
  };
});
jest.mock('../../submission/Database', () => {
  return {
    DynamoDBDatabase: jest.fn(() => {
      return {
        getSubmissionsByFormName: mockDBGetSubmissionsByFormName,
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
    describe('parsing happyflows', () => {});
    describe('database', () => {
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
    describe('formdefinition parsing', () => {});
    describe('csv parsing', () => {});


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
      };
      expect(() => {new FormOverviewRequestHandler();}).toThrow({ name: 'error', message: 'No table NAME provided, retrieving submissions will fail.' });
    });
    test('bucketname error', () => {
      process.env = {
        ...originalEnv,
        TABLE_NAME: 'MockTableName',
        DOWNLOAD_BUCKET_NAME: 'MockDownloadbucketname',
      };
      expect(() => {new FormOverviewRequestHandler();}).toThrow({ name: 'error', message: 'No bucket NAME provided, retrieving submissions will fail.' });
    });
    test('downloadbucketname error', () => {
      process.env = {
        ...originalEnv,
        TABLE_NAME: 'MockTableName',
        BUCKET_NAME: 'MockBucketname',
      };
      expect(() => {new FormOverviewRequestHandler();}).toThrow({ name: 'error', message: 'No download bucket NAME provided, storing formOverview will fail.' });
    });
  });
});
