import { S3Storage, Storage } from '../submission/Storage';

export class FormOverviewRequestHandler {
  private storage!: Storage;
  private searchKey = 'PU2';

  constructor() {
    this.setup();
    if (!this.storage) {
      throw Error('Storage empty');
    }
  }

  /**
   * Check for required environment variables, and create
   * storage and database objects to pass to handler.
   */
  private setup() {
    if (process.env.BUCKET_NAME == undefined) {
      throw Error('No bucket NAME provided, retrieving forms will fail');
    }
    this.storage = new S3Storage(process.env.BUCKET_NAME);
  }

  async handleRequest(message: any) {
    console.log(`Message not used yet ${message}, using constant searchKey ${this.searchKey}`);
    const storage = this.storage;
    const allKeys = await storage.searchAllObjectsByShortKey(this.searchKey);
    await this.getSubmissionFromKeys(allKeys);
    // retrieve forms with a certain key from bucket
  }

  async getSubmissionFromKeys(allKeys: string[]) {
    console.log(`[getSubmissionFromKeys] begin functie met ${allKeys}`);
    if (allKeys.length > 0) {
      console.log('[getSubmissionFromKeys] er zijn keys');

      console.log('[getSubmissionFromKeys] Promise.all callback starts');

      const bucketObjects: any[] = [];

      for ( const key of allKeys) {
        const bucketObject = await this.storage.getBucketObject(key);
        if (!!bucketObject?.Body) {
          console.log(`[getSubmissionFromKeys] foreach ${key}, processing complete`);
          const bodyString = await bucketObject.Body.transformToString();
          const data = JSON.parse(bodyString);
          console.log(`[getSubmissionFromKeys] foreach ${key}, JSON data`, data);
          bucketObjects.push(bucketObject);
        }
      }
      // await Promise.all(
      //   allKeys.map(async (key) => {
      //     console.log(`[getSubmissionFromKeys] foreach ${key}, start processing`);
      //     const bucketObject = await this.storage.getBucketObject(key);

      //     if (!!bucketObject?.Body) {
      //       console.log(`[getSubmissionFromKeys] foreach ${key}, processing complete`);
      //       const bodyString = await bucketObject.Body.transformToString();
      //       const data = JSON.parse(bodyString);
      //       console.log(`[getSubmissionFromKeys] foreach ${key}, JSON data`, data);
      //       bucketObjects.push(bucketObject); // Correct cast
      //     }

      //     console.log(`[getSubmissionFromKeys] foreach ${key}, processing complete, pushing object`);
      //   }),
      // );

      console.log('[getSubmissionFromKeys] Promise.all callback completes');
      console.log('[getSubmissionFromKeys] getBucketObject foreach has been executed');
    }
  }


}

