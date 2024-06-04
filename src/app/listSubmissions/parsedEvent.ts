import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { z } from 'zod';

const EventParametersSchema = z.object({
  userId: z.string(),
  userType: z.enum(['organisation', 'person']),
  key: z.string().optional(),
  idToken: z.string().transform((header) => header.replace('Bearer ', '')),
});
export type EventParameters = z.infer<typeof EventParametersSchema>;

export function parsedEvent(event: APIGatewayProxyEventV2): EventParameters {
  return EventParametersSchema.passthrough().parse({
    userId: event.queryStringParameters?.user_id,
    userType: event.queryStringParameters?.user_type,
    key: event.pathParameters?.key,
    idToken: event.headers.Authorization,
  });
}
