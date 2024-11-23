/**
 * Configuration specific to RxMission ZGW API Calls
 * For each branch (dev,acc,prod) submissions can be
 * processed and sent to RxMission in their own specific way
 */

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
  /**
   * Role type for belanghebbende-role
   */
  belanghebbendeRolType?: string;
}

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

/**
 * Haalt SubmissionZaakProperties op basis van branchName en appId of formName.
 * @param branchName Naam van de branch.
 * @param appIdOrFormName Parameters object met appId of formName.
 * @returns De overeenkomstige SubmissionZaakProperties.
 * @throws Error als er niet precies één match is of als beide parameters zijn doorgegeven.
 */
export function getSubmissionPropsForFormWithBranch(
  branchName: string,
  appIdOrFormName: { appId?: string; formName?: string },
): SubmissionZaakProperties {
  const config = getRxMissionZgwConfiguration(branchName);
  return getSubmissionPropsFromAppIdOrFormName(config, appIdOrFormName);
}


/**
 * Implementatie van de functie die zowel appId als formName accepteert.
 * @param config Configuratie object. Kan opgehaald worden met getRxMissionZgwConfiguration(branchName: string)
 * @param appIdOrFormName Parameters object met appId of formName.
 * @returns De overeenkomstige SubmissionZaakProperties.
 * @throws Error als er niet precies één match is of als beide parameters zijn doorgegeven.
 */
export function getSubmissionPropsFromAppIdOrFormName(
  config: RxMissionZgwConfiguration,
  appIdOrFormName: { appId?: string; formName?: string },
): SubmissionZaakProperties {
  const { appId, formName } = appIdOrFormName;

  if ((appId && formName) || (!appId && !formName)) {
    throw new Error('You must provide either appId or formName, but not both.');
  }
  const key = formName ? 'formName' : 'appId';
  const value = (formName || appId)!.toLowerCase();

  const match = config.submissionZaakProperties.find(
    (props) => props[key]?.toLowerCase() === value,
  );
  if (!match) {
    throw new Error('Could not retrieve single config for zaak');
  }
  return match;
}


const rxMissionConfigurations: { [name: string] : RxMissionZgwConfiguration } = {
  development: {
    branchName: 'development',
    submissionZaakProperties: [
      {
        // Als er een aparte eigenaar opgevoerd wordt, dan komt er een tweede betrokkene bij. De eigenaar die als niet originele aanvrager opgevoerd wordt is een "belanghebbende".
        appId: 'R01',
        formName: 'kamerverhuurvergunningaanvragen',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/07fea148-1ede-4f39-bd2a-d5f43855e707', //Aanvraag Beschikking Behandelen
        aanvragerRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/5ecbff9a-767b-4684-b158-c2217418054e', // Initiator rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        belanghebbendeRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/84b198b1-10be-4da4-a645-6a5859b0b55f', // Belanghebbende rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        statusType: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/257a9236-74e5-4eb3-8556-63ea58980509', // Zaak gestart (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        informatieObjectType: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/b222fce5-5ebf-4f6e-83a6-3ded759d2b59', // Aanvraag
        productType: 'https://producten.preprod-rx-services.nl/api/v1/product/5152a5d9-b915-4679-18dd-08dcce4a3fa1', // NMG-00002 Omzetvergunning

      },
      {
        // Periode van de activiteit is van belang. Het verhuren tot wanneer is belangrijk.
        appId: 'R02',
        formName: 'vergunningaanvragentijdelijkverhurenwoning',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/07fea148-1ede-4f39-bd2a-d5f43855e707', //Aanvraag Beschikking Behandelen
        aanvragerRolType: '',
        statusType: '',
        informatieObjectType: '',
        productType: 'https://producten.preprod-rx-services.nl/api/v1/product/06141a44-80d7-4bf7-18de-08dcce4a3fa1', // NMG-00003 Vergunning tijdelijk verhuren
      },
      {
        appId: 'R03',
        formName: 'vergunningaanvragenverhurenwoonruimte',
      },
      {
        appId: 'R04',
        formName: 'vooroverlegomgevingsvergunningaanvragen',
      },
      {
        appId: 'R05',
        formName: 'bouwmaterialenopopenbaarterreinmeldenofvergunningaanvragen',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/07fea148-1ede-4f39-bd2a-d5f43855e707', //Aanvraag Beschikking Behandelen
        productType: 'https://producten.preprod-rx-services.nl/api/v1/product/058f0902-6248-40cf-bd3d-08dcd0bf97b7', //NMG-00001 Bouwobjectenvergunning
        aanvragerRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/5ecbff9a-767b-4684-b158-c2217418054e', // Initiator rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        belanghebbendeRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/84b198b1-10be-4da4-a645-6a5859b0b55f', // Belanghebbende rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        statusType: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/257a9236-74e5-4eb3-8556-63ea58980509', // Zaak gestart (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        informatieObjectType: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/b222fce5-5ebf-4f6e-83a6-3ded759d2b59', // Aanvraag
      },
      {
        appId: 'R06',
        formName: 'contactformulier',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/07fea148-1ede-4f39-bd2a-d5f43855e707', //Aanvraag Beschikking Behandelen
        productType: 'https://producten.preprod-rx-services.nl/api/v1/product/058f0902-6248-40cf-bd3d-08dcd0bf97b7', //NMG-00001 Bouwobjectenvergunning
      },
      {
        appId: 'TDL',
        formName: 'test',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/07fea148-1ede-4f39-bd2a-d5f43855e707',
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
