
import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
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
    const bucketObjects = await this.getSubmissionsFromKeys(allKeys);
    const _csvFile: string = await this.compileCsvFile(bucketObjects);
    console.log('csv', _csvFile);

  }

  async getSubmissionsFromKeys(allKeys: string[]): Promise<GetObjectCommandOutput[]> {
    const bucketObjects: GetObjectCommandOutput[] = [];
    if (allKeys.length > 0) {
      for ( const key of allKeys) {
        const bucketObject = await this.storage.getBucketObject(key);
        if (!!bucketObject) {bucketObjects.push(bucketObject);} else {
          console.log('Formulier bestand niet opgehaald uit bucket met key: ', key);
        }
      }

    }
    return bucketObjects;
  }

  async compileCsvFile(bucketObjects: GetObjectCommandOutput[]): Promise<string> {
    const csvArray = [];
    const csvHeaders = ['Tijd', 'BSN', 'Naam', 'Voornamen', 'Achternaam', 'GeboorteDatum', 'NederlandseNationaliteit', 'Gemeente', 'Woonplaats', 'Adres'];
    csvArray.push(csvHeaders);

    for (const bucketObject of bucketObjects) {
      if (bucketObject.Body) {
        const bodyString = await bucketObject.Body.transformToString();
        const jsonData = JSON.parse(bodyString);
        const formData = JSON.parse(jsonData.Message);

        if (formData.formTypeId === 'ondersteuneninleidendverzoekreferendumjanuari2024' && !!formData.brpData) {
          const persoonsGegevens = formData.brpData.Persoon.Persoonsgegevens;
          const adresGegevens = formData.brpData.Persoon.Adres;
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
          console.log('Formulier niet verwerkt. FormTypeId: ', formData.formTypeId, ' brpDataObject: ', formData.brpData);
        }
      } else {
        //lege body
      }
    }
    let csvContent: string = '';

    csvArray.forEach(row => {
      csvContent += row.join(',') + '\n';
    });
    console.log('CsvContent: ', csvContent);
    return csvContent;

  }

}


