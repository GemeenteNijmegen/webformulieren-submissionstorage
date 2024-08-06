import { Duration } from 'aws-cdk-lib';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { ZgwFunction } from './app/zgw/zgw-function';
import { Statics } from './statics';

interface SubmissionZgwForwarderProps {
}

export class SubmissionZgwForwarder extends Construct {

  public lambda: Function;

  constructor(scope: Construct, id: string, _props: SubmissionZgwForwarderProps) {
    super(scope, id);

    const key = Key.fromKeyArn(this, 'key', StringParameter.valueForStringParameter(this, Statics.ssmDataKeyArn));
    // IBucket requires encryption key, otherwise grant methods won't add the correct permissions
    const storageBucket = Bucket.fromBucketAttributes(this, 'bucket', {
      bucketArn: StringParameter.valueForStringParameter(this, Statics.ssmSubmissionBucketArn),
      encryptionKey: key,
    });

    this.lambda = this.submissionHandlerLambda(storageBucket);
    this.addEventSubscription();
  }

  private submissionHandlerLambda(bucket: IBucket) {
    const zgwLambda = new ZgwFunction(this, 'function', {
      logRetention: RetentionDays.SIX_MONTHS,
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
      timeout: Duration.minutes(5),
    });
    bucket.grantWrite(zgwLambda);

    return zgwLambda;
  }

  private addEventSubscription() {
    return new Rule(this, 'rule', {
      description: 'Subscribe to new form events from the submission storage',
      eventPattern: {
        source: ['Submissionstorage'],
        detailType: ['New Form Submitted'],
      },
      targets: [
        new LambdaFunction(this.lambda, {

        }),
      ],
    });
  }

}
