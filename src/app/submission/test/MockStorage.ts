import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { Storage } from '../Storage';


export class MockStorage implements Storage {
  private bucket?: string;

  constructor(bucket?: string) {
    this.bucket = bucket;
  }

  searchAllObjectsByShortKey(searchKey: string): Promise<string[]> {
    throw new Error(`MockStorage with ${searchKey}`);
  }

  public async get(key: string): Promise<GetObjectCommandOutput | undefined> {
    console.debug(`would get ${key} from ${this.bucket}`);
    return {} as GetObjectCommandOutput;
  }
  public async getBatch(keys: string[]): Promise<GetObjectCommandOutput[]> {
    console.debug(`would get ${keys.length} objects from ${this.bucket}`);
    return [] as GetObjectCommandOutput[];
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
