import { SubmissionZaakProperties } from './RxMissionZgwConfiguration';
import { Submission } from '../../submission/SubmissionSchema';
import { ZaakNotFoundError, ZgwClient } from '../zgwClient/ZgwClient';
import { SubmissionData } from '../../submission/Database';

export class RXMissionZaak {
  private zgwClient: ZgwClient;
  private submissionZaakProperties: SubmissionZaakProperties;

  constructor(zgwClient: ZgwClient, submissionZaakProperties: SubmissionZaakProperties) {
    this.zgwClient = zgwClient;
    this.submissionZaakProperties = submissionZaakProperties;
    console.dir(this.submissionZaakProperties, { depth: null, colors: true, compact: false, showHidden: true });

  }

  async create(submission: Submission, submissionData: SubmissionData) {
    // Handle idempotency by checking if the zaak already exists
    // Deze vlieger gaat niet op als er geen FormulierReference gebruikt wordt
    // Als het zaaknummer in RxMission aangemaakt wordt, dan weten we de id hier nog niet
    // Zie Readme voor uiteenzetting probleem

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
      formulier: submissionData.formTitle ?? 'Onbekend formulier',
      formulierKey: submission.reference,
      toelichting: `Webformulierinzending ${submission.reference}`,
      productenOfDiensten: [this.submissionZaakProperties.productType ?? ''],
    });

    // Set zaakstatus
    await this.zgwClient.addZaakStatus({ zaakUrl: zaak.url, statusType: this.submissionZaakProperties.statusType, statustoelichting: 'RxMissionZaak DevOps webformulieren' });
    return zaak;
  }
}
