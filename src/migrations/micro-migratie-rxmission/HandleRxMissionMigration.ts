import { ZgwCatalogiConfig } from './GenerateConfigInterfaces';
import { GeometrieTransformer } from './GeometrieTransformer';
import { Row } from './RxMissionMigratie';
import * as ZAAK_CONFIG from './RxMissionZaakConfig';
import { ZakenApiZaakResponse } from '../../app/zgw/zgwClient/model/ZakenApiZaak.model';
import {
  AddZaakStatusParameters,
  CreateZaakParameters,
  ZaakNotFoundError,
  ZgwClient,
} from '../../app/zgw/zgwClient/ZgwClient';
import { HttpMethod } from '../../app/zgw/zgwClient/ZgwHttpClient';

export class HandleRxMissionMigration {

  // Eenmalig ZgwClient aanmaken
  private zgwClient: ZgwClient;
  private zakenBaseUrl: string;
  private documentenBaseUrl: string;
  private zaakConfig: ZgwCatalogiConfig;
  private producten: { melding: string; vergunning: string };
  private geometrieTransformer: GeometrieTransformer;
  private envProd: boolean;

  // Default PREPROD
  constructor(PROD: boolean = false) {
    this.envProd = PROD;
    if (PROD) {
      // This line prevents execution on production. Please comment to execute on prod.
      // One of the many fail-safes to make sure you are dealing with prod.
      // throw new Error(
      //   'Environment is PREPROD. Operation aborted. Delete this check once you are ready to migrate.',
      // );
    }
    if (PROD) {
      console.log(`
        **************************************************
        *                                                
        *  WAARSCHUWING: MIGRATIE WORDT UITGEVOERD IN PROD  
        *                                                
        **************************************************
        `);
    }
    if (!process.env.RX_CLIENT_ID) {
      console.log(`
        **************************************************
        *                                                
        *  WAARSCHUWING: GEEN WAARDE GEVONDEN IN .ENV  
        *                                                
        **************************************************
        `);
    }
    /**
     * Basic setup of the client, geometryTransformer and zaakconfig based on the environment
     */
    const BASE_URL = PROD
      ? process.env.RX_PROD_BASE_URL
      : process.env.RX_PREPROD_BASE_URL;
    this.zakenBaseUrl = `https://zaken.${BASE_URL}/api/v1/`;
    this.documentenBaseUrl = `https://documenten.${BASE_URL}/api/v1/`;

    this.zaakConfig = PROD
      ? ZAAK_CONFIG.schaduwzaakProd
      : ZAAK_CONFIG.schaduwzaakPreProd;
    this.producten = PROD
      ? ZAAK_CONFIG.schaduwzaakProdProducten
      : ZAAK_CONFIG.schaduwzaakPreProdProducten;

    this.zgwClient = new ZgwClient({
      clientId: process.env.RX_CLIENT_ID!,
      clientSecret: PROD
        ? process.env.RX_PROD_CLIENT_SECRET!
        : process.env.RX_PREPROD_CLIENT_SECRET!,
      zakenApiUrl: this.zakenBaseUrl,
      documentenApiUrl: this.documentenBaseUrl,
      name: 'Migration_RxMission',
      zaaktype: ZAAK_CONFIG.getZaakTypeUrl(this.zaakConfig),
      roltype: ZAAK_CONFIG.getRolTypeUrl(this.zaakConfig),
    });
    this.geometrieTransformer = new GeometrieTransformer();
  }

