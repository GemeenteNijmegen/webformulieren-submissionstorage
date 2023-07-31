import { PermissionsBoundaryAspect } from '@gemeentenijmegen/aws-constructs';
import { Aspects, Stage, StageProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiStack } from './ApiStack';
import { Configurable, Configuration } from './Configuration';
import { Statics } from './statics';
import { StorageStack } from './StorageStack';

interface ApiStageProps extends StageProps, Configurable { }

/**
 * Stage responsible for the API Gateway and lambdas
 */
export class ApiStage extends Stage {

  readonly configuration: Configuration;

  constructor(scope: Construct, id: string, props: ApiStageProps) {
    super(scope, id, props);

    Tags.of(this).add('cdkManaged', 'yes');
    Tags.of(this).add('Project', Statics.projectName);
    Aspects.of(this).add(new PermissionsBoundaryAspect());

    this.configuration = props.configuration;
    const storageStack = new StorageStack(this, 'storage');
    new ApiStack(this, 'api').addDependency(storageStack);
  }
}
