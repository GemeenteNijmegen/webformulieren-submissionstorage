import { S3Client } from '@aws-sdk/client-s3';
import { MockStorage } from './MockStorage';
import { describeIntegration } from '../../test-utils/describeIntegration';
import { S3Storage } from '../Storage';


describe('Storage methods', () => {
  const storage = new MockStorage('mockBucketName');
  test('Store method returns succesfully', async () => {
    expect(await storage.store('somekey', 'textcontents')).toBeTruthy();
  });

  test('Copy method returns succesfully', async () => {
    expect(await storage.copy('somebucket', 'somekey', 'eu-central-1', 'somekey')).toBeTruthy();
  });

  test('Get method returns succesfully', async () => {
    expect(await storage.get('somekey')).toBeTruthy();
  });

  test('Get Batch method returns succesfully', async () => {
    expect(await storage.getBatch(['somekey', 'anotherkey'])).toBeTruthy();
  });
});

describeIntegration('S3 integration tests', () => {
  const client = new S3Client({
    endpoint: 'http://localhost:4566',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
    forcePathStyle: true,
  });
  const localS3Storage = new S3Storage('test-bucket', { client });

  beforeEach(async () => {
    await localS3Storage.store('alwaysPresentObjectKey', 'textcontents');
  });


  test('Store method returns succesfully', async () => {
    expect(await localS3Storage.store('somekey', 'textcontents')).toBeTruthy();
  });

  test('Get method returns succesfully', async () => {
    const result = await localS3Storage.get('alwaysPresentObjectKey');
    expect(result?.Body).toBeTruthy();
  });

  test('Get batch returns succesfully', async () => {
    const result = await localS3Storage.getBatch(['alwaysPresentObjectKey']);
    expect(result).toHaveLength(1);

    const resultWithMissing = await localS3Storage.getBatch(['alwaysPresentObjectKey', 'nonexistentkey']);
    expect(resultWithMissing).toHaveLength(1);
  });

});
