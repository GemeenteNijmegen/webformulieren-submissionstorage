import { Submission } from '../submission/SubmissionSchema';

/**
 * Usertype possibilities for now
 * person, organisation or anonymous
 */
export type UserType = 'person' | 'organisation' | 'anonymous';

/**
 * KnownUserType excludes 'anonymous' from UserType
 */
export type KnownUserType = Exclude<UserType, 'anonymous'>;

export function isKnownUserType(userType: UserType): userType is KnownUserType {
  return userType === 'person' || userType === 'organisation';
}

/**
   * Get the UserType from a submission.
   *
   * Submissions can be done with bsn, kvk
   * or anonymous (we ignore other logins for now).
   *
   * @returns
   */
export function getUserTypeFromSubmission(submission: Submission): UserType {
  if (submission.bsn) {
    return 'person';
  } else if (submission.kvknummer) {
    return 'organisation';
  } else {
    return 'anonymous';
  }
}
