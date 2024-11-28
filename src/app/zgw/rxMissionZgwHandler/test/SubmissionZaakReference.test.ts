import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { SubmissionZaakReference } from '../SubmissionZaakReference';

const dbMock = mockClient(DynamoDBClient);

describe('Submission to Zaak references', () => {
  beforeEach(() => {
    dbMock.reset();
  });
  test('sending works', async () => {
    const ref = new SubmissionZaakReference('testtable');
    await ref.set('TDL01.100', 'https://example.com');
    expect(dbMock.calls()).toHaveLength(1);
    expect(dbMock.calls()[0].firstArg.input.Item.pk.S).toBe('TDL01.100');
  });

  test('getting works', async () => {
    dbMock.callsFakeOnce(() => {
      return {
        Item: {
          pk: { S: 'TDL12.345' },
          zaak: { S: 'https://example.com' },
        },
      };
    });
    const ref = new SubmissionZaakReference('testtable');
    await ref.get('TDL12.345');
    expect(dbMock.calls()).toHaveLength(1);
  });
});
