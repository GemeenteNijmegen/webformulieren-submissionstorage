import { StackProps } from 'aws-cdk-lib';
import { AnyPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

interface SubmissionsTopicProps extends StackProps {
  /**
   * Allow access for different AWS accounts to publish to this topic
   */
  publishingAccountIds?: string[];
}
export class SubmissionsTopic extends Construct {
  topic: ITopic;
  constructor(scope: Construct, id: string, props: SubmissionsTopicProps) {
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