  async createZaak(
    row: Row,
  ): Promise<{ url: string; identification: string | undefined; zaakgeometrieAdded: boolean }> {
    const zaakGeometrie = await this.geometrieTransformer.processGeometry(
      row.zaakgeometrie,
    ); // Returns undefined on fail
    // check if row.zaaktype in excel (cases insensitive) contains the word aanvraag, besluit or beschik - util test shows results with excel possibilities
    const product =
    row.zaaktype &&
    (row.zaaktype.toLowerCase().includes('aanvraag') ||
      row.zaaktype.toLowerCase().includes('besluit') ||
      row.zaaktype.toLowerCase().includes('beschik'))
      ? [this.producten.vergunning]
      : [this.producten.melding];

    const toelichting: string = this.createToelichting(row);
    let retryWithoutGeometry: boolean = false;
    const zaakParams: CreateZaakParameters = {
      productenOfDiensten: product,
      toelichting: `${toelichting}`,
      zaakgeometrie: zaakGeometrie, // api call works with undefined
      omschrijving: `${row.zaakomschrijving.substring(0,79)}`,
    };
    try {
      return await this.callCreateZaak(zaakParams, row);
    } catch (error: any) {
      if (!retryWithoutGeometry) {
        retryWithoutGeometry = true;
        console.error(`Retry create zaak without zaakgeometrie ${row.openwavezaaknummer}`);
        return this.callCreateZaak({ ...zaakParams, zaakgeometrie: undefined, toelichting: `GEEN LOCATIE OP KAART MOGELIJK. ${toelichting}` }, row);
      } else {
        throw Error(`CREATING ZAAK ON RETRY FAILED: ${row.openwavezaaknummer}`);
      }
    }

  }
  async callCreateZaak(params: CreateZaakParameters, row: Row) {
    try {
      const zaakResult: ZakenApiZaakResponse = await this.zgwClient.createZaak(params);
      console.log(
        `[HandleMigration createZaak] ${zaakResult.identificatie} ${zaakResult.url}. Succesvol aangemaakt.`,
      );
      return { url: zaakResult.url, identification: zaakResult.identificatie, zaakgeometrieAdded: !!params.zaakgeometrie };
    } catch (error: any) {
      console.error(`CREATING ZAAK FAILED: ${row.openwavezaaknummer} ${JSON.stringify(error.message)}`);
      throw Error(`CREATING ZAAK FAILED: ${row.openwavezaaknummer} ${JSON.stringify(error.message)}`);
    }
  }
  /**
   * Bundles all fields from migration excel that have no other options to be added to the zaak
   * Max 1000 chars allowed in toelichting
   */
  createToelichting(row: Row): string {
    let toelichting = '';
    if (row.contactpersoon) { toelichting += `Naam: ${row.contactpersoon},  `;}
    if (row.email) { toelichting += `Email: ${row.email},   `;}
    if (row.telefoon) { toelichting += `Tel: ${row.telefoon},   `;}
    if (row.locatie) { toelichting += `Locatie: ${row.locatie},   `;}
    // Only add bsn or kvk in PROD
    if (this.envProd) {
      if (row.bsn || row.kvk) { toelichting += `kvk/bsn: ${row.bsn ? 'bsn: ' + row.bsn : row.kvk ? 'kvk: ' + row.kvk : 'geen'},    `;}
    } else {
      if (row.bsn || row.kvk) { toelichting += `kvk/bsn: ${row.bsn ? 'bsn: ' : row.kvk ? 'kvk: ' : 'geen'},    `;}
    }
    if (row.zaakomschrijving) { toelichting += `   Omschrijving: ${row.zaakomschrijving},     `;}
    if (row.producten) { toelichting += `   Producten: ${row.producten},   `;}
    if (row.urlcorsa) { toelichting += `  UrlCorsa: ${row.urlcorsa},   `;}
    if (row.urlopenwave) { toelichting += `  UrlOpenWave: ${row.urlopenwave},   `;}
    if (row.openwavezaaknummer) { toelichting += `Zaaknummers: [ openwave: ${row.openwavezaaknummer}, corsa: ${row.corsazaaknummer}, cb_openwave: ${row.cbopenwavezaaknummer}],   `;}

    // Make sure the char limit is not exceeded
    toelichting = toelichting.length > 999 ? toelichting.substring(0, 999) : toelichting;
    return toelichting;
  }

  /**
   * Levert geen error op
   */
  async addStatus(zaakUrl: string): Promise<boolean> {
    const params: AddZaakStatusParameters = {
      zaakUrl: zaakUrl,
      statusType: ZAAK_CONFIG.getStatusTypeUrl(this.zaakConfig),
      statustoelichting: 'Devops aangemaakt in migratie',
    };
    const status = await this.zgwClient.addZaakStatus(params);
    return !!status.url;
  }

  /**
   * Zaakeigenschappen
   * No errors when the calls fail
   */
  async addZaakEigenschappen(
    zaakUrl: string,
    row: Row,
  ): Promise<{ openwave: string; corsa: string }> {
    let response = { corsa: '', openwave: '' };
    try {
      const corsaEigenschap = await this.zgwClient.addZaakEigenschap(
        zaakUrl,
        ZAAK_CONFIG.getZaakEigenschapUrl(this.zaakConfig, 'ZAAKNUMMER_CORSA'),
        row.corsazaaknummer,
      );
      response.corsa = corsaEigenschap.url;
    } catch (error: any) {
      console.error(
        `Zaakeigenschap Corsa is niet toegevoegd. Error: ${error}. ${row.openwavezaaknummer} ${row.corsazaaknummer}`,
      );
    }

    try {
      const openwaveEigenschap = await this.zgwClient.addZaakEigenschap(
        zaakUrl,
        ZAAK_CONFIG.getZaakEigenschapUrl(
          this.zaakConfig,
          'ZAAKNUMMER_OPENWAVE',
        ),
        row.openwavezaaknummer,
      );
      response.openwave = openwaveEigenschap.url;
    } catch (error: any) {
      console.error(
        `Zaakeigenschap Openwave is niet toegevoegd. Error: ${error}. ${row.openwavezaaknummer} ${row.corsazaaknummer}`,
      );
    }
    return response;
  }

