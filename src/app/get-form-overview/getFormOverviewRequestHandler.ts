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
    await storage
      .searchAllObjectsByShortKey(this.searchKey)
      .then((allKeys) => {
        console.log(
          'Keys returned: ',
          allKeys.length,
          ' first key: ',
          allKeys[0],
        );
        this.getSubmissionFromKeys(allKeys);
      },
      )
      .catch(() =>
        console.log(
          '[getFormOverviewRequestHandler - handleRequest] searchAllObjectsByShortKey catch',
        ),
      );
    // retrieve forms with a certain key from bucket


  }
  getSubmissionFromKeys(allKeys: string[]): void {
    if (allKeys[0]) {
      this.storage.getBucketObject(allKeys[0]).then((submission) => console.log('The submission json retrieved', submission)).catch(() => console.log('[getFormOverviewRequestHandler - getObjectBucket] could not retrieve submission.json catch Promise'));
    }
  }
}

