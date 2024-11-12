import { environmentVariables } from '@gemeentenijmegen/utils';
import { EventBridgeEvent } from 'aws-lambda';
import { getRxMissionZgwConfiguration } from './RxMissionZgwConfiguration';
import { RxMissionZgwHandler } from './RxMissionZgwHandler';

if (process.env.DEBUG !== 'true') {
  console.debug = () => {};
  console.dir = () => {};
}

/**
 * Get specific config
 */
const env = environmentVariables(['BRANCH_NAME']);
const rxMissionZgwConfig = getRxMissionZgwConfiguration(env.BRANCH_NAME!);

export async function handler(event: EventBridgeEvent<'New Form Processed', {Reference: string; UserId: string; UserType: 'person' | 'organisation'; Key: string}>) {
  console.log('RxMission Event Detected and ready for processing', event);
  // parse event with zod
  const rxMissionZgwHandler = new RxMissionZgwHandler(rxMissionZgwConfig);
  await rxMissionZgwHandler.sendSubmissionToRxMission(event.detail.Key, event.detail.UserId, event.detail.UserType);

}