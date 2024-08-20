import { AWS } from '@gemeentenijmegen/utils';
import * as jwt from 'jsonwebtoken';

interface ZgwClientOptions {
  /**
   * @default - fetched from environment variable ZGW_CLIENT_ID when init is called
   */
  clientId?: string;

  /**
   * @default - fetch from secretsmanager using the arn provided in ZGW_CLIENT_SERCET_ARN when init is called
   */
  clientSecret?: string;

  /**
   * Name used to identify this application
   */
  name: string;

  /**
   * Zaken API url to send submissions to
   */
  zakenApiUrl: string;

  /**
   * Documenten API url to store attachments
   */
  documentenApiUrl: string;

  /**
   * Zaaktype url for the zaak to create
   */
  zaaktype: string;

  /**
   * Zaakstatus url for the zaak to create
   */
  zaakstatus: string;

  /**
   * A informatieobjecttype for documents added to a zaak
   */
  informatieobjecttype: string;

  /**
   * RSIN of the organization
   * @default - RSIN of Gemeente Nijmegen
   */
  rsin?: string;
}

export class ZgwClient {

  public static readonly GN_RSIN = '001479179';

  private clientId?: string;
  private clientSecret?: string;
  private readonly options: ZgwClientOptions;

  constructor(options: ZgwClientOptions) {
    this.options = options;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
  }

  async init() {
    if (this.clientId && this.clientSecret) {
      return;
    }
    this.clientId = process.env.ZGW_CLIENT_ID;
    this.clientSecret = await AWS.getSecret(process.env.ZGW_CLIENT_SECRET_ARN!);
  }

  async getZaak(identificatie: string) {
    const zaken = await this.callZaakApi('GET', `zaken?identificatie=${identificatie}`);
    if (!zaken || zaken.count == 0) {
      throw new ZaakNotFoundError();
    } else if (zaken.count > 1) {
      throw Error('Multiple zaken found');
    }
    return zaken.results[0];
  }

  async createZaak(identificatie: string, formulier: string) {

    const zaakRequest = {
      identificatie: identificatie,
      bronorganisatie: this.options.rsin ?? ZgwClient.GN_RSIN,
      zaaktype: this.options.zaaktype,
      verantwoordelijkeOrganisatie: this.options.rsin ?? ZgwClient.GN_RSIN,
      startdatum: this.datestemp(),
      omschrijving: `Webformulier ${identificatie}`,
      toelichting: `Webformulier ${formulier}`,
    };
    const zaak = await this.callZaakApi('POST', 'zaken', zaakRequest);

    const statusRequest = {
      zaak: zaak.url,
      statustype: this.options.zaakstatus,
      datumStatusGezet: this.datestemp(),
      statustoelichting: 'Aanvraag ingediend vanuit Webformulieren',
    };
    await this.callZaakApi('POST', 'statussen', statusRequest);

    return zaak;
  }

  async addDocumentToZaak(zaak: string, documentName: string, documentBase64: string) {
    const documentRequest = {
      bronorganisatie: this.options.rsin ?? ZgwClient.GN_RSIN,
      creatiedatum: this.datestemp(),
      titel: documentName,
      auteur: this.options.name,
      taal: 'dut',
      informatieobjecttype: this.options.informatieobjecttype,
      inhoud: documentBase64,
      bestandsnaam: documentName,
    };
    const document = await this.callDocumentenApi('POST', 'enkelvoudiginformatieobjecten', documentRequest);

    const documentZaakRequest = {
      informatieobject: document.url,
      zaak: zaak,
    };
    await this.callZaakApi('POST', 'zaakinformatieobjecten', documentZaakRequest);
  }


  private createToken(clientId: string, userId: string, secret: string) {
    const token = jwt.sign({
      iss: clientId,
      iat: Date.now(),
      client_id: clientId,
      user_id: userId,
      user_representation: userId,
    }, secret);
    return token;
  }

  private async callZaakApi(method: string, path: string, data?: any) {
    this.checkConfiguration();
    const token = this.createToken(this.clientId!, this.options.name, this.clientSecret!);

    const url = this.joinUrl(this.options.zakenApiUrl, path);
    const response = await fetch(url, {
      method: method,
      body: JSON.stringify(data),
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-type': 'application/json',
        'Content-Crs': 'EPSG:4326',
        'Accept-Crs': 'EPSG:4326',
      },
    });
    console.debug(response);
    const json = await response.json() as any;
    console.debug(json);
    if (response.status < 200 || response.status > 300) {
      throw Error('Not a 2xx response');
    }
    return json;
  }

  private async callDocumentenApi(method: string, path: string, data?: any) {
    this.checkConfiguration();
    const token = this.createToken(this.clientId!, this.options.name, this.clientSecret!);

    const url = this.joinUrl(this.options.documentenApiUrl, path);
    const response = await fetch(url, {
      method: method,
      body: JSON.stringify(data),
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-type': 'application/json',
      },
    });
    console.debug(response);
    const json = await response.json() as any;
    console.debug(json);
    if (response.status < 200 || response.status > 300) {
      throw Error('Not a 2xx response');
    }
    return json;
  }


  private checkConfiguration() {
    if (!this.clientId || !this.clientSecret) {
      throw Error('ZgwClient is not configured correctly!');
    }
  }

  private datestemp() {
    return new Date().toISOString().substring(0, 'yyyy-mm-dd'.length);
  }

  private joinUrl(start: string, ...args: string[]) {
    if (!start.endsWith('/')) {
      start = `${start}/`;
    }
    return start + args.map( pathPart => pathPart.replace(/(^\/|\/$)/g, '') ).join('/');
  }


}


export class ZaakNotFoundError extends Error {}