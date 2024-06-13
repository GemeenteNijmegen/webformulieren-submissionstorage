import { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';

const EventParametersSchema = z.object({
  userId: z.string(),
  userType: z.enum(['organisation', 'person']),
  key: z.string().optional(),
  idToken: z.string().transform((header) => header.replace('Bearer ', '')),
});
export type EventParameters = z.infer<typeof EventParametersSchema>;

export function parsedEvent(event: APIGatewayProxyEvent): EventParameters {
  return EventParametersSchema.passthrough().parse({
    userId: event.requestContext.authorizer?.identifier,
    userType: event.requestContext.authorizer?.type,
    key: event.pathParameters?.key,
    idToken: event.headers.Authorization,
  });
}
