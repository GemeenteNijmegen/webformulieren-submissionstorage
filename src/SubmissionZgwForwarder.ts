import { Duration } from 'aws-cdk-lib';
import { ITable, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { ZgwFunction } from './app/zgw/zgw-function';
import { Configurable } from './Configuration';
import { Statics } from './statics';

interface SubmissionZgwForwarderProps extends Configurable {}

export class SubmissionZgwForwarder extends Construct {

  public lambda: Function;
  private props: SubmissionZgwForwarderProps;

  constructor(scope: Construct, id: string, props: SubmissionZgwForwarderProps) {
    super(scope, id);
    this.props = props;

    const table = Table.fromTableName(this, 'table', StringParameter.valueForStringParameter(this, Statics.ssmSubmissionTableName));
    const key = Key.fromKeyArn(this, 'key', StringParameter.valueForStringParameter(this, Statics.ssmDataKeyArn));
    // IBucket requires encryption key, otherwise grant methods won't add the correct permissions
    const storageBucket = Bucket.fromBucketAttributes(this, 'bucket', {
      bucketArn: StringParameter.valueForStringParameter(this, Statics.ssmSubmissionBucketArn),
      encryptionKey: key,
    });

    this.lambda = this.submissionHandlerLambda(storageBucket, table);
    this.addEventSubscription();
  }

  private submissionHandlerLambda(bucket: IBucket, table: ITable) {
    const clientsecret = Secret.fromSecretNameV2(this, 'client-secret', Statics.ssmZgwClientSecret);

    const zgwLambda = new ZgwFunction(this, 'function', {
      logRetention: RetentionDays.SIX_MONTHS,
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
        ZGW_CLIENT_ID: StringParameter.valueForStringParameter(this, Statics.ssmZgwClientId),
        ZGW_CLIENT_SECRET_ARN: clientsecret.secretArn,
        ZAAKTYPE: StringParameter.valueForStringParameter(this, Statics.ssmZgwZaaktype),
        ZAAKSTATUS: StringParameter.valueForStringParameter(this, Statics.ssmZgwZaakstatus),
        ZAKEN_API_URL: StringParameter.valueForStringParameter(this, Statics.ssmZgwZakenApiUrl),
        DOCUMENTEN_API_URL: StringParameter.valueForStringParameter(this, Statics.ssmZgwDocumentenApiUrl),
        OBJECTINFORMATIETYPE: StringParameter.valueForStringParameter(this, Statics.ssmZgwInformatieObjectType),
        DEBUG: this.props.configuration.debug ? 'true' : 'false',
      },
      timeout: Duration.minutes(5),
    });
    bucket.grantWrite(zgwLambda);
    clientsecret.grantRead(zgwLambda);

    return zgwLambda;
  }

  private addEventSubscription() {
    return new Rule(this, 'rule', {
      description: 'Subscribe to new form events from the submission storage',
      eventPattern: {
        source: ['Submissionstorage'],
        detailType: ['New Form Processed'],
      },
      targets: [
        new LambdaFunction(this.lambda),
      ],
    });
  }

}
