import { Duration, Stack } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Bucket, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Statics } from './statics';

/**
 * Contains all API-related resources.
 */
export class StorageStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const key = this.key();
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
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      encryptionKey: key,
      encryption: TableEncryption.CUSTOMER_MANAGED,
    });
    this.addArnToParameterStore('tableParam', table.tableArn, Statics.ssmSubmissionTableArn);
    this.addArnToParameterStore('tableNameParam', table.tableName, Statics.ssmSubmissionTableName);

    this.addParameters();
  }

  private key() {
    const key = new Key(this, 'kmskey', {
      enableKeyRotation: true,
      description: 'encryption key for user data',
      alias: `${Statics.projectName}/user-data`,
    });

    // Store key arn to be used in other stacks/projects
    new StringParameter(this, 'key', {
      stringValue: key.keyArn,
      parameterName: Statics.ssmDataKeyArn,
    });

    return key;
  }

  private addArnToParameterStore(id: string, arn: string, name: string) {
    new StringParameter(this, id, {
      stringValue: arn,
      parameterName: name,
    });
  }

  /**
   * Add general parameters, the values of which should be added later
   */
  private addParameters() {
    new StringParameter(this, 'submissionTopicArn', {
      stringValue: '-',
      parameterName: Statics.ssmSubmissionTopicArn,
    });

    new StringParameter(this, 'sourceBucketArn', {
      stringValue: '-',
      parameterName: Statics.ssmSourceBucketArn,
      description: 'ARN for the source bucket, to allow copying submission files',
    });

    new StringParameter(this, 'sourceKeyArn', {
      stringValue: '-',
      parameterName: Statics.ssmSourceKeyArn,
      description: 'ARN for the source bucket encryption key, to allow copying submission files',
    });

    new StringParameter(this, 'formIoBaseUrl', {
      stringValue: '-',
      parameterName: Statics.ssmFormIoBaseUrl,
      description: 'Base url for retrieving form config. Includes stage path.',
    });

    new Secret(this, 'formIoApiKey', {
      secretName: Statics.secretFormIoApiKey,
      description: 'FormIO Api token for retrieving form config',
    });
  }
}
