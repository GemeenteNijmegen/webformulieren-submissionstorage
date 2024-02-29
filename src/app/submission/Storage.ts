import {
  GetObjectCommand,
  GetObjectCommandInput,
  GetObjectCommandOutput,
  ListObjectsV2Command,
  ListObjectsV2Output,
  ListObjectsV2Request,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  getSignedUrl,
} from '@aws-sdk/s3-request-presigner';
export interface Storage {
  store(key: string, contents: string): Promise<boolean>;
  copy(
    sourceBucket: string,
    sourceKey: string,
    sourceRegion: string,
    destinationKey: string
  ): Promise<boolean>;
  get(key: string): Promise<GetObjectCommandOutput| undefined>;
  getBatch( keys: string[]): Promise<GetObjectCommandOutput[]>;
  searchAllObjectsByShortKey(searchKey: string): Promise<string[]>;
}

export class S3Storage implements Storage {
  private bucket: string;
  private s3Client: S3Client;
  private clients: any = {
    default: new S3Client({}),
  };

  constructor(bucket: string, config?: { client?: S3Client }) {
    this.bucket = bucket;
    this.s3Client = config?.client ?? new S3Client({});
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
      return false;
    }
    return true;
  }

  public async get( key: string): Promise<GetObjectCommandOutput | undefined > {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    } as GetObjectCommandInput );
    try {
      const bucketObject = await this.s3Client.send(command);
      return bucketObject;
    } catch (err) {
      console.error(`getBucketObject failed for key ${key} with error: `, err);
      return undefined;
    }
  }

  public async getBatch( keys: string[]): Promise<GetObjectCommandOutput[]> {
    const promises = keys.map((key) => this.get(key));
    const results = await Promise.allSettled(promises);
    const bucketObjects = (results.filter((result, index) => {
      if (result.status == 'rejected') {
        console.log(`object ${keys[index]} in batch failed: ${result.reason}`);
      }
      return result.status == 'fulfilled' && result.value;
    }) as PromiseFulfilledResult<GetObjectCommandOutput>[]);
    return bucketObjects.map(bucketObject => bucketObject.value);
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

  public getPresignedUrl(key: string) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.clients.default, command, { expiresIn: 5 });
  }

  private clientForRegion(region: string): S3Client {
    if (!this.clients[region]) {
      this.clients[region] = new S3Client({ region: region });
    }
    return this.clients[region];
  }
}
