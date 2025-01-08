import fs from 'fs';
import path from 'path';
import { ZgwCatalogiZaakTypeSetup, aanvraagBeschikkingZaakCatalogiSetup, schaduwZaakCatalogiSetup, ZgwCatalogiConfig } from './GenerateConfigInterfaces';
import { describeIntegration } from '../../app/test-utils/describeIntegration';
import { HttpMethod, ZgwHttpClient } from '../../app/zgw/zgwClient/ZgwHttpClient';

/**
 * This test generates the config for a zaak from the zgw catalogi
 * Retrieves the latest version of the zaak
 * Retrieves statustypen, roltypen, eiegenschappen en resultaattypen op basis van de ZgwCatalogiZaakTypeSetup
 * Returns a ZgwCatalogiConfig in a file in ./output (untracked) with the zaak name and a timestamp
 */
const PROD: boolean = process.env.RX_ENV == 'PROD' ? true : false; // false is PREPROD
const BASE_URL_CATALOGI = PROD
  ? `https://catalogi.${process.env.RX_PROD_BASE_URL}/api/v1/`
  : `https://catalogi.${process.env.RX_PREPROD_BASE_URL}/api/v1/`;

console.log(`PROD? ${PROD}. ${BASE_URL_CATALOGI}`);

const zgwHttpClient = new ZgwHttpClient({
  clientId: process.env.RX_CLIENT_ID!,
  clientSecret: PROD ? process.env.RX_PROD_CLIENT_SECRET! :process.env.RX_PREPROD_CLIENT_SECRET!,
});

export async function fetchZaakTypeConfig(
  zaaktypeIdentificatie: string,
  zaakTypeSetup: ZgwCatalogiZaakTypeSetup,
): Promise<ZgwCatalogiConfig> {
  // Haal zaaktypen op, kunnen er meerdere zijn in verschillende versies
  const zaaktypenResponse = await zgwHttpClient.request(HttpMethod.Get,
    `${BASE_URL_CATALOGI}zaaktypen?identificatie=${zaaktypeIdentificatie}`,
  );

  const zaaktypen = zaaktypenResponse.results;

  if (zaaktypen.length === 0) {
    throw new Error(`Geen zaaktypen gevonden voor identificatie: ${zaaktypeIdentificatie}`);
  }

  //  Filter op zaaktypen zonder einddatum (waarschijnlijk nieuwste)
  //const latestZaakType = zaaktypen.filter((zaaktype: any) => !zaaktype.eindeGeldigheid)[0];


  // Sorteer de gefilterde zaaktypen op versiedatum en selecteer de laatste, misschien niet de beste optie
  const latestZaakType = zaaktypen.sort((a: any, b: any) =>
    new Date(b.versiedatum).getTime() - new Date(a.versiedatum).getTime(),
  )[0];
  if (latestZaakType.length > 1 || latestZaakType.length === 0) {
    throw new Error(`Geen of meer dan 1 zaaktypen zonder einddatum gevonden voor identificatie: ${zaaktypeIdentificatie}. Aantal: ${latestZaakType.length}`);
  }

  // Haal details op van gerelateerde URLs
  const fetchDetails = async (
    urls: string[],
    originals: { kenmerk: string; omschrijving?: string; naam?: string; default?: boolean }[],
  ) => {
    if (!urls || urls.length === 0 || !originals || originals.length === 0) { return [];}
    const results = await Promise.all(
      urls.map(async (url) => {
        const detail = await zgwHttpClient.request(HttpMethod.Get, url);
        const original = originals.find(
          (o) => (o.omschrijving && o.omschrijving === detail.omschrijving) || (o.naam && o.naam === detail.naam),
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
      }),
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
  const resultaatTypen = latestZaakType.resultaattypen ? await fetchDetails(latestZaakType.resultaattypen, zaakTypeSetup.resultaatTypen|| []) : [];
  const eigenschappen = latestZaakType.eigenschappen ? await fetchDetails(latestZaakType.eigenschappen, zaakTypeSetup.eigenschappen|| []) : [];
  const informatieObjectTypen = latestZaakType.informatieobjecttypen
    ? await fetchDetails(latestZaakType.informatieobjecttypen, zaakTypeSetup.informatieObjectTypen || [])
    : [];
  const rolTypen = await fetchDetails(latestZaakType.roltypen, zaakTypeSetup.rolTypen);

  const config: ZgwCatalogiConfig = {
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
      writeOutputToFile(`schaduwzaak-${process.env.RX_ENV}`, config);
      console.log('Generated Config: Schaduwzaak');
    } catch (error) {
      console.error('Error fetching zaaktype config:', error);
    }
  });

  xtest('Aanvraag beschikking - todo move', async() => {
    try {
      const config = await fetchZaakTypeConfig('NMG-AANVRBS-OVERIG', aanvraagBeschikkingZaakCatalogiSetup);
      writeOutputToFile('aanvraag-beschikking', config);
      console.log('Generated Config: Aanvraag Beschikking');
    } catch (error) {
      console.error('Error fetching zaaktype config:', error);
    }
  });
});


/**
   *  Test helper methods and const
   */

function writeOutputToFile(name: string, data: any) {
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
