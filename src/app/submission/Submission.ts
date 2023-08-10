import { z } from 'zod';
import { FormConnector } from './FormConnector';
import { getSubObjectsWithKey } from './getSubObjectsWithKey';
import { Storage } from './Storage';
import { SubmissionSchema, s3ObjectSchema } from './SubmissionSchema';

type ParsedSubmission = z.infer<typeof SubmissionSchema>;

interface s3Object {
  /** Name of an S3 bucket */
  bucket: string;
  /** the key (entire path) to the file in S3 */
  key: string;
  /** The filename this file was uploaded as */
  originalName?: string;

}

interface SubmissionProps {
  storage: Storage;
  formConnector: FormConnector;
}

/**
 * Handle a submission message from SNS
 */
export class Submission {
  private rawSubmission: any;
  private parsedSubmission?: ParsedSubmission;

  private storage: Storage;
  private formConnector: FormConnector;

  public bsn?: string;
  public kvk?: string;
  public pdf?: s3Object;
  public attachments?: s3Object[];

  constructor(props: SubmissionProps) {
    this.storage = props.storage;
    this.formConnector = props.formConnector;
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
   * TODO: Save attachments, PDF and form definition
   *
   * @returns Results of the save operation
   */
  async save(): Promise<boolean> {
    if (!this.parsedSubmission) {
      throw Error('parse submission before attempting to save');
    }
    // Save submission, but only if an identifiable user submitted
    const userId = this.bsn ? this.bsn : this.kvk;
    if (!userId) {
      return false;
    }
    const baseKey = this.parsedSubmission.reference;

    const [formDefinition, submissionStoreResult] = await Promise.all([
      this.formConnector.definition(this.parsedSubmission.formTypeId),
      this.storage.store(`${baseKey}/submission.json`, JSON.stringify(this.rawSubmission)),
    ]);
    if (!submissionStoreResult) {
      throw Error('Failed storing raw submission');
    }
    await this.storage.store(`${baseKey}/formdefinition.json`, JSON.stringify(formDefinition));

    // Store in dynamodb
    // const hashedId = hashString(userId);
    // this.database.save({
    //   pk: `SUBMISSION#${hashedId}#${baseKey}`

    // });

    return true;
  }
}
