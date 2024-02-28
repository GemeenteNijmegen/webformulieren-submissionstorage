export abstract class Statics {
  static readonly projectName: string = 'webformulieren-submissionstorage';
  static readonly repositoryOwner: string = 'GemeenteNijmegen';
  static readonly repository: string = 'webformulieren-submissionstorage';

  /**
   * Environments (in new lz)
   */
  static readonly gnBuildEnvironment = {
    account: '836443378780',
    region: 'eu-central-1',
  };

  static readonly appDevEnvironment = {
    account: '358927146986', //gn-submission-storage-dev
    region: 'eu-central-1',
  };

  static readonly appProdEnvironment = {
    account: '606343885688', //gn-submission-storag-prod
    region: 'eu-central-1',
  };

  static readonly acceptanceWebformulierenAccountIdOldLz = '315037222840';
  static readonly productionWebformulierenAccountIdOldLz = '196212984627';

  static readonly acceptanceWebformulierenAccountId = '338472043295';
  static readonly productionWebformulierenAccountId = '147064197580';

  // Managed in dns-managment project:
  static readonly accountRootHostedZonePath: string = '/gemeente-nijmegen/account/hostedzone';
  static readonly accountRootHostedZoneId: string = `${this.accountRootHostedZonePath}/id`;
  static readonly accountRootHostedZoneName: string = `${this.accountRootHostedZonePath}/name`;

  // The KSM key parameters for each account
  static readonly ssmAccountDnsSecKmsKey: string = '/gemeente-nijmegen/account/dnssec/kmskey/arn';

  static readonly certificatePath: string = `/${this.projectName}/certificates`;
  static readonly certificateArn: string = `/${this.certificatePath}/certificate-arn`;

  static readonly ssmZonePath: string = `/${this.projectName}/zone`;
  static readonly ssmZoneId: string = `${this.ssmZonePath}/id`;
  static readonly ssmZoneName: string = `${this.ssmZonePath}/name`;

  static readonly ssmAccessEdgeLambdaPath: string = `/${this.projectName}/accesslambda`;
  static readonly ssmAccessEdgeLambdaArn: string = `${this.ssmAccessEdgeLambdaPath}/arn`;

  static ssmDataKeyArn: string = `/${this.projectName}/dataKeyArn`;
  static ssmSubmissionBucketArn: string = `/${this.projectName}/submissionBucketArn`;
  static ssmDownloadBucketArn: string = `/${this.projectName}/downloadBucketArn`;
  static ssmSourceBucketArn: string = `/${this.projectName}/sourceBucketArn`;
  static ssmSourceKeyArn: string = `/${this.projectName}/sourceKeyArn`;
  static ssmSubmissionBucketName: string = `/${this.projectName}/submissionBucketName`;
  static ssmDownloadBucketName: string = `/${this.projectName}/downloadBucketName`;
  static ssmSubmissionTableArn: string = `/${this.projectName}/submissionTableArn`;
  static ssmSubmissionTableName: string = `/${this.projectName}/submissionTableName`;
  static ssmFormIoBaseUrl: string = `/${this.projectName}/formIoBaseUrl`;

  static secretFormIoApiKey: string = `/${this.projectName}/FormIoAPIKey`;
}
