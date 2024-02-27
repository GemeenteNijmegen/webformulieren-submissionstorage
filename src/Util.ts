import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { RemoteParameters } from 'cdk-remote-stack';
import { Construct } from 'constructs';
import { Statics } from './statics';

/**
 * Will import the project hosted zone
 * @param scope
 * @param fromRegion
 * @returns project hosted zone
 */

export function importProjectHostedZone(scope: Construct, fromRegion: string) {
  const zoneParams = new RemoteParameters(scope, 'zone-params', {
    path: Statics.ssmZonePath,
    region: fromRegion,
  });
  return HostedZone.fromHostedZoneAttributes(scope, 'zone', {
    hostedZoneId: zoneParams.get(Statics.ssmZoneId),
    zoneName: zoneParams.get(Statics.ssmZoneName),
  });
}
