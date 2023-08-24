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
}

export function getConfiguration(branchName: string): Configuration {
  const configName = Object.keys(configurations).find((configurationName) => {
    const config = configurations[configurationName];
    return config.branchName == branchName;
  });
  if(configName) {
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
  },
  production: {
    branchName: 'main',
    deployFromEnvironment: Statics.gnBuildEnvironment,
    deployToEnvironment: Statics.appProdEnvironment,
    includePipelineValidationChecks: false,
  },
};
