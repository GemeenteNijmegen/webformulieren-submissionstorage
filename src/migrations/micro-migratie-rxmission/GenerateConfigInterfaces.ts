/**
 * Generate config for ZGW calls based on identification, names and version
 * Make sure you have client id and secret set in .env file
 */

export interface zgwCatalogiConfig {
  branch?: 'development'|'acceptance'|'main'; // On which brqanch was it generated
  environment?: 'PREPROD'|'PROD'; // Which environment for RxMission
  version?: string; // Version ZaakType based on versiedatum
  versionStartDate?: string; // Version ZaakType based on beginGeldigheid
  zaakTypeIdentificatie: string;// e.g. NMG-schaduwzaak
  zaakTypeUrl?: string; // url for specific zaaktype in that environment
  zaakTypeBeschrijving: string; // Description for human readability
  statusTypen:{ url: string; kenmerk?: string; omschrijving?: string; default?: boolean}[];
  resultaatTypen: { url: string; kenmerk?: string; omschrijving?: string; default?: boolean}[];
  eigenschappen: { url: string; kenmerk?: string; naam?: string; default?: boolean}[];
  informatieObjectTypen?: { url: string; kenmerk?: string; omschrijving?: string;default?: boolean}[];
  rolTypen: { url: string; kenmerk?: string; omschrijving?: string; default?: boolean}[];
}

export interface ZgwCatalogiZaakTypeSetup {
  beschrijving?: string;
  zaaktypeIdentificatie: string;
  statusTypen:{kenmerk: string; omschrijving: string; default?: boolean}[];
  resultaatTypen?: {kenmerk: string; omschrijving: string; default?: boolean}[];
  eigenschappen?: {kenmerk: string; naam: string; default?: boolean}[];
  informatieObjectTypen?: {kenmerk: string; omschrijving: string;default?: boolean}[];
  rolTypen: {kenmerk: string; omschrijving: string; default?: boolean}[];
}

export const schaduwZaakCatalogiSetup: ZgwCatalogiZaakTypeSetup = {
  beschrijving: 'Zaaktype voor migratie ODRN',
  zaaktypeIdentificatie: 'NMG-schaduwzaak',
  statusTypen: [{
    kenmerk: 'START',
    omschrijving: 'Zaak gestart',
    default: true,
  }],
  resultaatTypen: [{
    kenmerk: 'GEWEIGERD',
    omschrijving: 'Geweigerd',
  },
  {
    kenmerk: 'VERLEEND',
    omschrijving: 'Verleend',
  },
  {
    kenmerk: 'AFGEBROKEN',
    omschrijving: 'Afgebroken',
  },
  {
    kenmerk: 'AFGESLOTEN',
    omschrijving: 'Afgesloten',
  },
  {
    kenmerk: 'BUITEN_BEHANDELING',
    omschrijving: 'Buiten behandeling',
  },
  {
    kenmerk: 'GEACCEPTEERD',
    omschrijving: 'Geaccepteerd',
  },
  {
    kenmerk: 'VERLEEND',
    omschrijving: 'Verleend',
  },
  {
    kenmerk: 'GEDEELTELIJK_VERLEEND',
    omschrijving: 'Gedeeltelijkverleend',
  },
  {
    kenmerk: 'NIET_GEACCEPTEERD',
    omschrijving: 'Niet geaccepteerd',
  },
  {
    kenmerk: 'TOEGEKEND',
    omschrijving: 'Toegekend',
  },
  {
    kenmerk: 'VERGUNNINGSVRIJ',
    omschrijving: 'VErgunningsvrij',
  },
  {
    kenmerk: 'BESCHIKKING_OP_AANVGRAAG',
    omschrijving: 'Beschikking op aanvraag',
  },
  {
    kenmerk: 'INGETROKKEN',
    omschrijving: 'Ingetrokken',
  }],
  eigenschappen: [{
    kenmerk: 'ZAAKNUMMER_OPENWAVE',
    naam: 'Zaaknummer OpenWave',
  },
  {
    kenmerk: 'ZAAKNUMMER_CORSA',
    naam: 'Zaaknummer Corsa',
  }],
  rolTypen: [{
    kenmerk: 'INITIATOR',
    omschrijving: 'Initiator',
    default: true,
  }],
};


//Voor eigen gemak hier ook aanvraag beschikking om snel de nieuwe versie in RxMission config te kunnen zetten
//TODO: verplaats naar niet migratie van RxMission

export const aanvraagBeschikkingZaakCatalogiSetup: ZgwCatalogiZaakTypeSetup = {
  beschrijving: 'Aanvraag Beschikking Overige',
  zaaktypeIdentificatie: 'NMG-AANVRBS-OVERIG',
  statusTypen: [{
    kenmerk: 'START',
    omschrijving: 'Zaak gestart',
    default: true,
  }],
  informatieObjectTypen: [
    {
      kenmerk: 'VERZOEK',
      omschrijving: 'Verzoek',
    },
    {
      kenmerk: 'BIJLAGE_VERZOEK',
      omschrijving: 'Bijlage bij verzoek',
    },
  ],
  eigenschappen: [
    {
      kenmerk: 'FORMULIER_KENMERK',
      naam: 'Formulier kenmerk',
    },
  ],
  rolTypen: [
    {
      kenmerk: 'INITIATOR',
      omschrijving: 'Initiator',
      default: true,
    },
    {
      kenmerk: 'BELANGHEBBENDE',
      omschrijving: 'Belanghebbende',
      default: true,
    },
  ],
};