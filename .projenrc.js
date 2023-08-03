const { GemeenteNijmegenCdkApp } = require('@gemeentenijmegen/projen-project-type');
const project = new GemeenteNijmegenCdkApp({
  name: 'webformulieren-submissionstorage',
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  devDeps: [
    '@gemeentenijmegen/projen-project-type',
    '@types/sns-validator',
  ],
  deps: [
    '@gemeentenijmegen/aws-constructs',
    '@gemeentenijmegen/apigateway-http',
    '@types/aws-lambda',
    'sns-validator',
    'zod',
    'node-jq',
  ],

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
