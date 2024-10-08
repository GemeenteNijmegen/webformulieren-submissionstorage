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
    naamIngelogdeGebruiker: z.string().optional(),
  }).passthrough(),
  employeeData: z.any(),
  pdf: z.object({
    reference: z.string(),
    location: z.string(),
    bucketName: z.string(),
  }),
  bsn: z.string().optional(),
  kvknummer: z.string().optional(),
  metadata: z.object({
    timestamp: z.array(z.number()),
  }).passthrough(),
});

export const SubmissionPaymentSchema = z.object({
  appId: z.string(),
  reference: z.string(),
  amount: z.number(),
});
