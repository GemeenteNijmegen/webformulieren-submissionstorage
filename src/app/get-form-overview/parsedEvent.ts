import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { z } from 'zod';

const EventParametersSchema = z.object({
  formuliernaam: z.string(),
});
export type EventParameters = z.infer<typeof EventParametersSchema>;

export function parsedEvent(event: APIGatewayProxyEventV2): EventParameters {
  return EventParametersSchema.passthrough().parse({
    formuliernaam: event.queryStringParameters?.formuliernaam,
  });
}
