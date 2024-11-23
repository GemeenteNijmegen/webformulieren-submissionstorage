import { Bsn, environmentVariables, S3Storage } from '@gemeentenijmegen/utils';
import 'dotenv/config';
import { RXMissionDocument } from './RXMissionDocument';
import { RXMissionZaak } from './RxMissionZaak';
import { RxMissionZgwConfiguration, SubmissionZaakProperties } from './RxMissionZgwConfiguration';
import { UserType } from '../../shared/UserType';
import { Database, DynamoDBDatabase, SubmissionData } from '../../submission/Database';
import { Submission, SubmissionSchema } from '../../submission/SubmissionSchema';
import { SubmissionUtils } from '../SubmissionUtils';
import { ZgwClient } from '../zgwClient/ZgwClient';

const envKeys = [
  'BUCKET_NAME',
  'TABLE_NAME',
  'ZAAKTYPE',
  'ROLTYPE',
  'ZAKEN_API_URL',
  'DOCUMENTEN_API_URL',
] as const;


export class RxMissionZgwHandler {
  private storage: S3Storage;
  private database: Database;
  private zgwClient: ZgwClient;
  // private rxmConfig: RxMissionZgwConfiguration;
  private submissionZaakProperties: SubmissionZaakProperties;

  constructor(_rxMissionZgwConfiguration: RxMissionZgwConfiguration, submissionZaakProperties: SubmissionZaakProperties) {
    // Nog bepalen of we deze wel nodig gaan hebben, misschien wel als er wat generieke branch config toegevoegd wordt
    // this.rxmConfig = rxMissionZgwConfiguration;
    this.submissionZaakProperties = submissionZaakProperties;
    const env = environmentVariables(envKeys);
    this.storage = new S3Storage(env.BUCKET_NAME);
    this.database = new DynamoDBDatabase(env.TABLE_NAME);

    this.zgwClient = new ZgwClient({
      zaaktype: env.ZAAKTYPE, // Moet eruit
      roltype: env.ROLTYPE, // Moet eruit
      zakenApiUrl: env.ZAKEN_API_URL,
      documentenApiUrl: env.DOCUMENTEN_API_URL,
      name: 'Rxmission',
    });
  }


  async sendSubmissionToRxMission(key: string, userId: string, userType: UserType) {
    await this.zgwClient.init();

    // Get submission
    const submission = await this.database.getSubmission({ key, userId, userType });
    if (!submission) {
      throw Error(`Could not find submission ${key}`);
    }

    const parsedSubmission = SubmissionSchema.passthrough().parse(await this.submissionData(key));
    console.log('parsedsubmission: ', parsedSubmission.appId);
    const submissionAttachments: string[] = submission.attachments ?? [];
    if (process.env.DEBUG==='true') {
      console.debug('Submission', parsedSubmission, 'Attachments', submissionAttachments.length);
    }

    const zaak = new RXMissionZaak(this.zgwClient, this.submissionZaakProperties);
    const zgwZaak = await zaak.create(parsedSubmission);

    if (process.env.ADDROLE) { //TODO: ff uit kunnen zetten van rol, later conditie weghalen
      // We may have returned an existing zaak, in which role creation failed. If there are no roles added to the zaak, we try adding them.
      if (zgwZaak.rollen.length == 0) {
        // Originele ZgwForwardHandler opzet die vervangen moet worden
        await this.addRole(parsedSubmission, zgwZaak, submission);

        // const rol = new RXMissionRol({zgwClient: this.zgwClient, submissionZaakpropeties: this.submissionZaakProperties});
        // await rol.addRolToZaak()
      }
    }

    // We may have returned an existing zaak, in which some documents have been created.
    // Only start adding docs if the zaakinformatieobjecten count is different from attachments + pdf
    // TODO: check which attachments have already been added before adding all attachments again.
    if (zgwZaak.zaakinformatieobjecten.length < (submissionAttachments.length + 1)) {
      await this.uploadAttachment(key, zgwZaak.url, `${key}.pdf`);
      const uploads = submissionAttachments.map(async attachment => this.uploadAttachment(key, zgwZaak.url, 'attachments/' + attachment));
      await Promise.all(uploads);
    }
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
    if (!bytes) {
      throw Error('error converting file');
    }
    const blob = new Blob([bytes]);
    const document = new RXMissionDocument({
      identificatie: `${key}-${attachment}`,
      fileName: attachment,
      informatieObjectType: this.submissionZaakProperties.informatieObjectType ?? '',
      zgwClient: this.zgwClient,
      contents: blob,
    });
    return document.addToZaak(zaak);
  }

}
