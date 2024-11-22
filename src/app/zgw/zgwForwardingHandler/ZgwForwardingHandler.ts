import { Bsn, environmentVariables, S3Storage } from '@gemeentenijmegen/utils';
import { Database, DynamoDBDatabase } from '../../submission/Database';
import { SubmissionSchema } from '../../submission/SubmissionSchema';
import { SubmissionUtils } from '../SubmissionUtils';
import { ZakenApiZaakResponse } from '../zgwClient/model/ZakenApiZaak.model';
import { ZaakNotFoundError, ZgwClient } from '../zgwClient/ZgwClient';

export class ZgwForwarderHandler {

  private storage!: S3Storage;
  private database!: Database;
  private zgw!: ZgwClient;

  constructor() {
    this.setup();
  }

  /**
   * Check for required environment variables, and create
   * storage and database objects to pass to handler.
   */
  private setup() {
    if (process.env.BUCKET_NAME == undefined) {
      throw Error('No bucket NAME provided, storing submissions will fail.');
    }
    if (process.env.TABLE_NAME == undefined) {
      throw Error('No table NAME provided, storing submissions will fail.');
    }
    this.storage = new S3Storage(process.env.BUCKET_NAME);
    this.database = new DynamoDBDatabase(process.env.TABLE_NAME);

    const env = environmentVariables(
      [
        'ZAAKTYPE',
        'ROLTYPE',
        'ZAAKSTATUS',
        'INFORMATIEOBJECTTYPE',
        'ZAKEN_API_URL',
        'DOCUMENTEN_API_URL',
      ],
    );

    this.zgw = new ZgwClient({
      zaaktype: env.ZAAKTYPE,
      zaakstatus: env.ZAAKSTATUS,
      roltype: env.ROLTYPE,
      informatieobjecttype: env.INFORMATIEOBJECTTYPE,
      zakenApiUrl: env.ZAKEN_API_URL,
      documentenApiUrl: env.DOCUMENTEN_API_URL,
      name: 'Webformulieren',
    });

  }

  async sendSubmissionToZgw(key: string, userId: string, userType: 'person' | 'organisation') {
    await this.zgw.init();

    // Get submission
    const submission = await this.database.getSubmission({ key, userId, userType });
    const parsedSubmission = SubmissionSchema.passthrough().parse(await this.submissionData(key));
    if (process.env.DEBUG==='true') {
      console.debug('Submission', parsedSubmission);
    }

    if (!submission) {
      throw Error(`Could not find submission ${key}`);
    }

    // Collect information for creating the role
    const email = SubmissionUtils.findEmail(parsedSubmission);
    const telefoon = SubmissionUtils.findTelefoon(parsedSubmission);
    const name = parsedSubmission.data.naamIngelogdeGebruiker;
    const hasContactDetails = !!email || !!telefoon;
    if (!hasContactDetails || !name) {
      console.log('No contact information found in submission. Notifications cannot be send.');
    }

    // Handle idempotency by checking if the zaak already exists
    try {
      const existingZaak = await this.zgw.getZaak(key);
      if (existingZaak) {
        console.log('Zaak exists, skipping');
        return;
      }
    } catch (error) {
      // If zaak not found is thrown that's a good thing we can continue
      // Otherwise log the error and stop processing
      if (!(error instanceof ZaakNotFoundError)) {
        console.error(error);
        return;
      }
    }

    // Create zaak
    const zaak: ZakenApiZaakResponse = await this.zgw.createZaak(key, submission.formTitle ?? 'Onbekend formulier'); // TODO expand with usefull fields
    // Set status for zaak
    if (zaak.url) {
      await this.zgw.addZaakStatus({ zaakUrl: zaak.url });
    }
    if (parsedSubmission.bsn) {
      await this.zgw.addBsnRoleToZaak(zaak.url, new Bsn(submission.userId), email, telefoon, name);
    } else if (parsedSubmission.kvknummer) {
      await this.zgw.addKvkRoleToZaak(zaak.url, submission.userId, email, telefoon, name);
    } else {
      console.warn('No BSN or KVK found so a rol will not be created.');
    }

    // Check if the zaak has attachments
    if (!submission.attachments) {
      throw Error('No attachments found');
    }

    // Upload attachments
    await this.uploadAttachment(key, zaak.url, `${key}.pdf`);
    const uploads = submission.attachments.map(async attachment => this.uploadAttachment(key, zaak.url, 'attachments/' + attachment));
    await Promise.all(uploads);

    // Check for voorkeurskanaal eigenschap and store it
    if (process.env.KANAALVOORKEUR_EIGENSCHAP) {
      const voorkeur = SubmissionUtils.findKanaalvoorkeur(parsedSubmission);
      if (voorkeur) {
        await this.zgw.addZaakEigenschap(zaak.url, process.env.KANAALVOORKEUR_EIGENSCHAP, voorkeur);
      }
    }

  }

  async submissionData(key: string) {
    const jsonFile = await this.storage.get(`${key}/submission.json`);
    if (jsonFile && jsonFile.Body) {
      const contents = await jsonFile.Body.transformToString();
      console.debug(contents);
      const message = JSON.parse(contents);
      return JSON.parse(message.Message);
    }
    throw Error('No submission file');
  }

  async uploadAttachment(key: string, zaak: string, attachment: string) {
    const attachmentKey = `${key}/${attachment}`;
    const inhoud = await this.storage.get(attachmentKey);
    const base64 = await inhoud?.Body?.transformToString('base64');
    return this.zgw.addDocumentToZaak(zaak, attachment, base64 ?? '');
  }

}
