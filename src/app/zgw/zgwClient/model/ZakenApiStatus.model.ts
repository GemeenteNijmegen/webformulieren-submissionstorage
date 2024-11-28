import { z } from 'zod';

/**
 * Schema voor zowel request als response van het aanmaken van een Status voor een Zaak.
 */
export const zakenApiStatusSchema = z.object({
  /**
     * URL-referentie naar de ZAAK.
     * @example "http://example.com/zaak/12345"
     */
  zaak: z.string()
    .url({ message: 'Zaak moet een geldige URL zijn.' })
    .max(1000, { message: 'Zaak URL mag maximaal 1000 tekens bevatten.' })
    .describe('URL-referentie naar de ZAAK.'),

  /**
     * URL-referentie naar het STATUSTYPE (in de Catalogi API).
     * @example "http://example.com/statustype/status1"
     */
  statustype: z.string()
    .url({ message: 'Statustype moet een geldige URL zijn.' })
    .max(1000, { message: 'Statustype URL mag maximaal 1000 tekens bevatten.' })
    .describe('URL-referentie naar het STATUSTYPE (in de Catalogi API).'),

  /**
     * De datum waarop de ZAAK de status heeft verkregen.
     * @example "2019-08-24T14:15:22Z"
     */
  datumStatusGezet: z.string()
    .describe('De datum waarop de ZAAK de status heeft verkregen.'),

  /**
     * Een, voor de initiator van de zaak relevante, toelichting op de status van een zaak.
     * @example "Status is goedgekeurd."
     */
  statustoelichting: z.string()
    .max(1000, { message: 'Statustoelichting mag maximaal 1000 tekens bevatten.' })
    .optional()
    .describe('Een, voor de initiator van de zaak relevante, toelichting op de status van een zaak.'),

  /**
     * De BETROKKENE die in zijn/haar ROL in een ZAAK heeft geregistreerd dat STATUSsen in die ZAAK bereikt zijn.
     * @example "http://example.com/user/67890"
     */
  gezetdoor: z.string()
    .url({ message: 'Gezetdoor moet een geldige URL zijn.' })
    .max(200, { message: 'Gezetdoor URL mag maximaal 200 tekens bevatten.' })
    .optional()
    .describe('De BETROKKENE die in zijn/haar ROL in een ZAAK heeft geregistreerd dat STATUSsen in die ZAAK bereikt zijn.'),

  /**
     * URL-referentie naar de Status.
     * Alleen aanwezig in de response.
     * @example "http://example.com/status/1"
     */
  url: z.string()
    .url({ message: 'URL moet een geldige URL zijn.' })
    .optional()
    .describe('URL-referentie naar de Status.'),

  /**
     * UUID van de Status.
     * Alleen aanwezig in de response.
     * @example "095be615-a8ad-4c33-8e9c-c7612fbf6c9f"
     */
  uuid: z.string()
    .uuid({ message: 'UUID moet een geldige UUID zijn.' })
    .optional()
    .describe('UUID van de Status.'),

  /**
     * Indicatie of dit de laatst gezette status is.
     * Alleen aanwezig in de response.
     * @example true
     */
  indicatieLaatstGezetteStatus: z.boolean()
    .optional()
    .describe('Indicatie of dit de laatst gezette status is.'),

}).passthrough();
export type ZakenApiStatus = z.infer<typeof zakenApiStatusSchema>;
