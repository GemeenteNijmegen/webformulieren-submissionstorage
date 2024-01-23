import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { Storage } from '../Storage';


export class MockStorage implements Storage {
  private bucket?: string;

  constructor(bucket?: string) {
    this.bucket = bucket;
  }
  getBucketObject(key: string): Promise<GetObjectCommandOutput | undefined> {
    throw new Error(`MockStorage with ${key}`);
  }
  searchAllObjectsByShortKey(searchKey: string): Promise<string[]> {
    throw new Error(`MockStorage with ${searchKey}`);
  }
  public async get(bucket: string, key: string) {
    console.debug(`would get ${key} from ${bucket}`);
    return true;
  }

  public async store(key: string, contents: string) {
    console.debug(
      `would store ${key} with contents of size ${contents.length} to ${this.bucket}`,
    );
    return true;
  }

  public async copy(
    sourceBucket: string,
    sourceKey: string,
    sourceRegion: string,
    destinationKey: string,
  ) {
    console.debug(
      `would copy ${sourceBucket}/${sourceKey} in ${sourceRegion} to ${destinationKey}`,
    );
    return true;
  }
}
