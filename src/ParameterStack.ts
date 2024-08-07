
import { Stack, StackProps } from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Configurable } from './Configuration';
import { Statics } from './statics';

interface ParameterStackProps extends StackProps, Configurable {};

export class ParameterStack extends Stack {
  constructor(scope: Construct, id: string, props: ParameterStackProps) {
    super(scope, id, props);

    this.zgwParameters();

  }


  private zgwParameters() {

    new StringParameter(this, 'ssm-zgw-1', {
      parameterName: Statics.ssmZgwZakenApiUrl,
      stringValue: '-',
    });

    new StringParameter(this, 'ssm-zgw-2', {
      parameterName: Statics.ssmZgwDocumentenApiUrl,
      stringValue: '-',
    });

    new StringParameter(this, 'ssm-zgw-3', {
      parameterName: Statics.ssmZgwZaaktype,
      stringValue: '-',
    });

    new StringParameter(this, 'ssm-zgw-4', {
      parameterName: Statics.ssmZgwZaakstatus,
      stringValue: '-',
    });

    new StringParameter(this, 'ssm-zgw-5', {
      parameterName: Statics.ssmZgwInformatieObjectType,
      stringValue: '-',
    });

    new StringParameter(this, 'ssm-zgw-6', {
      parameterName: Statics.ssmZgwClientId,
      stringValue: '-',
    });

    new Secret(this, 'secret-zgw-1', {
      secretName: Statics.ssmZgwClientSecret,
    });

  }

}
