export abstract class Statics {
  static readonly projectName: string = 'webformulieren-submissionstorage';
  static readonly repositoryOwner: string = 'gemeenteNijmegen';
  static readonly repository: string = 'webformulieren-submissionstorage';

  /**
   * Environments (in new lz)
   */
  static readonly gnBuildEnvironment = {
    account: '836443378780',
    region: 'eu-central-1',
  };

  static readonly appDevEnvironment = {
    account: '833119272131', //gn-sandbox-01
    region: 'eu-central-1',
  };

  static ssmDataKeyArn: string = `/${this.projectName}/dataKeyArn`;
  static ssmSubmissionBucketArn: string = `/${this.projectName}/submissionBucketArn`;
  static ssmSubmissionTableArn: string = `/${this.projectName}/submissionTableArn`;
}
