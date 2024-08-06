import { EventBridgeEvent } from 'aws-lambda';

export async function handler(event: EventBridgeEvent<'New Form Submitted', {Reference: string}>) {
  console.debug(JSON.stringify(event));

}