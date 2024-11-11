import { ZgwClient } from '../ZgwClient';


beforeEach(() => {

});


describe('ZGW Client', () => {

  const client = new ZgwClient({
    documentenApiUrl: 'https://documenten-api',
    zakenApiUrl: 'https://documenten-api',
    informatieobjecttype: 'https://catalogi-api/informatieobjecttype',
    zaakstatus: 'https://catalogi-api/zaakstatus',
    zaaktype: 'https://catalogi-api/zaaktypr',
    name: 'Test',
    clientId: 'id',
    clientSecret: 'secret',
    roltype: 'https://roltype',
  });

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


function setFetchMockResponse(response: any) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      headers: {
        test: 'test',
      },
      json: () => Promise.resolve(response),
    }),
  ) as jest.Mock;
}
