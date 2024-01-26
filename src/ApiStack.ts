
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { GetFormOverviewFunction } from './app/get-form-overview/getFormOverview-function';
import { ListSubmissionsFunction } from './app/listSubmissions/listSubmissions-function';
import { Configurable } from './Configuration';
import { Statics } from './statics';
import { SubmissionSnsEventHandler } from './SubmissionSnsEventHandler';
import { SubmissionsTopic } from './SubmissionsTopic';

interface ApiStackProps extends StackProps, Configurable {};
/**
 * Contains all API-related resources.
 */
export class ApiStack extends Stack {

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const internalTopic = new SubmissionsTopic(this, 'submissions', { publishingAccountIds: props.configuration.allowedAccountIdsToPublishToSNS });

    let topicArns = [internalTopic.topic.topicArn];
    if (props.configuration.subscribeToTopicArns) {
      topicArns = topicArns.concat(props.configuration.subscribeToTopicArns);
    }

    new SubmissionSnsEventHandler(this, 'submissionhandler', {
      topicArns: topicArns,
    });


    const api = this.createApi();

    //TODO: move later on
    const formOverviewFunction = this.getFormOverviewFunction();
    const formOverviewApi = api.root.addResource('formoverview');
    formOverviewApi.addMethod('GET', new LambdaIntegration(formOverviewFunction), {
      apiKeyRequired: true,
      // requestParameters: {
      //   'method.request.querystring.key': true,
      // },
    });

    const listSubmissionsFunction = new ListSubmissionsLambda(this, 'listsubmissions');
    const listSubmissionsEndpoint = api.root.addResource('submissions');
    listSubmissionsEndpoint.addMethod('GET', new LambdaIntegration(listSubmissionsFunction.lambda), {
      apiKeyRequired: true,
      requestParameters: {
        'method.request.querystring.user_id': true,
        'method.request.querystring.user_type': true,
      },
    });
  }

  private createApi() {
    const api = new RestApi(this, 'submissionStorageApi', {
      description: 'api endpoints om submission storage data op te halen',
    });
    //PAste
    const plan = api.addUsagePlan('UsagePlanManagementApi', {
      name: 'management',
      description: 'used for rate-limit and api key',
      throttle: {
        rateLimit: 5,
        burstLimit: 10,
      },
    });
    const apiKey = api.addApiKey('ApiKeyManagement', {
      apiKeyName: 'ManagementApi',
      description: 'gebruikt voor alle methods van management API',
    });

    //fix for removing/adding usage plans to workaround old bug https://github.com/aws/aws-cdk/pull/13817
    plan.addApiKey(apiKey);

    plan.addApiStage({
      stage: api.deploymentStage,
    });

    return api;
  }

  private getFormOverviewFunction() {
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
    return formOverviewFunction;
  }
}


class ListSubmissionsLambda extends Construct {
  lambda: ListSubmissionsFunction;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const table = Table.fromTableName(this, 'table', StringParameter.valueForStringParameter(this, Statics.ssmSubmissionTableName));
    this.lambda = new ListSubmissionsFunction(this, 'list-submissions');
    table.grantReadData(this.lambda);
  }
}
