import { PermissionsBoundaryAspect } from '@gemeentenijmegen/aws-constructs';
import { Aspects, Stage, StageProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiStack } from './ApiStack';
import { Configurable } from './Configuration';
import { Statics } from './statics';
import { StorageStack } from './StorageStack';

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

    const storageStack = new StorageStack(this, 'storage');

    const apiStack = new ApiStack(this, 'api', { configuration: props.configuration } );
    apiStack.addDependency(storageStack);
  }
}
