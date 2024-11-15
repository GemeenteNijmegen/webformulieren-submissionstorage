import * as fs from 'fs';
import path from 'path';
import { environmentVariables } from '@gemeentenijmegen/utils';
import { describeIntegration } from '../../../test-utils/describeIntegration';
import { ZgwClient } from '../../zgwClient/ZgwClient';
describeIntegration('RX Mission live tests', () => {

  test('Can create zaak in ZGW store', async() => {
    const zgwClient = testZgwClient();
    const spyOnFetch = jest.spyOn(global, 'fetch');

    try {
      const fileBuffer = getFile('samples/test.pdf');
      if (fileBuffer) {
        // eerst document creeëren, dan pas uploaden
        const doc = {
          identificatie: 'TESTDOC1',
          bronorganisatie: '001479179',
          creatiedatum: '2024-08-27',
          titel: 'test Devops Nijmegen',
          vertrouwelijkheidaanduiding: 'openbaar',
          auteur: 'Devops Nijmegen',
          status: '',
          formaat: 'application/pdf',
          taal: 'nld',
          bestandsnaam: 'test.pdf',
          inhoud: null,
          bestandsomvang: fileBuffer.byteLength,
          informatieobjecttype: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/47d64918-891c-4653-8237-cd5445fc6543',
        };

        const informatieObject = await zgwClient.callDocumentenApi('POST', 'enkelvoudiginformatieobjecten', doc);
        console.debug('informatieobject', informatieObject);
        const bestandsDeelUrl = informatieObject?.bestandsdelen?.[0]?.url;
        const lock = informatieObject?.lock;

        if (bestandsDeelUrl && lock) {
          const data = new FormData();
          data.append('inhoud', new Blob([fileBuffer]));
          data.append('lock', lock);
          const result = await zgwClient.callBestandsdelenApi('put', bestandsDeelUrl, data);
          console.debug('bestandsdeel', result);
          // if (result.url) {
          //   //TODO Gaat mis op url: https://documenten.preprod-rx-services.nl/api/v1/https://documenten.preprod-rx-services.nl/api/v1/enkelvoudiginformatieobjecten/{uuid}}/unlock
          //   const unlockResult = await zgwClient.callDocumentenApi('POST', `${informatieObject.url}/unlock`, {
          //     lock: lock,
          //   });
          //   console.debug('unlock', unlockResult);
          //   const relateResult = await zgwClient.callZaakApi('POST', 'zaakinformatieobjecten', {
          //     informatieobject: informatieObject.url,
          //     zaak: 'https://zaken.preprod-rx-services.nl/api/v1/zaken/7a89ea95-a167-415f-80d8-6b9bb0c61da7',
          //     titel: 'test.pdf',
          //     beschrijving: 'test DEVOPS nijmegen',
          //   },
          //   );
          //   console.debug(relateResult);
          // }
        }


        // await zgwClient.addDocumentToZaak('https://zaken.preprod-rx-services.nl/api/v1/zaken/76ad64eb-e3e1-4a59-a101-c3b3eb7e470a', 'test.pdf', base64Pdf);
        console.log('Fetch calls', spyOnFetch.mock.calls);
      } else {
        console.error('no file');
      }
    } catch (error) {
      //
    }
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


function getFile(filePath: string): Buffer | null {
  try {
    const absolutePath = path.resolve(__dirname, filePath); // Resolve relative to script's directory
    const pdfBuffer = fs.readFileSync(absolutePath); // Read the PDF file as a buffer
    return pdfBuffer;
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
}
