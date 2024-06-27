import { APIGatewayAuthorizerWithContextCallback, APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
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
    {
      method: 'GET',
      path: '/submissions',
      requiredScope: 'submissions:read-own',
    },
  ],
};


type IdentityType = 'person' | 'system' | 'organization';
interface Identity {
  identifier: string;
  type: IdentityType;
}

export async function handler(
  event: APIGatewayRequestAuthorizerEvent,
  _context: any,
  callback: APIGatewayAuthorizerWithContextCallback<any>,
) {

  console.log(event);
  try {
    const jwt = event.headers?.Authorization?.substring(7);
    if (!jwt) {
      throw Error('No token provided in header');
    }
    const identity = await validateJwt(jwt, event);
    callback(null, generatePolicy('Allow', event.methodArn, identity));
  } catch (error) {
    console.log(error);
    if (error instanceof Unauthorized) {
      callback('Unauthorized');
    }
    callback('Error: Invalid token');
  }
};

async function validateJwt(jwt: string, event: APIGatewayRequestAuthorizerEvent) : Promise<Identity> {
  const issuer = `https://${process.env.TRUSTED_ISSUER}/oauth`;
  const jwks = jose.createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  const result = await jose.jwtVerify(jwt, jwks, {
    issuer: issuer,
  });

  // Check if we know the endpoint that is requested
  const requirements = getEndpointAuthorizationRequirements(event.path, event.httpMethod);
  console.log('Auth requirements', requirements);

  // Check if we are allowed to request the endpoint with the given claims in the token
  const scopes = (result.payload.scope as string);
  if (!scopes || !scopes.split(' ').find(scope => scope == requirements.requiredScope)) {
    throw new Unauthorized();
  }

  // Validate audience
  if (Array.isArray(result.payload.aud) && !result.payload.aud?.includes(configuration.audience)) {
    throw Error('Wrong audience');
  } else if (result.payload.aud != configuration.audience) {
    throw Error('Wrong audience');
  }

  // Try to identify the token owner
  if (result.payload.identifier) {
    return {
      identifier: result.payload.identifier as string,
      type: result.payload.type as IdentityType,
    };
  } else if (result.payload.sub) {
    return {
      identifier: result.payload.sub,
      type: 'system',
    };
  } else {
    throw Error('No subject found in token');
  }


}


function getEndpointAuthorizationRequirements(path: string, method: string) {
  const authorizationRequirements = configuration.endpoints.find(endpoint => path.startsWith(endpoint.path) && endpoint.method == method);
  if (!authorizationRequirements) {
    throw Error('No endpoint authorization configured, this is a problem with the configuration of the API itself, not the caller');
  }
  return authorizationRequirements;
}

function generatePolicy(effect: string, resource: string, identity: Identity) {
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
    context: {
      ...identity,
    },
    principalId: identity.identifier,
    policyDocument: policyDocument,
  };

}


class Unauthorized extends Error {

}