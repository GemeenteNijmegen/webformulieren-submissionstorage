import { Stack } from 'aws-cdk-lib';
import { LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { SubmissionFunction } from './app/submission/submission-function';

/**
 * Contains all API-related resources.
 */
export class ApiStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const api = new RestApi(this, 'gateway');
    api.root.addMethod('ANY', new MockIntegration({
      integrationResponses: [
        { statusCode: '200' },
      ],
      passthroughBehavior: PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
      },
    }), {
      methodResponses: [
        { statusCode: '200' },
      ],
    });

    const submissionResource = api.root.addResource('submission');
    submissionResource.addMethod('POST', new LambdaIntegration(new SubmissionFunction(this, 'submission')), {
      apiKeyRequired: true,
      requestParameters: {
        'method.request.querystring.formname': true,
      },
    });
  }
}
