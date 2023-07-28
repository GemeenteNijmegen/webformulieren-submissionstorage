import { PermissionsBoundaryAspect } from '@gemeentenijmegen/aws-constructs';
import { Aspects, Stack, Stage, StageProps, Tags } from 'aws-cdk-lib';
import { MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { Configurable, Configuration } from './Configuration';
import { Statics } from './statics';

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
    new ApiStack(this, 'api');
  }
}

/**
 * Contains all API-related resources.
 */
class ApiStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const api = new RestApi(this, 'gateway');
    api.root.addMethod('ANY', new MockIntegration({
      integrationResponses: [
        { statusCode: '200' },
      ],
      passthroughBehavior: PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
      },
    }), {
      methodResponses: [
        { statusCode: '200' },
      ],
    });
  }
}
