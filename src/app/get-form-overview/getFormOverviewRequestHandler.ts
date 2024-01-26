
import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { APIGatewayProxyResult } from 'aws-lambda';
import { S3Storage, Storage } from '../submission/Storage';

export class FormOverviewRequestHandler {
  private storage!: Storage;
  private downloadStorage!: Storage;
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
    return {
      statusCode: 200,
      body: csvFile,
      headers: {
        'Content-type': 'text/csv',
        'Content-Disposition': 'attachment;filename=referendumFormOverview.csv',
      },
    };

  }

  async getSubmissionsFromKeys(allKeys: string[]): Promise<GetObjectCommandOutput[]> {
    const getObjectPromises: Promise<any>[] = [];
    let bucketObjects: GetObjectCommandOutput[] = [];
    if (allKeys.length > 0) {
      for ( const key of allKeys) {
        getObjectPromises.push(this.storage.get(key));
      }
      bucketObjects = await Promise.all(getObjectPromises);
    }
    return bucketObjects;
  }

  async compileCsvFile(bucketObjects: GetObjectCommandOutput[]): Promise<string> {
    const csvArray = [];
    const csvHeaders = ['Tijd', 'BSN', 'Naam', 'Voornamen', 'Achternaam', 'GeboorteDatum', 'NederlandseNationaliteit', 'Gemeente', 'Woonplaats', 'Adres'];
    csvArray.push(csvHeaders);
    const failedCsvProcessing = [];
    for (const bucketObject of bucketObjects) {
      if (bucketObject.Body) {
        const bodyString = await bucketObject.Body.transformToString();
        const jsonData = JSON.parse(bodyString);
        const formData = JSON.parse(jsonData.Message);

        if (formData.formTypeId === 'ondersteuneninleidendverzoekreferendumjanuari2024' && !!formData.brpData) {

          const persoonsGegevens = formData.brpData.Persoon.Persoonsgegevens;
          const adresGegevens = formData.brpData.Persoon.Adres;
          console.log('Parsing csv for object', persoonsGegevens.Naam);
          const csvData = [
            jsonData.Timestamp,
            formData.bsn,
            persoonsGegevens.Naam,
            persoonsGegevens.Voornamen,
            persoonsGegevens.Achternaam,
            persoonsGegevens.Geboortedatum,
            persoonsGegevens.NederlandseNationaliteit,
            adresGegevens.Gemeente,
            adresGegevens.Woonplaats,
            `${adresGegevens.Straat} ${adresGegevens.Huisnummer} ${adresGegevens.Postcode}`,
          ];
          csvArray.push(csvData);
        } else {
          failedCsvProcessing.push(`FormTypeId: ${formData.formTypeId} brpDataObject: ${formData.brpData}`);
        }
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


