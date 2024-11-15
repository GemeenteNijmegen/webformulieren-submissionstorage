import { ZgwClient } from '../ZgwClient';


beforeEach(() => {

});


describe('ZGW Client', () => {

  const client = new ZgwClient({
    documentenApiUrl: 'https://documenten-api',
    zakenApiUrl: 'https://zaken-api',
    informatieobjecttype: 'https://catalogi-api/informatieobjecttype',
    zaakstatus: 'https://catalogi-api/zaakstatus',
    zaaktype: 'https://catalogi-api/zaaktypr',
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
      const spyOnFetch = jest.spyOn(global, 'fetch').mockResolvedValue(getFetchMockResponse() as any as Response);
      await client.createZaak('R01.0001', 'mockFormulierNaam');
      expect(spyOnFetch).toHaveBeenNthCalledWith(1, 'https://zaken-api/zaken', {
        method: 'POST',
        body: expect.any(String), 
        headers: expect.objectContaining({
          'Authorization': expect.stringMatching(/^Bearer\s.+/), // Matches any token prefixed with 'Bearer '
          'Content-type': 'application/json',
          'Content-Crs': 'EPSG:4326',
          'Accept-Crs': 'EPSG:4326',
        }),
      })
    });
  });
});


function setFetchMockResponse(response: any) {
  global.fetch = jest.fn(() =>
    Promise.resolve(getFetchMockResponse(response)),
  ) as jest.Mock;
}

function getFetchMockResponse(response: any = {}){
  return {
    headers: {
      test: 'test',
    },
    json: () => Promise.resolve(response),
  }
}