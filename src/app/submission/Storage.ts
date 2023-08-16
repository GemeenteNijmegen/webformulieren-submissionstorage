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

  constructor(bucket: string, regions?: string[]) {
    this.bucket = bucket;
    if (regions) {
      for (let region of regions) {
        this.clients[region] = new S3Client({ region });
      }
    }
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
      const object = await this.clients[sourceRegion].send(getObjectCommand);
      const putObjectCommand = new PutObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        Body: object.Body,
      });
      await this.clients.default.send(putObjectCommand);
    } catch (err) {
      console.error(err);
    }
    console.debug(`successfully copied ${sourceBucket}/${sourceKey} to ${destinationKey}`);
    return true;
  }
}
