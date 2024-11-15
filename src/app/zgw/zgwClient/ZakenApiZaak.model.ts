import { z } from 'zod';

/**
 * Schema en type van een zaak zoals deze in de ZGW ZakenAPI gebruik wordt.
 * Bijvoorbeeld voor een POST, PUT of GET van een zaak
 * Gebaseerd op versie 1.5.1 van de ZakenAPI
 */
const zakenApiZaakSchema = z.object({
  identificatie: z
    .string()
    .max(40, 'Identificatie must be 40 characters or less.')
    .optional(),

  bronorganisatie: z
    .string()
    .regex(/^\d{9}$/, 'Bronorganisatie must be a 9-digit RSIN.')
    .min(1, 'Bronorganisatie is required.')
    .max(9, 'Bronorganisatie must be a valid RSIN.'),

  omschrijving: z
    .string()
    .max(80, 'Omschrijving must be 80 characters or less.')
    .optional(),

  toelichting: z
    .string()
    .max(1000, 'Toelichting must be 1000 characters or less.')
    .optional(),

  zaaktype: z
    .string()
    .url('Zaaktype must be a valid URL.')
    .min(1, 'Zaaktype is required.')
    .max(1000, 'Zaaktype URL must be 1000 characters or less.'),

  registratiedatum: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),

  verantwoordelijkeOrganisatie: z
    .string()
    .regex(/^\d{9}$/, 'VerantwoordelijkeOrganisatie must be a 9-digit RSIN.')
    .min(1, 'VerantwoordelijkeOrganisatie is required.')
    .max(9, 'VerantwoordelijkeOrganisatie must be a valid RSIN.'),

  startdatum: z
    .string()
    .min(1, 'Startdatum is required.')
    .refine((val) => !isNaN(Date.parse(val)), 'Startdatum must be a valid date string.'),


  einddatumGepland: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'EinddatumGepland must be a valid date string or null.'),

  uiterlijkeEinddatumAfdoening: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'UiterlijkeEinddatumAfdoening must be a valid date string or null.'),

  publicatiedatum: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Publicatiedatum must be a valid date string or null.'),

  communicatiekanaal: z
    .string()
    .url('Communicatiekanaal must be a valid URL.')
    .max(1000, 'Communicatiekanaal URL must be 1000 characters or less.')
    .optional(),

  communicatiekanaalNaam: z
    .string()
    .max(250, 'CommunicatiekanaalNaam must be 250 characters or less.')
    .optional(),

  productenOfDiensten: z
    .array(z.string().url('Each product or service URL must be valid.'))
    .optional(),

  vertrouwelijkheidaanduiding: z
    .enum(['openbaar', 'beperkt_openbaar', 'intern', 'zaakvertrouwelijk', 'vertrouwelijk', 'confidentieel', 'geheim', 'zeer_geheim'])
    .optional(),

  betalingsindicatie: z
    .enum(['nvt', 'nog_niet', 'gedeeltelijk', 'geheel'])
    .optional(),

  laatsteBetaaldatum: z
    .string()
    .nullable()
    .optional(),

  archiefnominatie: z
    .enum(['blijvend_bewaren', 'vernietigen'])
    .nullable()
    .optional(),

  archiefstatus: z
    .enum(['nog_te_archiveren', 'gearchiveerd', 'gearchiveerd_procestermijn_onbekend', 'overgedragen'])
    .optional(),

  archiefactiedatum: z
    .string()
    .nullable()
    .optional(),

  opdrachtgevendeOrganisatie: z
    .string()
    .max(9, 'OpdrachtgevendeOrganisatie must be 9 characters or less.')
    .optional(),

  processobjectaard: z
    .string()
    .max(200, 'Processobjectaard must be 200 characters or less.')
    .optional(),

  startdatumBewaartermijn: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'StartdatumBewaartermijn must be a valid date string or null.'),
}).passthrough();

export type ZakenApiZaak = z.infer<typeof zakenApiZaakSchema>;
export { zakenApiZaakSchema };
