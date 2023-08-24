import { z } from 'zod';

export const s3ObjectSchema = z.object({
  bucket: z.string(),
  key: z.string(),
  originalName: z.string().optional(),
});
export const SubmissionSchema = z.object({
  formId: z.string(),
  formTypeId: z.string(),
  appId: z.string(),
  reference: z.string(),
  data: z.object({
    kenmerk: z.string(),
    naamIngelogdeGebruiker: z.string(),
  }).required().passthrough(),
  employeeData: z.any(),
  pdf: z.object({
    reference: z.string(),
    location: z.string(),
    bucketName: z.string(),
  }),
  bsn: z.string().optional(),
  kvk: z.string().optional(),
});
