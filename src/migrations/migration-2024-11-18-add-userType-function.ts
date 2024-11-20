// ~~ Generated by projen. To modify, edit .projenrc.js and run "npx projen".
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Props for Migration20241118AddUserTypeFunction
 */
export interface Migration20241118AddUserTypeFunctionProps extends lambda.FunctionOptions {
}

/**
 * An AWS Lambda function which executes src/migrations/migration-2024-11-18-add-userType.
 */
export class Migration20241118AddUserTypeFunction extends lambda.Function {
  constructor(scope: Construct, id: string, props?: Migration20241118AddUserTypeFunctionProps) {
    super(scope, id, {
      description: 'src/migrations/migration-2024-11-18-add-userType.lambda.ts',
      ...props,
      runtime: new lambda.Runtime('nodejs20.x', lambda.RuntimeFamily.NODEJS),
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../assets/migrations/migration-2024-11-18-add-userType.lambda')),
    });
    this.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1', { removeInEdge: true });
  }
}