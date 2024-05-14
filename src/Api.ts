import { Duration } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi, DomainNameOptions, EndpointType, SecurityPolicy } from 'aws-cdk-lib/aws-apigateway';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ITable, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';
import { ARecord, HostedZone, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGateway } from 'aws-cdk-lib/aws-route53-targets';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { RemoteParameters } from 'cdk-remote-stack';
import { Construct } from 'constructs';
import { DownloadFunction } from './app/download/download-function';
import { GetFormOverviewFunction } from './app/get-form-overview/getFormOverview-function';
import { ListSubmissionsFunction } from './app/listSubmissions/listSubmissions-function';
import { Statics } from './statics';

interface ApiProps {
  subdomain?: string;
}
export class Api extends Construct {
  private api: RestApi;
  private hostedZone?: IHostedZone;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    this.api = this.createApiWithApiKey(props.subdomain);

    const key = Key.fromKeyArn(this, 'key', StringParameter.valueForStringParameter(this, Statics.ssmDataKeyArn));

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
    });

    this.addListSubmissionsEndpoint(storageBucket, table);
    this.addFormOverviewEndpoint(table, storageBucket, downloadBucket);
    this.addDownloadEndpoint(storageBucket);
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
      requestParameters: {
        'method.request.querystring.user_id': true,
        'method.request.querystring.user_type': true,
      },
    });
    listSubmissionsEndpoint.addResource('{key}').addMethod('GET', new LambdaIntegration(lambda), {
      apiKeyRequired: true,
      requestParameters: {
        'method.request.querystring.user_id': true,
        'method.request.querystring.user_type': true,
      },
    });
  }

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
      requestParameters: {
        'method.request.querystring.key': true,
      },
    });
  }

  private addFormOverviewEndpoint(table: ITable, storageBucket: IBucket, downloadBucket: IBucket) {
    const formOverviewFunction = new GetFormOverviewFunction(this, 'getFormOverview', {
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: storageBucket.bucketName,
        DOWNLOAD_BUCKET_NAME: downloadBucket.bucketName,
      },
      timeout: Duration.minutes(10),
      memorySize: 1024,
    });
    storageBucket.grantRead(formOverviewFunction);
    downloadBucket.grantReadWrite(formOverviewFunction);

    const formOverviewApi = this.api.root.addResource('formoverview');
    formOverviewApi.addMethod('GET', new LambdaIntegration(formOverviewFunction), {
      apiKeyRequired: true,
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
