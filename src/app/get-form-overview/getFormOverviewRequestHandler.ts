
import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { ApiGatewayV2Response } from '@gemeentenijmegen/apigateway-http';
import { FormDefinitionParser } from './formDefinition/FormDefinitionParser';
import { FormParser } from './formParser/FormParser';
import { EventParameters } from './parsedEvent';
import { Database, DynamoDBDatabase } from '../submission/Database';
import { S3Storage, Storage } from '../submission/Storage';

export class FormOverviewRequestHandler {
  private storage!: Storage;
  private downloadStorage!: Storage;
  private database: Database;

  constructor() {
    const environment = this.getEvironmentVariables();
    [this.database, this.storage, this.downloadStorage] = this.setup(environment);
  }

  private getEvironmentVariables() {
    if (process.env.TABLE_NAME == undefined) {
      throw Error('No table NAME provided, retrieving submissions will fail.');
    }
    if (process.env.BUCKET_NAME == undefined) {
      throw Error('No bucket NAME provided, retrieving submissions will fail.');
    }
    if (process.env.DOWNLOAD_BUCKET_NAME == undefined) {
      throw Error('No bucket NAME provided, storing formOverview will fail.');
    }
    return {
      tableName: process.env.TABLE_NAME,
      bucketName: process.env.BUCKET_NAME,
      downloadBucketName: process.env.DOWNLOAD_BUCKET_NAME,
    };
  }

  private setup(environment: {tableName: string; bucketName: string; downloadBucketName: string} ): [Database, Storage, Storage] {
    const database = new DynamoDBDatabase(environment.tableName);
    const storage = new S3Storage(environment.bucketName);
    const downloadStorage = new S3Storage(environment.downloadBucketName);
    return [database, storage, downloadStorage];
  }

  async handleRequest(params:EventParameters): Promise<ApiGatewayV2Response> {

    const { submissions, formdefinition } = await this.getFormSubmissionsDatabase(params);
    const formDefinition: GetObjectCommandOutput | undefined = await this.storage.get(formdefinition);

    const formDefinitionString = await formDefinition!.Body!.transformToString();
    const formDefinitionJSON = JSON.parse(formDefinitionString);
    const parsedFormDefinition = new FormDefinitionParser(formDefinitionJSON);
    const formParser = new FormParser(parsedFormDefinition.getParsedFormDefinition());
    const bucketObjects = await this.getSubmissionsFromKeys(submissions);

    const csvFile: string = await this.compileCsvFile(bucketObjects, formParser);
    const epochTime = new Date().getTime();
    const csvFilenName = `FormOverview-${epochTime}-${parsedFormDefinition.allMetadata.formName}.csv`;
    await this.downloadStorage.store(csvFilenName, csvFile);
    return {
      statusCode: 200,
      body: csvFile,
      headers: {
        'Content-type': 'text/csv',
        'Content-Disposition': `attachment;filename=${csvFilenName}`,
      },
    };
  }

  async getFormSubmissionsDatabase(params: EventParameters): Promise<{submissions:string[]; formdefinition: string}> {
    if (!params.formuliernaam) {
      throw Error('Cannot retrieve formOverview without queryparam formuliernaam');
    }
    const databaseResult = await this.database.getSubmissionsByFormName({ formName: params.formuliernaam });
    if (!databaseResult || !Array.isArray(databaseResult) || !databaseResult.length) {
      throw Error('Cannot retrieve formOverview. DatabaseResult is false or empty');
    }

    const submissions: string[] = databaseResult.map((dbItem) => {
      return `${dbItem.key}/submission.json`;
    });
    const formdefinition: string =`${databaseResult[0].key}/formdefinition.json`;
    return { submissions, formdefinition };
  }


  async getSubmissionsFromKeys(allKeys: string[]): Promise<GetObjectCommandOutput[]> {
    return this.storage.getBatch(allKeys);
  }

  async compileCsvFile(bucketObjects: GetObjectCommandOutput[], formParser: FormParser): Promise<string> {
    const csvArray = [];
    csvArray.push(formParser.getHeaders());
    const failedCsvProcessing = [];
    for (const bucketObject of bucketObjects) {
      if (bucketObject.Body) {
        const bodyString = await bucketObject.Body.transformToString();
        csvArray.push(formParser.parseForm(bodyString));
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