  /**
   * Rol toevoegen indien mogelijk
   * No errors on fail, but undefined returned
   */
  async addRol(zaakUrl: string, row: Row): Promise<string | undefined> {
    if (!row.typecontact || (!row.bsn && !row.kvk)) {
      console.error(
        `No Rol added because no typeContact or no bsn/kvk ${row.openwavezaaknummer}`,
      );
      return undefined;
    }
    const userType =
      row.typecontact.toLowerCase().trim() === 'natuurlijk persoon'
        ? 'natuurlijk_persoon'
        : 'niet_natuurlijk_persoon';
    try {
      const createdRol = await this.zgwClient.createRol({
        zaak: zaakUrl,
        rolType: ZAAK_CONFIG.getRolTypeUrl(this.zaakConfig),
        userType: userType,
        identifier: row.bsn ?? row.kvk,
        name: row.contactpersoon ?? 'unknown name', //required for contactpersoonrol
        email: row.email ?? 'unknown email',
        telefoon: row.telefoon ?? 'unknown phone',
      });
      return createdRol.url ?? undefined;
    } catch (error: any) {
      console.error(
        `No Rol added because api call failed ${row.openwavezaaknummer}`,
      );
      return undefined;
    }
  }

  /**
   * Resultaat mapping specific for migration excel
   * Returns undefined, no error on fail
   */
  async addResultaat(zaakUrl: string, row: Row) {
    // Map row.zaakresultaat values to config `kenmerk` values
    const resultaatMapping: Record<string, string> = {
      'Afgebroken': 'AFGEBROKEN',
      'Afgesloten': 'AFGESLOTEN',
      'Buiten behandeling gelaten': 'BUITEN_BEHANDELING',
      'Geaccepteerd': 'GEACCEPTEERD',
      'Gedeeltelijk verleend': 'GEDEELTELIJK_VERLEEND',
      'Geweigerd': 'GEWEIGERD',
      'Ingetrokken': 'INGETROKKEN',
      'Niet geaccepteerd': 'NIET_GEACCEPTEERD',
      'Toegekend': 'TOEGEKEND',
      'Vergunningvrij': 'VERGUNNINGSVRIJ',
      'Verleend': 'VERLEEND',
    };
    const zaakresultaat = row.zaakresultaat?.trim(); // Ensure no trailing spaces
    const kenmerk = resultaatMapping[zaakresultaat];

    if (!kenmerk) {
      console.error(
        `No mapping found for zaakresultaat "${row.zaakresultaat}".`,
      );
      return undefined;
    }
    try {
      const resultaattype = ZAAK_CONFIG.getResultaatTypeUrl(
        this.zaakConfig,
        kenmerk,
      );
      const resultaat = await this.zgwClient.callZaakApi(
        HttpMethod.Post,
        'resultaten',
        {
          zaak: zaakUrl,
          resultaattype: resultaattype,
          toelichting: `${row.zaakresultaat} originele zaaktype migratie`,
        },
      );
      return resultaat.url ?? undefined;
    } catch (error: any) {
      console.error(
        `No resultaat added because api call failed ${row.openwavezaaknummer} - ${row.zaakresultaat}`,
      );
      return undefined;
    }
  }

  /**
   * Get zaak to check if a zaak has been deleted
   */
  async getSingleZaak(zaakUrl: string) {
    const zaak = await this.zgwClient.callZaakApi(HttpMethod.Get, zaakUrl);
    if (!zaak) {
      throw new ZaakNotFoundError();
    }
    return zaak;
  }
  /**
   * Verwijder zaak, rol, resultaat, status, eigenschap of iets anders in de zakenapi.
   * Geef het type mee om duidelijke foutmeldingen te krijgen.
   */
  async deleteZaakApiObject(url: string, type: string = 'zaak'): Promise<void> {
    try {
      await this.zgwClient.callZaakApi(HttpMethod.Delete, url);
      console.log(`DELETE ${type}:  ${url} success}`);
    } catch (error: any) {
      console.error(`DELETING ${type} FAILED: ${url}`);
      throw Error(`DELETING ${type} FAILED: ${url}`);
    }
  }

  /**
   * Patch omschrijving zaak
   */
  async patchOmschrijvingZaak(url: string, omschrijving: string): Promise<{url: string; identification: string | undefined;}>{
    const cappedOmschrijving = omschrijving.substring(0,79);
    try {
      const patchedZaak = await this.zgwClient.callZaakApi(HttpMethod.Patch, url, { omschrijving: cappedOmschrijving });
      console.log(`PATCH:  ${url} success ${omschrijving}`);
      return {url: patchedZaak.url, identification: patchedZaak.identificatie}
    } catch (error: any) {
      console.error(`PATCH FAILED: ${url} ${omschrijving}`);
      throw Error(`PATCH FAILED: ${url} ${omschrijving}`);
    }
  }
}