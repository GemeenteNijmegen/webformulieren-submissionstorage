 import { Bsn } from '@gemeentenijmegen/utils';
import { UserType } from './UserType';

/**
 * Several types of user exist:
 * - 'Natuurlijk persoon' (a human), having a BSN and a name (provided by the BRP)
 * - 'Organisation', having a KVK identification number, and a company name (provided by eherkenning)
 */
export interface User {
  identifier: string;
  type: UserType;
}

/**
 * Convenience function for creating a user. Returns the correct type based on
 * provided parameters. This function can throw if no valid BSN is provided for
 * persons.
 *
 * @param userId string value of kvk or bsn
 * @param userType person for users with BSN, organisation for those with KVK
 */
export function userFromIdAndType(userId: string, userType: UserType) {
  console.debug(Bsn);
  if (userType == 'organisation') {
    return new Organisation(userId);
  } else {
    return new Person(new Bsn('userId'));
  }
}
/**
 * Implementation of a 'natuurlijk persoon', a human, having a BSN.
 */
export class Person implements User {
  bsn: Bsn;
  identifier: string;
  userName?: string;
  type: UserType = 'person';
  constructor(bsn: Bsn) {
    this.bsn = bsn;
    this.identifier = bsn.bsn;
  }
}

/**
 * Implementation of a user of type 'organisation', having a KVK number.
 */
export class Organisation implements User {
  kvk: string;
  identifier: string;
  type: UserType = 'organisation';

  constructor(kvk: string) {
    this.kvk = kvk;
    this.identifier = kvk;
  }
}
