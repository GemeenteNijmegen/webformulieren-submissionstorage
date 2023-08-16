import { ITable, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { SubmissionFunction } from './app/submission/submission-function';
import { Statics } from './statics';
import { GetobjectFunction } from './app/submission/getobject-function';

interface SubmissionSnsEventHandlerProps {
  topicArn: string;
}
export class SubmissionSnsEventHandler extends Construct {
  constructor(scope: Construct, id: string, props: SubmissionSnsEventHandlerProps) {
    super(scope, id);

    const topic = Topic.fromTopicArn(this, 'submission-topic', props.topicArn);
    const table = Table.fromTableName(this, 'table', StringParameter.valueForStringParameter(this, Statics.ssmSubmissionTableName));
    const key = Key.fromKeyArn(this, 'key', StringParameter.valueForStringParameter(this, Statics.ssmDataKeyArn));
    // IBucket requires encryption key, otherwise grant methods won't add the correct permissions
    const storageBucket = Bucket.fromBucketAttributes(this, 'bucket', {
      bucketArn: StringParameter.valueForStringParameter(this, Statics.ssmSubmissionBucketArn),
      encryptionKey: key,
    });
    const sourceBucket = Bucket.fromBucketArn(this, 'sourceBucket', StringParameter.valueForStringParameter(this, Statics.ssmSourceBucketArn));
    const secret = Secret.fromSecretNameV2(this, 'apikey', Statics.secretFormIoApiKey);

    this.submissionHandlerLambda(storageBucket, sourceBucket, table, topic, secret);
    this.getobjectDemo(sourceBucket);
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
  private submissionHandlerLambda(bucket: IBucket, sourceBucket: IBucket, table: ITable, topic: ITopic, secret: ISecret) {
    const submissionLambda = new SubmissionFunction(this, 'submission', {
      role: this.lambdaRole(),
      logRetention: RetentionDays.SIX_MONTHS,
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
        FORMIO_API_KEY_ARN: secret.secretArn,
        FORMIO_BASE_URL: StringParameter.valueForStringParameter(this, Statics.ssmFormIoBaseUrl),
      },
    });
    bucket.grantWrite(submissionLambda);
    sourceBucket.grantRead(submissionLambda);
    table.grantReadWriteData(submissionLambda);
    secret.grantRead(submissionLambda);
    const key = Key.fromKeyArn(this, 'sourceBucketKey', StringParameter.valueForStringParameter(this, Statics.ssmSourceKeyArn));
    key.grantDecrypt(submissionLambda);

    topic.addSubscription(new LambdaSubscription(submissionLambda));
  }

  private getobjectDemo(bucket: IBucket) {
    const lambda = new GetobjectFunction(this, 'getobject', {
      role: this.lambdaRole(),
      logRetention: RetentionDays.SIX_MONTHS,
      environment: {
        BUCKET: bucket.bucketName,
      }
    });
    bucket.grantRead(lambda);
    const key = Key.fromKeyArn(this, 'sourceBucketKeyGet', StringParameter.valueForStringParameter(this, Statics.ssmSourceKeyArn));
    key.grantDecrypt(lambda);
  }

  /**
   * We use a custom service role, because this role needs to
   * assume a role in a different account. This way, the other
   * account can add this role arn to its relevant policy.
   */
  lambdaRole() {
    return new Role(this, 'role', {
      roleName: 'submissionhandler-lambda-role',
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for submission handler lambda, custom role so role name is predictable',
      managedPolicies: [{
        managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      }],
    });
  }

}
