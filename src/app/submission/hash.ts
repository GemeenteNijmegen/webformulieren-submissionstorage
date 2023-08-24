import crypto from 'crypto';

/**
 * Helper function for creating a
 * cryptographically secure hash from a string.
 */
export function hashString(string: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(string);
  return hash.digest('base64');
}
