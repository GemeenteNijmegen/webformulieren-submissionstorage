import { Duration, Stack } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Bucket, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Statics } from './statics';

/**
 * Contains all API-related resources.
 */
export class StorageStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const key = this.keyFromParameterStore(Statics.ssmDataKeyArn);
    /**
     * This bucket will receive submission attachments
     * (Submission PDF, uploads) for each submission.
     */
    const bucket = new Bucket(this, 'submission-attachments', {
      eventBridgeEnabled: true,
      enforceSSL: true,
      encryption: BucketEncryption.KMS,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [
        {
          expiration: Duration.days(365),
        },
      ],
      encryptionKey: key,
    });
    this.addArnToParameterStore('bucketParam', bucket.bucketArn, Statics.ssmSubmissionBucketArn);
    this.addArnToParameterStore('bucketNameParam', bucket.bucketName, Statics.ssmSubmissionBucketName);

    const table = new Table(this, 'submissions', {
      partitionKey: { name: 'sessionid', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      encryptionKey: key,
      encryption: TableEncryption.CUSTOMER_MANAGED,
    });
    this.addArnToParameterStore('tableParam', table.tableArn, Statics.ssmSubmissionTableArn);
    this.addArnToParameterStore('tableNameParam', table.tableName, Statics.ssmSubmissionTableName);

    this.addParameters();
  }

  private addArnToParameterStore(id: string, arn: string, name: string) {
    new StringParameter(this, id, {
      stringValue: arn,
      parameterName: name,
    });
  }

  private keyFromParameterStore(parameterName: string) {
    const keyArn = StringParameter.valueForStringParameter(this, parameterName);
    const key = Key.fromKeyArn(this, 'key', keyArn);
    return key;
  }

  /**
   * Add general parameters, the values of which should be added later
   */
  private addParameters() {
    new StringParameter(this, 'submissionTopicArn', {
      stringValue: '-',
      parameterName: Statics.ssmSubmissionTopicArn,
    });
  }
}
