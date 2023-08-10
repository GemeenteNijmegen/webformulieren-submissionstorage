import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface Storage {
  store(key: string, contents: string): Promise<boolean>;
  copy(source: string, destination: string): Promise<boolean>;
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

  public async copy(source: string, destination: string) {
    console.debug(`would copy ${source} to ${destination}`);
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
    } catch (err) {
      console.error(err);
    }
    return true;
  }

  public async copy(source: string, destination: string) {
    console.debug(`would copy ${source} to ${destination}`);
    return false;
  }
}
