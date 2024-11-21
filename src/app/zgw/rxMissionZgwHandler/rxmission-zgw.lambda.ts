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
const env = environmentVariables(['BRANCH']);
const rxMissionZgwConfig = getRxMissionZgwConfiguration(env.BRANCH!);

export async function handler(event: RxMissionProcessedFormEvent) {
  console.log('RxMission Event Detected and ready for processing', event);
  // parse event with zod
  const rxMissionZgwHandler = new RxMissionZgwHandler(rxMissionZgwConfig);
  await rxMissionZgwHandler.sendSubmissionToRxMission(event.detail.Key, event.detail.UserId, event.detail.UserType);

}

export interface RxMissionEventDetail {
  Reference: string;
  UserId: string;
  UserType: 'person' | 'organisation';
  Key: string;
}

export type RxMissionProcessedFormEvent = EventBridgeEvent<'New Form Processed', RxMissionEventDetail>;