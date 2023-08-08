import { Stack } from 'aws-cdk-lib';
import { MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { ITable, Table } from 'aws-cdk-lib/aws-dynamodb';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
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
    const table = Table.fromTableName(this, 'table', StringParameter.valueForStringParameter(this, Statics.ssmSubmissionTableName));
    const bucket = Bucket.fromBucketArn(this, 'bucket', StringParameter.valueForStringParameter(this, Statics.ssmSubmissionBucketArn));

    this.submissionHandlerLambda(bucket, table, topic);
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
  private submissionHandlerLambda(bucket: IBucket, table: ITable, topic: ITopic) {
    const submissionLambda = new SubmissionFunction(this, 'submission', {
      logRetention: RetentionDays.SIX_MONTHS,
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
      },
    });
    bucket.grantWrite(submissionLambda);
    table.grantReadWriteData(submissionLambda);

    topic.addSubscription(new LambdaSubscription(submissionLambda));
  }
}
