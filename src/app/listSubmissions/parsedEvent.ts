import { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';

const EventParametersSchema = z.object({
  userId: z.string(),
  userType: z.enum(['organisation', 'person']), // Cannot retrieve anonymous submissions due to this restriction
  key: z.string().optional(),
});
export type EventParameters = z.infer<typeof EventParametersSchema>;

export function parsedEvent(event: APIGatewayProxyEvent): EventParameters {
  return EventParametersSchema.passthrough().parse({
    userId: event.queryStringParameters?.user_id,
    userType: event.queryStringParameters?.user_type,
    key: event.pathParameters?.key,
  });
}

export function parsedEventWithAuthorizer(event: APIGatewayProxyEvent): EventParameters {
  return EventParametersSchema.passthrough().parse({
    userId: event.requestContext.authorizer?.identifier,
    userType: event.requestContext.authorizer?.type,
    key: event.pathParameters?.key,
  });
}
