import fs from 'fs';
import path from 'path';
import { HttpMethod, ZgwHttpClient } from '../ZgwHttpClient';


/**
 * Dit is geen test, maar een tijdelijke workaround om informatieobjecten en statustypen snel op te kunnen halen uit de catalogi
 * Pas je lokale .env file aan om hier andere client-id en secret te gebruiken
 * Dit moeten we zsm vervangen voor een soortement van Catalogi ZGW interface waarmee we snel config op kunnen halen.
 */

xdescribe('Live fetch ZGW catalogi config', () => {

  test('Zaaktype', async () => {
    const ZAAKTYPE_UUID_AANVRAAG_BESCHIKKING_OVERIGE = '3d845f0f-0971-4a8f-9232-439696bf1504'; // preprod
    // const ZAAKTYPE_UUID_AANVRAAG_BESCHIKKING_OVERIGE = "vul hier je prod uuid in"; // prod nog in te vullen

    const BASE_URL_CATALOGI = 'https://catalogi.preprod-rx-services.nl/api/v1/'; // Pre-prod
    // const BASE_URL_CATALOGI = "https://catalogi.rx-services.nl/api/v1/"; // Prod

    const zgwHttpClient = new ZgwHttpClient({ clientId: process.env.CLIENT_ID!, clientSecret: process.env.CLIENT_SECRET! });
    expect(zgwHttpClient).toBeTruthy(); // Constructs httpclient with local env vars


    const zaakTypeUrl = `${BASE_URL_CATALOGI}zaaktypen/${ZAAKTYPE_UUID_AANVRAAG_BESCHIKKING_OVERIGE}`;
    const zaakType: CatalogiZaaktypeTemp = await zgwHttpClient.request(HttpMethod.Get, zaakTypeUrl);

    const statusTypen = (await Promise.all(
      zaakType.statustypen!.map(
        statusurl => zgwHttpClient.request(HttpMethod.Get, statusurl),
      ),
    )).map((statussen) => { return { url: statussen.url, omschrijving: statussen.omschrijving };});

    const informatieObjectTypen = (await Promise.all(
      zaakType.informatieobjecttypen!.map(
        infoUrl => zgwHttpClient.request(HttpMethod.Get, infoUrl),
      ),
    )).map((infoObject) => { return { url: infoObject.url, omschrijving: infoObject.omschrijving };});;

    const rolTypen = (await Promise.all(
      zaakType.roltypen!.map(
        rolUrl => zgwHttpClient.request(HttpMethod.Get, rolUrl),
      ),
    )).map((roltype) => { return { url: roltype.url, omschrijving: roltype.omschrijving };});;

    writeOutputToFile('zaaktypeOnderdelen', [statusTypen, informatieObjectTypen, rolTypen]);
  });


});

export interface CatalogiZaaktypeTemp {
  url?: string;
  omschrijving?: string;
  id?: string;

  productenOfDiensten?: string[];
  statustypen?: string[];
  resultaattypen?: string[];
  informatieobjecttypen?: string[];
  roltypen?: string[];

  [key: string]: unknown; // Allows additional properties
}


/**
 *  Test helper methods and const
 */

function writeOutputToFile(name: string, data: any) {
  if (process.env.DEBUG) {
    const outputDir = path.resolve(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now(); // Epoch in milliseconds
    const fileName = `${name}_${timestamp}.json`;
    const filePath = path.join(outputDir, fileName);

    const jsonData = JSON.stringify(data, null, 2); // Pretty-printed JSON
    fs.writeFileSync(filePath, jsonData, 'utf8');

    console.log(`Output written to ${filePath}`);
  }
}
