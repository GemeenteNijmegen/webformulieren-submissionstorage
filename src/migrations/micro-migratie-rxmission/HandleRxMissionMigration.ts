import { ZakenApiZaakResponse } from "../../app/zgw/zgwClient/model/ZakenApiZaak.model";
import { AddZaakStatusParameters, CreateZaakParameters, ZgwClient } from "../../app/zgw/zgwClient/ZgwClient";
import { HttpMethod } from "../../app/zgw/zgwClient/ZgwHttpClient";
import { zgwCatalogiConfig } from "./GenerateConfigInterfaces";
import { GeometrieTransformer } from "./GeometrieTransformer";
import { Row } from "./RxMissionMigratie";
import * as ZAAK_CONFIG from "./RxMissionZaakConfig";

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
  private producten: {melding: string; vergunning: string};
  private geometrieTransformer: GeometrieTransformer;

  // Nu PROD hard op false, later in eindfase toevoegen om PROD te kunnen kiezen
  constructor(PROD: boolean = false) {
    if(PROD){
      console.log(`
        **************************************************
        *                                                *
        *  WAARSCHUWING: MIGRATIE WORDT UITGEVOERD IN PROD  *
        *                                                *
        **************************************************
        `);
          
    }
    if(!process.env.RX_CLIENT_ID){
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
    
    this.zaakConfig = PROD ? ZAAK_CONFIG.schaduwzaakProd : ZAAK_CONFIG.schaduwzaakPreProd;
    this.producten = PROD ? ZAAK_CONFIG.schaduwzaakProdProducten : ZAAK_CONFIG.schaduwzaakPreProdProducten;
    

    this.zgwClient = new ZgwClient({
      clientId: process.env.RX_CLIENT_ID!,
      clientSecret: PROD ? process.env.RX_PROD_CLIENT_SECRET! : process.env.RX_PREPROD_CLIENT_SECRET!,
      zakenApiUrl: this.zakenBaseUrl,
      documentenApiUrl: this.documentenBaseUrl,
      name: 'Migration_RxMission',
      zaaktype: ZAAK_CONFIG.getZaakTypeUrl(this.zaakConfig),
      roltype: ZAAK_CONFIG.getRolTypeUrl(this.zaakConfig),
    });
    this.geometrieTransformer = new GeometrieTransformer();
  }

  async createZaak(row: Row): Promise<{url: string; identification: string | undefined;}> {
    const zaakGeometrie = await this.geometrieTransformer.processGeometry(row.zaakgeometrie); // Returns undefined on fail
    // check if row.zaaktype (cases insensitive) contains the word aanvraag
    const product = row.zaaktype && row.zaaktype.toLowerCase().includes('aanvraag') ? [this.producten.vergunning] : [this.producten.melding]; 
    try{
      const zaakResult: ZakenApiZaakResponse = await this.zgwClient.createZaak({
        productenOfDiensten: product,
        toelichting: `TESTEN MIGRATIE ${row.openwavezaaknummer}`, // TODO: vullen met rest informatie
        zaakgeometrie: zaakGeometrie, // api call works with undefined
        omschrijving: 'DEVOPS MIGRATIE TESTEN',
      } as CreateZaakParameters);
      console.log(`[HandleMigration createZaak] ${zaakResult.identificatie} ${zaakResult.url}. Succesvol aangemaakt.`)
      return {url: zaakResult.url, identification: zaakResult.identificatie};
    }
    catch(error: any){
      console.error(`CREATING ZAAK FAILED: ${row} ${JSON.stringify(error)}`);
      throw Error(`CREATING ZAAK FAILED: ${row} ${JSON.stringify(error)}`);
    }
  }
  /**
   * Levert geen error op
   */
  async addStatus(zaakUrl: string): Promise<boolean>{
    const params: AddZaakStatusParameters = {
      zaakUrl: zaakUrl,
      statusType: ZAAK_CONFIG.getStatusTypeUrl(this.zaakConfig),
      statustoelichting: 'Devops aangemaakt in migratie'
    };
    const status = await this.zgwClient.addZaakStatus(params);
    return !!status.url
  }

  /**
   * Zaakeigenschappen
   * No errors when the calls fail
   */
  async addZaakEigenschappen(zaakUrl: string, row: Row): Promise<{openwave: string; corsa: string;}>{
    let response = { corsa: '', openwave: ''};
    try{
      const corsaEigenschap = await this.zgwClient.addZaakEigenschap(
        zaakUrl, 
        ZAAK_CONFIG.getZaakEigenschapUrl(this.zaakConfig, 'ZAAKNUMMER_CORSA'), 
        row.corsazaaknummer
      );
      response.corsa = corsaEigenschap.url;
    }catch(error: any){
      console.error(`Zaakeigenschap Corsa is niet toegevoegd. Error: ${error}. ${row.openwavezaaknummer} ${row.corsazaaknummer}`);
    }
    

    try{
      const openwaveEigenschap = await this.zgwClient.addZaakEigenschap(
        zaakUrl, 
        ZAAK_CONFIG.getZaakEigenschapUrl(this.zaakConfig, 'ZAAKNUMMER_OPENWAVE'), 
        row.openwavezaaknummer
      );
      response.openwave = openwaveEigenschap.url;
    }catch(error: any){
      console.error(`Zaakeigenschap Openwave is niet toegevoegd. Error: ${error}. ${row.openwavezaaknummer} ${row.corsazaaknummer}`);
    }
    return response;
  }

  /**
   * Kijken of dit nodig is om op te ruimen en of we uberhaupt rechten hebben.
   */
  async deleteZaak(zaakUrl: string): Promise<void>{
    try{
      this.zgwClient.callZaakApi(HttpMethod.Delete, zaakUrl);
      console.log(`DELETE ${zaakUrl} success`);
    }
    catch(error: any){
      console.error(`DELETING ZAAK FAILED: ${zaakUrl}`);
      throw Error(`DELETING ZAAK FAILED: ${zaakUrl}`);
    }
  }
}