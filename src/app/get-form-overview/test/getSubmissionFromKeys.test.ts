import { FORM_FILE_MOCK_WITH_BRP_FORM_REFERENDUM_01, FORM_FILE_MOCK_WITH_BRP_NOT_FORM_REFERENDUM_02, FORM_FILE_MOCK_WITHOUT_BRP_WITH_REFERENDUM_03 } from './formResponse.mock';
import { S3Storage } from '../../submission/Storage';
import { FormOverviewRequestHandler } from '../getFormOverviewRequestHandler';

let mockSearchAllObjectsByShortKey = jest.fn();
let mockGetBucketObject = jest.fn();

const describeIntegration = process.env.JEST_RUN_INTEGRATION_TESTS ? describe : describe.skip;

jest.mock('../../submission/Storage', () => {

  return {
    S3Storage: jest.fn(() => {
      return {
        searchAllObjectsByShortKey: mockSearchAllObjectsByShortKey,
        getBucketObject: mockGetBucketObject,
      };
    }),
  };


},

);

const originalEnv = process.env;
describeIntegration('getSubmissionFromKeysTests', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      BUCKET_NAME: 'My_mocked_bucketname',
    };
  });
  afterEach(() => {
    process.env = originalEnv;
  });
  it('should setup a new FormOverviewRequestHandler', () => {
    new FormOverviewRequestHandler();
    expect(S3Storage).toHaveBeenCalled();
  });
  it('should call a mock searchAllObjectsByShortKey and return an array of keys', async () => {
    const expectedObjectKeys = [
      'PU219.872/submission.json',
      'PU219.874/submission.json',
      'PU219.892/submission.json',
    ];
    mockSearchAllObjectsByShortKey.mockResolvedValue(expectedObjectKeys);
    mockGetBucketObject.mockReturnValueOnce( {
      Body: {
        transformToString:
         () => { return JSON.stringify(FORM_FILE_MOCK_WITH_BRP_FORM_REFERENDUM_01); },
      },
    })
      .mockReturnValueOnce({ Body: { transformToString: () => { return JSON.stringify(FORM_FILE_MOCK_WITH_BRP_NOT_FORM_REFERENDUM_02); } } })
      .mockReturnValueOnce({ Body: { transformToString: () => { return JSON.stringify(FORM_FILE_MOCK_WITHOUT_BRP_WITH_REFERENDUM_03); } } });


    const formOverviewRequestHandler = new FormOverviewRequestHandler();
    await formOverviewRequestHandler.handleRequest('');

  });


});