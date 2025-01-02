import { ZakenApiZaakResponse } from "../../app/zgw/zgwClient/model/ZakenApiZaak.model";
import { CreateZaakParameters, ZgwClient } from "../../app/zgw/zgwClient/ZgwClient";
import { HttpMethod } from "../../app/zgw/zgwClient/ZgwHttpClient";
import { zgwCatalogiConfig } from "./GenerateConfigInterfaces";
import { GeometrieTransformer } from "./GeometrieTransformer";
import { Row } from "./RxMissionMigratie";
import * as ZAAK_CONFIG from "./RxMissionZaakConfig";

export class HandleRxMissionMigration {

  // Maak zaak, sla zaaknummer op
  // Error handling
  // Rol
  // Zaakeigenschappen
  // Status

  // Eenmalig ZgwClient aanmaken
  private zgwClient: ZgwClient;
  private zakenBaseUrl: string;
  private documentenBaseUrl: string;
  private zaakConfig: zgwCatalogiConfig;
  private producten: {melding: string; vergunning: string};
  private geometrieTransformer: GeometrieTransformer;

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

  async createZaak(row: Row) {
    const zaakGeometrie = this.geometrieTransformer.processGeometry(row.zaakgeometrie); // Returns undefined on fail
    try{
      const zaakResult: ZakenApiZaakResponse = await this.zgwClient.createZaak({
        productenOfDiensten: [this.producten.melding], // TODO: change to melding or vergunning based on row 
        toelichting: `TESTEN MIGRATIE ${row.openwavezaaknummer}`,
        zaakgeometrie: zaakGeometrie, // api call works with undefined
        omschrijving: 'DEVOPS MIGRATIE TESTEN',
      } as CreateZaakParameters);
      console.log(`[HandleMigration createZaak] ${zaakResult.url}. Succesvol aangemaakt.`)
      return zaakResult.url;
    }
    catch(error: any){
      console.error(`CREATING ZAAK FAILED: ${row} ${JSON.stringify(error)}`);
      throw Error(`CREATING ZAAK FAILED: ${row} ${JSON.stringify(error)}`);
    }
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
  cleanZaakgeometrie(input: string): any {
    console.log('ZAAKGEOMETRIE: ', input);
    console.log('ZAAKGEOMETRIE: ', JSON.stringify(input));
    try {
      // Remove unwanted characters (e.g., \r\n)
      const cleanedInput = input.replace(/\r?\n|\r/g, '').trim();
  
      // Parse the cleaned string into a JSON object
      const zaakgeometrie = JSON.parse(cleanedInput);
  
      // Validate the basic structure of the GeoJSON (optional)
      if (!zaakgeometrie.type || !zaakgeometrie.coordinates) {
        throw new Error('Invalid GeoJSON structure');
      }
  
      return zaakgeometrie;
    } catch (error: any) {
      console.error('Failed to clean zaakgeometrie:', error.message);
      throw new Error('Invalid zaakgeometrie input');
    }
  }
}