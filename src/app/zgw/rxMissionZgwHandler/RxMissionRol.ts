import { SubmissionZaakProperties } from './RxMissionZgwConfiguration';
import { SubmissionData } from '../../submission/Database';
import { Submission } from '../../submission/SubmissionSchema';
import { SubmissionUtils } from '../SubmissionUtils';
import { ZgwClient } from '../zgwClient/ZgwClient';
import { ZakenApiRolResponse } from '../zgwClient/model/ZakenApiRol.model';
import { Organisation, Person, User, userFromIdAndType } from '../../shared/User';
import { UserType } from '../../shared/UserType';

interface RXMissionRolConfig {
  zgwClient: ZgwClient;
  submissionZaakProperties: SubmissionZaakProperties;
}

/**
 * Adds rol(len) to a zaak
 * Extracting the needed data from the submission and submissionProperties to build the right request(s)
 * The types in ZakenApiRol can be used to build the RolRequest
 */
export class RXMissionRol {
  private zgwClient: ZgwClient;
  private submissionZaakProperties: SubmissionZaakProperties;

  constructor(config: RXMissionRolConfig) {
    this.zgwClient = config.zgwClient;
    this.submissionZaakProperties = config.submissionZaakProperties;
  }

  public async addRolToZaak(zaak: string, parsedSubmission: Submission, submission: SubmissionData) {
    console.debug(this.submissionZaakProperties);
    // Build the RolRequest based on submission and submissionZaakProperties
    // Maybe even add two roles (belanghebbende) if needed
    const email = SubmissionUtils.findEmail(parsedSubmission);
    const telefoon = SubmissionUtils.findTelefoon(parsedSubmission);
    const name = parsedSubmission.data.naamIngelogdeGebruiker;
    const hasContactDetails = !!email || !!telefoon;
    if (!hasContactDetails || !name) {
      console.log('No contact information found in submission. Notifications cannot be send.');
    }
    let userType: UserType;
    if (parsedSubmission.bsn) {
      userType = 'person';
    } else if (parsedSubmission.kvknummer) {
      userType = 'organisation';
    } else {
      console.warn('No BSN or KVK found so a rol will not be created.');
      return;
    }
    const user = userFromIdAndType(submission.userId, userType);
    await this.createRol({ zaak, user, email, telefoon, name });
  };

  private async createRol(config: {
    zaak: string;
    user: User;
    email?: string;
    telefoon?: string;
    name?: string;
  }): Promise<ZakenApiRolResponse> {
    if (config.user instanceof Person) {
      return this.zgwClient.addBsnRoleToZaak(config.zaak, config.user.bsn, config.email, config.telefoon, config.name);
    } else if (config.user instanceof Organisation) {
      return this.zgwClient.addKvkRoleToZaak(config.zaak, config.user.identifier, config.email, config.telefoon, config.name);
    } else {
      throw Error('Unexpectedly didnt get a valid usertype');
    }
  }
}

