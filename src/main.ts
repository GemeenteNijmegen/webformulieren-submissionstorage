import { App } from 'aws-cdk-lib';
import { getConfiguration } from './Configuration';
import { PipelineStack } from './PipelineStack';

const app = new App();

const branchToBuild = process.env.BRANCH_NAME ?? 'development';
console.log(`building branch ${branchToBuild}`);
const configuration = getConfiguration(branchToBuild);

console.log('Building branch:', branchToBuild);

new PipelineStack(app, `pipeline-${configuration.branchName}`,
  {
    env: configuration.deployFromEnvironment,
    configuration: configuration,
  },
);

app.synth();
