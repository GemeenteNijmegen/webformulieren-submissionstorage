import { Stack } from 'aws-cdk-lib';
import { MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Statics } from './statics';
import { SubmissionSnsEventHandler } from './SubmissionSnsEventHandler';

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

    new SubmissionSnsEventHandler(this, 'submissionhandler', {
      topicArn: StringParameter.valueForStringParameter(this, Statics.ssmSubmissionTopicArn),
    });
  }
}
