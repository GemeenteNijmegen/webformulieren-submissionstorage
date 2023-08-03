import { Stack } from 'aws-cdk-lib';
import { MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { SubmissionFunction } from './app/submission/submission-function';
import { Statics } from './statics';

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

interface SubmissionSnsEventHandlerProps {
  topicArn: string;
}

class SubmissionSnsEventHandler extends Construct {
  constructor(scope: Construct, id: string, props: SubmissionSnsEventHandlerProps) {
    super(scope, id);
    const topic = Topic.fromTopicArn(this, 'submission-topic', props.topicArn);
    const submissionLambda = new SubmissionFunction(this, 'submission', {
      logRetention: RetentionDays.SIX_MONTHS,
    });
    topic.addSubscription(new LambdaSubscription(submissionLambda));
  }
}
