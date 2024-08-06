
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Api } from './Api';
import { Configurable } from './Configuration';
import { SubmissionSnsEventHandler } from './SubmissionSnsEventHandler';
import { SubmissionsTopic } from './SubmissionsTopic';
import { SubmissionZgwForwarder } from './SubmissionZgwForwarder';

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

    if (props.configuration.forwardToZgw) {
      new SubmissionZgwForwarder(this, 'zgw-forwarder', {});
    }

    new Api(this, 'api', { subdomain: props.configuration.subdomain, configuration: props.configuration });
  }
}
