// ~~ Generated by projen. To modify, edit .projenrc.js and run "npx projen".
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Props for GetFormOverviewFunction
 */
export interface GetFormOverviewFunctionProps extends lambda.FunctionOptions {
}

/**
 * An AWS Lambda function which executes src/app/formOverview/getFormOverview/getFormOverview.
 */
export class GetFormOverviewFunction extends lambda.Function {
  constructor(scope: Construct, id: string, props?: GetFormOverviewFunctionProps) {
    super(scope, id, {
      description: 'src/app/formOverview/getFormOverview/getFormOverview.lambda.ts',
      ...props,
      runtime: new lambda.Runtime('nodejs22.x', lambda.RuntimeFamily.NODEJS),
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../../assets/app/formOverview/getFormOverview/getFormOverview.lambda')),
    });
    this.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1', { removeInEdge: true });
  }
}