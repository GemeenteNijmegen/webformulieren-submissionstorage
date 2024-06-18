
import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http';
import { FormDefinitionParser } from './formDefinition/FormDefinitionParser';
import { FormParser } from './formParser/FormParser';
import { EventParameters } from './parsedEvent';
import { Database, DynamoDBDatabase } from '../../submission/Database';
import { S3Storage, Storage } from '../../submission/Storage';
import { DDBFormOverviewDatabase, FormOverviewDatabase } from '../database/FormOverviewDatabase';

export class FormOverviewRequestHandler {
  private storage: Storage;
  private downloadStorage: Storage;
  private database: Database;
  private formOverviewDatabase: FormOverviewDatabase;

  constructor() {
    const environment = this.getEvironmentVariables();
    [this.database, this.storage, this.downloadStorage, this.formOverviewDatabase] = this.setup(environment);
  }

  private getEvironmentVariables() {
    if (process.env.TABLE_NAME == undefined) {
      throw Error('No submissions table NAME provided, retrieving submissions will fail.');
    }
    if (process.env.BUCKET_NAME == undefined) {
      throw Error('No bucket NAME provided, retrieving submissions will fail.');
    }
    if (process.env.DOWNLOAD_BUCKET_NAME == undefined) {
      throw Error('No download bucket NAME provided, storing formOverview will fail.');
    }
    if (process.env.FORM_OVERVIEW_TABLE_NAME == undefined) {
      throw Error('No form overview table NAME provided, storing formOverview metadata will fail.');
    }
    return {
      tableName: process.env.TABLE_NAME,
      bucketName: process.env.BUCKET_NAME,
      downloadBucketName: process.env.DOWNLOAD_BUCKET_NAME,
      formOverviewTableName: process.env.FORM_OVERVIEW_TABLE_NAME,
    };
  }

  private setup(environment: {tableName: string; bucketName: string; downloadBucketName: string; formOverviewTableName: string} ):
  [Database, Storage, Storage, FormOverviewDatabase] {
    const database = new DynamoDBDatabase(environment.tableName);
    const storage = new S3Storage(environment.bucketName);
    const downloadStorage = new S3Storage(environment.downloadBucketName);
    const formOverviewDatabase = new DDBFormOverviewDatabase(environment.formOverviewTableName);
    return [database, storage, downloadStorage, formOverviewDatabase];
  }

  async handleRequest(params:EventParameters): Promise<ApiGatewayV2Response> {
    if (!params.formuliernaam) {
      throw Error('Cannot retrieve formOverview without queryparam formuliernaam');
    }

    const { submissions, formdefinition } = await this.getFormSubmissionsDatabase(params);
    // No submissions found in database
    if (!submissions.length) return Response.ok(204);

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
      const csvFileName = await this.saveCsvFile(parsedFormDefinition, csvFile, params);
      csvResponse = this.getCsvResponse(csvFileName);
    } catch {
      throw Error('Cannot retrieve formOverview. Parsing forms to csv or saving csvfile to downloadbucket failed.');
    }
    return csvResponse;
  }

  private async saveCsvFile( parsedFormDefinition: FormDefinitionParser, csvFile: string, params: EventParameters) {
    const epochTime = new Date().getTime();
    const csvFileName = `FormOverview-${epochTime}-${parsedFormDefinition.allMetadata.formName}.csv`;
    await this.downloadStorage.store(csvFileName, csvFile);
    console.log('Database');
    await this.formOverviewDatabase.storeFormOverview({
      fileName: csvFileName,
      createdBy: 'default_change_to_api_queryparam',
      formName: parsedFormDefinition.allMetadata.formName,
      formTitle: parsedFormDefinition.allMetadata.formTitle,
      queryStartDate: params.startdatum,
      queryEndDate: params.einddatum,
    });
    return csvFileName;
  }

  private getCsvResponse(csvFileName: string): ApiGatewayV2Response {
    return Response.ok(200, `Csv has been saved in bucket as ${csvFileName}`);
  }

  async getFormSubmissionsDatabase(params: EventParameters): Promise<{submissions:string[]; formdefinition: string}> {
    const databaseResult = await this.database.getSubmissionsByFormName({
      formName: params.formuliernaam,
      startDate: params.startdatum,
      endDate: params.einddatum,
    });
    if (!databaseResult || !Array.isArray(databaseResult)) {
      throw Error('Cannot retrieve formOverview. DatabaseResult is false or not the expected array.');
    }
    // No results from database should return an empty object to throw a 204
    if (!databaseResult.length) { return { submissions: [], formdefinition: '' };}

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
      csvContent += row.join(';') + '\n';
    });
    console.log(`Done processing csv file. Number of processed rows: ${(csvArray.length - 1)}. Number of failed csv transformations: ${failedCsvProcessing.length}. Number of header and form fields length mismatches:  ${headerAndFieldMismatches}.`);
    return csvContent;
  }

}


