import {
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2Request,
  ListObjectsV2Output,
  S3Client,
  GetObjectCommandOutput,
  GetObjectCommandInput,
} from '@aws-sdk/client-s3';

export interface Storage {
  store(key: string, contents: string): Promise<boolean>;
  copy(
    sourceBucket: string,
    sourceKey: string,
    sourceRegion: string,
    destinationKey: string
  ): Promise<boolean>;
  get(bucket: string, key: string): Promise<boolean>;
  getBucketObject(key: string): Promise<GetObjectCommandOutput| undefined>;
  searchAllObjectsByShortKey(searchKey: string): Promise<string[]>;
}

export class MockStorage implements Storage {
  private bucket?: string;

  constructor(bucket?: string) {
    this.bucket = bucket;
  }
  getBucketObject( key: string): Promise<GetObjectCommandOutput | undefined> {
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
    console.debug(
      `Storing ${key} with contents of size ${contents.length} to ${this.bucket}`,
    );
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
      console.debug(
        `successfully got ${object} of size ${object.Body?.transformToByteArray.length}`,
      );
      return true;
    } catch (err) {
      console.error(err);
    }
    return false;
  }

  //TODO: afstemmen en wijzigen
  public async getBucketObject( key: string): Promise<GetObjectCommandOutput| undefined> {
    console.log(`[getBucketObject] Aangeroepen met ${key}`);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    } as GetObjectCommandInput);

    try {
      console.log('[GetObjectBucket] command:', command);
      const object: GetObjectCommandOutput = await this.s3Client.send(command);
      console.log(
        `successfully got ${object} of size ${object.Body?.transformToByteArray.length}`,
      );
      return object;
    } catch (err) {
      console.error(err);
    }
    return undefined;

  }

  public async copy(
    sourceBucket: string,
    sourceKey: string,
    sourceRegion: string,
    destinationKey: string,
  ) {
    console.debug(
      `copying ${sourceKey} in ${sourceRegion} to ${destinationKey}`,
    );
    const getObjectCommand = new GetObjectCommand({
      Bucket: sourceBucket,
      Key: sourceKey,
    });
    try {
      const object = await this.clientForRegion(sourceRegion).send(
        getObjectCommand,
      );
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
    console.debug(
      `successfully copied ${sourceBucket}/${sourceKey} to ${destinationKey}`,
    );
    return true;
  }

  public async searchAllObjectsByShortKey(
    searchKey: string,
  ): Promise<string[]> {
    console.info(
      `start searching all objects with listV2Object with searchkey ${searchKey}`,
    );

    const allKeys: string[] = [];
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: searchKey,
    } as ListObjectsV2Request);

    // try {
    let isTruncated: boolean = true;

    while (isTruncated) {
      console.log('In while isTruncated loop');
      const listObjectsV2Output: ListObjectsV2Output =
          await this.s3Client.send(command);
      //TODO: make submission.json are variable and change the function name
      listObjectsV2Output.Contents?.filter((contents) => contents.Key?.includes('submission.json') ).map((contents) => {
        contents.Key ? allKeys.push(contents?.Key) : console.log(
          '[searchAllObjectsByShortKey] Individual key not found and not added to allKeys.',
        );
      });
      isTruncated = !!listObjectsV2Output.IsTruncated;
      command.input.ContinuationToken =
          listObjectsV2Output.NextContinuationToken;
    }
    // } catch (err) {
    //   console.error(err);
    // }
    console.info(
      `[searchAllObjectsByShortKey] Found ${allKeys.length} bucket objects with prefix ${searchKey}`,
    );
    return allKeys;
  }

  private clientForRegion(region: string): S3Client {
    if (!this.clients[region]) {
      this.clients[region] = new S3Client({ region: region });
    }
    return this.clients[region];
  }
}
