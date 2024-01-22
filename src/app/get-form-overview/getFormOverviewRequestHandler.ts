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
    await this.getSubmissionsFromKeys(allKeys);
  }

  async getSubmissionsFromKeys(allKeys: string[]) {
    console.log(`[getSubmissionFromKeys] begin functie met ${allKeys}`);
    if (allKeys.length > 0) {

      const csvArray = [];
      const csvHeaders = ['Tijd', 'BSN', 'Naam', 'GeboorteDatum', 'NederlandseNationaliteit', 'Gemeente', 'Woonplaats'];
      csvArray.push(csvHeaders);
      for ( const key of allKeys) {
        const bucketObject = await this.storage.getBucketObject(key);
        if (!!bucketObject?.Body) {
          const bodyString = await bucketObject.Body.transformToString();
          const jsonData = JSON.parse(bodyString);
          const formData = JSON.parse(jsonData.Message);
          const persoonsGegevens = formData.brpData.Persoonsgegevens;
          const adresGegevens = formData.brpData.Adres;
          console.log(`[getSubmissionFromKeys] foreach ${key}, JSON data`, jsonData);
          const csvData = [
            jsonData.Timestamp,
            formData.bsn,
            persoonsGegevens.Naam,
            persoonsGegevens.Geboortedatum,
            persoonsGegevens.NederlandseNationaliteit,
            adresGegevens.Gemeente,
            adresGegevens.Woonplaats,
          ];
          csvArray.push(csvData);

        }
      }
      console.log('[getSubmissionFromKeys] getBucketObject foreach has been executed');
      console.log('csvData? ', csvArray);
    }
  }


}


