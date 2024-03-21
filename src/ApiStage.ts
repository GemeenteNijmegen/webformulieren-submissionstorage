import { PermissionsBoundaryAspect } from '@gemeentenijmegen/aws-constructs';
import { Aspects, Stage, StageProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiStack } from './ApiStack';
import { Configurable } from './Configuration';
import { Statics } from './statics';
import { StorageStack } from './StorageStack';
import { UsEastStack } from './UsEastStack';

interface ApiStageProps extends StageProps, Configurable { }

/**
 * Stage responsible for the API Gateway and lambdas
 */
export class ApiStage extends Stage {

  constructor(scope: Construct, id: string, props: ApiStageProps) {
    super(scope, id, props);

    Tags.of(this).add('cdkManaged', 'yes');
    Tags.of(this).add('Project', Statics.projectName);
    Aspects.of(this).add(new PermissionsBoundaryAspect());

    const configuration = props.configuration;

    const storageStack = new StorageStack(this, 'storage', { configuration });


    const apiStack = new ApiStack(this, 'api', { configuration } );
    apiStack.addDependency(storageStack);
    if (configuration.subdomain) {
      const usEastStack = new UsEastStack(this, 'us-east', {
        env: { region: 'us-east-1' },
        accountHostedZoneRegion: 'eu-central-1',
        subdomain: configuration.subdomain,
        useDnsSec: configuration.useDnsSec,
      });
      apiStack.addDependency(usEastStack);
    }
  }
}
