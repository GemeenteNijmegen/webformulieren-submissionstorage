import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { z } from 'zod';

const EventParametersSchema = z.object({
  formuliernaam: z.string({
    required_error: 'formuliernaam is vereist',
    invalid_type_error: 'formuliernaam moet een string zijn',
  }),
  startdatum: z.optional(z.string().date('Startdatum moet het formaat JJJJ-MM-DD hebben')),
  einddatum: z.optional(z.string().date('Einddatum moet het formaat JJJJ-MM-DD hebben')),
  appid: z.optional(z.string()),
  responseformat: z.optional(z.string()),
});
export type EventParameters = z.infer<typeof EventParametersSchema>;

export function parsedEvent(event: APIGatewayProxyEventV2): EventParameters {
  const params = EventParametersSchema.passthrough().parse({
    formuliernaam: event.queryStringParameters?.formuliernaam,
    startdatum: event.queryStringParameters?.startdatum,
    einddatum: event.queryStringParameters?.einddatum,
    appid: event.queryStringParameters?.appid,
    responseformat: event.queryStringParameters?.responseformat,
  });
  if (params.startdatum && params.einddatum) {
    if (new Date(params.startdatum) < new Date(params.einddatum)) {
      throw new Error('Einddatum mag niet na startdatum zijn');
    }
  }
  return params;
}
