import * as fs from 'fs';
import path from 'path';
import { ZgwClient } from '../zgwClient/ZgwClient';

interface RXMissionDocumentConfig {
  zgwClient: ZgwClient;
  informatieObjectType: string;
  informatieObjectProperties?: any;
}

/**
 * Create and upload documents
 *
 * This is ZGW-standard, using the 'bestandsdelen' functionality. Some documentation
 * from Roxit: https://github.com/OneGround/About/blob/main/exampledocumentupload.md
 */

export class RXMissionDocument {
  private zgwClient: ZgwClient;
  private informatieObjectType: string;
  private informatieObject: any;
  private informatieObjectProperties?: any;
  private lock?: string;
  private fileName: string;
  private fileBuffer: Buffer;

  constructor(filePath: string, fileName: string, config: RXMissionDocumentConfig) {
    this.zgwClient = config.zgwClient;
    this.informatieObjectType = config.informatieObjectType;
    this.informatieObjectProperties = config.informatieObjectProperties;
    this.fileName = fileName;
    this.fileBuffer = this.getFile(filePath);
  }

  /**
   * Adding a document to a Zaak
   *
   * This is a multipart process:
   * - Create an informatieObject, containing the filesize of your file, but no contents
   * - Get a reference to this first 'bestandsdeel'
   * - Upload that bestandsdeel
   * - Unlock the informatieObject
   * - Attach the informatieObject to the Zaak
   *
   * @param zaakUrl
   */
  public async addToZaak(zaakUrl: string) {
    try {
      await this.createInformatieObject(this.informatieObjectType, this.fileBuffer.byteLength);
    } catch (error) {
      console.error('Could not create informatieobject, stopping');
      throw (error);
    }

    const bestandsDeelUrl = this.informatieObject?.bestandsdelen?.[0]?.url;
    this.lock = this.informatieObject?.lock;
    if (!bestandsDeelUrl) {
      throw Error('No bestandsdeel URL found in informatieobject, cannot continue');
    }
    if (!this.lock) {
      throw Error('No lock found on document, cannot continue');
    }
    try {
      const uploadResult = await this.uploadFile(bestandsDeelUrl);
      if (!uploadResult.url) {
        console.error('Error adding bestandsdeel', { result: uploadResult, bestandsDeelUrl, lock: this.lock });
        throw Error('Error adding bestandsdeel');
      }
    } catch (error) {
      console.error('Could not upload bestandsdeel, retry?', { bestandsdeel: bestandsDeelUrl, lock: this.lock });
      throw Error('Error adding bestandsdeel');
    }
    await this.unlock();
    await this.relateToZaak(zaakUrl);

  }

  private async uploadFile(bestandsDeelUrl: any) {
    const data = new FormData();
    data.append('inhoud', new Blob([this.fileBuffer]));
    data.append('lock', this.lock);
    const result = await this.zgwClient.callBestandsdelenApi('PUT', bestandsDeelUrl, data);
    console.debug('put file', result);
    return result;
  }

  private async relateToZaak(zaakUrl: string) {
    const result = await this.zgwClient.relateDocumentToZaak(zaakUrl, this.informatieObject.url, this.fileName);
    console.debug('relate to zaak', result);
  }

  private getFile(filePath: string): Buffer {
    const absolutePath = path.resolve(filePath); // Resolve relative to script's directory
    const fileBuffer = fs.readFileSync(absolutePath); // Read the PDF file as a buffer
    return fileBuffer;
  }

  private async createInformatieObject(informatieobjecttype: string, fileSize: number) {
    const doc = {
      identificatie: 'DEVOPS-TESTDOC', //Combi moet uniek zijn met bronorganisatie
      bronorganisatie: '001479179', //Combi moet uniek zijn met identificatie
      creatiedatum: '2024-08-27',
      titel: 'test Devops Nijmegen',
      vertrouwelijkheidaanduiding: 'openbaar',
      auteur: 'Devops Nijmegen',
      status: '',
      formaat: 'application/pdf',
      taal: 'nld',
      bestandsnaam: 'test2.pdf',
      inhoud: null,
      bestandsomvang: fileSize,
      informatieobjecttype,
      ...this.informatieObjectProperties,
    };
    this.informatieObject = await this.zgwClient.callDocumentenApi('POST', 'enkelvoudiginformatieobjecten', doc);
    console.debug('create informatieobject', this.informatieObject);
  }

  private async unlock() {
    const result = await this.zgwClient.callDocumentenApi('POST', `${this.informatieObject.url}/unlock`, {
      lock: this.lock,
    });
    console.debug('unlock', result);
  }
}
