import { SubmissionZaakProperties } from './RxMissionZgwConfiguration';
import { ZakenApiRolRequest } from '../zgwClient/model/ZakenApiRol.model';
import { ZgwClient } from '../zgwClient/ZgwClient';
import { SubmissionUtils } from '../SubmissionUtils';
import { Submission } from '../../submission/SubmissionSchema';
import { SubmissionData } from '../../submission/Database';

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
    let userType: 'natuurlijk_persoon' | 'niet_natuurlijk_persoon';
    if (parsedSubmission.bsn) {
      userType = 'natuurlijk_persoon';
    } else if (parsedSubmission.kvknummer) {
      userType = 'niet_natuurlijk_persoon';
    } else {
      console.warn('No BSN or KVK found so a rol will not be created.');
      return;
    }
    await this.zgwClient.createRol({ zaak, userType, identifier: submission.userId, email, telefoon, name});
  };
}

