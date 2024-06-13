import { APIGatewayEventRequestContext } from 'aws-lambda';


export function getContext(identifier: string): APIGatewayEventRequestContext {
  const requestContext = {
    authorizer: {
      identifier: identifier,
      type: 'person',
    },
  };
  return requestContext as any;
}