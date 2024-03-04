import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { LocalstackContainer } from '@testcontainers/localstack';
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
  let localS3Storage: S3Storage;
  let client: S3Client;
  const bucketCommandInput = {
    Bucket: 'test-bucket',
  };
  beforeAll(async() => {
    const container = await new LocalstackContainer().start();
    console.debug('container url', container.getConnectionUri());
    client = new S3Client({
      endpoint: container.getConnectionUri(),
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
      forcePathStyle: true,
    });
    localS3Storage = new S3Storage('test-bucket', { client });


    const command = new CreateBucketCommand(bucketCommandInput);

    const createBucketResponse = await client.send(command);
    expect(createBucketResponse.$metadata.httpStatusCode).toEqual(200);
  });


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

  test('Create presigned url for object', async() => {
    const result = await localS3Storage.getPresignedUrl('alwaysPresentObjectKey');
    expect(result).toMatch(/X-Amz-Signature=/);
  });

});
