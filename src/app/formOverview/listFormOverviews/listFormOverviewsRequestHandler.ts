
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http';
import { EventParameters } from './parsedEvent';
import { DDBFormOverviewDatabase, FormOverviewDatabase } from '../database/FormOverviewDatabase';


export class ListOverviewsRequestHandler {
  private formOverviewDatabase: FormOverviewDatabase;

  constructor() {
    const environment = this.getEvironmentVariables();
    [this.formOverviewDatabase] = this.setup(environment);
  }

  private getEvironmentVariables() {
    if (process.env.FORM_OVERVIEW_TABLE_NAME == undefined) {
      throw Error('No table NAME provided, retrieving submissions will fail.');
    }
    return {
      formOverviewDatabase: process.env.FORM_OVERVIEW_TABLE_NAME,
    };
  }

  private setup(environment: {formOverviewDatabase: string} ): [FormOverviewDatabase] {
    const formOverviewDatabase= new DDBFormOverviewDatabase(environment.formOverviewDatabase);
    return [formOverviewDatabase];
  }

  async handleRequest(params: EventParameters): Promise<ApiGatewayV2Response> {
    const filterValues: {[key:string]:string}|undefined = this.getFilterValues(params);
    const databaseResult = await this.formOverviewDatabase.getFormOverviews(filterValues);
    if (!databaseResult || !Array.isArray(databaseResult)) {
      throw Error('Cannot retrieve formOverview. DatabaseResult is false or not the expected array.');
    }
    //TODO: nog goed naar kijken
    return Response.json(databaseResult, 200);
  }
  private getFilterValues(params: EventParameters) :{[key:string]:string}|undefined {
    // Create a result object to hold the key-value pairs
    const result: {[key: string]: string} = {};
    // Check if 'formuliernaam' is present and map it to 'formName'
    if (params.formuliernaam) {
      result.formName = params.formuliernaam.toLowerCase();
    }
    // Check if 'appid' is present and map it to 'appId'
    if (params.appid) {
      result.appId = params.appid.toUpperCase();
    }
    // Return undefined if result object is empty
    return Object.keys(result).length > 0 ? result : undefined;
  }
}