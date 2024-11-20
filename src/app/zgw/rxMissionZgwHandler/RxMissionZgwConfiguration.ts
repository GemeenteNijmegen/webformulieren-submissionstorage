/**
 * Configuration specific to RxMission ZGW API Calls
 * For each branch (dev,acc,prod) submissions can be
 * processed and sent to RxMission in their own specific way
 */

// TODO: kijken of dit wel de juiste plek is. Misschien is de algemene config toch duidelijker.
// Vermoeden dat er veel meer specifieke properties bij komen, vooral als we gaan mappen.
// Optioneel om een default config te hebben die aangevuld kan worden met branch config.
export interface RxMissionZgwConfiguration {
  /**
   * The branch name this configuration is used for
   */
  branchName: string;
  submissionZaakProperties: SubmissionZaakProperties[];
}

/**
 * All properties of the submission and RxMission zaak that are linked
 * For example: a certain submission is linked to a standard zaakType in RxMission
 */
export interface SubmissionZaakProperties {
  /**
    * The appId used to identify the submission type
    * For Example: TLD or PI60
    */
  appId: string;
  /**
   * Secondary method to identify a form if the appId has multiple form types
   */
  formName?: string;
  /**
   * RxMission Zaaktype
   */
  zaakType?: string;
  /**
   * RXMission productentype, as URL
   * For example: `https://producten.preprod-rx-services.nl/api/v1/product/058f0902-6248-40cf-bd3d-08dcd0bf97b7`
   */
  productType?: string;
  
  /**
   * InformatieObjectType for document.
   */
  informatieObjectType?: string;

  /**
   * Statustype for initial status for zaak
   */
  statusType?: string;

  /**
   * Role type for initiator-role
   */
  aanvragerRolType?: string;
}


//TODO: consider rewriting with a default config part
/**
 *
 * @param branchName
 * @returns RxMissionZgWConfiguration
 */
export function getRxMissionZgwConfiguration(branchName: string): RxMissionZgwConfiguration {
  const configName = Object.keys(rxMissionConfigurations).find((configurationName) => {
    const config = rxMissionConfigurations[configurationName];
    return config.branchName == branchName;
  });
  if (configName) {
    return rxMissionConfigurations[configName];
  }
  throw Error(`No RxMission ZGW configuration found for branch name ${branchName}`);
}

/**
 * Returns an array of appIds based on the branch name.
 *
 * @param branchName - The name of the branch to get appIds for
 * @returns An array of appIds linked to the branch name
 */
export function getAppIdsByBranchName(branchName: string): string[] {
  const configuration = getRxMissionZgwConfiguration(branchName);
  // Map over submissionZaakProperties om alleen de appId te extraheren
  return configuration.submissionZaakProperties.map(property => property.appId);
}

const rxMissionConfigurations: { [name: string] : RxMissionZgwConfiguration } = {
  development: {
    branchName: 'development',
    submissionZaakProperties: [
      {
        appId: 'RX01',
      },
      {
        appId: 'RX02',
      },
      {
        appId: 'TDL',
        zaakType: `https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/07fea148-1ede-4f39-bd2a-d5f43855e707`,
        aanvragerRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/5ecbff9a-767b-4684-b158-c2217418054e',
        statusType: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/257a9236-74e5-4eb3-8556-63ea58980509',
        informatieObjectType: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/47d64918-891c-4653-8237-cd5445fc6543',
        productType: 'https://producten.preprod-rx-services.nl/api/v1/product/1f616878-dc79-4b14-bd3e-08dcd0bf97b7',
      },
    ],
  },
  acceptance: {
    branchName: 'acceptance',
    submissionZaakProperties: [],
  },
  production: {
    branchName: 'production',
    submissionZaakProperties: [],
  },
};
