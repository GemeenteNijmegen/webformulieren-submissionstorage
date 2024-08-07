import { S3Storage } from '@gemeentenijmegen/utils';
import { ZgwClient } from './ZgwClient';
import { Database, DynamoDBDatabase } from '../submission/Database';

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

    if (
      !process.env.ZAAKTYPE ||
      !process.env.ZAAKSTATUS ||
      !process.env.INFORMATIEOBJECTTYPE ||
      !process.env.ZAKEN_API_URL ||
      !process.env.DOCUMENTEN_API_URL
    ) {
      throw Error('ZGW Client is misconfigured!');
    }

    this.zgw = new ZgwClient({
      zaaktype: process.env.ZAAKTYPE,
      zaakstatus: process.env.ZAAKSTATUS,
      informatieobjecttype: process.env.INFORMATIEOBJECTTYPE,
      zakenApiUrl: process.env.ZAKEN_API_URL,
      documentenApiUrl: process.env.DOCUMENTEN_API_URL,
      name: 'Webformulieren',
    });

  }

  async sendSubmissionToZgw(key: string, userId: string) {
    await this.zgw.init();

    // Get submission
    const submission = await this.database.getSubmission({ key, userId });
    if (!submission) {
      throw Error(`Could not find submission ${key}`);
    }

    // Handle idempotency
    const zaken = await this.zgw.getZaak(key);
    if (zaken && zaken.count > 0) {
      console.log('Zaak already exits skipping creation of zaak', key);
      return;
    }

    // Create zaak
    const zaak = await this.zgw.createZaak(key, submission.formTitle ?? 'Onbekend formulier'); // TODO expand with usefull fields

    // Check if the zaak has attachments
    if (!submission.attachments) {
      throw Error('No attachments found');
    }

    // Upload attachments
    await this.uploadAttachment(key, zaak.url, `${key}.pdf`);
    const uploads = submission.attachments.map(async attachment => this.uploadAttachment(key, zaak.url, 'attachments/' + attachment));
    await Promise.all(uploads);

  }

  async uploadAttachment(key: string, zaak: string, attachment: string) {
    const attachmentKey = `${key}/${attachment}`;
    const inhoud = await this.storage.get(attachmentKey);
    const base64 = await inhoud?.Body?.transformToString('base64');
    return this.zgw.addDocumentToZaak(zaak, attachment, base64 ?? '');
  }

}