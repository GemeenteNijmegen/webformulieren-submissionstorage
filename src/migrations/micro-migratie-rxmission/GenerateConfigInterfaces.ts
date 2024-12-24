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
    statusTypen:{ url: string; kenmerk?: string; omschrijving?: string; default?: boolean;}[];
    resultaatTypen: { url: string; kenmerk?: string; omschrijving?: string; default?: boolean;}[];
    eigenschappen: { url: string; kenmerk?: string; naam?: string; default?: boolean;}[];
    informatieObjectTypen?: { url: string; kenmerk?: string; omschrijving?: string;default?: boolean;}[];
    rolTypen: { url: string; kenmerk?: string; omschrijving?: string; default?: boolean;}[];
}

export interface ZgwCatalogiZaakTypeSetup {
beschrijving?: string;  
 zaaktypeIdentificatie: string;
 statusTypen:{kenmerk: string; omschrijving: string; default?: boolean;}[];
 resultaatTypen: {kenmerk: string; omschrijving: string; default?: boolean;}[];
 eigenschappen: {kenmerk: string; naam: string; default?: boolean;}[];
 informatieObjectTypen?: {kenmerk: string; omschrijving: string;default?: boolean;}[];
 rolTypen: {kenmerk: string; omschrijving: string; default?: boolean;}[];
}

export const schaduwZaakCatalogiSetup: ZgwCatalogiZaakTypeSetup = {
    beschrijving: 'Zaaktype voor migratie ODRN',
    zaaktypeIdentificatie:'NMG-schaduwzaak',
    statusTypen: [{
        kenmerk: 'START',
        omschrijving: 'Zaak gestart',
        default: true,
    }],
    resultaatTypen: [{
        kenmerk: 'GEWEIGERD',
        omschrijving: 'Geweigerd',
    },{
        kenmerk: 'VERLEEND',
        omschrijving: 'Verleend',
    },{
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
    }]
}