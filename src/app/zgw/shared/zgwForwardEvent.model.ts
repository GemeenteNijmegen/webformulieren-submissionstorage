import { EventBridgeEvent } from 'aws-lambda/trigger/eventbridge';
import { UserType } from '../../shared/User';
import { HashedUserId } from '../../submission/hash';

export interface ZgwForwardEventDetail {
  Reference: string;
  UserId: string;
  pk: HashedUserId;
  sk: string;
  UserType: UserType;
  Key: string;
}

export type ZgwForwardProcessedFormEvent = EventBridgeEvent<'New Form Processed', ZgwForwardEventDetail>;