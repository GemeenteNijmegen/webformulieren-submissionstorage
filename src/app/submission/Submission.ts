import { z } from 'zod';
import { Database } from './Database';
import { FormConnector } from './FormConnector';
import { getSubObjectsWithKey } from './getSubObjectsWithKey';
import { s3Object } from './s3Object';
import { Storage } from './Storage';
import { SubmissionSchema, s3ObjectSchema } from './SubmissionSchema';

type ParsedSubmission = z.infer<typeof SubmissionSchema>;

interface SubmissionProps {
  storage: Storage;
  formConnector: FormConnector;
  database: Database;
}

/**
 * Handle a submission message from SNS
 */
export class Submission {
  private rawSubmission: any;
  private parsedSubmission?: ParsedSubmission;

  private storage: Storage;
  private formConnector: FormConnector;
  private database: Database;

  public bsn?: string;
  public kvk?: string;
  public pdf?: s3Object;
  public attachments?: s3Object[];
  public key?: string;

  constructor(props: SubmissionProps) {
    this.storage = props.storage;
    this.formConnector = props.formConnector;
    this.database = props.database;
  }

  async parse(message: any) {
    this.rawSubmission = message;
    const contents = JSON.parse(message.Message);
    this.parsedSubmission = SubmissionSchema.passthrough().parse(contents);
    this.bsn = this.parsedSubmission.bsn;
    this.kvk = this.parsedSubmission.kvk;
    this.pdf = {
      bucket: this.parsedSubmission.pdf.bucketName,
      key: this.parsedSubmission.pdf.location,
    };
    this.key = this.parsedSubmission.reference;
    this.attachments = await this.getAttachments();
  }

  /**
   * Retrieve all attachment locations from the submission. We recognize upload fields
   * by the fact they contain a 'bucketName' field, and search the message for
   * these fields
   *
   * @returns `[s3Object]`
   */
  async getAttachments(): Promise<{ bucket: string; key: string; originalName?: string | undefined }[]> {
    const filesObjects = getSubObjectsWithKey(this.parsedSubmission!.data, 'bucketName');
    return filesObjects.map((file: any) => {
      const result = {
        bucket: file.bucketName,
        key: file.location,
        originalName: file.originalName,
      };
      return result;
    }).map((file: any) => s3ObjectSchema.parse(file)) ?? undefined;
  }

  isAnonymous() {
    return (this.bsn || this.kvk) ? false : true;
  }

  /**
   * Save the submission
   *
   * Currently this will use the provided storage class
   * to save only the raw submission message.
   *
   * TODO: Save attachments, PDF
   */
  async save(): Promise<boolean> {
    if (!this.parsedSubmission || !this.pdf || !this.key) {
      throw Error('parse submission before attempting to save');
    }

    const formDefinition = await this.formConnector.definition(this.parsedSubmission.formTypeId);
    const pdfKey = `${this.key}/${this.key}.pdf`;
    // Prepare and do all independent requests in parallel
    const copyPromises: Promise<any>[] = [];
    copyPromises.push(this.storage.store(`${this.key}/submission.json`, JSON.stringify(this.rawSubmission))); // Submission
    copyPromises.push(this.storage.store(`${this.key}/formdefinition.json`, JSON.stringify(formDefinition))); // Form def
    copyPromises.push(this.storage.copy(this.pdf.bucket, this.pdf.key, 'eu-central-1', pdfKey)); // PDF
    copyPromises.push(...this.attachmentPromises());
    try {
      await Promise.all(copyPromises);
    } catch (error: any) {
      console.error(error);
    }

    // Store in dynamodb
    await this.database.storeSubmission({
      userId: this.userId(),
      key: this.key,
      pdf: pdfKey,
      attachments: this.attachments,
    });

    return true;
  }

  /**
   * Get the userid for this submission.
   *
   * Submissions can be done with bsn, kvk
   * or anonymous (we ignore other logins for now).
   * We store all submissions, but won't be able
   * to retrieve anonymous submissions for regular
   * users.
   *
   * @returns bsn or kvk or 'anonymous'
   */
  private userId() {
    if (this.bsn) {
      return this.bsn;
    } else if (this.kvk) {
      return this.kvk;
    } else {
      return 'anonymous';
    }
  }

  /**
   * Create promises for storing attachments
   *
   * @returns promises[]
   */
  private attachmentPromises() {
    const promises = [];
    if (this.attachments) {
      for (let attachment of this.attachments) {
        promises.push(this.storage.copy(attachment.bucket, attachment.key, 'eu-central-1', `${this.key}/attachments/${attachment.originalName}`));
      }
    }
    return promises;
  }
}
