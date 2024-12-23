import { ZgwClient } from "../zgwClient/ZgwClient";
import { RxMissionEigenschapName, RxMissionZaakEigenschap, SubmissionZaakProperties } from "./RxMissionZgwConfiguration";

interface RXMissionEigenschapConfig {
  zgwClient: ZgwClient;
  submissionZaakProperties: SubmissionZaakProperties;
  zaakUrl: string;
}

/**
 * Add an Eigenschap to a Zaak
 * Based on RxMissionZgwConfig
 * Zaakurl in config constructor to add multiple Eigenschappen
 */
export class RxMissionEigenschap {
  private zgwClient: ZgwClient;
  private submissionZaakProperties: SubmissionZaakProperties;
  private zaakUrl: string;

  constructor(config: RXMissionEigenschapConfig) {
    this.zgwClient = config.zgwClient;
    this.submissionZaakProperties = config.submissionZaakProperties;
    this.zaakUrl = config.zaakUrl;
  }

  public async addEigenschapToZaak(eigenschapName: RxMissionEigenschapName, value: string,){
    try {
        const eigenschap = this.getEigenschapFromZaakProperties(eigenschapName);
        await this.zgwClient.addZaakEigenschap(this.zaakUrl, eigenschap.url, value);
      } catch (error: any) {
        // Catch the error thrown by getEigenschapFromZaakProperties for now with value in the error because it does not have sensitive information
        // Does not stop the rest of the add zaak process
        console.error(`
            Error in addEigenschapToZaak: ${error?.message ?? 'No error message'}. 
            Eigenschap: ${eigenschapName}. For zaak: ${this.zaakUrl}.
            ${value}
            `);
      }
  }

  private getEigenschapFromZaakProperties(eigenschapName: RxMissionEigenschapName): RxMissionZaakEigenschap {
    // Might have to deal with more than one zaakeigenschap found, this might not be the place
    const zaakEigenschap = this.submissionZaakProperties.zaakEigenschappen?.find(
        (eigenschap) => eigenschap.name === eigenschapName
      );
      if (!zaakEigenschap) {
        throw new Error(`Eigenschap with name ${eigenschapName} not found in the submission properties.`);
      }
      return zaakEigenschap;
  }
}