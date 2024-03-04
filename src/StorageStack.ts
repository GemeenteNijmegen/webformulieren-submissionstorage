import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Bucket, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Configurable } from './Configuration';
import { Migration20240206EnrichTableFunction } from './migrations/migration-2024-02-06-enrich-table-function';
import { Statics } from './statics';

interface StorageStackProps extends StackProps, Configurable {};

/**
 * Contains all API-related resources.
 */
export class StorageStack extends Stack {
  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const key = this.key();
    /**
     * This bucket will receive submission attachments
     * (Submission PDF, uploads) for each submission.
     */
    const storageBucket = new Bucket(this, 'submission-attachments', {
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
    this.addArnToParameterStore('bucketParam', storageBucket.bucketArn, Statics.ssmSubmissionBucketArn);
    this.addArnToParameterStore('bucketNameParam', storageBucket.bucketName, Statics.ssmSubmissionBucketName);

    /**
     * This bucket will receive submission attachments
     * (Submission PDF, uploads) for each submission.
     */
    const downloadBucket = new Bucket(this, 'downloads', {
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
    this.addArnToParameterStore('downloadBucketParam', downloadBucket.bucketArn, Statics.ssmDownloadBucketArn);
    this.addArnToParameterStore('downloadBucketNameParam', downloadBucket.bucketName, Statics.ssmDownloadBucketName);

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

    this.addMigrations(table, storageBucket);
  }

  private addMigrations(table: Table, bucket: Bucket) {
    /**
     * Enrich table items using data from S3 storage
     */
    const migration = new Migration20240206EnrichTableFunction(this, 'migration-20240206', {
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
      },
      memorySize: 2048,
    });
    table.grantReadWriteData(migration);
    bucket.grantRead(migration);
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
