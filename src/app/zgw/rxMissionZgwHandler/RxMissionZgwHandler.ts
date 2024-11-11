import { Bsn, environmentVariables, S3Storage } from '@gemeentenijmegen/utils';
import { Database, DynamoDBDatabase } from '../../submission/Database';
import { SubmissionSchema } from '../../submission/SubmissionSchema';
import { SubmissionUtils } from '../SubmissionUtils';
import { RxMissionZgwConfiguration } from './RxMissionZgwConfiguration';
import { ZaakNotFoundError, ZgwClient } from '../zgwClient/ZgwClient';

const envKeys = [
  'BUCKET_NAME',
  'TABLE_NAME',
  'ZAAKTYPE',
  'ROLTYPE',
  'ZAAKSTATUS',
  'INFORMATIEOBJECTTYPE',
  'ZAKEN_API_URL',
  'DOCUMENTEN_API_URL',
] as const;


export class RxMissionZgwHandler {
  private storage: S3Storage;
  private database: Database;
  private zgwClient: ZgwClient;
  private rxmConfig: RxMissionZgwConfiguration;

  constructor(rxMissionZgwConfiguration: RxMissionZgwConfiguration) {
    this.rxmConfig = rxMissionZgwConfiguration;
    const env = environmentVariables(envKeys);
    this.storage = new S3Storage(env.BUCKET_NAME);
    this.database = new DynamoDBDatabase(env.TABLE_NAME);

    this.zgwClient = new ZgwClient({
      zaaktype: env.ZAAKTYPE,
      zaakstatus: env.ZAAKSTATUS,
      roltype: env.ROLTYPE,
      informatieobjecttype: env.INFORMATIEOBJECTTYPE,
      zakenApiUrl: env.ZAKEN_API_URL,
      documentenApiUrl: env.DOCUMENTEN_API_URL,
      name: 'Rxmission',
    });
  }


  async sendSubmissionToRxMission(key: string, userId: string) {
    await this.zgwClient.init();

    // Get submission
    // TODO: alleen op kunnen halen uit S3 met key en verwerken (parsedsubmission). Checken of dit echt nodig gaat zijn of altijd bsn/kvk aanwezig
    const submission = await this.database.getSubmission({ key, userId });
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
      const existingZaak = await this.zgwClient.getZaak(key);
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
    // Gebruikt database data die ook uit parsedSubmission kan komen
    // Zaaktype meegeven
    console.debug('RxMissionZGWConfig. Which can be used to retrieve zaaktype from appId');
    console.dir(this.rxmConfig, { depth: null, colors: true, compact: false, showHidden: true });
    const zaak = await this.zgwClient.createZaak(key, submission.formTitle ?? 'Onbekend formulier'); // TODO expand with usefull fields

    // Geen rol toevoegen indien geen bsn of kvk
    // Nog checken bij RxMission of ze uberhaupt rollen hebben zonder bsn/kvk
    if (parsedSubmission.bsn) {
      await this.zgwClient.addBsnRoleToZaak(zaak.url, new Bsn(submission.userId), email, telefoon, name);
    } else if (parsedSubmission.kvknummer) {
      await this.zgwClient.addKvkRoleToZaak(zaak.url, submission.userId, email, telefoon, name);
    } else {
      console.warn('No BSN or KVK found so a rol will not be created.');
    }

    // Check if the zaak has attachments
    // TODO: checken in parsedsubmission of in S3
    if (!submission.attachments) {
      throw Error('No attachments found');
    }

    // Upload attachments
    // Nog checken bij RxMission of hier beperkingen aan zitten. Kunnen grote docs zijn met bouwzaken
    await this.uploadAttachment(key, zaak.url, `${key}.pdf`);
    const uploads = submission.attachments.map(async attachment => this.uploadAttachment(key, zaak.url, 'attachments/' + attachment));
    await Promise.all(uploads);
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
    return this.zgwClient.addDocumentToZaak(zaak, attachment, base64 ?? '');
  }

}
