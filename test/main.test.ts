import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Configuration } from '../src/Configuration';
import { PipelineStack } from '../src/PipelineStack';

test('Snapshot', () => {
  const app = new App();
  const configuration: Configuration = {
    branchName: 'stacktest',
    deployFromEnvironment: {
      account: '12345678',
      region: 'eu-central-1',
    },
    deployToEnvironment: {
      account: '12345678',
      region: 'eu-central-1',
    },
    includePipelineValidationChecks: false,
  };
  const stack = new PipelineStack(app, 'test', { env: configuration.deployFromEnvironment, configuration });

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
