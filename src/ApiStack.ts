
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Api } from './Api';
import { CloudFrontDistribution } from './CloudFrontDistribution';
import { Configurable } from './Configuration';
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

    const api = new Api(this, 'api');
    const distribution = new CloudFrontDistribution(this, 'cfdistribution', {
      apiGatewayDomain: api.domain(),
    });
    distribution.node.addDependency(api);
  }
}
