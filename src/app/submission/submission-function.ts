// ~~ Generated by projen. To modify, edit .projenrc.js and run "npx projen".
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Props for SubmissionFunction
 */
export interface SubmissionFunctionProps extends lambda.FunctionOptions {
}

/**
 * An AWS Lambda function which executes src/app/submission/submission.
 */
export class SubmissionFunction extends lambda.Function {
  constructor(scope: Construct, id: string, props?: SubmissionFunctionProps) {
    super(scope, id, {
      description: 'src/app/submission/submission.lambda.ts',
      ...props,
      runtime: new lambda.Runtime('nodejs18.x', lambda.RuntimeFamily.NODEJS),
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../assets/app/submission/submission.lambda')),
    });
    this.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1', { removeInEdge: true });
  }
}