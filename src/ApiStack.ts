import { Stack, StackProps } from 'aws-cdk-lib';
import { AnyPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Configurable } from './Configuration';
import { Statics } from './statics';
import { SubmissionSnsEventHandler } from './SubmissionSnsEventHandler';

interface ApiStackProps extends StackProps, Configurable {};
/**
 * Contains all API-related resources.
 */
export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const internalTopic = new SNSTopic(this, 'submissions', { publishingAccountIds: props.configuration.allowedAccountIdsToPublishToSNS });
    new SubmissionSnsEventHandler(this, 'submissionhandler', {
      topicArns: [internalTopic.topic.topicArn, StringParameter.valueForStringParameter(this, Statics.ssmSubmissionTopicArn)],
    });
  }
}

interface SNSTopicProps extends StackProps {
  /**
   * Should the topic be protected by the KMS key (default true)
   */
  keyProtected?: boolean;

  /**
   * Allow access for different AWS accounts to publish to this topic
   */
  publishingAccountIds?: string[];
}
class SNSTopic extends Construct {
  topic: ITopic;
  constructor(scope: Construct, id: string, props: SNSTopicProps) {
    super(scope, id);

    this.topic = new Topic(this, 'submissions', {
      displayName: 'submissions',
    });

    this.allowCrossAccountAccess(props.publishingAccountIds);
  }

  /**
   * Allow cross account access to this topic
   *
   * This allows lambda's with the execution role 'storesubmissions-lambda-role'
   * in the accounts in `allowedAccountIds` access to publish to this topic.
   *
   * @param allowedAccountIds array of account IDs
   */
  allowCrossAccountAccess(allowedAccountIds?: string[]): void {
    if (!allowedAccountIds || allowedAccountIds.length == 0) { return; }
    const crossAccountPrincipalArns = allowedAccountIds.map(
      (accountId) => `arn:aws:iam::${accountId}:role/storesubmissions-lambda-role`,
    );
    this.topic.addToResourcePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'SNS:Publish',
      ],
      resources: [this.topic.topicArn],
      principals: [new AnyPrincipal()],
      conditions: {
        ArnLike: {
          'aws:PrincipalArn': crossAccountPrincipalArns,
        },
      },
    }));
  }
}
