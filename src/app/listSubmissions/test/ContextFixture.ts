import { APIGatewayEventRequestContextLambdaAuthorizer } from 'aws-lambda';


export function getContext(identifier: string) {
  const requestContext: APIGatewayEventRequestContextLambdaAuthorizer<any> = {
    lambda: {
      identifier: identifier,
      type: 'person',
    },
  };
  return requestContext;
}