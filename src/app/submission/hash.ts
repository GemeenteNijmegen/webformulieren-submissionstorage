import crypto from 'crypto';
import { UserType } from '../shared/User';

// CREATE PK from

/**
 * Helper function for creating a
 * cryptographically secure hash from a string.
 */
export function hashString(string: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(string);
  return hash.digest('base64');
}

/**
 * Generates a hashed user identifier based on the provided user ID and user type.
 * This function hashes the `userId` to prevent the storage of sensitive information in its raw form.
 * The hashed ID is prefixed with a string that represents the user type.
 *
 * @example
 * ```typescript
 * const userId = '123456789';
 *
 * const hashedPersonId = getHashedUserId(userId, 'person');
 * // hashedPersonId might be 'PERSON#e807f1fcf82d132f9bb018ca6738a19f'
 *
 * const hashedOrgId = getHashedUserId(userId, 'organisation');
 * // hashedOrgId might be 'ORG#e807f1fcf82d132f9bb018ca6738a19f'
 *
 * const anonymousId = getHashedUserId('', 'anonymous');
 * // anonymousId is 'ANONYMOUS'
 * ```
 *
 * @param userId
 * @param userType
 * @returns
 */
export function getHashedUserId(userId: string, userType: UserType): HashedUserId {
  const hashedId = hashString(userId);
  if (userType == 'person') {
    return `PERSON#${hashedId}`;
  } else if (userType == 'organisation') {
    return `ORG#${hashedId}`;
  } else {
    return 'ANONYMOUS';
  }
}

/**
 * Represents the possible formats of a hashed user identifier.
 * - For a person: `'PERSON#<hashedId>'`
 * - For an organisation: `'ORG#<hashedId>'`
 * - For an anonymous user: `'ANONYMOUS'`
 */
export type HashedUserId =
| `PERSON#${string}`
| `ORG#${string}`
| 'ANONYMOUS';