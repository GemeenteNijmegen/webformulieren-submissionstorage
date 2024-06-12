import { APIGatewayAuthorizerCallback, APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import * as jose from 'jose';

const configuration = {
  audience: 'api.submissionstorage-dev.csp-nijmegen.nl',
  endpoints: [
    {
      method: 'GET',
      path: '/formoverview',
      requiredScope: 'form-overview',
    },
    {
      method: 'GET',
      path: '/listformoverviews',
      requiredScope: 'form-overview',
    },
    {
      method: 'GET',
      path: '/downloadformoverview',
      requiredScope: 'form-overview',
    },
  ],
};

export async function handler(
  event: APIGatewayRequestAuthorizerEvent,
  _context: any,
  callback: APIGatewayAuthorizerCallback,
) {

  console.log(event);
  try {
    const jwt = event.headers?.Authorization?.substring(7);
    if (!jwt) {
      throw Error('No token provided in header');
    }
    const subject = await validateJwt(jwt, event);
    callback(null, generatePolicy(subject, 'Allow', event.methodArn));
  } catch (error) {
    console.log(error);
    if (error instanceof Unauthorized) {
      callback('Unauthorized');
    }
    callback('Error: Invalid token');
  }
};

async function validateJwt(jwt: string, event: APIGatewayRequestAuthorizerEvent) {
  const issuer = `https://${process.env.TRUSTED_ISSUER}/oauth`;
  const jwks = jose.createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  const result = await jose.jwtVerify(jwt, jwks, {
    issuer: issuer,
  });

  if (!result.payload.sub) {
    throw Error('No subject found in token');
  }


  if (Array.isArray(result.payload.aud) && !result.payload.aud?.includes(configuration.audience)) {
    throw Error('Wrong audience');
  } else if (result.payload.aud != configuration.audience) {
    throw Error('Wrong audience');
  }

  const requirements = getEndpointAuthorizationRequirements(event.path, event.httpMethod);

  console.log('Auth requirements', requirements);

  const scopes = (result.payload.scope as string);
  if (scopes && scopes.split(' ').find(scope => scope == requirements.requiredScope)) {
    return result.payload.sub;
  }

  throw new Unauthorized();
}


function getEndpointAuthorizationRequirements(path: string, method: string) {
  const authorizationRequirements = configuration.endpoints.find(endpoint => endpoint.path == path && endpoint.method == method);
  if (!authorizationRequirements) {
    throw Error('No endpoint authorization configured, this is a problem with the configuration of the API itself, not the caller');
  }
  return authorizationRequirements;
}

function generatePolicy(principalId: string, effect: string, resource: string) {
  if (!effect && !resource) {
    throw Error('missing effect and resource');
  }

  const policyDocument = {
    Version: '2012-10-17',
    Statement: [{
      Action: 'execute-api:Invoke',
      Effect: effect,
      Resource: resource,
    }],
  };

  return {
    principalId: principalId,
    policyDocument: policyDocument,
  };

}


class Unauthorized extends Error {

}