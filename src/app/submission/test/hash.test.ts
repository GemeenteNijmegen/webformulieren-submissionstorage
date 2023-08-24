import { hashString } from '../hash';

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
