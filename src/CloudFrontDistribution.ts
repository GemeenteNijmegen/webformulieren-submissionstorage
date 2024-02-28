import { Duration } from 'aws-cdk-lib';
import { Certificate, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { AllowedMethods, CacheCookieBehavior, CacheHeaderBehavior, CachePolicy, CacheQueryStringBehavior, Distribution, HeadersFrameOption, HeadersReferrerPolicy, LambdaEdgeEventType, OriginAccessIdentity, OriginRequestHeaderBehavior, OriginRequestPolicy, PriceClass, ResponseHeadersPolicy, SecurityPolicyProtocol, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Version } from 'aws-cdk-lib/aws-lambda';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { BlockPublicAccess, Bucket, BucketEncryption, IBucket, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { RemoteParameters } from 'cdk-remote-stack';
import { Construct } from 'constructs';
import { Statics } from './statics';

interface CloudfrontDistributionStackProps {
  apiGatewayDomain?: string;
  domainNames?: string[];
  webAclId?: string;
}
export class CloudFrontDistribution extends Construct {
  private _responseHeadersPolicy: ResponseHeadersPolicy | undefined;
  constructor(scope: Construct, id: string, props?: CloudfrontDistributionStackProps) {
    super(scope, id);

    const certificate = this.certificate();
    const hostedZone = this.hostedZone();

    const domainNames = props?.domainNames ?? [];
    this.distribution([...domainNames, hostedZone.zoneName], certificate, props?.webAclId);
  }

  /** Certificate is imported from US-East-1 */
  private certificate() {
    const remoteCertificateArn = new RemoteParameters(this, 'remote-certificate-arn', {
      path: Statics.certificatePath,
      region: 'us-east-1',
    });
    const certificate = Certificate.fromCertificateArn(this, 'certificate', remoteCertificateArn.get(Statics.certificateArn));
    return certificate;
  }

  /** Hosted zone is imported from US-East-1 */
  private hostedZone() {
    const remoteHostedZone = new RemoteParameters(this, 'remote-hosted-zone', {
      path: Statics.ssmZonePath,
      region: 'us-east-1',
    });
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'hosted-zone', {
      hostedZoneId: remoteHostedZone.get(Statics.ssmZoneId),
      zoneName: remoteHostedZone.get(Statics.ssmZoneName),
    });
    return hostedZone;
  }

  distribution(domainNames?: string[], certificate?: ICertificate, webAclId?: string) {
    if (!certificate) { domainNames = undefined; };

    const edgeLambda = this.edgeLambdaFromUsEast();
    const storageBucket = this.storageBucket();
    const originAccessIdentity = new OriginAccessIdentity(this, 'publicresourcesbucket-oia');
    this.allowOriginAccessIdentityAccessToBucket(originAccessIdentity, storageBucket);

    const distribution = new Distribution(this, 'cf-distribution', {
      priceClass: PriceClass.PRICE_CLASS_100,
      domainNames,
      certificate,
      webAclId,
      defaultBehavior: {
        origin: new S3Origin(storageBucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        edgeLambdas: [
          {
            eventType: LambdaEdgeEventType.VIEWER_REQUEST,
            functionVersion: edgeLambda,
          },
        ],
        originRequestPolicy: new OriginRequestPolicy(this, 'cf-originrequestpolicy', {
          originRequestPolicyName: 'cfOriginRequestPolicy',
          headerBehavior: OriginRequestHeaderBehavior.allowList(
            'Accept-Charset',
            'Origin',
            'Accept',
            'Referer',
            'Accept-Language',
            'Accept-Datetime',
          ),
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachePolicy: new CachePolicy(this, 'cf-caching', {
          cachePolicyName: 'cfCachingSessionsMijnUitkering',
          cookieBehavior: CacheCookieBehavior.all(),
          headerBehavior: CacheHeaderBehavior.allowList('Authorization'),
          queryStringBehavior: CacheQueryStringBehavior.all(),
          defaultTtl: Duration.seconds(0),
          minTtl: Duration.seconds(0),
          maxTtl: Duration.seconds(1),
        }),
        responseHeadersPolicy: this.responseHeadersPolicy(),
      },
      logBucket: this.logBucket(),
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultRootObject: '/',
    });
    return distribution;
  }

  private edgeLambdaFromUsEast() {
    const remoteLambdaParameters = new RemoteParameters(this, 'remote-edge-lambda', {
      path: Statics.ssmAccessEdgeLambdaPath,
      region: 'us-east-1',
    });
    const edgeLambda = Version.fromVersionArn(this, 'access-control-function', remoteLambdaParameters.get(Statics.ssmAccessEdgeLambdaArn));
    return edgeLambda;
  }

  private storageBucket() {
    const key = Key.fromKeyArn(this, 'key', StringParameter.valueForStringParameter(this, Statics.ssmDataKeyArn));
    // IBucket requires encryption key, otherwise grant methods won't add the correct permissions
    const storageBucket = Bucket.fromBucketAttributes(this, 'bucket', {
      bucketArn: StringParameter.valueForStringParameter(this, Statics.ssmSubmissionBucketArn),
      encryptionKey: key,
    });
    return storageBucket;
  }

  /**
   * Get a set of (security) response headers to inject into the response
   * @returns {ResponseHeadersPolicy} cloudfront responseHeadersPolicy
   */
  private responseHeadersPolicy(): ResponseHeadersPolicy {
    if (!this._responseHeadersPolicy) {
      this._responseHeadersPolicy = new ResponseHeadersPolicy(this, 'responseheaders', {
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
          referrerPolicy: { referrerPolicy: HeadersReferrerPolicy.NO_REFERRER, override: true },
          strictTransportSecurity: { accessControlMaxAge: Duration.days(366), includeSubdomains: true, override: true },
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate',
              override: false,
            },
            {
              header: 'Pragma',
              value: 'no-cache',
              override: false,
            },
            {
              header: 'Expires',
              value: '0',
              override: false,
            },
          ],
        },
      });
    }
    return this._responseHeadersPolicy;
  }

  /**
   * Create a bucket to hold cloudfront logs
   * @returns s3.Bucket
   */
  private logBucket() {
    const cfLogBucket = new Bucket(this, 'CloudfrontLogs', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      eventBridgeEnabled: true,
      enforceSSL: true,
      encryption: BucketEncryption.S3_MANAGED,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      lifecycleRules: [
        {
          id: 'delete objects after 180 days',
          enabled: true,
          expiration: Duration.days(180),
        },
      ],
    });
    return cfLogBucket;
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
  allowOriginAccessIdentityAccessToBucket(originAccessIdentity: OriginAccessIdentity, bucket: IBucket) {
    if (!bucket.addToResourcePolicy(new PolicyStatement({
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
    )) {
      throw Error('Bucket policy not appended');
    };
  }
}
