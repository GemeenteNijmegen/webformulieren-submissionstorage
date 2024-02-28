import { CloudFrontRequestEvent, CloudFrontResponse } from 'aws-lambda';

export async function handler(_event: CloudFrontRequestEvent): Promise<CloudFrontResponse> {
  console.debug(JSON.stringify(_event));
  return {
    status: '200',
    statusDescription: 'OK',
    headers: {},
  };
}
