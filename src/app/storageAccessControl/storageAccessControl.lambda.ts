import { CloudFrontRequestEvent, CloudFrontResponse } from 'aws-lambda';

export async function handler(_event: CloudFrontRequestEvent): Promise<CloudFrontResponse> {

  return {
    status: '403',
    statusDescription: 'No access allowed',
    headers: {},
  };
}
