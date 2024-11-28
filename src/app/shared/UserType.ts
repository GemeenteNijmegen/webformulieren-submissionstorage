import { Submission } from '../submission/SubmissionSchema';

/**
 * Usertype possibilities for now
 * person, organisation or anonymous
 */
export type UserType = 'person' | 'organisation' | 'anonymous';

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
