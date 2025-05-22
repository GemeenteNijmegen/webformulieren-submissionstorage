import { Criticality } from '@gemeentenijmegen/aws-constructs';
import { Environment as CdkEnvironment } from 'aws-cdk-lib';
import { Statics } from './statics';

export interface Configurable {
  readonly configuration: Configuration;
}

/**
 * Make account and region required
 */
export interface Environment extends CdkEnvironment {
  account: string;
  region: string;
}

export interface Configuration {
  readonly deployFromEnvironment: Environment;
  readonly deployToEnvironment: Environment;

  /**
   * The branch name this configuration is used for
   */
  readonly branchName: string;

  /**
   * includePipelineValidationChcks
   */
  readonly includePipelineValidationChecks: boolean;

  /**
   * Allow this project's SNS topic to be published to
   * by other accounts. This allows access to lambda
   * execution roles named 'storesubmissions-lambda-role'.
   */
  readonly allowedAccountIdsToPublishToSNS?: string[];

  /**
   * A list of SNS topic ARNs to subscribe to.
   * Published submissions on this topic are then
   * processed.
   */
  readonly subscribeToTopicArns?: string[];

  /**
   * The subdomain of our main subdomain (`account`.csp-nijmegen.nl) this
   * API will be accessible at.
   */
  readonly subdomain?: string;

  /**
   * A list of CNAME records to register in the hosted zone
   * Note: key should be withou domain suffix (only subdomain).
   */
  readonly cnameRecords?: { [key: string]: string };

  /**
   * Set this boolean to setup DNSSEC
   */
  readonly useDnsSec?: boolean;

  /**
   * If set, the lambda's will use a lambda authorizer to verify and authorize users.
   * This authorizer uses tokens provided by our auth service.
   */
  readonly useGatewayAuthorizer?: boolean;

  /**
   * Forward submission to ZGW APIs feature flag
   * @default false
   */
  readonly forwardToZgw?: boolean;

  /**
   * RxMission application zgw forwarding of submissions enabled
   * Feature flag
   * Additional specific RxMission Configuration in rxMissionZgwHandler
   */
  readonly enableRxMissionZwgHandler?: boolean;

  /**
   * Enable dubug mode for some lambdas
   * @default false
   */
  readonly debug?: boolean;
  /**
   * Criticality for alarms
   */
  criticality: Criticality;
}

export function getConfiguration(branchName: string): Configuration {
  const configName = Object.keys(configurations).find((configurationName) => {
    const config = configurations[configurationName];
    return config.branchName == branchName;
  });
  if (configName) {
    return configurations[configName];
  }
  throw Error(`No configuration found for branch name ${branchName}`);
}

const configurations: { [name: string]: Configuration } = {
  development: {
    branchName: 'development',
    subdomain: 'api',
    deployFromEnvironment: Statics.gnBuildEnvironment,
    deployToEnvironment: Statics.appDevEnvironment,
    includePipelineValidationChecks: false,
    allowedAccountIdsToPublishToSNS: [
      Statics.acceptanceWebformulierenAccountId,
    ],
    subscribeToTopicArns: [
      'arn:aws:sns:eu-central-1:338472043295:eform-submissions',
    ],
    useGatewayAuthorizer: false,
    forwardToZgw: true,
    enableRxMissionZwgHandler: true,
    debug: true,
    criticality: new Criticality('low'),
  },
  acceptance: {
    branchName: 'acceptance',
    subdomain: 'api',
    deployFromEnvironment: Statics.gnBuildEnvironment,
    deployToEnvironment: Statics.appAccpEnvironment,
    includePipelineValidationChecks: false,
    allowedAccountIdsToPublishToSNS: [
      Statics.acceptanceWebformulierenAccountId,
    ],
    subscribeToTopicArns: [
      'arn:aws:sns:eu-central-1:338472043295:eform-submissions',
    ],
    useGatewayAuthorizer: false,
    enableRxMissionZwgHandler: false,
    criticality: new Criticality('low'),
  },
  production: {
    branchName: 'main',
    subdomain: 'api',
    deployFromEnvironment: Statics.gnBuildEnvironment,
    deployToEnvironment: Statics.appProdEnvironment,
    includePipelineValidationChecks: false,
    allowedAccountIdsToPublishToSNS: [
      Statics.productionWebformulierenAccountId,
    ],
    subscribeToTopicArns: [
      'arn:aws:sns:eu-central-1:147064197580:eform-submissions',
    ],
    useDnsSec: true,
    useGatewayAuthorizer: false,
    enableRxMissionZwgHandler: true,
    criticality: new Criticality('high'),
  },
};
