import { OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Statics } from './statics';

interface OriginAccessForS3Props {
  bucket: Bucket;
  originAccessIdentity?: OriginAccessIdentity;
}
/**
 * Setup origin access identity for cloudfront access. This must be provided
 * with a 'real' Bucket object so it can modify the resource policy, and may
 * be provided with an Origin Access Identity.
 */
export class OriginAccessForS3 extends Construct {
  constructor(scope: Construct, id: string, props: OriginAccessForS3Props) {
    super(scope, id);
    const originAccessIdentity = props.originAccessIdentity ?? new OriginAccessIdentity(this, 'publicresourcesbucket-oai');
    this.allowOriginAccessIdentityAccessToBucket(originAccessIdentity, props.bucket);
  }

  originAccessIdentityToParameter(originAccessIdentity: OriginAccessIdentity) {
    new StringParameter(this, 'oai', {
      stringValue: originAccessIdentity.originAccessIdentityId,
      parameterName: Statics.ssmSourceKeyArn,
      description: 'Cloudfront User ID for the origin access identity',
    });
  }
  /**
   * Allow listBucket to the origin access identity
   *
   * Necessary so cloudfront receives 404's as 404 instead of 403. This also allows
   * a listing of the bucket if no /index.html is present in the bucket.
   *
   * @param originAccessIdentity
   * @param bucket
   */
  allowOriginAccessIdentityAccessToBucket(originAccessIdentity: OriginAccessIdentity, bucket: Bucket) {
    const result = bucket.addToResourcePolicy(new PolicyStatement({
      resources: [
        `${bucket.bucketArn}`,
        `${bucket.bucketArn}/*`,
      ],
      actions: [
        's3:GetObject',
        's3:ListBucket',
      ],
      effect: Effect.ALLOW,
      principals: [originAccessIdentity.grantPrincipal],
    }),
    );
    console.debug(result);
    if (!result.statementAdded) {
      throw Error('Bucket policy not appended');
    };
  }
}
