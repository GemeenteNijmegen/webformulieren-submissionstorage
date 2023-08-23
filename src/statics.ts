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

  static ssmDataKeyArn: string = `/${this.projectName}/dataKeyArn`;
  static ssmSubmissionBucketArn: string = `/${this.projectName}/submissionBucketArn`;
  static ssmSourceBucketArn: string = `/${this.projectName}/sourceBucketArn`;
  static ssmSourceKeyArn: string = `/${this.projectName}/sourceKeyArn`;
  static ssmSubmissionBucketName: string = `/${this.projectName}/submissionBucketName`;
  static ssmSubmissionTableArn: string = `/${this.projectName}/submissionTableArn`;
  static ssmSubmissionTableName: string = `/${this.projectName}/submissionTableName`;
  static ssmSubmissionTopicArn: string = `/${this.projectName}/ssmSubmissionTopicArn`;
  static ssmFormIoBaseUrl: string = `/${this.projectName}/formIoBaseUrl`;

  static secretFormIoApiKey: string = `/${this.projectName}/FormIoAPIKey`;
}
