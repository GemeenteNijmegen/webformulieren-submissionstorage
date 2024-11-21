import { environmentVariables } from '@gemeentenijmegen/utils';
import { getRxMissionZgwConfiguration } from './RxMissionZgwConfiguration';
import { RxMissionZgwHandler } from './RxMissionZgwHandler';
import { ZgwForwardProcessedFormEvent } from '../shared/zgwForwardEvent.model';

if (process.env.DEBUG !== 'true') {
  console.debug = () => {};
  console.dir = () => {};
}

/**
 * Get specific config
 */
const env = environmentVariables(['BRANCH']);
const rxMissionZgwConfig = getRxMissionZgwConfiguration(env.BRANCH!);

export async function handler(event: ZgwForwardProcessedFormEvent) {
  console.log('RxMission Event Detected and ready for processing', event);
  // parse event with zod
  const rxMissionZgwHandler = new RxMissionZgwHandler(rxMissionZgwConfig);
  await rxMissionZgwHandler.sendSubmissionToRxMission(event.detail.Key, event.detail.userId, event.detail.userType);

}
