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

const configurations: { [name: string] : Configuration } = {
  development: {
    branchName: 'development',
    deployFromEnvironment: Statics.gnBuildEnvironment,
    deployToEnvironment: Statics.appDevEnvironment,
    includePipelineValidationChecks: false,
    allowedAccountIdsToPublishToSNS: [
      Statics.acceptanceWebformulierenAccountId,
    ],
    subscribeToTopicArns: [
      'arn:aws:sns:eu-central-1:338472043295:eform-submissions',
    ],
  },
  production: {
    branchName: 'main',
    deployFromEnvironment: Statics.gnBuildEnvironment,
    deployToEnvironment: Statics.appProdEnvironment,
    includePipelineValidationChecks: false,
    allowedAccountIdsToPublishToSNS: [
      Statics.productionWebformulierenAccountId,
    ],
    subscribeToTopicArns: [
      'arn:aws:sns:eu-central-1:147064197580:eform-submissions',
    ],
  },
};
