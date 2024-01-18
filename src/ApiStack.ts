import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { AnyPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { GetFormOverviewFunction } from './app/get-form-overview/getFormOverview-function';
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

    let topicArns = [internalTopic.topic.topicArn];
    if (props.configuration.subscribeToTopicArns) {
      topicArns = topicArns.concat(props.configuration.subscribeToTopicArns);
    }

    new SubmissionSnsEventHandler(this, 'submissionhandler', {
      topicArns: topicArns,
    });

    //TODO: move later on
    const key = Key.fromKeyArn(this, 'key', StringParameter.valueForStringParameter(this, Statics.ssmDataKeyArn));
    // IBucket requires encryption key, otherwise grant methods won't add the correct permissions
    const storageBucket = Bucket.fromBucketAttributes(this, 'bucket', {
      bucketArn: StringParameter.valueForStringParameter(this, Statics.ssmSubmissionBucketArn),
      encryptionKey: key,
    });


    const formOverviewFunction = new GetFormOverviewFunction(this, 'getFormOverview', { environment: { BUCKET_NAME: storageBucket.bucketName }, timeout: Duration.minutes(5) });
    storageBucket.grantRead(formOverviewFunction);
  }
}

interface SNSTopicProps extends StackProps {
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
