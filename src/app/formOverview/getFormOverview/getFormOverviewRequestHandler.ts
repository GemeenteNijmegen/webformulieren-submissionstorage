
import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http';
import { S3Storage, Storage } from '@gemeentenijmegen/utils';
import { FormDefinitionParser } from './formDefinition/FormDefinitionParser';
import { FormParser } from './formParser/FormParser';
import { EventParameters } from './parsedEvent';
import { getEnvVariables } from '../../../utils/getEnvVariables/getEnvVariables';
import { Database, DynamoDBDatabase } from '../../submission/Database';
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

    const env = getEnvVariables(['TABLE_NAME', 'BUCKET_NAME', 'DOWNLOAD_BUCKET_NAME', 'FORM_OVERVIEW_TABLE_NAME'] as const);
    return {
      tableName: env.TABLE_NAME,
      bucketName: env.BUCKET_NAME,
      downloadBucketName: env.DOWNLOAD_BUCKET_NAME,
      formOverviewTableName: env.FORM_OVERVIEW_TABLE_NAME,
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
    return this.createResponse(submissionBucketObjects, formParser, parsedFormDefinition, params);

  }

  private async createResponse(
    submissionBucketObjects: GetObjectCommandOutput[],
    formParser: FormParser,
    parsedFormDefinition: FormDefinitionParser,
    params: EventParameters,
  ): Promise<ApiGatewayV2Response> {
    let response: ApiGatewayV2Response;
    try {
      const submissionsArray = await this.processSubmissionsToArray(formParser, submissionBucketObjects);
      if (params.responseformat == 'json') {
        const convertToJSON = await this.convertToJSON(submissionsArray);
        response = Response.json(convertToJSON, 200);
      } else {
        const csvFile = await this.compileCsvFile(submissionsArray);
        const csvFileName = await this.saveCsvFile(parsedFormDefinition, csvFile, params);
        response = this.getCsvResponse(csvFileName);
      }
    } catch {
      throw Error('Cannot retrieve formOverview. Parsing forms to csv or saving csvfile to downloadbucket failed.');
    }
    return response;
  }

  private async saveCsvFile( parsedFormDefinition: FormDefinitionParser, csvFile: string, params: EventParameters) {
    const epochTime = new Date().getTime();
    const csvFileName = `FormOverview-${epochTime}-${parsedFormDefinition.allMetadata.formName}.csv`;
    await this.downloadStorage.store(csvFileName, csvFile);
    await this.formOverviewDatabase.storeFormOverview({
      fileName: csvFileName,
      createdBy: 'default_change_to_api_queryparam',
      formName: parsedFormDefinition.allMetadata.formName,
      formTitle: parsedFormDefinition.allMetadata.formTitle,
      queryStartDate: params.startdatum,
      queryEndDate: params.einddatum,
      appId: params.appid,
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
      appId: params.appid,
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

  async compileCsvFile(submissionsArray: string[][]): Promise<string> {
    let csvContent: string = '';
    submissionsArray.forEach(row => {
      csvContent += row.join(';') + '\n';
    });
    return csvContent;
  }
  /**
   * Convert a string[][] with the first array being the headers to JSON key value pairs
   * @param data
   * @returns
   */
  async convertToJSON(data: string[][]): Promise<{[key: string]: string}[]> {
    if (data.length === 0) return []; // Handle empty data case

    const [headers, ...rows] = data;

    const jsonArray = rows.map(row => {
      const obj: { [key: string]: string } = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    return jsonArray;
  }

  private async processSubmissionsToArray(formParser: FormParser, bucketObjects: GetObjectCommandOutput[]): Promise<string[][]> {
    const submissionsArray = [];
    const headers = formParser.getHeaders();
    submissionsArray.push(headers);

    const failedProcessing = [];
    let headerAndFieldMismatches = 0;
    for (const bucketObject of bucketObjects) {
      if (bucketObject.Body) {
        const bodyString = await bucketObject.Body.transformToString();
        const parsedForm = formParser.parseForm(bodyString);
        if (parsedForm.length !== headers.length) { headerAndFieldMismatches++; }
        submissionsArray.push(parsedForm);
      } else {
        failedProcessing.push(`No form body retrieved from body. Possibly only metadata retrieved with requestId: ${bucketObject.$metadata.requestId}`);
      }
    }
    console.log(`
      Done processing submissions. 
      Number of processed rows: ${(submissionsArray.length - 1)}. 
      Number of failed submission transformations: ${failedProcessing.length}. 
      Number of header and form fields length mismatches:  ${headerAndFieldMismatches}.`);

    return submissionsArray;
  }
}


