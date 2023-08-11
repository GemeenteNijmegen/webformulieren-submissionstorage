import { CopyObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface Storage {
  store(key: string, contents: string): Promise<boolean>;
  copy(source: string, destinationKey: string): Promise<boolean>;
}

export class MockStorage implements Storage {
  private bucket?: string;

  constructor(bucket?: string) {
    this.bucket = bucket;
  }

  public async store(key: string, contents: string) {
    console.debug(`would store ${key} with contents of size ${contents.length} to ${this.bucket}`);
    return true;
  }

  public async copy(source: string, destinationKey: string) {
    console.debug(`would copy ${source} to ${destinationKey}`);
    return true;
  }
}

export class S3Storage implements Storage {
  private bucket: string;
  private s3Client: S3Client;

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

  public async copy(source: string, destinationKey: string) {
    console.debug(`copying ${source} to ${destinationKey}`);
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      Key: destinationKey,
      CopySource: source
    });
    try {
      await this.s3Client.send(command);
    } catch (err) {
      console.error(err);
    }
    console.debug(`successfully copied ${source} to ${destinationKey}`);
    return true;
  }
}
