import { zgwCatalogiConfig } from './GenerateConfigInterfaces';

export const schaduwzaakPreProd: zgwCatalogiConfig = {
  branch: 'development',
  environment: 'PREPROD',
  version: '2024-12-27',
  versionStartDate: '2025-01-03',
  zaakTypeIdentificatie: 'NMG-schaduwzaak',
  zaakTypeUrl: 'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/af126e36-8209-4795-80d9-bd3105b3762e',
  zaakTypeBeschrijving: 'Schaduwzaak ODRN',
  statusTypen: [
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/14ba433b-af94-462d-8f02-7f5561d3eca3',
      kenmerk: 'START',
      omschrijving: 'Zaak gestart',
      default: true,
    },
  ],
  resultaatTypen: [
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/resultaattypen/5d542454-83c3-4fd8-8502-276cdd618166',
      kenmerk: 'VERLEEND',
      omschrijving: 'Verleend',
      default: false,
    },
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/resultaattypen/1f74fb72-a688-485b-a903-93bbce50e397',
      kenmerk: 'GEWEIGERD',
      omschrijving: 'Geweigerd',
      default: false,
    },
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/resultaattypen/02f0f37c-0b4b-4ebb-b66a-bc5d59ce0eca',
      kenmerk: 'INGETROKKEN',
      omschrijving: 'Ingetrokken',
      default: false,
    },
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/resultaattypen/2604c0a2-bd4e-43ad-b4ca-cbfaaf873dfe',
      kenmerk: 'AFGEBROKEN',
      omschrijving: 'Afgebroken',
      default: false,
    },
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/resultaattypen/3121cbde-d90d-41cf-b7c5-13c77965c304',
      kenmerk: 'AFGESLOTEN',
      omschrijving: 'Afgesloten',
      default: false,
    },
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/resultaattypen/109d7e28-967a-45fd-9d91-df3d3f04002f',
      kenmerk: 'BUITEN_BEHANDELING',
      omschrijving: 'Buiten behandeling',
      default: false,
    },
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/resultaattypen/aeacae98-bd3e-4eba-8895-9287b706f599',
      kenmerk: 'GEACCEPTEERD',
      omschrijving: 'Geaccepteerd',
      default: false,
    },
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/resultaattypen/9c3c51dd-82ce-4dfe-b777-5841f583104b',
      kenmerk: 'GEDEELTELIJK_VERLEEND',
      omschrijving: 'Gedeeltelijkverleend',
      default: false,
    },
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/resultaattypen/b9828ec0-1804-4ef2-864f-c3c52d090eae',
      kenmerk: 'NIET_GEACCEPTEERD',
      omschrijving: 'Niet geaccepteerd',
      default: false,
    },
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/resultaattypen/05e1ac42-8f1b-4858-8a4d-89ed10bef43c',
      kenmerk: 'TOEGEKEND',
      omschrijving: 'Toegekend',
      default: false,
    },
  ],
  eigenschappen: [
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/eigenschappen/970675b5-fa01-4fd6-911f-c7e6e5ea4a8f',
      kenmerk: 'ZAAKNUMMER_CORSA',
      naam: 'Zaaknummer Corsa',
      default: false,
    },
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/eigenschappen/14d86d76-d2c1-486e-babb-69cb70a73d30',
      kenmerk: 'ZAAKNUMMER_OPENWAVE',
      naam: 'Zaaknummer OpenWave',
      default: false,
    },
  ],
  informatieObjectTypen: [],
  rolTypen: [
    {
      url: 'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/f601ff83-85fa-4785-b11c-a2bd069a3931',
      kenmerk: 'INITIATOR',
      omschrijving: 'Initiator',
      default: true,
    },
  ],
};


export const schaduwzaakProd: zgwCatalogiConfig = {
  branch: 'development',
  environment: 'PREPROD',
  version: '2024-09-12',
  versionStartDate: '2024-09-12',
  zaakTypeIdentificatie: 'NMG-schaduwzaak',
  zaakTypeUrl:
    'https://catalogi.preprod-rx-services.nl/api/v1/zaaktypen/2662aef5-bfab-441a-8c34-81362a454549',
  zaakTypeBeschrijving: 'Schaduwzaak ODRN',
  statusTypen: [
    {
      url:
        'https://catalogi.preprod-rx-services.nl/api/v1/statustypen/98c676f4-c5ec-468d-984a-94561dd2c19f',
      kenmerk: 'START',
      omschrijving: 'Zaak gestart',
      default: true,
    },
  ],
  resultaatTypen: [],
  eigenschappen: [
    {
      url:
        'https://catalogi.preprod-rx-services.nl/api/v1/eigenschappen/68eb4bd0-ef05-4d0e-a4b7-c6a91cedf2a6',
      kenmerk: 'ZAAKNUMMER_OPENWAVE',
      naam: 'Zaaknummer OpenWave',
      default: false,
    },
    {
      url:
        'https://catalogi.preprod-rx-services.nl/api/v1/eigenschappen/3afb18f8-3a36-4170-bde1-e28d2b58d4f2',
      kenmerk: 'ZAAKNUMMER_CORSA',
      naam: 'Zaaknummer Corsa',
      default: false,
    },
  ],
  informatieObjectTypen: [],
  rolTypen: [
    {
      url:
        'https://catalogi.preprod-rx-services.nl/api/v1/roltypen/631fcf75-73fc-4333-8acb-23f80788f181',
      kenmerk: 'INITIATOR',
      omschrijving: 'Initiator',
      default: true,
    },
  ],
};


