import { randomUUID } from 'crypto';
import { environmentVariables } from '@gemeentenijmegen/utils';
import { SubmissionData } from '../../../submission/Database';
import { Submission, SubmissionSchema } from '../../../submission/SubmissionSchema';
import * as snsSample from '../../../submission/test/samples/sns.sample.json';
import { describeIntegration } from '../../../test-utils/describeIntegration';
import { ZgwClient } from '../../zgwClient/ZgwClient';
import { RXMissionZaak } from '../RxMissionZaak';

describeIntegration('RX Mission live tests', () => {
  test('Can create zaak object', async() => {
    const zgwClient = testZgwClient();
    const zaak = new RXMissionZaak(zgwClient);

    const submission = getSampleSubmissionDataBaseData('12.345');
    const parsedSubmission = SubmissionSchema.passthrough().parse(JSON.parse(snsSample.Records[0].Sns.Message));

    console.debug(zaak, submission, parsedSubmission);
    expect(zaak).toBeTruthy();
  });

  test('Can create mock zaak in ZGW store', async() => {
    const zgwClient = testZgwClient();
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

    const zaakRefNo = '12.345';
    const submission = getSampleSubmissionDataBaseData(zaakRefNo);

    const parsedSubmission = getSampleSubmission(zaakRefNo);
    await zaak.createZaak(parsedSubmission, submission);
    console.log('Fetch call 1', spyOnFetch.mock.calls[0]);
    console.log('Fetch call 2', spyOnFetch.mock.calls[1]);
  });


  test('Can create zaak in ZGW store', async() => {
    const zgwClient = testZgwClient();
    const spyOnFetch = jest.spyOn(global, 'fetch');

    const zaak = new RXMissionZaak(zgwClient);
    const zaakRefNo = '12.346';


    const submission = getSampleSubmissionDataBaseData(zaakRefNo);
    const parsedSubmission = getSampleSubmission(zaakRefNo);
    await zaak.createZaak(parsedSubmission, submission);
    console.log('Fetch call 1', spyOnFetch.mock.calls[0]);
    console.log('Fetch call 2', spyOnFetch.mock.calls[1]);
  });
});

function testZgwClient() {
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
  return zgwClient;
}

function getSampleSubmission(refNo: string) {
  const sample = {
    appId: 'TDL',
    formId: randomUUID(),
    formTypeId: 'DEVOPSTEST',
    data: {
      naamIngelogdeGebruiker: 'H. De Tester',
    },
    metadata: {
      timestamp: [2024, 2, 1, 13, 19, 4, 11811229],
    },
    pdf: {
      bucketName: 'TESTBUCKET',
      location: 'someid/pdf/TDL',
      reference: 'c07e4f3b36955bb31565fb1ef7bdefaf',
    },
    reference: `TDL${refNo}`,
    bsn: '900222670',
  } as Submission;
  return sample;
}

function getSampleSubmissionDataBaseData(refNo: string) {
  return {
    userId: '900222670',
    userType: 'person',
    key: `TDL${refNo}`,
    pdf: 'submission.pdf',
    dateSubmitted: '2023-12-23T11:58:52.670Z',
    formName: 'testDevops',
    formTitle: 'DEVOPS testformulier',
  } as SubmissionData;
}
