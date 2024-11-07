
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

    // TODO: resubmit
    // idee om hier de api aan te maken en een nieuw resubmit endpoint aan te maken voor de RxMissionZgwForwarder die
    // dezelfde lambda aanroept als de eventbridge events.
    // Andere optie is een apart endpoint met een lambda die een event inschiet maar dan als resubmit ipv new form (lijkt beter idee)
    // Maakt het testen ook gemakkelijker opnieuw in te kunnen schieten
    if (props.configuration.forwardToZgw || props.configuration.enableRxMissionZwgHandler) {
      new SubmissionZgwForwarder(this, 'zgw-forwarder', {
        configuration: props.configuration,
      });
    }

    new Api(this, 'api', { subdomain: props.configuration.subdomain, configuration: props.configuration });
  }
}
