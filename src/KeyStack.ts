import { aws_kms as KMS, Stack, aws_iam as IAM, aws_ssm as SSM } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Statics } from './statics';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

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
}
