import { zgwCatalogiConfig } from './GenerateConfigInterfaces';

export const schaduwzaakPreProd = {};

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
