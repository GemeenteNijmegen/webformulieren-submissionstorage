import { Bsn, environmentVariables, S3Storage } from '@gemeentenijmegen/utils';
import { ZaakNotFoundError, ZgwClient } from './ZgwClient';
import { Database, DynamoDBDatabase } from '../submission/Database';
import { SubmissionSchema } from '../submission/SubmissionSchema';

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

  async sendSubmissionToZgw(key: string, userId: string) {
    await this.zgw.init();

    // Get submission
    const submission = await this.database.getSubmission({ key, userId });
    const parsedSubmission = SubmissionSchema.passthrough().parse(await this.submissionData(key));

    if (!submission) {
      throw Error(`Could not find submission ${key}`);
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
    const zaak = await this.zgw.createZaak(key, submission.formTitle ?? 'Onbekend formulier'); // TODO expand with usefull fields

    if (parsedSubmission.bsn) {
      await this.zgw.addBsnRoleToZaak(zaak.url, new Bsn(submission.userId));
    } else if (parsedSubmission.kvk) {
      await this.zgw.addKvkRoleToZaak(zaak.url, submission.userId);
    }


    // Check if the zaak has attachments
    if (!submission.attachments) {
      throw Error('No attachments found');
    }

    // Upload attachments
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
    return this.zgw.addDocumentToZaak(zaak, attachment, base64 ?? '');
  }

}
