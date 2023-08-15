import { MockDatabase } from '../Database';

describe('Save object', () => {
  test('Creating database object', async () => {
    expect(new MockDatabase('mockTable')).toBeTruthy();
  });

  test('Storing a new submission', async () => {
    const db = new MockDatabase('mockTable');
    expect(await db.storeSubmission({
      userId: 'testuser',
      key: 'TDL.1234',
      pdf: {
        bucket: 'testbucket',
        key: 'test.pdf',
        originalName: 'test.pdf',
      },
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
