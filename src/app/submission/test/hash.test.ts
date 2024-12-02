import { UserType } from '../../shared/UserType';
import { getHashedUserId, HashedUserId, hashString } from '../hash';

describe('Hash function', () => {
  test('Hashing a string returns the hashed string', async () => {
    const hashedString = hashString('somehashablestring');
    console.debug(hashedString);
    expect(hashedString).not.toEqual('somehashablestring');
  });

  test('Hashing a string twice returns the same hash', async () => {
    const hashedString = hashString('somehashablestring');
    const hashedString2 = hashString('somehashablestring');
    console.debug(hashedString);
    expect(hashedString).toEqual(hashedString2);
  });
});


describe('getHashedUserId function', () => {
  // Define test cases as an array of objects
  const testCases = [
    {
      description: 'Generates correct hashed user ID for a person',
      userId: '900026236',
      userType: 'person' as UserType,
      expected: `PERSON#${hashString('900026236')}`,
    },
    {
      description: 'Generates correct hashed user ID for an organisation',
      userId: 'ORG123456',
      userType: 'organisation' as UserType,
      expected: `ORG#${hashString('ORG123456')}`,
    },
    {
      description: 'Returns "ANONYMOUS" for anonymous user type',
      userId: '', // Typically empty for anonymous users
      userType: 'anonymous' as UserType,
      expected: 'ANONYMOUS' as HashedUserId,
    },
    {
      description: 'Handles empty userId for person userType gracefully',
      userId: '',
      userType: 'person' as UserType,
      expected: `PERSON#${hashString('')}`,
    },
    {
      description: 'Handles empty userId for organisation userType gracefully',
      userId: '',
      userType: 'organisation' as UserType,
      expected: `ORG#${hashString('')}`,
    },
    {
      description: 'Returns "ANONYMOUS" for unknown userType',
      userId: '123456789',
      userType: 'unknown' as UserType, // Force an invalid userType
      expected: 'ANONYMOUS' as HashedUserId,
    },
  ];

  // Parameterized test using test.each
  test.each(testCases)('$description', ({ userId, userType, expected }) => {
    const result = getHashedUserId(userId, userType);
    console.debug(`Generated HashedUserId: ${result}`);
    expect(result).toBe(expected);
  });
});