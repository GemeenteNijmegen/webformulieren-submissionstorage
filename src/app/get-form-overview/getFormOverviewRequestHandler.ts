
import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { ApiGatewayV2Response } from '@gemeentenijmegen/apigateway-http';
import { FormDefinitionParser } from './formDefinition/FormDefinitionParser';
import { FormParser } from './formParser/FormParser';
import { EventParameters } from './parsedEvent';
import { Database, DynamoDBDatabase } from '../submission/Database';
import { S3Storage, Storage } from '../submission/Storage';

export class FormOverviewRequestHandler {
  private storage: Storage;
  private downloadStorage: Storage;
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
      throw Error('No download bucket NAME provided, storing formOverview will fail.');
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
    if (!params.formuliernaam) {
      throw Error('Cannot retrieve formOverview without queryparam formuliernaam');
    }

    const { submissions, formdefinition } = await this.getFormSubmissionsDatabase(params);
    // No submissions found in database
    if (!submissions.length) return { statusCode: 204 };

    let parsedFormDefinition: FormDefinitionParser;
    let formParser: FormParser;
    try {
      const formDefinition: GetObjectCommandOutput | undefined = await this.storage.get(formdefinition);
      const formDefinitionString = await formDefinition!.Body!.transformToString();
      const formDefinitionJSON = JSON.parse(formDefinitionString);
      parsedFormDefinition = new FormDefinitionParser(formDefinitionJSON);
      formParser = new FormParser(parsedFormDefinition.getParsedFormDefinition());
    } catch {
      throw Error('Cannot retrieve formOverview. FormParserDefinition failed.');
    }

    const submissionBucketObjects:GetObjectCommandOutput[] = await this.getSubmissionsFromKeys(submissions);

    let csvResponse: ApiGatewayV2Response;
    try {
      const csvFile = await this.compileCsvFile(submissionBucketObjects, formParser);
      const csvFileName = await this.saveCsvFile(parsedFormDefinition, csvFile);
      csvResponse = this.getCsvResponse(csvFile, csvFileName);
    } catch {
      throw Error('Cannot retrieve formOverview. Parsing forms to csv or saving csvfile to downloadbucket failed.');
    }
    return csvResponse;
  }

  private async saveCsvFile( parsedFormDefinition: FormDefinitionParser, csvFile: string) {
    const epochTime = new Date().getTime();
    const csvFilenName = `FormOverview-${epochTime}-${parsedFormDefinition.allMetadata.formName}.csv`;
    await this.downloadStorage.store(csvFilenName, csvFile);
    return csvFilenName;
  }

  private getCsvResponse(csvFile: string, csvFilenName: string): ApiGatewayV2Response {
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
    const databaseResult = await this.database.getSubmissionsByFormName({ formName: params.formuliernaam });
    // TODO: empty result different return
    if (!databaseResult || !Array.isArray(databaseResult)) {
      throw Error('Cannot retrieve formOverview. DatabaseResult is false');
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
    const headers = formParser.getHeaders();
    csvArray.push(headers);

    const failedCsvProcessing = [];
    let headerAndFieldMismatches = 0;
    for (const bucketObject of bucketObjects) {
      if (bucketObject.Body) {
        const bodyString = await bucketObject.Body.transformToString();
        const parsedForm = formParser.parseForm(bodyString);
        if (parsedForm.length !== headers.length) { headerAndFieldMismatches++;}
        csvArray.push(parsedForm);
      } else {
        failedCsvProcessing.push(`No form body retrieved from body. Possibly only metadata retrieved with requestId: ${bucketObject.$metadata.requestId}`);
      }
    }

    let csvContent: string = '';
    csvArray.forEach(row => {
      csvContent += row.join(',') + '\n';
    });
    console.log(`Done processing csv file. Number of processed rows: ${(csvArray.length - 1)}. Number of failed csv transformations: ${failedCsvProcessing.length}. Number of header and form fields length mismatches:  ${headerAndFieldMismatches}.`);
    return csvContent;
  }

}


