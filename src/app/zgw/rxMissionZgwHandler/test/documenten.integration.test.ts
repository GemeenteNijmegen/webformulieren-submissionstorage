import path from 'path';
import { environmentVariables } from '@gemeentenijmegen/utils';
import { describeIntegration } from '../../../test-utils/describeIntegration';
import { ZgwClient } from '../../zgwClient/ZgwClient';
import { RXMissionDocument } from '../RXMissionDocument';

const sampleFilePath = path.resolve(__dirname, 'samples/test.pdf');


describe('Document upload test', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      INFORMATIEOBJECTTYPE: 'https://mockinfoobject',
    };
  });
  afterEach(() => {
    process.env = originalEnv;
  });


  test('Can create document in ZGW store', async() => {
    const env = environmentVariables(['INFORMATIEOBJECTTYPE']);
    const zgwClient = zgwTestClient();
    setFetchMockResponse({});
    const spyOnFetch = jest.spyOn(global, 'fetch');
    const document = new RXMissionDocument(sampleFilePath, 'testfile', { zgwClient: zgwClient, informatieObjectType: env.INFORMATIEOBJECTTYPE });
    await document.addToZaak('https://zaak-test/zaak');
    console.debug(spyOnFetch.mock.calls);
    expect(spyOnFetch.mock.calls[0][0]).toBe('https://documenten-api/enkelvoudiginformatieobjecten');

  });
});


describeIntegration('Live document upload test', () => {

  test('Can create document in ZGW store', async() => {
    const env = environmentVariables(['INFORMATIEOBJECTTYPE']);
    const zgwClient = liveTestZgwClient();
    const spyOnFetch = jest.spyOn(global, 'fetch');
    try {
      const document = new RXMissionDocument(sampleFilePath, 'testfile', { zgwClient: zgwClient, informatieObjectType: env.INFORMATIEOBJECTTYPE });
      await document.addToZaak('https://zaken.preprod-rx-services.nl/api/v1/zaken/bf8e1c72-b6be-403b-bfb7-406c8408ab91');
    } catch (error) {
      console.error(error);
    }
    console.debug(spyOnFetch.mock.calls);
  });
});


function zgwTestClient() {
  const client = new ZgwClient({
    documentenApiUrl: 'https://documenten-api',
    zakenApiUrl: 'https://documenten-api',
    informatieobjecttype: 'https://catalogi-api/informatieobjecttype',
    zaakstatus: 'https://catalogi-api/zaakstatus',
    zaaktype: 'https://catalogi-api/zaaktypr',
    name: 'Test',
    clientId: 'id',
    clientSecret: 'secret',
    roltype: 'https://roltype',
  });
  return client;
}

export function liveTestZgwClient() {
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

function setFetchMockResponse(response: any) {
  global.fetch = jest.fn((url: string) => {
    console.debug('fetch url', url);
    return Promise.resolve({
      headers: {
        test: 'test',
      },
      json: () => {
        if (url.includes('enkelvoudiginformatieobjecten')) {
          return Promise.resolve({
            bestandsdelen: [
              {
                url: 'https://bestandsdeel',
              },
            ],
            lock: 'bladieneplockbla',
          });
        } else if (url.includes('https://bestandsdeel')) {
          return {
            url: 'https://bestandsdeel',
          };
        } else {
          return Promise.resolve(response);
        }
      },
    });
  }) as jest.Mock;
}


