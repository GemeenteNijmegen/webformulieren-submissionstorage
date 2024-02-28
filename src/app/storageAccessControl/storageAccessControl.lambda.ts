import { CloudFrontRequestEvent, CloudFrontResponse } from 'aws-lambda';

export async function handler(event: CloudFrontRequestEvent, _context: any, callback: any): Promise<CloudFrontResponse> {
  console.debug(JSON.stringify(event));
  const request = event.Records[0].cf.request;
  if (request.uri.startsWith('/APV18.605')) {
    callback(null, request);
  }

  return {
    status: '403',
    statusDescription: 'OK',
    headers: {},
  };
}
