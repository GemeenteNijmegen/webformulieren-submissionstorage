import { environmentVariables, S3Storage } from '@gemeentenijmegen/utils';
import 'dotenv/config';
import { RXMissionDocument } from './RXMissionDocument';
import { RXMissionRol } from './RxMissionRol';
import { RXMissionZaak } from './RxMissionZaak';
import { RxMissionZgwConfiguration, SubmissionZaakProperties } from './RxMissionZgwConfiguration';
import { SubmissionZaakReference } from './SubmissionZaakReference';
import { UserType } from '../../shared/UserType';
import { Database, DynamoDBDatabase } from '../../submission/Database';
import { SubmissionSchema } from '../../submission/SubmissionSchema';
import { ZgwClient } from '../zgwClient/ZgwClient';

const envKeys = [
  'BUCKET_NAME',
  'TABLE_NAME',
  'ZAAKREFERENCE_TABLE_NAME',
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
  private zaakReference: SubmissionZaakReference;

  constructor(_rxMissionZgwConfiguration: RxMissionZgwConfiguration, submissionZaakProperties: SubmissionZaakProperties) {
    // Nog bepalen of we deze wel nodig gaan hebben, misschien wel als er wat generieke branch config toegevoegd wordt
    // this.rxmConfig = rxMissionZgwConfiguration;
    this.submissionZaakProperties = submissionZaakProperties;
    const env = environmentVariables(envKeys);
    this.storage = new S3Storage(env.BUCKET_NAME);
    this.database = new DynamoDBDatabase(env.TABLE_NAME);
    this.zaakReference = new SubmissionZaakReference(env.ZAAKREFERENCE_TABLE_NAME);

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

    const zaak = new RXMissionZaak(this.zgwClient, this.submissionZaakProperties, this.zaakReference);
    const zgwZaak = await zaak.create(parsedSubmission, submission);
    console.debug('created zaak');

    // We may have returned an existing zaak, in which role creation failed. If there are no roles added to the zaak, we try adding them.
    if (zgwZaak.rollen.length == 0) {
      console.debug('creating roles');
      const role = new RXMissionRol({ zgwClient: this.zgwClient, submissionZaakProperties: this.submissionZaakProperties });
      await role.addRolToZaak(zgwZaak.url, parsedSubmission, submission);
    }

    // We may have returned an existing zaak, in which some documents have been created.
    // Only start adding docs if the zaakinformatieobjecten count is different from attachments + pdf
    // TODO: check which attachments have already been added before adding all attachments again.
    if (zgwZaak.zaakinformatieobjecten.length < (submissionAttachments.length + 1)) {
      console.debug('creating documents');
      const informatieObjectTypeSubmissionPdf = this.submissionZaakProperties.informatieObjectTypeVerzoek
        ?? this.submissionZaakProperties.informatieObjectType;
      const informatieObjectTypeSubmissionAttachments = this.submissionZaakProperties.informatieObjectTypeBijlageVerzoek
        ?? this.submissionZaakProperties.informatieObjectType;
      await this.uploadAttachment(key, zgwZaak.url, informatieObjectTypeSubmissionPdf, `${key}.pdf`);
      const uploads = submissionAttachments.map(
        async attachment => this.uploadAttachment(
          key,
          zgwZaak.url,
          informatieObjectTypeSubmissionAttachments,
          'attachments/' + attachment));
      await Promise.all(uploads);
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

  async uploadAttachment(key: string, zaak: string, informatieObjectType: string, attachment: string) {
    const attachmentKey = `${key}/${attachment}`;
    const inhoud = await this.storage.get(attachmentKey);
    const bytes = await inhoud?.Body?.transformToByteArray();
    if (!bytes) {
      throw Error('error converting file');
    }
    const blob = new Blob([bytes]);
    const document = new RXMissionDocument({
      fileName: attachment,
      informatieObjectType: informatieObjectType,
      zgwClient: this.zgwClient,
      contents: blob,
    });
    return document.addToZaak(zaak);
  }
}
