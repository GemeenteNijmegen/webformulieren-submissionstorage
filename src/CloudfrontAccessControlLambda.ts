import { CompositePrincipal, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { StorageAccessControlFunction } from './app/storageAccessControl/storageAccessControl-function';
import { Statics } from './statics';

export class CloudfrontAccessControlLambda extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const lambda = new StorageAccessControlFunction(this, 'access-control', {
      role: this.lambdaRole(),
    });

    new StringParameter(this, 'storageaccesslambdaarn', {
      stringValue: lambda.currentVersion.edgeArn,
      parameterName: Statics.ssmAccessEdgeLambdaArn,
    });

    /**
   * We use a custom service role, because this role needs to
   * assume a role in a different account. This way, the other
   * account can add this role arn to its relevant policy.
   */
  }

  private lambdaRole() {
    return new Role(this, 'role', {
      roleName: 'access-edge-lambda-role',
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('lambda.amazonaws.com'),
        new ServicePrincipal('edgelambda.amazonaws.com'),
      ),
      description: 'Role for access control to S3, requires assumable by edgelambda.amazonaws.com',
      managedPolicies: [{
        managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      }],
    });
  }
}
