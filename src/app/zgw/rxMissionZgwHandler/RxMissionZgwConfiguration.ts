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

export type RxMissionEigenschapName = 'FORMULIER_KENMERK' | 'CORSA_ZAAKNUMMER';
export interface RxMissionZaakEigenschap {
  name: RxMissionEigenschapName;
  url: string;
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
   * ZaakEigenschap for storing the form reference (appId)
   */
  formReferenceEigenschap?: string;

  /**
   * InformatieObjectType for document. Fallback if no specific types have been configured
   */
  informatieObjectType: string;
  /**
   * InformatieObjectType for form pdf.
   */
  informatieObjectTypeVerzoek?: string;
  /**
   * InformatieObjectType for bijlages.
   */
  informatieObjectTypeBijlageVerzoek?: string;

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
  /**
   * Zaakeigenschappen
   */
  zaakEigenschappen?: RxMissionZaakEigenschap[];
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


const rxMissionConfigurations: { [name: string]: RxMissionZgwConfiguration } = {
  development: {
    branchName: 'development',
    submissionZaakProperties: [
      {
        // Als er een aparte eigenaar opgevoerd wordt, dan komt er een tweede betrokkene bij. De eigenaar die als niet originele aanvrager opgevoerd wordt is een "belanghebbende".
        appId: 'R01',
        formName: 'kamerverhuurvergunningaanvragen',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/5872119f-a89b-4179-b346-bb2084b10ac6', //Aanvraag Beschikking Behandelen - Overige vergunningen
        aanvragerRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/90bb727e-ec39-4d65-b00f-3b0022c02b8b', // Initiator rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        belanghebbendeRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/6ac5841b-38d5-40fd-af43-491a47d82ca7', // Belanghebbende rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        statusType: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/0ce93423-a997-4e58-81c5-8323993eb0d9', // Zaak gestart (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        informatieObjectType: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/91594e2f-63f4-4012-bc59-03813b3a30f8', // Bijlage bij verzoek
        informatieObjectTypeVerzoek: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/d0eedfaa-3262-4cfc-a91e-ac0dc7b5af77', // Verzoek
        informatieObjectTypeBijlageVerzoek: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/91594e2f-63f4-4012-bc59-03813b3a30f8', // Bijlage bij verzoek
        productType: 'https://producten.preprod-rx-services.nl/api/v1/product/5152a5d9-b915-4679-18dd-08dcce4a3fa1', // NMG-00002 Omzetvergunning
        zaakEigenschappen: [
          {
            name: 'FORMULIER_KENMERK',
            url: 'https://catalogi.preprod-rx-services.nl/api/v1/eigenschappen/a51405c3-9488-49a1-ada1-4a1e6589f3ea',
          },
        ],
      },
      {
        // Periode van de activiteit is van belang. Het verhuren tot wanneer is belangrijk.
        appId: 'R02',
        formName: 'vergunningaanvragentijdelijkverhurenwoning',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/5872119f-a89b-4179-b346-bb2084b10ac6', //Aanvraag Beschikking Behandelen - Overige vergunningen
        aanvragerRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/90bb727e-ec39-4d65-b00f-3b0022c02b8b', // Initiator rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        belanghebbendeRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/6ac5841b-38d5-40fd-af43-491a47d82ca7', // Belanghebbende rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        statusType: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/0ce93423-a997-4e58-81c5-8323993eb0d9', // Zaak gestart (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        informatieObjectType: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/91594e2f-63f4-4012-bc59-03813b3a30f8', // Bijlage bij verzoek
        informatieObjectTypeVerzoek: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/d0eedfaa-3262-4cfc-a91e-ac0dc7b5af77', // Verzoek
        informatieObjectTypeBijlageVerzoek: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/91594e2f-63f4-4012-bc59-03813b3a30f8', // Bijlage bij verzoek
        productType: 'https://producten.preprod-rx-services.nl/api/v1/product/06141a44-80d7-4bf7-18de-08dcce4a3fa1', // NMG-00003 Vergunning tijdelijk verhuren
      },
      // {
      //   // VOORLOPIG NIET: Dit formulier wordt waarschijnlijk nog niet omgezet, gaat nog via BDI. Nog checken waarom ze het via BDI laten lopen. Hoort bij een andere afdeling
      //   appId: 'R03',
      //   formName: 'vergunningaanvragenverhurenwoonruimte',
      // },
      // {
      //   // Half januari komt bouw starten / stoppen. Wordt nog gemaakt door Team Online
      //   appId: 'R04',
      //   formName: 'wijzignaarcorrectenaam',
      // },
      {
        appId: 'R05',
        formName: 'bouwmaterialenopopenbaarterreinmeldenofvergunningaanvragen',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/5872119f-a89b-4179-b346-bb2084b10ac6', //Aanvraag Beschikking Behandelen - Overige vergunningen
        aanvragerRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/90bb727e-ec39-4d65-b00f-3b0022c02b8b', // Initiator rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        belanghebbendeRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/6ac5841b-38d5-40fd-af43-491a47d82ca7', // Belanghebbende rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        statusType: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/0ce93423-a997-4e58-81c5-8323993eb0d9', // Zaak gestart (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        informatieObjectType: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/91594e2f-63f4-4012-bc59-03813b3a30f8', // Bijlage bij verzoek
        informatieObjectTypeVerzoek: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/d0eedfaa-3262-4cfc-a91e-ac0dc7b5af77', // Verzoek
        informatieObjectTypeBijlageVerzoek: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/91594e2f-63f4-4012-bc59-03813b3a30f8', // Bijlage bij verzoek
      },
      {
        appId: 'R06',
        formName: 'contactformulier',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/09790f18-0a91-4b6f-9626-82f68f7a33a4', //Incidentmelding behandelen RX-INCMLD
        productType: 'https://producten.preprod-rx-services.nl/api/v1/product/e65fd89d-8eaa-4d07-cd6b-08dc764eec1f', //RX-00044 KLACHT
        statusType: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/a75b32b4-85c9-4ef4-ac6d-4a3ae2892564', // Zaak gestart
        aanvragerRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/2d3ad8d3-2592-41b7-99f3-8c50f869fff6', // Melder
        informatieObjectType: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/d0eedfaa-3262-4cfc-a91e-ac0dc7b5af77', // Verzoek
        informatieObjectTypeVerzoek: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/d0eedfaa-3262-4cfc-a91e-ac0dc7b5af77', // Verzoek
        informatieObjectTypeBijlageVerzoek: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/91594e2f-63f4-4012-bc59-03813b3a30f8', // Bijlage bij verzoek
      },
      // {
      //   appId: 'TDL',
      //   formName: 'test',
      //   zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/36f5d279-c430-41e4-9ffb-1c995249c02c', //Aanvraag Beschikking Behandelen - Overige vergunningen
      //   aanvragerRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/d21d85bc-8777-4346-8271-b6d1dd2aee52', // Initiator rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
      //   belanghebbendeRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/7be409d4-1102-4d2c-bc8d-50431fc84124', // Belanghebbende rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
      //   statusType: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/85623ed8-69b9-4c1a-9e89-5a31115bf124', // Zaak gestart (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
      //   informatieObjectType: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/91594e2f-63f4-4012-bc59-03813b3a30f8', // Bijlage bij verzoek
      //   productType: 'https://producten.preprod-rx-services.nl/api/v1/product/5152a5d9-b915-4679-18dd-08dcce4a3fa1', // NMG-00002 Omzetvergunning
      // },
    ],
  },
  acceptance: {
    branchName: 'acceptance',
    submissionZaakProperties: [
      {
        // Als er een aparte eigenaar opgevoerd wordt, dan komt er een tweede betrokkene bij. De eigenaar die als niet originele aanvrager opgevoerd wordt is een "belanghebbende".
        appId: 'R01',
        formName: 'kamerverhuurvergunningaanvragen',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/36f5d279-c430-41e4-9ffb-1c995249c02c', //Aanvraag Beschikking Behandelen - Overige vergunningen
        aanvragerRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/d21d85bc-8777-4346-8271-b6d1dd2aee52', // Initiator rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        belanghebbendeRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/7be409d4-1102-4d2c-bc8d-50431fc84124', // Belanghebbende rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        statusType: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/85623ed8-69b9-4c1a-9e89-5a31115bf124', // Zaak gestart (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        informatieObjectType: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/91594e2f-63f4-4012-bc59-03813b3a30f8', // Bijlage bij verzoek
        productType: 'https://producten.preprod-rx-services.nl/api/v1/product/5152a5d9-b915-4679-18dd-08dcce4a3fa1', // NMG-00002 Omzetvergunning

      },
      {
        // Periode van de activiteit is van belang. Het verhuren tot wanneer is belangrijk.
        appId: 'R02',
        formName: 'vergunningaanvragentijdelijkverhurenwoning',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/36f5d279-c430-41e4-9ffb-1c995249c02c', //Aanvraag Beschikking Behandelen - Overige vergunningen
        aanvragerRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/d21d85bc-8777-4346-8271-b6d1dd2aee52',
        statusType: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/85623ed8-69b9-4c1a-9e89-5a31115bf124',
        informatieObjectType: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/91594e2f-63f4-4012-bc59-03813b3a30f8', // Bijlage bij verzoek
        productType: 'https://producten.preprod-rx-services.nl/api/v1/product/06141a44-80d7-4bf7-18de-08dcce4a3fa1', // NMG-00003 Vergunning tijdelijk verhuren
      },
      {
        appId: 'R05',
        formName: 'bouwmaterialenopopenbaarterreinmeldenofvergunningaanvragen',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/36f5d279-c430-41e4-9ffb-1c995249c02c', //Aanvraag Beschikking Behandelen - Overige vergunningen NMG-AANVRBS-OVERIG
        productType: 'https://producten.preprod-rx-services.nl/api/v1/product/058f0902-6248-40cf-bd3d-08dcd0bf97b7', //NMG-00001 Bouwobjectenvergunning
        aanvragerRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/d21d85bc-8777-4346-8271-b6d1dd2aee52', // Initiator rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        belanghebbendeRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/7be409d4-1102-4d2c-bc8d-50431fc84124', // Belanghebbende rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        statusType: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/85623ed8-69b9-4c1a-9e89-5a31115bf124', // Zaak gestart (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        informatieObjectType: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/91594e2f-63f4-4012-bc59-03813b3a30f8', // Bijlage bij verzoek
      },
      {
        appId: 'R06',
        formName: 'contactformulier',
        zaakType: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/49fc85b5-2570-49bb-9d2b-6eddddee3849', //Incidentmelding behandelen RX-INCMLD
        productType: 'https://producten.preprod-rx-services.nl/api/v1/product/e65fd89d-8eaa-4d07-cd6b-08dc764eec1f', //RX-00044 KLACHT
        statusType: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/a252dd2c-60b3-4040-a196-14a4f31efc90', // Zaak gestart
        aanvragerRolType: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/3f4c92da-15b6-452b-8803-10b2354c75ba', // Melder
        informatieObjectType: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/d0eedfaa-3262-4cfc-a91e-ac0dc7b5af77', // Verzoek
        informatieObjectTypeVerzoek: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/d0eedfaa-3262-4cfc-a91e-ac0dc7b5af77', // Verzoek
        informatieObjectTypeBijlageVerzoek: 'https://catalogi.preprod-rx-services.nl/api/v1/informatieobjecttypen/91594e2f-63f4-4012-bc59-03813b3a30f8', // Bijlage bij verzoek
      },
    ],
  },
  production: {
    branchName: 'main',
    submissionZaakProperties: [

      {
        appId: 'R01',
        formName: 'kamerverhuurvergunningaanvragen',
        zaakType: 'https://catalogi.rx-services.nl/api/v1/zaaktypen/4dd23361-003f-45e1-812d-212e0fbbaba6', // Prod Aanvraag Beschikking behandelen - Overige
        productType: 'https://producten.rx-services.nl/api/v1/product/4cdd787c-4ac0-4eb6-3c93-08dcf73ae7ca', //NMG-00002 Prod Omzettingsvergunning
        aanvragerRolType: 'https://catalogi.rx-services.nl/api/v1/roltypen/c95e27fa-a3f1-4be2-9eb0-69d15d4ec197', // Initiator rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        belanghebbendeRolType: 'https://catalogi.rx-services.nl/api/v1/roltypen/65850f8e-5a4f-42aa-9092-8253dcb8d00d', // Belanghebbende rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        statusType: 'https://catalogi.rx-services.nl/api/v1/statustypen/56e8310b-296c-4942-8b35-1d9f0445aa86', // Zaak gestart
        informatieObjectType: 'https://catalogi.rx-services.nl/api/v1/informatieobjecttypen/495a066a-24e6-4c53-a0da-bb4b11a5f635', // Verzoek
        informatieObjectTypeVerzoek: 'https://catalogi.rx-services.nl/api/v1/informatieobjecttypen/495a066a-24e6-4c53-a0da-bb4b11a5f635', // Verzoek
        informatieObjectTypeBijlageVerzoek: 'https://catalogi.rx-services.nl/api/v1/informatieobjecttypen/169c89ab-e6ae-42bf-8436-7fa7e4970634', // Bijlage bij verzoek
      },
      {
        appId: 'R02',
        formName: 'vergunningaanvragentijdelijkverhurenwoning',
        zaakType: 'https://catalogi.rx-services.nl/api/v1/zaaktypen/4dd23361-003f-45e1-812d-212e0fbbaba6', // Prod Aanvraag Beschikking behandelen - Overige
        productType: 'https://producten.rx-services.nl/api/v1/product/f9c08801-c877-41b8-3c94-08dcf73ae7ca', //NMG-00003 Prod Vergunning tijdelijke verhuur
        aanvragerRolType: 'https://catalogi.rx-services.nl/api/v1/roltypen/c95e27fa-a3f1-4be2-9eb0-69d15d4ec197', // Initiator rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        belanghebbendeRolType: 'https://catalogi.rx-services.nl/api/v1/roltypen/65850f8e-5a4f-42aa-9092-8253dcb8d00d', // Belanghebbende rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        statusType: 'https://catalogi.rx-services.nl/api/v1/statustypen/56e8310b-296c-4942-8b35-1d9f0445aa86', // Zaak gestart
        informatieObjectType: 'https://catalogi.rx-services.nl/api/v1/informatieobjecttypen/495a066a-24e6-4c53-a0da-bb4b11a5f635', // Verzoek
        informatieObjectTypeVerzoek: 'https://catalogi.rx-services.nl/api/v1/informatieobjecttypen/495a066a-24e6-4c53-a0da-bb4b11a5f635', // Verzoek
        informatieObjectTypeBijlageVerzoek: 'https://catalogi.rx-services.nl/api/v1/informatieobjecttypen/169c89ab-e6ae-42bf-8436-7fa7e4970634', // Bijlage bij verzoek
      },
      {
        appId: 'R05',
        formName: 'bouwmaterialenopopenbaarterreinmeldenofvergunningaanvragen',
        zaakType: 'https://catalogi.rx-services.nl/api/v1/zaaktypen/4dd23361-003f-45e1-812d-212e0fbbaba6', // Prod Aanvraag Beschikking behandelen - Overige
        productType: 'https://producten.rx-services.nl/api/v1/product/aa929851-720b-4e1d-3c92-08dcf73ae7ca', // NMG-000001 Prod Bouwobjectenvergunning
        aanvragerRolType: 'https://catalogi.rx-services.nl/api/v1/roltypen/c95e27fa-a3f1-4be2-9eb0-69d15d4ec197', // Initiator rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        belanghebbendeRolType: 'https://catalogi.rx-services.nl/api/v1/roltypen/65850f8e-5a4f-42aa-9092-8253dcb8d00d', // Belanghebbende rol (altijd zelfde bij deze zaak, misschien op hoger niveau zetten in config)
        statusType: 'https://catalogi.rx-services.nl/api/v1/statustypen/56e8310b-296c-4942-8b35-1d9f0445aa86', // Zaak gestart
        informatieObjectType: 'https://catalogi.rx-services.nl/api/v1/informatieobjecttypen/495a066a-24e6-4c53-a0da-bb4b11a5f635', // Verzoek
        informatieObjectTypeVerzoek: 'https://catalogi.rx-services.nl/api/v1/informatieobjecttypen/495a066a-24e6-4c53-a0da-bb4b11a5f635', // Verzoek
        informatieObjectTypeBijlageVerzoek: 'https://catalogi.rx-services.nl/api/v1/informatieobjecttypen/169c89ab-e6ae-42bf-8436-7fa7e4970634', // Bijlage bij verzoek
      },
      {
        appId: 'R06',
        formName: 'contactformulier',
        zaakType: 'https://catalogi.rx-services.nl/api/v1/zaaktypen/2b641527-9617-4501-a228-076116205d6d', //Klachttmelding behandelen RX-INCMLD
        productType: 'https://producten.rx-services.nl/api/v1/product/dae31788-04a9-4162-3c7c-08dcf73ae7ca', // RX-00044 Klacht
        statusType: 'https://catalogi.rx-services.nl/api/v1/statustypen/3a0ebf3e-6116-4522-85c3-b9f99d01a438', // Zaak gestart
        aanvragerRolType: 'https://catalogi.rx-services.nl/api/v1/roltypen/80c46ce6-7fa2-4407-8b28-c9e7b4636b1f', // Melder
        informatieObjectType: 'https://catalogi.rx-services.nl/api/v1/informatieobjecttypen/495a066a-24e6-4c53-a0da-bb4b11a5f635', // Verzoek
        informatieObjectTypeVerzoek: 'https://catalogi.rx-services.nl/api/v1/informatieobjecttypen/495a066a-24e6-4c53-a0da-bb4b11a5f635', // Verzoek
        informatieObjectTypeBijlageVerzoek: 'https://catalogi.rx-services.nl/api/v1/informatieobjecttypen/169c89ab-e6ae-42bf-8436-7fa7e4970634', // Bijlage Verzoek
      },

    ],
  },
};
