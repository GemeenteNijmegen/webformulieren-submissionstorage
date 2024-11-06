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
import { RxmissionZgwFunction } from './app/zgw/rxMissionZgwHandler/rxmission-zgw-function';
import { getAppIdsByBranchName } from './app/zgw/rxMissionZgwHandler/RxMissionZgwConfiguration';
import { ZgwFunction } from './app/zgw/zgwForwardingHandler/zgw-function';
import { Configurable } from './Configuration';
import { Statics } from './statics';

interface SubmissionZgwForwarderProps extends Configurable {}

export class SubmissionZgwForwarder extends Construct {

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

    // Feature flag to send all submissions to mijn services open zaak
    if (this.props.configuration.forwardToZgw) {
      const zgwForwardHandlerLambda = this.zgwForwardingHandlerLambda(storageBucket, table);
      this.addEventSubscription(zgwForwardHandlerLambda);
    }
    // Feature flag to send all relevant submissions to RxMission application
    if (this.props.configuration.enableRxMissionZwgHandler) {
      const rxMissionZgwLambda = this.createRxMissionZgwHandlerLambda(storageBucket, table);
      this.addRxMissionEventSubscription(rxMissionZgwLambda);
    }
  }


  // TODO: eerst aparte lambda RxMission en dan samenvoegen

  private zgwForwardingHandlerLambda(bucket: IBucket, table: ITable) {
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
        INFORMATIEOBJECTTYPE: StringParameter.valueForStringParameter(this, Statics.ssmZgwInformatieObjectType),
        ROLTYPE: StringParameter.valueForStringParameter(this, Statics.ssmZgwRoltype),
        DEBUG: this.props.configuration.debug ? 'true' : 'false',
      },
      timeout: Duration.minutes(5),
    });
    bucket.grantRead(zgwLambda);
    clientsecret.grantRead(zgwLambda);
    table.grantReadData(zgwLambda);

    return zgwLambda;
  }


  private addEventSubscription(lambda: Function) {
    return new Rule(this, 'rule', {
      description: 'Subscribe to new form events from the submission storage',
      eventPattern: {
        source: ['Submissionstorage'],
        detailType: ['New Form Processed'],
      },
      targets: [
        new LambdaFunction(lambda),
      ],
    });
  }

  /**
 * Create lambda function to process submissions for application RxMission
 * @param bucket
 * @param table
 * @returns
 */
  private createRxMissionZgwHandlerLambda(bucket: IBucket, table: ITable) {
    const clientsecret = Secret.fromSecretNameV2(this, 'client-secret-rxm', Statics.ssmRxMissionZgwClientSecret);

    const rxmZgwLambda = new RxmissionZgwFunction(this, 'rxm-function', {
      logRetention: RetentionDays.SIX_MONTHS,
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
        ZGW_CLIENT_ID: StringParameter.valueForStringParameter(this, Statics.ssmRxMissionZgwClientId),
        ZGW_CLIENT_SECRET_ARN: clientsecret.secretArn,
        ZAAKTYPE: StringParameter.valueForStringParameter(this, Statics.ssmRxMissionZgwZaaktype),
        ZAAKSTATUS: StringParameter.valueForStringParameter(this, Statics.ssmRxMissionZgwZaakstatus),
        ZAKEN_API_URL: StringParameter.valueForStringParameter(this, Statics.ssmRxMissionZgwZakenApiUrl),
        DOCUMENTEN_API_URL: StringParameter.valueForStringParameter(this, Statics.ssmRxMissionZgwDocumentenApiUrl),
        INFORMATIEOBJECTTYPE: StringParameter.valueForStringParameter(this, Statics.ssmRxMissionZgwInformatieObjectType),
        ROLTYPE: StringParameter.valueForStringParameter(this, Statics.ssmRxMissionZgwRoltype),
        DEBUG: this.props.configuration.debug ? 'true' : 'false',
        BRANCH: this.props.configuration.branchName,
      },
      timeout: Duration.minutes(5),
    });
    bucket.grantRead(rxmZgwLambda);
    clientsecret.grantRead(rxmZgwLambda);
    table.grantReadData(rxmZgwLambda);

    return rxmZgwLambda;
  }

  // TODO: nieuwe subscription toevoegen die voor rxmission op appID filtert. De bestaande hieronder mag lekker algemeen blijven.
  // https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html

  private addRxMissionEventSubscription(rxMissionZgwLambda: Function) {
    const filterAppIds: string[] = getAppIdsByBranchName(this.props.configuration.branchName);
    return new Rule(this, 'rxm-rule', {
      description: 'Subscribe to new form events from the submission storage',
      eventPattern: {
        source: ['Submissionstorage'],
        detailType: ['New Form Processed'],
        detail: {
          Reference: [
            {
              prefix: filterAppIds,
            },
          ],
        },
      },
      targets: [
        new LambdaFunction(rxMissionZgwLambda),
      ],
    });
  }
}
