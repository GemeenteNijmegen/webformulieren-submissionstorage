import fs from 'fs';
import path from 'path';
import { describeIntegration } from '../../../test-utils/describeIntegration';
import { HttpMethod, ZgwHttpClient } from '../ZgwHttpClient';


/**
 * Dit is geen test, maar een tijdelijke workaround om informatieobjecten en statustypen snel op te kunnen halen uit de catalogi
 * Pas je lokale .env file aan om hier andere client-id en secret te gebruiken
 * Dit moeten we zsm vervangen voor een soortement van Catalogi ZGW interface waarmee we snel config op kunnen halen.
 * Kies voor prod of preprod met de PROD boolean
 */

describeIntegration('Live fetch ZGW catalogi config', () => {
  const PROD: boolean = process.env.RX_ENV === 'PROD'? true : false ; //false is PREPROD
  const BASE_URL_CATALOGI = PROD ? 'https://catalogi.rx-services.nl/api/v1/' :'https://catalogi.preprod-rx-services.nl/api/v1/';
  const zgwHttpClient = new ZgwHttpClient({ clientId: process.env.CLIENT_ID!, clientSecret: PROD ? process.env.RX_PROD_CLIENT_SECRET! : process.env.RX_PREPROD_CLIENT_SECRET! });

  interface ZaakTypeConfig {
    zaakTypeUuid?: string;
    outputFileName: string;
    identificatie?: string;
  }

  const fetchZaakTypeDetails = async (config: ZaakTypeConfig) => {
    expect(zgwHttpClient).toBeTruthy(); // Constructs httpclient with local env vars
    let zaakTypeUrl = '';
    let aantalZaakTypes = '';
    let versiesZaakTypes = [];

    if (config.zaakTypeUuid) {zaakTypeUrl = `${BASE_URL_CATALOGI}zaaktypen/${config.zaakTypeUuid}`;} else if (config.identificatie) {
      const zaaktypenResponse = await zgwHttpClient.request(HttpMethod.Get,
        `${BASE_URL_CATALOGI}zaaktypen?identificatie=${config.identificatie}`,
      );
      const zaaktypen = zaaktypenResponse.results;
      aantalZaakTypes = zaaktypen.length;
      versiesZaakTypes = zaaktypen.map((z:any) => z.versiedatum);
      const latestZaakType = zaaktypen.sort((a: any, b: any) =>
        new Date(b.versiedatum).getTime() - new Date(a.versiedatum).getTime(),
      )[0];
      zaakTypeUrl = latestZaakType.url;
    } else { console.error(`${config.outputFileName} cannot be generated because both zaaktypeuuid and identificatie are missing`); return undefined; }

    const zaakType: CatalogiZaaktypeTemp = await zgwHttpClient.request(HttpMethod.Get, zaakTypeUrl);
    console.log('Zaaktype: ', zaakType);

    // Fetch statusTypen
    const statusTypen = (await Promise.all(
      zaakType.statustypen!.map(
        statusurl => zgwHttpClient.request(HttpMethod.Get, statusurl),
      ),
    )).map((statussen) => { return { url: statussen.url, omschrijving: statussen.omschrijving }; });

    // Fetch informatieObjectTypen
    const informatieObjectTypen = (await Promise.all(
      zaakType.informatieobjecttypen!.map(
        infoUrl => zgwHttpClient.request(HttpMethod.Get, infoUrl),
      ),
    )).map((infoObject) => { return { url: infoObject.url, omschrijving: infoObject.omschrijving }; });

    // Fetch rolTypen
    const rolTypen = (await Promise.all(
      zaakType.roltypen!.map(
        rolUrl => zgwHttpClient.request(HttpMethod.Get, rolUrl),
      ),
    )).map((roltype) => { return { url: roltype.url, omschrijving: roltype.omschrijving }; });

    const eigenschappen = (await Promise.all(
      zaakType.eigenschappen!.map(
        eigenschapUrl => zgwHttpClient.request(HttpMethod.Get, eigenschapUrl),
      ),
    )).map((eigenschaptype) => { return { url: eigenschaptype.url, omschrijving: eigenschaptype.naam }; });

    const resultaten = (await Promise.all(
      zaakType.resultaattypen!.map(
        resultaatUrl => zgwHttpClient.request(HttpMethod.Get, resultaatUrl),
      ),
    )).map((resultaattype) => {
      return {
        url: resultaattype.url,
        omschrijving: resultaattype.omschrijving,
        omschrijvingGeneriek: resultaattype.omschrijvingGeneriek,
      };
    });

    const besluittypen = (await Promise.all(
      zaakType.besluittypen!.map(
        besluitUrl => zgwHttpClient.request(HttpMethod.Get, besluitUrl),
      ),
    )).map((besluittype) => {
      return {
        url: besluittype.url,
        omschrijving: besluittype.omschrijving,
        omschrijvingGeneriek: besluittype.omschrijvingGeneriek,
      };
    });

    // Write output to file
    writeOutputToFile(`${config.outputFileName}-${ PROD ? 'prod' : 'preprod'}`, {
      ZAAKTYPE: zaakType.omschrijving,
      VERSIE: zaakType.versiedatum,
      AANTAL: aantalZaakTypes,
      ALLE_VERSIES: versiesZaakTypes,
      STATUSTYPEN: statusTypen,
      INFORMATIEOBJECTTYPEN: informatieObjectTypen,
      ROLTYPEN: rolTypen,
      EIGENSCHAPPEN: eigenschappen,
      RESULTATEN: resultaten,
      BESLUITTYPEN: besluittypen,
    });
  };

  test('Zaaktype Aanvraag Beschikking Overige', async () => {
    const config: ZaakTypeConfig = {
      // zaakTypeUuid: PROD ? 'dca652be-eaa8-4d05-b336-59cb4466880e' : '3d845f0f-0971-4a8f-9232-439696bf1504',
      outputFileName: 'aanvraagBeschikking',
      identificatie: 'NMG-AANVRBS-OVERIG',
    };

    await fetchZaakTypeDetails(config);
  });

  test('Zaaktype Incident Behandelen', async () => {
    const config: ZaakTypeConfig = {
      // zaakTypeUuid: PROD ? '617234fd-b99c-4c4d-9eee-9ced620830e2' : '09790f18-0a91-4b6f-9626-82f68f7a33a4',
      outputFileName: 'incident',
      identificatie: 'RX-INCMLD',
    };

    await fetchZaakTypeDetails(config);
  });

  test('Zaaktype SchaduwZaak', async () => {
    const config: ZaakTypeConfig = {
      //zaakTypeUuid: PROD ? '4dfe121a-76a7-4d40-a61f-a4faa4562e78' : '2662aef5-bfab-441a-8c34-81362a454549',
      outputFileName: 'schaduwzaak',
      identificatie: 'NMG-schaduwzaak',
    };

    await fetchZaakTypeDetails(config);
  });


  // Fetch all zaaktypen (paginated API call)
  const fetchAllZaaktypen = async () => {
    let nextPageUrl: string | null = `${BASE_URL_CATALOGI}zaaktypen/`;
    let allZaaktypen: CatalogiZaaktypeTemp[] = [];

    while (nextPageUrl) {
      const response = await zgwHttpClient.request(HttpMethod.Get, nextPageUrl);
      const zaaktypen = response.results; // Get all zaaktypen from the current page
      allZaaktypen = [...allZaaktypen, ...zaaktypen]; // Add current page to the allZaaktypen array

      // Check if there is a next page
      nextPageUrl = response.next;
    }

    // Process all zaaktypen
    console.log(`Fetched ${allZaaktypen.length} zaaktypen`);

    const zaakTypenOverview = allZaaktypen.map(
      (zaaktype) => {
        return {
          url: zaaktype.url,
          identificatie: zaaktype.identificatie,
          omschrijving: zaaktype.omschrijving,
        };
      });

    // Write output to file
    writeOutputToFile(`alleZaaktypen-${ PROD ? 'prod' : 'preprod'}`, zaakTypenOverview);

  };

  test(`All Zaaktypen ${ PROD ? 'prod' : 'preprod'}`, async () => {
    await fetchAllZaaktypen();
  });


  // Nieuwe helper functie om eigenschappen te fetchen
  const fetchAllEigenschappenWithZaaktype = async () => {
    let nextPageUrl: string | null = `${BASE_URL_CATALOGI}eigenschappen/`;
    let allEigenschappen: any[] = [];

    while (nextPageUrl) {
      const response = await zgwHttpClient.request(HttpMethod.Get, nextPageUrl);
      const eigenschappen = response.results;
      allEigenschappen = [...allEigenschappen, ...eigenschappen];
      nextPageUrl = response.next;
    }

    console.log(`Fetched ${allEigenschappen.length} eigenschappen`);

    const eigenschappenOverview = await Promise.all(
      allEigenschappen.map(async (eigenschap) => {
        const zaaktypeResponse = await zgwHttpClient.request(HttpMethod.Get, eigenschap.zaaktype);
        return {
          url: eigenschap.url,
          naam: eigenschap.naam,
          zaaktypeUrl: eigenschap.zaaktype,
          zaaktypeOmschrijving: zaaktypeResponse.omschrijving,
        };
      }),
    );

    writeOutputToFile(`alleEigenschappen-${PROD ? 'prod' : 'preprod'}`, eigenschappenOverview);
  };

  test(`Alle Eigenschappen ${PROD ? 'prod' : 'preprod'}`, async () => {
    await fetchAllEigenschappenWithZaaktype();
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
  eigenschappen?: string[];
  besluittypen?: string[];

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
