import { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';

const EventParametersSchema = z.object({
  key: z.string(),
});
export type EventParameters = z.infer<typeof EventParametersSchema>;

export function parsedEvent(event: APIGatewayProxyEvent): EventParameters {
  return EventParametersSchema.passthrough().parse({
    key: event.queryStringParameters?.key,
  });
}
