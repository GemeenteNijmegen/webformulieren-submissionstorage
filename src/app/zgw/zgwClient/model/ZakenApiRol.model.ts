import { z } from 'zod';


const contactpersoonRolSchema = z.object({
  emailadres: z
    .string()
    .email()
    .max(254)
    .describe('Electronic mail address of the contact person.'),
  functie: z
    .string()
    .max(50)
    .optional()
    .describe('Role or function of the contact person within the organization.'),
  telefoonnummer: z
    .string()
    .max(20)
    .optional()
    .describe('Phone number of the contact person.'),
  naam: z
    .string()
    .min(1)
    .max(200)
    .describe('Formatted name of the contact person.'),
}).nullable();

const betrokkeneIdentificatieSchema = z
  .object({
    inpBsn: z
      .string()
      .max(9)
      .optional()
      .describe('Citizen Service Number (BSN) of the person.'),
    anpIdentificatie: z
      .string()
      .max(17)
      .optional()
      .describe('Unique identifier for another natural person.'),
    inpA_nummer: z
      .string()
      .regex(/^[1-9][0-9]{9}$/)
      .optional()
      .describe('Administration number of the person according to BRP.'),
    geslachtsnaam: z
      .string()
      .max(200)
      .optional()
      .describe('Last name of the person.'),
    voorvoegselGeslachtsnaam: z
      .string()
      .max(80)
      .optional()
      .describe('Prefix of the last name, if applicable.'),
    voorletters: z
      .string()
      .max(20)
      .optional()
      .describe('Initials of the person based on their first names.'),
    voornamen: z
      .string()
      .max(200)
      .optional()
      .describe('Given names of the person.'),
    geslachtsaanduiding: z
      .enum(['m', 'v', 'o'])
      .optional()
      .describe('Gender of the person: "m" (male), "v" (female), "o" (unknown).'),
    geboortedatum: z
      .string()
      .max(18)
      .optional()
      .describe('Birthdate of the person.'),
    verblijfsadres: z
      .object({})
      .optional()
      .nullable()
      .describe('Residential address of the person.'),
    subVerblijfBuitenland: z
      .object({})
      .optional()
      .nullable()
      .describe('Details about residence abroad, if applicable.'),
  })
  .nullable();


export const rolRequestSchema = z.object({
  zaak: z
    .string()
    .url()
    .describe('URL reference to the zaak for which this rol is created.'),
  betrokkene: z
    .string()
    .url()
    .describe('URL reference to the betrokkene involved in this rol.'),
  betrokkeneType: z
    .enum(['natuurlijk_persoon', 'niet_natuurlijk_persoon', 'medewerker', 'vestiging', 'organisatie'])
    .describe('Type of betrokkene associated with this rol.'),
  roltype: z
    .string()
    .url()
    .describe('URL reference to the roltype, defining the role of the betrokkene in the zaak.'),
  omschrijving: z
    .string()
    .optional()
    .describe('Optional description of the role in the context of the zaak.'),
  indicatieMachtiging: z
    .boolean()
    .optional()
    .describe(
      'Indicates if the betrokkene has the authorization to act in this role (default is false).',
    ),
  roltoelichting: z
    .string()
    .optional()
    .describe('Optional further explanation or clarification of the rol.'),
  contactpersoonRol: contactpersoonRolSchema.describe(
    'Details about the contact person representing the betrokkene.',
  ),
  betrokkeneIdentificatie: betrokkeneIdentificatieSchema.describe(
    'Details identifying the betrokkene involved in the zaak.',
  ),
}).passthrough();


export const rolResponseSchema = rolRequestSchema.extend({
  url: z
    .string()
    .url()
    .describe('Unique URL of the created rol.'),
  zaak: z
    .string()
    .url()
    .describe('URL reference to the zaak for which this rol was created.'),
  betrokkene: z
    .string()
    .url()
    .describe('URL reference to the betrokkene involved in this rol.'),
});

// TypeScript types inferred from the schemas
export type ZakenApiRolRequest = z.infer<typeof rolRequestSchema>;
export type ZakenApiRolResponse = z.infer<typeof rolResponseSchema>;
export type ContactpersoonRol = z.infer<typeof contactpersoonRolSchema>;
export type BetrokkeneIdentificatie = z.infer<typeof betrokkeneIdentificatieSchema>;