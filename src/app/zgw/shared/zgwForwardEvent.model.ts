import { EventBridgeEvent } from 'aws-lambda/trigger/eventbridge';
import { KnownUserType, UserType } from '../../shared/UserType';
import { HashedUserId } from '../../submission/hash';

export interface ZgwForwardEventDetail {
  Reference: string;
  userId: string;
  pk: HashedUserId;
  sk: string;
  userType: UserType | KnownUserType;
  Key: string;
}

export type ZgwForwardProcessedFormEvent = EventBridgeEvent<'New Form Processed', ZgwForwardEventDetail>;