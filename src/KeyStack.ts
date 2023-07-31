import { aws_kms as KMS, Stack, aws_iam as IAM, aws_ssm as SSM } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Statics } from './statics';

/**
 * This stack creates a KMS key for encrypting
 * user data. For storage a table is created in
 * dynamoDB and a bucket in S3. The data in these
 * stores should be encrypted using this key.
 *
 * The key (arn) is available via the parameter store
 * parameter `Statics.ssmDataKeyArn`.
 */
export class KeyStack extends Stack {
  /**
   * key for encrypting user data
   */
  key: KMS.Key;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.key = new KMS.Key(this, 'kmskey', {
      enableKeyRotation: true,
      description: 'encryption key for user data',
      alias: `${Statics.projectName}/userdata`,
    });

    // Store key arn to be used in other stacks/projects
    new SSM.StringParameter(this, 'key', {
      stringValue: this.key.keyArn,
      parameterName: Statics.ssmDataKeyArn,
    });

  }

  setPolicies() {
    this.key.addToResourcePolicy(new IAM.PolicyStatement({
      sid: 'Allow direct access to key metadata to the account',
      effect: IAM.Effect.ALLOW,
      principals: [new IAM.AccountRootPrincipal],
      actions: [
        'kms:Describe*',
        'kms:Get*',
        'kms:List*',
        'kms:RevokeGrant',
      ],
      resources: [this.key.keyArn],
    }));

    this.key.addToResourcePolicy(new IAM.PolicyStatement({
      sid: 'Allow DynamoDB to directly describe the key',
      effect: IAM.Effect.ALLOW,
      principals: [new IAM.ServicePrincipal('dynamodb.amazonaws.com')],
      actions: [
        'kms:Describe*',
        'kms:Get*',
        'kms:List*',
      ],
      resources: ['*'], // Wildcard '*' required
    }));

    this.key.addToResourcePolicy(new IAM.PolicyStatement({
      sid: 'Allow S3 to directly describe the key',
      effect: IAM.Effect.ALLOW,
      principals: [new IAM.ServicePrincipal('s3.amazonaws.com')],
      actions: [
        'kms:Describe*',
        'kms:Get*',
        'kms:List*',
      ],
      resources: ['*'], // Wildcard '*' required
    }));
  }
}
