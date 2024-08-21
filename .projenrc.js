const { GemeenteNijmegenCdkApp } = require('@gemeentenijmegen/projen-project-type');
const project = new GemeenteNijmegenCdkApp({
  name: 'webformulieren-submissionstorage',
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  devDeps: [
    '@gemeentenijmegen/projen-project-type',
    '@aws-sdk/client-secrets-manager',
    '@types/sns-validator',
    'aws-sdk-client-mock',
    '@types/jsonwebtoken',
  ],
  deps: [
    '@gemeentenijmegen/aws-constructs',
    '@gemeentenijmegen/dnssec-record',
    '@gemeentenijmegen/utils',
    '@gemeentenijmegen/apigateway-http',
    '@types/aws-lambda',
    'sns-validator',
    'zod',
    '@aws-sdk/client-s3',
    '@aws-sdk/client-eventbridge',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/s3-request-presigner',
    'axios',
    'dotenv',
    'cdk-remote-stack',
    'jose', // 🌮
    'jsonwebtoken',
  ],
  jestOptions: {
    jestConfig: {
      setupFiles: ['dotenv/config'],
      roots: ['test', 'src'],
    },
  },
  gitignore: [
    'src/app/submission/test/docker/',
  ],
  depsUpgradeOptions: {
    workflowOptions: {
      branches: ['development'],
      labels: ['auto-merge'],
    },
  },
  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
