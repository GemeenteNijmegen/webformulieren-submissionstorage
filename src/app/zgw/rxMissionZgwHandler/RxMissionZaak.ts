import { SubmissionZaakProperties } from './RxMissionZgwConfiguration';
import { Submission } from '../../submission/SubmissionSchema';
import { ZaakNotFoundError, ZgwClient } from '../zgwClient/ZgwClient';

export class RXMissionZaak {
  private zgwClient: ZgwClient;
  private submissionZaakProperties: SubmissionZaakProperties;

  constructor(zgwClient: ZgwClient, submissionZaakProperties: SubmissionZaakProperties) {
    this.zgwClient = zgwClient;
    this.submissionZaakProperties = submissionZaakProperties;
    console.dir(this.submissionZaakProperties, { depth: null, colors: true, compact: false, showHidden: true });

  }

  async create(submission: Submission) {
    // Handle idempotency by checking if the zaak already exists
    try {
      const existingZaak = await this.zgwClient.getZaak(submission.reference);
      if (existingZaak) {
        console.log(`Zaak with reference ${submission.reference} already exists, skipping`);
        return existingZaak;
      }
    } catch (error) {
      // If zaak not found is thrown that's a good thing we can continue
      // Otherwise log the error and stop processing
      if (!(error instanceof ZaakNotFoundError)) {
        console.error(error);
        throw error;
      }
    }

    const zaak = await this.zgwClient.createZaak({
      zaaktype: this.submissionZaakProperties.zaakType,
      formulier: this.submissionZaakProperties.formName ?? 'Onbekend formulier',
      formulierKey: submission.reference,
      toelichting: `Webformulier Devops ${submission.reference}`,
    });

    // Set zaakstatus
    await this.zgwClient.addZaakStatus({ zaakUrl: zaak.url, statusType: this.submissionZaakProperties.statusType, statustoelichting: 'RxMissionZaak DevOps webformulieren' });
    return zaak;
  }
}
