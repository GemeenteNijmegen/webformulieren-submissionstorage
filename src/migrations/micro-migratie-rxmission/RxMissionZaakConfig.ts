import { zgwCatalogiConfig } from './GenerateConfigInterfaces';

export const schaduwzaakPreProd: zgwCatalogiConfig = {
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
// TODO: met functioneel beheer deze prod waardes achterhalen
export const schaduwzaakProdProducten: {melding: string; vergunning: string} = {
  melding: '',
  vergunning: '',
};



/**
 * Config helper functions
 */


export function getRolTypeUrl(config: zgwCatalogiConfig): string {
  const { rolTypen } = config;
  if(!rolTypen){
    console.error('Check de catalogus config van de zaak. Er zijn geen roltypen aanwezig!');
  }
  // Zoek naar een roltype met kenmerk 'INITIATOR'
  const initiator = rolTypen.find((rol) => rol.kenmerk === 'INITIATOR');

  if(!initiator?.url){
    console.error('De catalogus config heeft geen INITIATOR ROL');
  }
  // Als een INITIATOR bestaat, retourneer de URL daarvan, anders de URL van het eerste roltype
  return initiator?.url || rolTypen[0]?.url || '';
}
export function getZaakTypeUrl(config: zgwCatalogiConfig): string {
  if(!config.zaakTypeUrl){
    console.error('ER IS GEEN ZAAKTYPEURL IN DE CONFIG AANWEZIG');
  }
  return config.zaakTypeUrl ?? '';
}