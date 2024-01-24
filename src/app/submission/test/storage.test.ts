import { MockStorage } from './MockStorage';

const storage = new MockStorage('mockBucketName');

describe('Storage methods', () => {
  test('Store method returns succesfully', async () => {
    expect(await storage.store('somekey', 'textcontents')).toBeTruthy();
  });

  test('Copy method returns succesfully', async () => {
    expect(await storage.copy('somebucket', 'somekey', 'eu-west-1', 'somekey')).toBeTruthy();
  });
});
