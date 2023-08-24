import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface Storage {
  store(key: string, contents: string): Promise<boolean>;
  copy(sourceBucket: string, sourceKey: string, sourceRegion: string, destinationKey: string): Promise<boolean>;
  get(bucket: string, key: string): Promise<boolean>;
}

export class MockStorage implements Storage {
  private bucket?: string;

  constructor(bucket?: string) {
    this.bucket = bucket;
  }
  public async get(bucket: string, key: string) {
    console.debug(`would get ${key} from ${bucket}`);
    return true;
  }

  public async store(key: string, contents: string) {
    console.debug(`would store ${key} with contents of size ${contents.length} to ${this.bucket}`);
    return true;
  }

  public async copy(sourceBucket: string, sourceKey: string, sourceRegion: string, destinationKey: string) {
    console.debug(`would copy ${sourceBucket}/${sourceKey} in ${sourceRegion} to ${destinationKey}`);
    return true;
  }
}

export class S3Storage implements Storage {
  private bucket: string;
  private s3Client: S3Client;
  private clients: any = {
    default: new S3Client({}),
  };

  constructor(bucket: string) {
    this.bucket = bucket;
    this.s3Client = new S3Client({});
  }

  public async store(key: string, contents: string) {
    console.debug(`Storing ${key} with contents of size ${contents.length} to ${this.bucket}`);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: contents,
      ServerSideEncryption: 'aws:kms',
    });
    try {
      await this.s3Client.send(command);
      console.debug(`successfully stored ${key}`);
    } catch (err) {
      console.error(err);
    }
    return true;
  }

  public async get(bucket: string, key: string) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    try {
      const object = await this.s3Client.send(command);
      console.debug(`successfully got ${object} of size ${object.Body?.transformToByteArray.length}`);
      return true;
    } catch (err) {
      console.error(err);
    }
    return false;
  }

  public async copy(sourceBucket: string, sourceKey: string, sourceRegion: string, destinationKey: string) {
    console.debug(`copying ${sourceKey} in ${sourceRegion} to ${destinationKey}`);
    const getObjectCommand = new GetObjectCommand({
      Bucket: sourceBucket,
      Key: sourceKey,
    });
    try {
      const object = await this.clientForRegion(sourceRegion).send(getObjectCommand);
      const putObjectCommand = new PutObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        Body: object.Body,
        // Request needs to know length to accept a stream: https://github.com/aws/aws-sdk-js/issues/2961#issuecomment-1580901710
        ContentLength: object.ContentLength,
      });
      await this.clients.default.send(putObjectCommand);
    } catch (err) {
      console.error(err);
    }
    console.debug(`successfully copied ${sourceBucket}/${sourceKey} to ${destinationKey}`);
    return true;
  }

  private clientForRegion(region: string): S3Client {
    if (!this.clients[region]) {
      this.clients[region] = new S3Client({ region: region });
    }
    return this.clients[region];
  }
}
