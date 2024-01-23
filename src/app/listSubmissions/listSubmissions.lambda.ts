import { ApiGatewayV2Response } from '@gemeentenijmegen/apigateway-http';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { z } from 'zod';

const ParametersSchema = z.object({
  userId: z.string(),
  userType: z.enum(['organisation', 'person']),
});

type Parameters = z.infer<typeof ParametersSchema>;

function parsedEvent(event: APIGatewayProxyEventV2): Parameters {
  return ParametersSchema.passthrough().parse({ 
    userId: event.queryStringParameters?.user_id,
    userType: event.queryStringParameters?.user_type,
  });
}

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiGatewayV2Response> {
  try {
    const params = parsedEvent(event);
    console.debug(params);
    return Response.ok();
  } catch (error: any) {
    console.error(error);
    return Response.error(400);
  }
}