/**
 * Producten zijn apart opgenomen, aangezien deze niet uit de catalogus gehaald kunnen worden
 */
export const schaduwzaakPreProdProducten: {melding: string; vergunning: string} = {
  melding: 'https://producten.preprod-rx-services.nl/api/v1/product/e55f1af2-f1f1-45b2-18e3-08dcce4a3fa1',
  vergunning: 'https://producten.preprod-rx-services.nl/api/v1/product/fe7c825a-4a8c-4f11-18e1-08dcce4a3fa1',
};
// Met functioneel opgehaald op 03-01-2024
export const schaduwzaakProdProducten: {melding: string; vergunning: string} = {
  melding: 'https://producten.rx-services.nl/api/v1/product/4831e7a5-0887-400d-3c9f-08dcf73ae7ca', // NMG-00015 Kopie melding
  vergunning: 'https://producten.rx-services.nl/api/v1/product/b9fc2e5f-b181-49b2-3c9c-08dcf73ae7ca', // NMG-00012 Kopie verleende vergunning
};


/**
 * Config helper functions
 */


export function getRolTypeUrl(config: zgwCatalogiConfig): string {
  const { rolTypen } = config;
  if (!rolTypen) {
    console.error('Check de catalogus config van de zaak. Er zijn geen roltypen aanwezig!');
  }
  // Zoek naar een roltype met kenmerk 'INITIATOR'
  const initiator = rolTypen.find((rol) => rol.kenmerk === 'INITIATOR');

  if (!initiator?.url) {
    console.error('De catalogus config heeft geen INITIATOR ROL');
  }
  // Als een INITIATOR bestaat, retourneer de URL daarvan, anders de URL van het eerste roltype
  return initiator?.url || rolTypen[0]?.url || '';
}
export function getZaakEigenschapUrl(config: zgwCatalogiConfig, kenmerk: 'ZAAKNUMMER_CORSA' | 'ZAAKNUMMER_OPENWAVE'): string {
  const { eigenschappen } = config;

  if (!eigenschappen) {
    console.error('Check de catalogus config van de zaak. Er zijn geen eigenschappen aanwezig!');
  }
  const eigenschap = eigenschappen.find((e) => e.kenmerk === kenmerk);

  if (!eigenschap?.url) {
    console.error(`De catalogus config heeft geen ${kenmerk} eigenschap`);
  }
  return eigenschap?.url || '';

}
export function getStatusTypeUrl(config: zgwCatalogiConfig): string {
  const { statusTypen } = config;
  if (!statusTypen) {
    console.error('Check de catalogus config van de zaak. Er zijn geen statustypen aanwezig!');
  }
  // Zoek naar een statustype met kenmerk 'START'
  const start = statusTypen.find((status) => status.kenmerk === 'START');

  if (start?.url) {
    console.error('De catalogus config heeft geen START status');
  }
  // Als een START status bestaat, retourneer de URL daarvan, anders de URL van het eerste statustype
  return start?.url || statusTypen[0]?.url || '';
}
export function getZaakTypeUrl(config: zgwCatalogiConfig): string {
  if (!config.zaakTypeUrl) {
    console.error('ER IS GEEN ZAAKTYPEURL IN DE CONFIG AANWEZIG');
  }
  return config.zaakTypeUrl ?? '';
}


/**
 * Get a resultaattype based on kenmerk
 */
export function getResultaatTypeUrl(
  config: zgwCatalogiConfig,
  kenmerk: string,
): string {
  const { resultaatTypen } = config;
  if (!resultaatTypen) {
    console.error('Check de catalogus config van de zaak. Er zijn geen resultaattypen aanwezig!');
  }
  const resultaatType = resultaatTypen.find((r) => r.kenmerk === kenmerk);

  if (!resultaatType?.url) {
    console.error(`ResultaatType met kenmerk "${kenmerk}" niet gevonden.`);
    return '';
  }

  return resultaatType.url;
}