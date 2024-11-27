import { SubmissionZaakProperties } from './RxMissionZgwConfiguration';
import { SubmissionZaakReference } from './SubmissionZaakReference';
import { SubmissionData } from '../../submission/Database';
import { Submission } from '../../submission/SubmissionSchema';
import { ZaakNotFoundError, ZgwClient } from '../zgwClient/ZgwClient';

export class RXMissionZaak {
  private zgwClient: ZgwClient;
  private submissionZaakProperties: SubmissionZaakProperties;
  private zaakReference: SubmissionZaakReference;

  constructor(zgwClient: ZgwClient, submissionZaakProperties: SubmissionZaakProperties, zaakReference: SubmissionZaakReference) {
    this.zgwClient = zgwClient;
    this.submissionZaakProperties = submissionZaakProperties;
    this.zaakReference = zaakReference;
    console.dir(this.submissionZaakProperties, { depth: null, colors: true, compact: false, showHidden: true });
  }

  async create(submission: Submission, submissionData: SubmissionData) {
    // Handle idempotency by checking if the zaak already exists
    // Deze vlieger gaat niet op als er geen FormulierReference gebruikt wordt
    // Als het zaaknummer in RxMission aangemaakt wordt, dan weten we de id hier nog niet
    // Zie Readme voor uiteenzetting probleem

    try {
      const zaakMapping = await this.zaakReference.get(submission.reference);
      if (zaakMapping) {
        console.log('Zaak already mapped, returning existing zaak', zaakMapping);
        return await this.zgwClient.getZaakByUrl(zaakMapping.zaakUrl);
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
    this.zaakReference.set(submission.reference, zaak.url);

    // Set zaakstatus
    await this.zgwClient.addZaakStatus({ zaakUrl: zaak.url, statusType: this.submissionZaakProperties.statusType, statustoelichting: 'RxMissionZaak DevOps webformulieren' });
    return zaak;
  }
}
