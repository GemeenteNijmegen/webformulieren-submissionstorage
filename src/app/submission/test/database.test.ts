import { MockDatabase } from './MockDatabase';

describe('Save object', () => {
  test('Creating database object', async () => {
    expect(new MockDatabase('mockTable')).toBeTruthy();
  });

  test('Storing a new submission', async () => {
    const db = new MockDatabase('mockTable');
    expect(await db.storeSubmission({
      userId: 'testuser',
      key: 'TDL.1234',
      pdf: 'test.pdf',
      attachments: [
        {
          bucket: 'testbucket',
          key: 'testattachment.pdf',
          originalName: 'testattachment2.pdf',
        },
      ],
    })).toBeTruthy();
  });
});
