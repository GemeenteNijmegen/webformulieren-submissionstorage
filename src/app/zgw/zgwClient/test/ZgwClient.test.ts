import { ZgwClient } from '../ZgwClient';
import { getFetchMockResponse, setFetchMockResponse } from './testUtils';


beforeEach(() => {

});


describe('ZGW Client', () => {

  const client = new ZgwClient({
    documentenApiUrl: 'https://documenten-api',
    zakenApiUrl: 'https://zaken-api',
    informatieobjecttype: 'https://catalogi-api/informatieobjecttype',
    zaakstatus: 'https://catalogi-api/zaakstatus',
    zaaktype: 'https://catalogi-api/zaaktype',
    name: 'Test',
    clientId: 'id',
    clientSecret: 'secret',
    roltype: 'https://roltype',
  });
  describe('getZaak', () => {
    test('GET zaak', async () => {
      setFetchMockResponse({
        count: 1,
        results: [
          {
            url: 'https://zaak-url',
          },
        ],
      });
      const zaak = await client.getZaak('ABC');
      expect(zaak.url).toBe('https://zaak-url');
    });
  });
  describe('createZaak', () => {
    test('original ZGWForwardHandler expected calls', async () => {
      const spyOnFetch = jest.spyOn(global, 'fetch').mockResolvedValue(getFetchMockResponse({ url: 'someurl' }) as any as Response);
      console.debug(spyOnFetch);
      await client.createZaak('R01.0001', 'mockFormulierNaam');
      console.debug(spyOnFetch.mock.calls);
      expect(spyOnFetch).toHaveBeenNthCalledWith(1, 'https://zaken-api/zaken', {
        method: 'POST',
        body: expect.any(String),
        headers: expect.objectContaining({
          'Authorization': expect.stringMatching(/^Bearer\s.+/), // Matches any token prefixed with 'Bearer '
          'Content-type': 'application/json',
          'Content-Crs': 'EPSG:4326',
          'Accept-Crs': 'EPSG:4326',
        }),
      });
    });
    test('original ZGWForwardHandler expected request content', async () => {
      const spyOnFetch = jest.spyOn(global, 'fetch').mockResolvedValue(getFetchMockResponse({ url: 'someurl' }) as any as Response);
      await client.createZaak('R02.0002', 'mockFormulierNaam');
      const createZaakRequest = spyOnFetch.mock.calls[0];
      console.debug(createZaakRequest);
      const parsedRequestBody = JSON.parse(createZaakRequest[1]!.body! as any);
      console.dir(parsedRequestBody, { colors: true });

      expect(parsedRequestBody.identificatie).toBe('R02.0002');

    });
  });
  describe('addZaakStatus', () => {
    test('original ZGWForwardHandler expected calls', async () => {
      const spyOnFetch = jest.spyOn(global, 'fetch').mockResolvedValue(getFetchMockResponse({ url: 'someurl' }) as any as Response);
      await client.addZaakStatus({ zaakUrl: 'https://url', statusType: 'https://statusurl' });
      console.debug(spyOnFetch.mock.calls);
      expect(spyOnFetch).toHaveBeenNthCalledWith(1, 'https://zaken-api/statussen', {
        method: 'POST',
        body: expect.any(String),
        headers: expect.objectContaining({
          'Authorization': expect.stringMatching(/^Bearer\s.+/), // Matches any token prefixed with 'Bearer '
          'Content-type': 'application/json',
          'Content-Crs': 'EPSG:4326',
          'Accept-Crs': 'EPSG:4326',
        }),
      });
    });
  });
});


