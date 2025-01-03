import { zgwCatalogiConfig } from './GenerateConfigInterfaces';
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
  // Rol
  // Zaakeigenschappen
  // Status
  // Zaakresultaat

  // Eenmalig ZgwClient aanmaken
  private zgwClient: ZgwClient;
  private zakenBaseUrl: string;
  private documentenBaseUrl: string;
  private zaakConfig: zgwCatalogiConfig;
  private producten: { melding: string; vergunning: string };
  private geometrieTransformer: GeometrieTransformer;

  // Nu PROD hard op false, later in eindfase toevoegen om PROD te kunnen kiezen
  constructor(PROD: boolean = false) {
    if (PROD) {
      throw new Error(
        'Environment is PREPROD. Operation aborted. Delete this check once you are ready to migrate.',
      );
    }

    console.log('Environment verified: PREPROD');
    if (PROD) {
      console.log(`
        **************************************************
        *                                                *
        *  WAARSCHUWING: MIGRATIE WORDT UITGEVOERD IN PROD  *
        *                                                *
        **************************************************
        `);
    }
    if (!process.env.RX_CLIENT_ID) {
      console.log(`
        **************************************************
        *                                                *
        *  WAARSCHUWING: GEEN WAARDE GEVONDEN IN .ENV  *
        *                                                *
        **************************************************
        `);
    }
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
  ): Promise<{ url: string; identification: string | undefined }> {
    const zaakGeometrie = await this.geometrieTransformer.processGeometry(
      row.zaakgeometrie,
    ); // Returns undefined on fail
    // check if row.zaaktype (cases insensitive) contains the word aanvraag
    const product =
      row.zaaktype && row.zaaktype.toLowerCase().includes('aanvraag')
        ? [this.producten.vergunning]
        : [this.producten.melding];
    try {
      const zaakResult: ZakenApiZaakResponse = await this.zgwClient.createZaak({
        productenOfDiensten: product,
        toelichting: `TESTEN MIGRATIE ${row.openwavezaaknummer}`, // TODO: vullen met rest informatie
        zaakgeometrie: zaakGeometrie, // api call works with undefined
        omschrijving: 'DEVOPS MIGRATIE TESTEN',
      } as CreateZaakParameters);
      console.log(
        `[HandleMigration createZaak] ${zaakResult.identificatie} ${zaakResult.url}. Succesvol aangemaakt.`,
      );
      return { url: zaakResult.url, identification: zaakResult.identificatie };
    } catch (error: any) {
      console.error(`CREATING ZAAK FAILED: ${row} ${JSON.stringify(error)}`);
      throw Error(`CREATING ZAAK FAILED: ${row} ${JSON.stringify(error)}`);
    }
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
      'Vergunningvrij': 'TOEGEKEND', // Map "Vergunningvrij" to "TOEGEKEND" if that's correct
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
   * get zaak om te checken of de delete gewerkt heeft
   */
  async getSingleZaak(zaakUrl: string) {
    const zaak = await this.zgwClient.callZaakApi(HttpMethod.Get, zaakUrl);
    if (!zaak) {
      throw new ZaakNotFoundError();
    }
    return zaak;
  }
  /**
   * Kijken of dit nodig is om op te ruimen en of we uberhaupt rechten hebben.
   */
  async deleteZaak(zaakUrl: string): Promise<void> {
    try {
      await this.zgwClient.callZaakApi(HttpMethod.Delete, zaakUrl);
      console.log(`DELETE ${zaakUrl} success}`);
    } catch (error: any) {
      console.error(`DELETING ZAAK FAILED: ${zaakUrl}`);
      throw Error(`DELETING ZAAK FAILED: ${zaakUrl}`);
    }
  }
}
