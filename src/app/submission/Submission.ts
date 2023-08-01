import { z } from 'zod';


export class Submission {
  public bsn?: string;
  public kvk?: string;
  private parsedSubmission: any;

  constructor(message: any) {
    const contents = JSON.parse(message.Message);
    this.parsedSubmission = SubmissionSchema.passthrough().parse(contents);
    this.bsn = this.parsedSubmission.bsn;
    this.kvk = this.parsedSubmission.kvk;
  }

  isAnonymous() {
    return (this.bsn || this.kvk) ? false : true;
  }
}


export const SubmissionSchema = z.object({
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
