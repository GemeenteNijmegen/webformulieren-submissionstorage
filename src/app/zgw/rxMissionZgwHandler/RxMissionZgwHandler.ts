import { Bsn, environmentVariables, S3Storage } from '@gemeentenijmegen/utils';
import { Database, DynamoDBDatabase, SubmissionData } from '../../submission/Database';
import { Submission, SubmissionSchema } from '../../submission/SubmissionSchema';
import { SubmissionUtils } from '../SubmissionUtils';
import { RXMissionZaak } from './RxMissionZaak';
import { RxMissionZgwConfiguration } from './RxMissionZgwConfiguration';
import { ZgwClient } from '../zgwClient/ZgwClient';
import 'dotenv/config';
import { RXMissionDocument } from './RXMissionDocument';

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
  private informatieObjectType: string;

  constructor(rxMissionZgwConfiguration: RxMissionZgwConfiguration) {
    this.rxmConfig = rxMissionZgwConfiguration;
    const env = environmentVariables(envKeys);
    this.informatieObjectType = env.INFORMATIEOBJECTTYPE;
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


  async sendSubmissionToRxMission(key: string, userId: string, userType: 'person' | 'organisation') {
    await this.zgwClient.init();

    // Get submission
    // TODO: alleen op kunnen halen uit S3 met key en verwerken (parsedsubmission). Checken of dit echt nodig gaat zijn of altijd bsn/kvk aanwezig
    const submission = await this.database.getSubmission({ key, userId, userType });
    const parsedSubmission = SubmissionSchema.passthrough().parse(await this.submissionData(key));
    if (process.env.DEBUG==='true') {
      console.debug('Submission', parsedSubmission);
    }

    if (!submission) {
      throw Error(`Could not find submission ${key}`);
    }

    // Create zaak
    // Gebruikt database data die ook uit parsedSubmission kan komen
    // Zaaktype meegeven
    console.debug('RxMissionZGWConfig. Which can be used to retrieve zaaktype from appId');
    console.dir(this.rxmConfig, { depth: null, colors: true, compact: false, showHidden: true });

    // TODO: vanaf dit stuk moet het per formulier anders worden gedaan afhankelijk van de config.
    // Deze zal steeds specifieker worden als we later bepaalde mappings toe gaan voegen.
    // Ander zaaktype en eventueel ook verschillende rollen en zaakeigenschappen per type formulier
    const zaak = new RXMissionZaak(this.zgwClient);
    const zgwZaak = await zaak.create(parsedSubmission, submission);

    // Geen rol toevoegen indien geen bsn of kvk
    // Nog checken bij RxMission of ze uberhaupt rollen hebben zonder bsn/kvk
    if (process.env.ADDROLE) { //TODO: ff uit kunnen zetten van rol, later conditie weghalen
      await this.addRole(parsedSubmission, zgwZaak, submission);
    }

    // Check if the zaak has attachments
    // TODO: checken in parsedsubmission of in S3
    if (!submission.attachments) {
      throw Error('No attachments found'); //TODO: geen attachments is ook prima?
    }

    // Upload attachments
    // Nog checken bij RxMission of hier beperkingen aan zitten. Kunnen grote docs zijn met bouwzaken
    await this.uploadAttachment(key, zgwZaak.url, `${key}.pdf`);
    const uploads = submission.attachments.map(async attachment => this.uploadAttachment(key, zgwZaak.url, 'attachments/' + attachment));
    await Promise.all(uploads);
  }

  private async addRole(parsedSubmission: Submission, zgwZaak: any, submission: SubmissionData) {
    // Collect information for creating the role
    const email = SubmissionUtils.findEmail(parsedSubmission);
    const telefoon = SubmissionUtils.findTelefoon(parsedSubmission);
    const name = parsedSubmission.data.naamIngelogdeGebruiker;
    const hasContactDetails = !!email || !!telefoon;
    if (!hasContactDetails || !name) {
      console.log('No contact information found in submission. Notifications cannot be send.');
    }
    if (parsedSubmission.bsn) {
      await this.zgwClient.addBsnRoleToZaak(zgwZaak.url, new Bsn(submission.userId), email, telefoon, name);
    } else if (parsedSubmission.kvknummer) {
      await this.zgwClient.addKvkRoleToZaak(zgwZaak.url, submission.userId, email, telefoon, name);
    } else {
      console.warn('No BSN or KVK found so a rol will not be created.');
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
    const bytes = await inhoud?.Body?.transformToByteArray();
    if(!bytes) {
      throw Error('error converting file');
    }
    const blob = new Blob([bytes]);
    const document = new RXMissionDocument({
      identificatie: `${key}-${attachment}`,
      fileName: attachment,
      informatieObjectType: this.informatieObjectType,
      zgwClient: this.zgwClient,
      contents: blob,
    });
    return await document.addToZaak(zaak);
  }

}
