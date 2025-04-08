import { Duration } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi, DomainNameOptions, EndpointType, SecurityPolicy, IdentitySource, RequestAuthorizer } from 'aws-cdk-lib/aws-apigateway';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ITable, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Key } from 'aws-cdk-lib/aws-kms';
import { ARecord, HostedZone, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGateway } from 'aws-cdk-lib/aws-route53-targets';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { RemoteParameters } from 'cdk-remote-stack';
import { Construct } from 'constructs';
import { DownloadFunction } from './app/download/download-function';
import { JwtAuthorizerFunction } from './app/formOverview/authorizer/JwtAuthorizer-function';
import { GetFormCountExpiredFunction } from './app/formOverview/getFormCount/getFormCountExpired-function';
import { GetFormOverviewFunction } from './app/formOverview/getFormOverview/getFormOverview-function';
import { ListFormOverviewsFunction } from './app/formOverview/listFormOverviews/listFormOverviews-function';
import { SubmittedFormOverviewFunction } from './app/formOverview/submittedFormOverview/submittedFormOverview-function';
import { ListSubmissionsFunction } from './app/listSubmissions/listSubmissions-function';
import { Configurable } from './Configuration';
import { Statics } from './statics';

interface ApiProps extends Configurable {
  subdomain?: string;
}
export class Api extends Construct {
  private api: RestApi;
  private hostedZone?: IHostedZone;

  private authorizer?: RequestAuthorizer;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    this.api = this.createApiWithApiKey(props.subdomain);

    const key = Key.fromKeyArn(this, 'key', StringParameter.valueForStringParameter(this, Statics.ssmDataKeyArn));

    // Only setup authorizer if configured. This is experimental functionality.
    this.authorizer = props.configuration.useGatewayAuthorizer ? this.jwtAuthorizer() : undefined;

    // IBucket requires encryption key, otherwise grant methods won't add the correct permissions
    const storageBucket = Bucket.fromBucketAttributes(this, 'bucket', {
      bucketArn: StringParameter.valueForStringParameter(this, Statics.ssmSubmissionBucketArn),
      encryptionKey: key,
    });

    const downloadBucket = Bucket.fromBucketAttributes(this, 'downloadBucket', {
      bucketArn: StringParameter.valueForStringParameter(this, Statics.ssmDownloadBucketArn),
      encryptionKey: key,
    });

    const table = Table.fromTableAttributes(this, 'table', {
      tableName: StringParameter.valueForStringParameter(this, Statics.ssmSubmissionTableName),
      encryptionKey: key,
      globalIndexes: ['formNameIndex'],
    });

    const formOverviewTable = Table.fromTableAttributes(this, 'formOverviewTable', {
      tableName: StringParameter.valueForStringParameter(this, Statics.ssmFormOverviewTableName),
      encryptionKey: key,
    });

    this.addListSubmissionsEndpoint(storageBucket, table);
    this.addDownloadEndpoint(storageBucket);

