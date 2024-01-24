import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { EventParameters } from './parsedEvent';

export class ListSubmissionsRequestHandler {
  constructor() {
  }

  handleRequest(parameters: EventParameters): Response {
    console.debug(parameters);
    return Response.ok();
  }
}
