import { z } from 'zod';
import { getSubObjectsWithKey } from './getSubObjectsWithKey';

interface s3Object {
  /** Name of an S3 bucket */
  bucket: string;
  /** the key (entire path) to the file in S3 */
  key: string;
  /** The filename this file was uploaded as */
  originalName?: string;
}

export class Submission {
  private parsedSubmission: any;

  public bsn?: string;
  public kvk?: string;
  public pdf?: s3Object;
  public attachments?: s3Object[];

  async parse(message: any) {
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
   * Retrieve all attachments from the submission. We recognize upload fields
   * by the fact they contain a 'bucketName' field, and search the message for
   * these fields, using `jq`.
   *
   * @returns `[s3Object]`
   */
  async getAttachments(): Promise<{ bucket: string; key: string; originalName?: string | undefined }[]> {
    /**
     * This [jq](https://jqlang.github.io/jq/) filter retrieves from the `data` subobject ALL fields that
     * have `bucketName` as one of their keys, and returns an array containing objects of the form {
     *  key: string,
     *  bucket: string,
     *  originalName: string
     * }
     */
    const filesObjects = getSubObjectsWithKey(this.parsedSubmission.data, 'bucketName');
    return filesObjects.map((file: any) => {
      const result = {
        bucket: file.bucketName, 
        key: file.location, 
        originalName: file.originalName 
      };
      return result;
    }).map((file: any) => s3ObjectSchema.parse(file)) ?? undefined;
  }
  isAnonymous() {
    return (this.bsn || this.kvk) ? false : true;
  }
}

const s3ObjectSchema = z.object({
  bucket: z.string(),
  key: z.string(),
  originalName: z.string().optional(),
});

const SubmissionSchema = z.object({
  formId: z.string(),
  formTypeId: z.string(),
  appId: z.string(),
  reference: z.string(),
  data: z.object({
    kenmerk: z.string(),
    naamIngelogdeGebruiker: z.string(),
  }).passthrough(),
  employeeData: z.any(),
  pdf: z.object({
    reference: z.string(),
    location: z.string(),
    bucketName: z.string(),
  }),
  bsn: z.string().optional(),
  kvk: z.string().optional(),
});
