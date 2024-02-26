import { Duration } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { ITable, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { GetFormOverviewFunction } from './app/get-form-overview/getFormOverview-function';
import { ListSubmissionsFunction } from './app/listSubmissions/listSubmissions-function';
import { Statics } from './statics';

export class Api extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const api = this.createApiWithApiKey();

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

    this.addListSubmissionsEndpoint(api, storageBucket, table);
    this.addFormOverviewEndpoint(api, storageBucket, downloadBucket);
  }

  private addListSubmissionsEndpoint(api: RestApi, storageBucket: IBucket, table: ITable) {
    const lambda = new ListSubmissionsFunction(this, 'list-submissions', {
      environment: {
        BUCKET_NAME: storageBucket.bucketName,
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadData(lambda);
    storageBucket.grantRead(lambda);

    const listSubmissionsEndpoint = api.root.addResource('submissions');
    listSubmissionsEndpoint.addMethod('GET', new LambdaIntegration(lambda), {
      apiKeyRequired: true,
      requestParameters: {
        'method.request.querystring.user_id': true,
        'method.request.querystring.user_type': true,
      },
    });
  }

  private createApiWithApiKey() {
    const api = new RestApi(this, 'api', {
      description: 'api endpoints om submission storage data op te halen',
    });
    //PAste
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

    //fix for removing/adding usage plans to workaround old bug https://github.com/aws/aws-cdk/pull/13817
    plan.addApiKey(apiKey);

    plan.addApiStage({
      stage: api.deploymentStage,
    });

    return api;
  }

  private addFormOverviewEndpoint(api: RestApi, storageBucket: IBucket, downloadBucket: IBucket) {
    const formOverviewFunction = new GetFormOverviewFunction(this, 'getFormOverview', {
      environment: {
        BUCKET_NAME: storageBucket.bucketName,
        DOWNLOAD_BUCKET_NAME: downloadBucket.bucketName,
      },
      timeout: Duration.minutes(10),
      memorySize: 1024,
    });
    storageBucket.grantRead(formOverviewFunction);
    downloadBucket.grantReadWrite(formOverviewFunction);

    const formOverviewApi = api.root.addResource('formoverview');
    formOverviewApi.addMethod('GET', new LambdaIntegration(formOverviewFunction), {
      apiKeyRequired: true,
    });
  }
}
