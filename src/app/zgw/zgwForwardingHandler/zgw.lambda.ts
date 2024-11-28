import { ZgwForwarderHandler } from './ZgwForwardingHandler';
import { isKnownUserType } from '../../shared/UserType';
import { ZgwForwardProcessedFormEvent } from '../shared/zgwForwardEvent.model';

if (process.env.DEBUG !== 'true') {
  console.debug = () => {};
}

export async function handler(event: ZgwForwardProcessedFormEvent) {
  console.debug(JSON.stringify(event));
  if (process.env.DEBUG==='true') {
    console.log(`Lambda event ${event}`);
  }
  if (isKnownUserType(event.detail.userType)) {
    const zgwHandler = new ZgwForwarderHandler();
    await zgwHandler.sendSubmissionToZgw(event.detail.Key, event.detail.userId, event.detail.userType);
  } else {
    throw Error('Event detail usertype is not a knownusertype. Anonymous is not allowed in the ZgwForwardHandler right now.');
  }
}