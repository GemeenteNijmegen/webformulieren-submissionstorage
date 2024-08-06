import { Duration, Stack } from 'aws-cdk-lib';
import { ITable, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { SubmissionFunction } from './app/submission/submission-function';
import { Statics } from './statics';

interface SubmissionSnsEventHandlerProps {
  topicArns: string[];
}

/**
 * The submissionsSnsEventHandler receives form submissions
 *
 * This handler is subscribed to the SNS Topic(s) form submissions are
 * submitted to. It handles receiving the submission, parsing it, saving
 * metadata to DynamoDB and storing attachments / PDF's to S3.
 */
export class SubmissionSnsEventHandler extends Construct {
  private role?: Role;
  public lambda: Function;
  constructor(scope: Construct, id: string, props: SubmissionSnsEventHandlerProps) {
    super(scope, id);

    const table = Table.fromTableName(this, 'table', StringParameter.valueForStringParameter(this, Statics.ssmSubmissionTableName));
    const key = Key.fromKeyArn(this, 'key', StringParameter.valueForStringParameter(this, Statics.ssmDataKeyArn));
    // IBucket requires encryption key, otherwise grant methods won't add the correct permissions
    const storageBucket = Bucket.fromBucketAttributes(this, 'bucket', {
      bucketArn: StringParameter.valueForStringParameter(this, Statics.ssmSubmissionBucketArn),
      encryptionKey: key,
    });
    const sourceBucket = Bucket.fromBucketArn(this, 'sourceBucket', StringParameter.valueForStringParameter(this, Statics.ssmSourceBucketArn));
    const secret = Secret.fromSecretNameV2(this, 'apikey', Statics.secretFormIoApiKey);

    const topics = props.topicArns.map((topicArn, i)=> Topic.fromTopicArn(this, `submission-topic-${i}`, topicArn));
    this.lambda = this.submissionHandlerLambda(storageBucket, sourceBucket, table, topics, secret);
  }

  /**
   * This lambda handles submissions received via SNS
   *
   * It will receive each submission, extract relevant info, store
   * the unedited submission in S3, retrieve attachments and store
   * them, and add relevant metadata to a dynamoDB table for
   * further use.
   *
   * @param bucket The bucket to store submission info / attachments in
   * @param table The dynamodb table to store submission (meta)data in
   * @param topic The SNS Topic to subscribe to for submissions
   */
  private submissionHandlerLambda(bucket: IBucket, sourceBucket: IBucket, table: ITable, topics: ITopic[], secret: ISecret) {
    const submissionLambda = new SubmissionFunction(this, 'submission', {
      role: this.lambdaRole(),
      logRetention: RetentionDays.SIX_MONTHS,
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
        FORMIO_API_KEY_ARN: secret.secretArn,
        FORMIO_BASE_URL: StringParameter.valueForStringParameter(this, Statics.ssmFormIoBaseUrl),
      },
      timeout: Duration.minutes(5),
    });
    bucket.grantWrite(submissionLambda);
    sourceBucket.grantRead(submissionLambda);
    table.grantReadWriteData(submissionLambda);
    secret.grantRead(submissionLambda);
    const key = Key.fromKeyArn(this, 'sourceBucketKey', StringParameter.valueForStringParameter(this, Statics.ssmSourceKeyArn));
    key.grantDecrypt(submissionLambda);
    const bus = EventBus.fromEventBusName(this, 'defaultbus', 'default');
    bus.grantPutEventsTo(submissionLambda);

    for (const topic of topics) {
      topic.addSubscription(new LambdaSubscription(submissionLambda));
    }
    return submissionLambda;
  }

  /**
   * We use a custom service role, because this role needs to
   * assume a role in a different account. This way, the other
   * account can add this role arn to its relevant policy.
   */
  lambdaRole() {
    if (!this.role) {
      this.role = new Role(this, 'role', {
        roleName: 'submissionhandler-lambda-role',
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        description: 'Role for submission handler lambda, custom role so role name is predictable',
        managedPolicies: [{
          managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        }],
      });
    }
    return this.role;
  }

}