    this.addGetFormOverviewEndpoint(table, storageBucket, downloadBucket, formOverviewTable);
    this.addGetFormCountExpired(table, downloadBucket, formOverviewTable);
    this.addSubmittedFormOverview(table, downloadBucket, formOverviewTable);
    this.addListFormOverviewsEndpoint(formOverviewTable);
    this.addFormOverviewDownloadEndpoint(downloadBucket);
  }

  private createApiWithApiKey(subdomain?: string) {
    let domainNameProps;
    if (subdomain) {
      this.hostedZone = this.getHostedZone();
      domainNameProps = this.apiGatewayDomainNameProps(this.hostedZone);
    }

    const api = new RestApi(this, 'api', {
      description: 'api endpoints om submission storage data op te halen',
      domainName: domainNameProps,
    });

    const plan = api.addUsagePlan('UsagePlanManagementApi', {
      description: 'used for rate-limit and api key',
      throttle: {
        rateLimit: 5,
        burstLimit: 10,
      },
    });
    const apiKey = api.addApiKey('ApiKeyManagement', {
      description: 'gebruikt voor alle methods van submissions API',
    });

    plan.addApiKey(apiKey);

    plan.addApiStage({
      stage: api.deploymentStage,
    });

    if (subdomain && this.hostedZone) {
      new ARecord(this, 'api-dns', {
        target: RecordTarget.fromAlias(new ApiGateway(api)),
        zone: this.hostedZone,
      } );
    }

    return api;
  }
  private getHostedZone() {
    if (!this.hostedZone) {
      const parameters = new RemoteParameters(this, 'hostedzone-params', {
        path: `${Statics.ssmZonePath}/`,
        region: 'us-east-1',
        timeout: Duration.seconds(10),
      });
      const zoneName = parameters.get(Statics.ssmZoneName);
      const hostedZoneId = parameters.get(Statics.ssmZoneId);
      this.hostedZone = HostedZone.fromHostedZoneAttributes(this, 'hostedzone', {
        hostedZoneId,
        zoneName,
      });
    }
    return this.hostedZone;
  }

  apiGatewayDomainNameProps(hostedZone: IHostedZone) {
    return {
      certificate: this.certificate(),
      domainName: hostedZone.zoneName,
      endpointType: EndpointType.EDGE,
      securityPolicy: SecurityPolicy.TLS_1_2,
    } as DomainNameOptions;
  }

  private addListSubmissionsEndpoint(storageBucket: IBucket, table: ITable) {
    const lambda = new ListSubmissionsFunction(this, 'list-submissions', {
      environment: {
        BUCKET_NAME: storageBucket.bucketName,
        TABLE_NAME: table.tableName,
      },
      memorySize: 1024,
    });
    table.grantReadData(lambda);
    storageBucket.grantRead(lambda);

    const listSubmissionsEndpoint = this.api.root.addResource('submissions');
    listSubmissionsEndpoint.addMethod('GET', new LambdaIntegration(lambda), {
      apiKeyRequired: true,
      authorizer: this.authorizer,
      requestParameters: {
        'method.request.querystring.user_id': true,
        'method.request.querystring.user_type': true,
      },
    });
    listSubmissionsEndpoint.addResource('{key}').addMethod('GET', new LambdaIntegration(lambda), {
      apiKeyRequired: true,
      authorizer: this.authorizer,
      requestParameters: {
        'method.request.querystring.user_id': true,
        'method.request.querystring.user_type': true,
      },
    });
  }

  /**
   * Download endpoint for submissions and attachments
   * @param storageBucket
   */
  private addDownloadEndpoint(storageBucket: IBucket) {
    const downloadFunction = new DownloadFunction(this, 'download', {
      environment: {
        BUCKET_NAME: storageBucket.bucketName,
      },
      timeout: Duration.minutes(10),
      memorySize: 1024,
    });
    storageBucket.grantRead(downloadFunction);

    const downloadEndpoint = this.api.root.addResource('download');
    downloadEndpoint.addMethod('GET', new LambdaIntegration(downloadFunction), {
      apiKeyRequired: true,
      authorizer: this.authorizer,
      requestParameters: {
        'method.request.querystring.key': true,
      },
    });
  }

  /**
   * Construct a RequestAuthorizer (used by api gateway)
   * to secure the fromOverview endpoints as a PoC.
   * @returns
   */
  private jwtAuthorizer() {
    return new RequestAuthorizer(this, 'request-authorizer', {
      handler: new JwtAuthorizerFunction(this, 'authorizer-function', {
        environment: {
          TRUSTED_ISSUER: 'auth-service.sandbox-01.csp-nijmegen.nl',
        },
      }),
      identitySources: [IdentitySource.header('Authorization')],
    });
  }

  private addGetFormCountExpired(table: ITable, downloadBucket: IBucket, formOverviewTable: ITable) {
    const formCountExpiredFunction = new GetFormCountExpiredFunction(this, 'getFormCountExpired', {
      environment: {
        TABLE_NAME: table.tableName,
        DOWNLOAD_BUCKET_NAME: downloadBucket.bucketName,
        FORM_OVERVIEW_TABLE_NAME: formOverviewTable.tableName,
      },
      timeout: Duration.minutes(15),
      memorySize: 2048,
    });
    formOverviewTable.grantReadWriteData(formCountExpiredFunction);
    table.grantReadData(formCountExpiredFunction);
    downloadBucket.grantReadWrite(formCountExpiredFunction);

    new Rule(this, 'expired-cronjob', {
      description: 'Monthly form expiration overview creation',
      schedule: Schedule.cron({
        day: '1',
        hour: '3',
        minute: '8',
      }),
      targets: [new LambdaFunction(formCountExpiredFunction)],
    });
  }

  private addSubmittedFormOverview(table: ITable, downloadBucket: IBucket, formOverviewTable: ITable) {
    const submittedFormOverviewFunction = new SubmittedFormOverviewFunction(this, 'submittedFormOverview', {
      environment: {
        TABLE_NAME: table.tableName,
        DOWNLOAD_BUCKET_NAME: downloadBucket.bucketName,
        FORM_OVERVIEW_TABLE_NAME: formOverviewTable.tableName,
      },
      timeout: Duration.minutes(15),
      memorySize: 2048,
    });
    formOverviewTable.grantReadWriteData(submittedFormOverviewFunction);
    table.grantReadData(submittedFormOverviewFunction);
    downloadBucket.grantReadWrite(submittedFormOverviewFunction);
    // Grant read access to SSM param to retrieve formnames to include in overview
    StringParameter.fromStringParameterName(
      this,
      'SubmittedFormOverviewParam',
      Statics.ssmSubmittedFormoverviewFormnames,
    ).grantRead(submittedFormOverviewFunction);

    new Rule(this, 'submitted-cronjob', {
      description: 'Weekly submitted forms creation',
      schedule: Schedule.cron({
        weekDay: 'MON', // Every Monday https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
        hour: '4',
        minute: '1',
      }),
      targets: [new LambdaFunction(submittedFormOverviewFunction)],
    });
  }

  /**
   * Generate form overview endpoints
   * @param table
   * @param storageBucket
   * @param downloadBucket
   * @param formOverviewTable
   */
  private addGetFormOverviewEndpoint(table: ITable, storageBucket: IBucket, downloadBucket: IBucket, formOverviewTable: ITable) {
    const formOverviewFunction = new GetFormOverviewFunction(this, 'getFormOverview', {
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: storageBucket.bucketName,
        DOWNLOAD_BUCKET_NAME: downloadBucket.bucketName,
        FORM_OVERVIEW_TABLE_NAME: formOverviewTable.tableName,
      },
      timeout: Duration.minutes(10),
      memorySize: 1024,
    });
    formOverviewTable.grantReadWriteData(formOverviewFunction);
    table.grantReadData(formOverviewFunction);
    storageBucket.grantRead(formOverviewFunction);
    downloadBucket.grantReadWrite(formOverviewFunction);

    const formOverviewApi = this.api.root.addResource('formoverview');
    formOverviewApi.addMethod('GET', new LambdaIntegration(formOverviewFunction), {
      apiKeyRequired: true,
      authorizer: this.authorizer,
      requestParameters: {
        'method.request.querystring.formuliernaam': true,
        'method.request.querystring.startdatum': false,
        'method.request.querystring.einddatum': false,
        'method.request.querystring.appid': false,
        'method.request.querystring.responseformat': false,
      },
    });
  }

  /**
   * Lists the finished form overviews
   * @param formOverviewTable
   */
  private addListFormOverviewsEndpoint(formOverviewTable: ITable) {
    const listFormOverviewsFunction = new ListFormOverviewsFunction(this, 'listFormOverview', {
      environment: {
        FORM_OVERVIEW_TABLE_NAME: formOverviewTable.tableName,
        USE_GATEWAY_AUTHORIZER: this.authorizer ? 'true' : 'false',
      },
      timeout: Duration.minutes(10),
      memorySize: 1024,
    });
    formOverviewTable.grantReadData(listFormOverviewsFunction);
    const formOverviewApi = this.api.root.addResource('listformoverviews');
    formOverviewApi.addMethod('GET', new LambdaIntegration(listFormOverviewsFunction), {
      apiKeyRequired: true,
      authorizer: this.authorizer,
      requestParameters: {
        'method.request.querystring.maxresults': false,
        'method.request.querystring.appid': false,
        'method.request.querystring.formuliernaam': false,
      },
    });
  }

  /**
   * Download function for form overviews
   * @param downloadBucket
   */
  private addFormOverviewDownloadEndpoint(downloadBucket: IBucket) {
    const downloadFunction = new DownloadFunction(this, 'form-overview-download', {
      environment: {
        BUCKET_NAME: downloadBucket.bucketName,
      },
      timeout: Duration.minutes(10),
      memorySize: 1024,
    });
    downloadBucket.grantRead(downloadFunction);

    const downloadEndpoint = this.api.root.addResource('downloadformoverview');
    downloadEndpoint.addMethod('GET', new LambdaIntegration(downloadFunction), {
      apiKeyRequired: true,
      authorizer: this.authorizer,
      requestParameters: {
        'method.request.querystring.key': true,
      },
    });
  }

  /**
     * Get the certificate ARN from parameter store in us-east-1
     * @returns string Certificate ARN
     */
  private certificate() {
    const parameters = new RemoteParameters(this, 'params', {
      path: `${Statics.certificatePath}/`,
      region: 'us-east-1',
      timeout: Duration.seconds(10),
    });
    const certificateArn = parameters.get(Statics.certificateArn);
    const certificate = Certificate.fromCertificateArn(this, 'cert', certificateArn);
    return certificate;
  }

  /**
   * Clean and return the apigateway subdomain placeholder
   * https://${Token[TOKEN.246]}.execute-api.eu-west-1.${Token[AWS.URLSuffix.3]}/
   * which can't be parsed by the URL class.
   *
   * @returns a domain-like string cleaned of protocol and trailing slash
   */
  domain(): string {
    const url = this.api.url;
    if (!url) { return ''; }
    let cleanedUrl = url
      .replace(/^https?:\/\//, '') //protocol
      .replace(/\/$/, ''); //optional trailing slash
    return cleanedUrl;
  }
}
