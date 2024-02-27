import { DnssecRecordStruct } from '@gemeentenijmegen/dnssec-record';
import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { CfnDNSSEC, CfnKeySigningKey, HostedZone, HostedZoneAttributes, IHostedZone, NsRecord } from 'aws-cdk-lib/aws-route53';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { RemoteParameters } from 'cdk-remote-stack';
import { Construct } from 'constructs';
import { Statics } from './statics';

export interface UsEastStackProps extends StackProps {
  accountHostedZoneRegion: string;
  subdomain: string;
  alternativeDomainNames?: string[];
  useDnsSec?: boolean;
}

export class UsEastStack extends Stack {
  subdomain: string;

  constructor(scope: Construct, id: string, props: UsEastStackProps) {
    super(scope, id, props);
    this.subdomain = props.subdomain;

    Tags.of(this).add('cdkManaged', 'yes');
    Tags.of(this).add('Project', Statics.projectName);

    const attributes = this.getZoneAttributesFromRegion(props);
    const accountHostedZone = HostedZone.fromHostedZoneAttributes(this, 'account-hosted-zone', attributes);
    const hostedZone = this.setupProjectHostedZone(accountHostedZone);
    this.setupCertificate(hostedZone, props);
    if (props.useDnsSec) {
      this.setupDNSSEC(`${props.subdomain}-ksk`, hostedZone, accountHostedZone);
    }
  }

  /**
   * Creata a subdomain for this project
   * @param accountHostedZone
   * @returns
   */
  private setupProjectHostedZone(accountHostedZone: IHostedZone) {

    // Create hosted zone
    const zone = new HostedZone(this, 'managment-csp', {
      zoneName: `${this.subdomain}.${accountHostedZone.zoneName}`,
    });

    // Export string parameters
    new StringParameter(this, 'hostedzone-id', {
      stringValue: zone.hostedZoneId,
      parameterName: Statics.ssmZoneId,
    });

    new StringParameter(this, 'hostedzone-name', {
      stringValue: zone.zoneName,
      parameterName: Statics.ssmZoneName,
    });

    // Register our new subdomain
    if (!zone.hostedZoneNameServers) {
      throw Error('Expected name servers to be set!');
    }
    new NsRecord(this, 'ns-record', {
      zone: accountHostedZone,
      values: zone.hostedZoneNameServers,
      recordName: this.subdomain,
    });

    return zone;
  }

  /**
   * Create a certificate for this project
   * @param hostedZone
   * @param props
   */
  setupCertificate(hostedZone: HostedZone, props: UsEastStackProps) {

    // Only do DNS validation automatically when we only have our hostedzone
    let validation = CertificateValidation.fromDns();
    if (!props.alternativeDomainNames) {
      validation = CertificateValidation.fromDns(hostedZone);
    }

    const certificate = new Certificate(this, 'certificate', {
      domainName: hostedZone.zoneName,
      subjectAlternativeNames: props.alternativeDomainNames,
      validation: validation,
    });

    new StringParameter(this, 'cert-arn', {
      stringValue: certificate.certificateArn,
      parameterName: Statics.certificateArn,
    });

  }

  /**
   * Finds the account hostedzone name and id in the given region
   * @param props
   * @returns
   */
  private getZoneAttributesFromRegion(props: UsEastStackProps): HostedZoneAttributes {
    const parameters = new RemoteParameters(this, 'parameters', {
      path: Statics.accountRootHostedZonePath,
      region: props.accountHostedZoneRegion,
    });
    const zoneId = parameters.get(Statics.accountRootHostedZoneId);
    const zoneName = parameters.get(Statics.accountRootHostedZoneName);
    return {
      hostedZoneId: zoneId,
      zoneName: zoneName,
    };
  }

  private setupDNSSEC(kskName: string, hostedZone: IHostedZone, accountRootZone: IHostedZone) {
    // KSK
    const accountDnssecKmsKeyArn = StringParameter.valueForStringParameter(this, Statics.ssmAccountDnsSecKmsKey);
    const dnssecKeySigning = new CfnKeySigningKey(this, 'dnssec-keysigning-key', {
      name: kskName,
      status: 'ACTIVE',
      hostedZoneId: hostedZone.hostedZoneId,
      keyManagementServiceArn: accountDnssecKmsKeyArn,
    });

    // Enable DNSSEC
    const dnssec = new CfnDNSSEC(this, 'dnssec', {
      hostedZoneId: hostedZone.hostedZoneId,
    });
    dnssec.node.addDependency(dnssecKeySigning);

    // DS record
    const dnssecRecord = new DnssecRecordStruct(this, 'dnssec-record', {
      keySigningKey: dnssecKeySigning,
      hostedZone: hostedZone,
      parentHostedZone: accountRootZone,
    });
    dnssecRecord.node.addDependency(dnssec);

  }


}
