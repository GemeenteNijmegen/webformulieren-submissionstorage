import { describeIntegration } from "../../app/test-utils/describeIntegration";
import { HttpMethod, ZgwHttpClient } from "../../app/zgw/zgwClient/ZgwHttpClient";
import { ZgwCatalogiZaakTypeSetup, schaduwZaakCatalogiSetup, zgwCatalogiConfig } from "./GenerateConfigInterfaces";
import fs from 'fs';
import path from 'path';


const PROD: boolean = process.env.RX_ENV == 'PROD' ? true : false; // false is PREPROD
const BASE_URL_CATALOGI = PROD
  ? 'https://catalogi.rx-services.nl/api/v1/'
  : 'https://catalogi.preprod-rx-services.nl/api/v1/';

const zgwHttpClient = new ZgwHttpClient({
  clientId: process.env.RX_CLIENT_ID!,
  clientSecret: PROD ? process.env.RX_PROD_CLIENT_SECRET! :process.env.RX_PREPROD_CLIENT_SECRET! ,
});

export async function fetchZaakTypeConfig(
    zaaktypeIdentificatie: string,
    zaakTypeSetup: ZgwCatalogiZaakTypeSetup
  ): Promise<zgwCatalogiConfig> {
    // Haal zaaktypen op, kunnen er meerdere zijn in verschillende versies
    const zaaktypenResponse = await zgwHttpClient.request(HttpMethod.Get,
      `${BASE_URL_CATALOGI}zaaktypen?identificatie=${zaaktypeIdentificatie}`
    );
  
    const zaaktypen = zaaktypenResponse.results;
  
    if (zaaktypen.length === 0) {
      throw new Error(`Geen zaaktypen gevonden voor identificatie: ${zaaktypeIdentificatie}`);
    }
  
    //  Filter op zaaktypen zonder einddatum (waarschijnlijk nieuwste)
    const latestZaakType = zaaktypen.filter((zaaktype: any) => !zaaktype.eindeGeldigheid);
  
    if (latestZaakType.length === 0) {
      throw new Error(`Geen zaaktypen zonder einddatum gevonden voor identificatie: ${zaaktypeIdentificatie}`);
    }
  
    // // Sorteer de gefilterde zaaktypen op versiedatum en selecteer de laatste, misschien niet de beste optie
    // const latestZaakType = zaaktypenZonderEinddatum.sort((a: any, b: any) =>
    //   new Date(b.versiedatum).getTime() - new Date(a.versiedatum).getTime()
    // )[0];
  
    // Haal details op van gerelateerde URLs
    const fetchDetails = async (
      urls: string[],
      originals: { kenmerk: string; omschrijving?: string; naam?: string; default?: boolean }[]
    ) => {
      const results = await Promise.all(
        urls.map(async (url) => {
          const detail = await zgwHttpClient.request(HttpMethod.Get, url);
          const original = originals.find(
            (o) => (o.omschrijving && o.omschrijving === detail.omschrijving) || (o.naam && o.naam === detail.naam)
          );
    
          // Return an object only if a matching original exists
          if (original) {
            return {
              url: detail.url,
              kenmerk: original.kenmerk,
              omschrijving: detail.omschrijving || original.omschrijving,
              naam: detail.naam || original.naam,
              default: original.default || false,
            };
          }
          return undefined; // Explicitly return undefined for non-matches
        })
      );
    
      // Filter out undefined values after resolving all promises
      return results.filter((result) => result !== undefined) as {
        url: string;
        kenmerk: string;
        omschrijving?: string;
        naam?: string;
        default?: boolean;
      }[];
    };
  
    const statusTypen = await fetchDetails(latestZaakType.statustypen, zaakTypeSetup.statusTypen);
    const resultaatTypen = await fetchDetails(latestZaakType.resultaattypen, zaakTypeSetup.resultaatTypen);
    const eigenschappen = await fetchDetails(latestZaakType.eigenschappen, zaakTypeSetup.eigenschappen);
    const informatieObjectTypen = latestZaakType.informatieobjecttypen
      ? await fetchDetails(latestZaakType.informatieobjecttypen, zaakTypeSetup.informatieObjectTypen || [])
      : [];
    const rolTypen = await fetchDetails(latestZaakType.roltypen, zaakTypeSetup.rolTypen);
  
    // Stap 5: Bouw de configuratie op
    const config: zgwCatalogiConfig = {
      branch: 'development', // Of 'acceptance' / 'main' afhankelijk van je omgeving
      environment: PROD ? 'PROD' : 'PREPROD',
      version: latestZaakType.versiedatum,
      versionStartDate: latestZaakType.beginGeldigheid,
      zaakTypeIdentificatie: latestZaakType.identificatie,
      zaakTypeUrl: latestZaakType.url,
      zaakTypeBeschrijving: latestZaakType.omschrijving,
      statusTypen,
      resultaatTypen,
      eigenschappen,
      informatieObjectTypen,
      rolTypen,
    };
  
    return config;
  }
  


describeIntegration('generateConfig with latest version zaakType', () => {
    test('SchaduwZaak', async() => {
        try {
            const config = await fetchZaakTypeConfig('NMG-schaduwzaak', schaduwZaakCatalogiSetup);
            writeOutputToFile('schaduwzaak', config);
            console.log('Generated Config: Schaduwzaak');
          } catch (error) {
            console.error('Error fetching zaaktype config:', error);
          }
    });
});


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
  