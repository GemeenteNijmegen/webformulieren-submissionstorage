import { Duration } from 'aws-cdk-lib';
import { AttributeType, BillingMode, ITable, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
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

      const zaakIdentifierMappingTable = this.zaakIdentifierMappingTable(key);

      const rxMissionZgwLambda = this.createRxMissionZgwHandlerLambda(storageBucket, table, zaakIdentifierMappingTable);
      this.addRxMissionEventSubscription(rxMissionZgwLambda);
    }
  }


  /**
   * Add a dynamoDB table for storing mapping between submission reference and zaakUrl
   * 
   * Not all ZGW-registration stores allow setting zaakID or adding a reference to the zaak. Because
   * creating a zaak is a multistage process, and lambda's may be invoked multiple times, we need to 
   * store a mappping between zaakUrl and reference, so subsequent invocations can verify if the zaak has
   * been (partially) created or not.
   *  
   * @param key encryption key for table
   * @returns Table
   */
  private zaakIdentifierMappingTable(key: IKey) {
    return new Table(this, 'zgw-submission-mapping', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: key,
    });
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
 * @param bucket S3 bucket containing submission information
 * @param submissionsTable Table containing submission information
 * @param mappingTable Table for storing submission reference to zaakUrl mappings. 
 * Necessary for idempotency.
 * @returns
 */
  private createRxMissionZgwHandlerLambda(bucket: IBucket, submissionsTable: ITable, mappingTable: ITable) {
    const clientsecret = Secret.fromSecretNameV2(this, 'client-secret-rxm', Statics.ssmRxMissionZgwClientSecret);

    const rxmZgwLambda = new RxmissionZgwFunction(this, 'rxm-function', {
      logRetention: RetentionDays.SIX_MONTHS,
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: submissionsTable.tableName,
        MAPPING_TABLE_NAME: mappingTable.tableName,
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
    submissionsTable.grantReadData(rxmZgwLambda);
    mappingTable.grantReadWriteData(rxmZgwLambda);

    return rxmZgwLambda;
  }

  // TODO: nieuwe subscription toevoegen die voor rxmission op appID filtert. De bestaande hieronder mag lekker algemeen blijven.
  // https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html

  private addRxMissionEventSubscription(rxMissionZgwLambda: Function) {
    const filterAppIds: string[] = getAppIdsByBranchName(this.props.configuration.branchName);
    console.log('filterappIds', filterAppIds);
    return new Rule(this, 'rxm-rule', {
      description: 'Subscribe to new form events from the submission storage',
      eventPattern: {
        source: ['Submissionstorage'],
        detailType: ['New Form Processed'],
        detail: {
          Reference: filterAppIds.map((appId) => ({
            prefix: appId,
          })),
        },
      },
      targets: [
        new LambdaFunction(rxMissionZgwLambda),
      ],
    });
  }
}
