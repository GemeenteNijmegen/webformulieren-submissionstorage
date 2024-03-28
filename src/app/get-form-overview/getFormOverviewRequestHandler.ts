
import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { APIGatewayProxyResult } from 'aws-lambda';
import { S3Storage, Storage } from '../submission/Storage';

export class FormOverviewRequestHandler {
  private storage!: Storage;
  private downloadStorage!: Storage;
  private searchKey = 'DMS';

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
    if (process.env.BUCKET_NAME == undefined || process.env.DOWNLOAD_BUCKET_NAME == undefined) {
      throw Error('No bucket NAME provided, retrieving forms will fail');
    }
    this.storage = new S3Storage(process.env.BUCKET_NAME);
    this.downloadStorage = new S3Storage(process.env.DOWNLOAD_BUCKET_NAME);
  }

  async handleRequest(message: any): Promise<APIGatewayProxyResult> {
    console.log(`Message not used yet ${message}, using constant searchKey ${this.searchKey}`);
    const storage = this.storage;
    const allKeys = await storage.searchAllObjectsByShortKey(this.searchKey);
    const bucketObjects = await this.getSubmissionsFromKeys(allKeys);
    const csvFile: string = await this.compileCsvFile(bucketObjects);
    await this.downloadStorage.store('referendumFormOverview.csv', csvFile);
    const epochTime = new Date().getTime();
    return {
      statusCode: 200,
      body: csvFile,
      headers: {
        'Content-type': 'text/csv',
        'Content-Disposition': `attachment;filename=FormOverview-${epochTime}.csv`,
      },
    };

  }

  async getSubmissionsFromKeys(allKeys: string[]): Promise<GetObjectCommandOutput[]> {
    return this.storage.getBatch(allKeys);
  }

  async compileCsvFile(bucketObjects: GetObjectCommandOutput[]): Promise<string> {
    const csvArray = [];
    const csvHeaders = ['Formuliernaam', 'DatumTijdOntvangen', 'Kenmerk'];
    csvArray.push(csvHeaders);
    const failedCsvProcessing = [];
    for (const bucketObject of bucketObjects) {
      if (bucketObject.Body) {
        const bodyString = await bucketObject.Body.transformToString();
        const jsonData = JSON.parse(bodyString);
        const jsonMessage = JSON.parse(jsonData.Message);
        const csvData = [
          jsonMessage.formTypeId,
          jsonData.Timestamp,
          jsonMessage.reference,
        ];
        csvArray.push(csvData);

      } else {
        failedCsvProcessing.push(`Geen body. Mogelijk metadata requestId: ${bucketObject.$metadata.requestId}`);
      }
    }
    let csvContent: string = '';

    csvArray.forEach(row => {
      csvContent += row.join(',') + '\n';
    });
    console.log('Aantal verwerkte csv rijen: ', (csvArray.length - 1));
    console.log('Failed csv transformations. Count: ', failedCsvProcessing.length, ' Objects failed: ', failedCsvProcessing);

    return csvContent;
  }

}


