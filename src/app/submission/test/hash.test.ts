import { hashString } from '../hash';

describe('Hash function', () => {
  test('Hashing a string returns the hashed string', async () => {
    const hashedString = hashString('somehashablestring');
    expect(hashedString).not.toEqual('somehashablestring');
  });

  test('Hashing a string twice returns the same hash', async () => {
    const hashedString = hashString('somehashablestring');
    const hashedString2 = hashString('somehashablestring');
    expect(hashedString).toEqual(hashedString2);
  });
});
