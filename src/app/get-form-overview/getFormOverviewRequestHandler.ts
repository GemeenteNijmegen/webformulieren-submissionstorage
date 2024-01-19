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
        this.getSubmissionFromKeys(allKeys).catch((err) => console.log('getFormOverviewRequestHandler - this.getSubmission] error catch ', err));
      },
      )
      .catch(() =>
        console.log(
          '[getFormOverviewRequestHandler - handleRequest] searchAllObjectsByShortKey catch',
        ),
      );
    // retrieve forms with a certain key from bucket


  }
  async getSubmissionFromKeys(allKeys: string[]): Promise<void> {
    console.log(`[getSubmissionFromKeys] begin functie met ${allKeys}`);
    // const streamToString = (stream:any) =>
    //   new Promise((resolve, reject) => {
    //     console.log('In stream to string');
    //     const chunks: any[] = [];
    //     stream.on('data', (chunk: any) => chunks.push(chunk));
    //     stream.on('error', reject);
    //     stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    //   });


    if (allKeys.length > 0) {
      console.log('[getSubmissionFromKeys] er zijn keys, de eerste is');

      // allKeys.forEach(async (key) => {
      //   console.log(`[getSubmissionFromKeys] foreach ${key}`);
      //   const bucketObject = await this.storage.getBucketObject(key);
      //   console.log('BucketObjectBody? 01', !!bucketObject?.Body);
      //   console.log('BucketObjectBody? 0', !!bucketObject?.Body);
      //   if (!!bucketObject?.Body) {
      //     // const bodyContents: string = await streamToString(bucketObject?.Body) as string;
      //     const bodyString = await bucketObject.Body.transformToString();
      //     const data = JSON.parse(bodyString);
      //     console.log('JSON data? ', data);
      //     // Manipulate the JSON data here

      //   }
      // });


      await Promise.all(
        allKeys.map(async key => {
          console.log(`[getSubmissionFromKeys] foreach ${key}`);
          const bucketObject = await this.storage.getBucketObject(key);

          if (!!bucketObject?.Body) {
            // const bodyContents: string = await streamToString(bucketObject.Body) as string;
            const bodyString = await bucketObject.Body.transformToString();
            const data = JSON.parse(bodyString);
            console.log('JSON data', data);
            // Manipulate the JSON data here
          }
        }),
      );


    }

    console.log('[getSubmissionFromKeys] getBucketObject foreach has been executed' );
  }
}

