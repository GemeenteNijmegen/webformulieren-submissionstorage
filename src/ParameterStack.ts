
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
    this.rxMissionZgwParameters();

    new StringParameter(this, 'ssm-submitted-formoverview-formnames-list', {
      parameterName: Statics.ssmSubmittedFormoverviewFormnames,
      stringValue: '-',
      description: 'Comma separated list with formnames to be retrieved for the overview of submitted forms. To check if all submitted forms were processed in the backend.'
    });

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

    new StringParameter(this, 'ssm-zgw-7', {
      parameterName: Statics.ssmZgwRoltype,
      stringValue: '-',
    });

    new Secret(this, 'secret-zgw-1', {
      secretName: Statics.ssmZgwClientSecret,
    });

  }
  private rxMissionZgwParameters() {

    new StringParameter(this, 'ssm-rxmission-zgw-1', {
      parameterName: Statics.ssmRxMissionZgwZakenApiUrl,
      stringValue: '-',
    });

    new StringParameter(this, 'ssm-rxmission-zgw-2', {
      parameterName: Statics.ssmRxMissionZgwDocumentenApiUrl,
      stringValue: '-',
    });

    new StringParameter(this, 'ssm-rxmission-zgw-3', {
      parameterName: Statics.ssmRxMissionZgwZaaktype,
      stringValue: '-',
    });

    new StringParameter(this, 'ssm-rxmission-zgw-4', {
      parameterName: Statics.ssmRxMissionZgwZaakstatus,
      stringValue: '-',
    });

    new StringParameter(this, 'ssm-rxmission-zgw-5', {
      parameterName: Statics.ssmRxMissionZgwInformatieObjectType,
      stringValue: '-',
    });

    new StringParameter(this, 'ssm-rxmission-zgw-6', {
      parameterName: Statics.ssmRxMissionZgwClientId,
      stringValue: '-',
    });

    new StringParameter(this, 'ssm-rxmission-zgw-7', {
      parameterName: Statics.ssmRxMissionZgwRoltype,
      stringValue: '-',
    });

    new Secret(this, 'secret-rxmission-zgw-1', {
      secretName: Statics.ssmRxMissionZgwClientSecret,
    });
  }

}
