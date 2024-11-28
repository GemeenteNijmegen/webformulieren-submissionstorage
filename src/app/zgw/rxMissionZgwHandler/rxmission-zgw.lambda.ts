import { environmentVariables } from '@gemeentenijmegen/utils';
import { getRxMissionZgwConfiguration, getSubmissionPropsFromAppIdOrFormName } from './RxMissionZgwConfiguration';
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
  const submissionZaakProperties = getSubmissionPropsFromAppIdOrFormName(rxMissionZgwConfig, { appId: event.detail.Key.substring(0, 3) ?? 'TLD' });
  const rxMissionZgwHandler = new RxMissionZgwHandler(rxMissionZgwConfig, submissionZaakProperties);
  await rxMissionZgwHandler.sendSubmissionToRxMission(event.detail.Key, event.detail.userId, event.detail.userType);
}
