import { EventBridgeEvent } from 'aws-lambda';
import { ZgwForwarderHandler } from './ZgwForwardingHandler';

if (process.env.DEBUG !== 'true') {
  console.debug = () => {};
}

export async function handler(event: EventBridgeEvent<'New Form Processed', {Reference: string; UserId: string; UserType: 'person' | 'organisation'; Key: string}>) {
  console.debug(JSON.stringify(event));

  const zgwHandler = new ZgwForwarderHandler();
  await zgwHandler.sendSubmissionToZgw(event.detail.Key, event.detail.UserId, event.detail.UserType);

}