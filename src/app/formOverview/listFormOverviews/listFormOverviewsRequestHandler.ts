
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
    console.log('Maxresults: ', params.maxresults);
    const databaseResult = await this.formOverviewDatabase.getFormOverviews();
    if (!databaseResult || !Array.isArray(databaseResult)) {
      throw Error('Cannot retrieve formOverview. DatabaseResult is false or not the expected array.');
    }
    //TODO: nog goed naar kijken
    return Response.json(databaseResult, 200);
  }
}