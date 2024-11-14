import { environmentVariables } from '@gemeentenijmegen/utils';
import { SubmissionSchema } from '../../../submission/SubmissionSchema';
import { MockDatabase } from '../../../submission/test/MockDatabase';
import * as snsSample from '../../../submission/test/samples/sns.sample.json';
import { describeIntegration } from '../../../test-utils/describeIntegration';
import { ZgwClient } from '../../zgwClient/ZgwClient';
import { RXMissionZaak } from '../RxMissionZaak';


const envKeys = [
  'BUCKET_NAME',
  'TABLE_NAME',
  'ZAAKTYPE',
  'ROLTYPE',
  'ZAAKSTATUS',
  'INFORMATIEOBJECTTYPE',
  'ZAKEN_API_URL',
  'DOCUMENTEN_API_URL',
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
});

describeIntegration('RX Mission live tests', () => {
  test('Can create zaak object', async() => {
    const zaak = new RXMissionZaak(zgwClient);

    const submission = await database.getSubmission({ key: 'TDL12.345', userId: '900222670', userType: 'person' });
    const parsedSubmission = SubmissionSchema.passthrough().parse(JSON.parse(snsSample.Records[0].Sns.Message));

    console.debug(zaak, submission, parsedSubmission);
    expect(zaak).toBeTruthy();
  });

  test('Can create zaak in ZGW store', async() => {

  });
});
