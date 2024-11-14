import { environmentVariables } from '@gemeentenijmegen/utils';
import { SubmissionSchema } from '../../../submission/SubmissionSchema';
import { MockDatabase } from '../../../submission/test/MockDatabase';
import * as snsSample from '../../../submission/test/samples/sns.sample.json';
import { describeIntegration } from '../../../test-utils/describeIntegration';
import { ZgwClient } from '../../zgwClient/ZgwClient';
import { RXMissionZaak } from '../RxMissionZaak';


describeIntegration('RX Mission live tests', () => {


  test('Can create zaak object', async() => {
    const { zgwClient, database } = testDependencies();
    const zaak = new RXMissionZaak(zgwClient);

    const submission = await database.getSubmission({ key: 'TDL12.345', userId: '900222670', userType: 'person' });
    const parsedSubmission = SubmissionSchema.passthrough().parse(JSON.parse(snsSample.Records[0].Sns.Message));

    console.debug(zaak, submission, parsedSubmission);
    expect(zaak).toBeTruthy();
  });

  test('Can create mock zaak in ZGW store', async() => {
    const { zgwClient, database } = testDependencies();
    const spyOnFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      headers: {
        test: 'test',
      },
      json: () => Promise.resolve({
        count: 0,
        next: null,
        previous: null,
        results: [],
      }),
    } as any as Response).mockResolvedValueOnce({
      headers: {
        test: 'test',
      },
      json: () => Promise.resolve({}),
    } as any as Response).mockResolvedValueOnce({
      json: () => Promise.resolve({}),
    } as any as Response);

    const zaak = new RXMissionZaak(zgwClient);

    const submission = await database.getSubmission({ key: 'TDL12.345', userId: '900222670', userType: 'person' });
    const parsedSubmission = SubmissionSchema.passthrough().parse(JSON.parse(snsSample.Records[0].Sns.Message));
    await zaak.createZaak(parsedSubmission, submission);
    console.log('Fetch call 1', spyOnFetch.mock.calls[0]);
    console.log('Fetch call 2', spyOnFetch.mock.calls[1]);
  });


  test('Can create zaak in ZGW store', async() => {
    const { zgwClient, database } = testDependencies();
    const spyOnFetch = jest.spyOn(global, 'fetch');

    const zaak = new RXMissionZaak(zgwClient);

    const submission = await database.getSubmission({ key: 'TDL12.346', userId: '900222670', userType: 'person' });
    const parsedSubmission = SubmissionSchema.passthrough().parse(JSON.parse(snsSample.Records[0].Sns.Message));
    await zaak.createZaak(parsedSubmission, submission);
    console.log('Fetch call 1', spyOnFetch.mock.calls[0]);
    console.log('Fetch call 2', spyOnFetch.mock.calls[1]);
  });
});

function testDependencies() {
  const envKeys = [
    'BUCKET_NAME',
    'TABLE_NAME',
    'ZAAKTYPE',
    'ROLTYPE',
    'ZAAKSTATUS',
    'INFORMATIEOBJECTTYPE',
    'ZAKEN_API_URL',
    'DOCUMENTEN_API_URL',
    'CLIENT_ID',
    'CLIENT_SECRET',
  ] as const;


  const database = new MockDatabase();
  const env = environmentVariables(envKeys);

  const zgwClient = new ZgwClient({
    zaaktype: env.ZAAKTYPE,
    zaakstatus: env.ZAAKSTATUS,
    roltype: env.ROLTYPE,
    informatieobjecttype: env.INFORMATIEOBJECTTYPE,
    zakenApiUrl: env.ZAKEN_API_URL,
    documentenApiUrl: env.DOCUMENTEN_API_URL,
    name: 'Rxmission',
    clientId: env.CLIENT_ID,
    clientSecret: env.CLIENT_SECRET,
  });
  return { zgwClient, database };
}

