const { GemeenteNijmegenCdkApp } = require('@gemeentenijmegen/projen-project-type');
const { LambdaRuntime } = require('projen/lib/awscdk');
const project = new GemeenteNijmegenCdkApp({
  name: 'webformulieren-submissionstorage',
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  devDeps: [
    '@gemeentenijmegen/projen-project-type',
    '@aws-sdk/client-secrets-manager',
    '@types/sns-validator',
    'aws-sdk-client-mock',
  ],
  deps: [
    '@gemeentenijmegen/aws-constructs',
    '@gemeentenijmegen/utils',
    '@gemeentenijmegen/apigateway-http',
    '@types/aws-lambda',
    'sns-validator',
    'zod',
    '@aws-sdk/client-s3',
    '@aws-sdk/client-dynamodb',
    'axios',
    'dotenv',
  ],
  jestOptions: {
    jestConfig: {
      setupFiles: ['dotenv/config'],
    }
  },
  gitignore: [
    'src/app/submission/test/docker/',
  ]
  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
