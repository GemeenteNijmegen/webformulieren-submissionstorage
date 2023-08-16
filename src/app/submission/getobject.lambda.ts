import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});

export async function handler(event: any) {
  try {
    console.debug(event);
    const command = new GetObjectCommand({
      Bucket: process.env.BUCKET,
      Key: '_e2OZxavlUk8TxtAoYnq7OGwgO4/pdf/TDL17.218',
    });
    const result = await s3Client.send(command);
    console.debug('result length', result.Body?.transformToByteArray.length);
    console.debug(result);
  } catch (err) {
    console.error(err);
  }
}
