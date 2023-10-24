import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ApiStack } from '../src/ApiStack';
import { Configuration } from '../src/Configuration';
import { PipelineStack } from '../src/PipelineStack';

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

test('Snapshot', () => {
  const app = new App();

  const stack = new PipelineStack(app, 'test', { env: configuration.deployFromEnvironment, configuration });

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});


test('Api Stack', () => {
  const app = new App();
  const apiStack = new ApiStack(app, 'api', { configuration });
  const template = Template.fromStack(apiStack);
  expect(template.resourceCountIs('AWS::SNS::Subscription', 2));
});
