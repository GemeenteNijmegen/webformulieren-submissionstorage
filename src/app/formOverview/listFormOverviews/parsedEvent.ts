import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { z } from 'zod';

const DEFAULT_MAX_RESULTS: number = 100;
const EventParametersSchema = z.object({
  maxresults: z.number(),
});
export type EventParameters = z.infer<typeof EventParametersSchema>;

export function parsedEvent(event: APIGatewayProxyEventV2): EventParameters {
  return EventParametersSchema.passthrough().parse({
    maxresults: event.queryStringParameters?.maxresults ? parseInt(event.queryStringParameters?.maxresults) : DEFAULT_MAX_RESULTS,
  });
}