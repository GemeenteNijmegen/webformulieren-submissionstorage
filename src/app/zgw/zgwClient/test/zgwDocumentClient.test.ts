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

  test('Calling endpoint with endpoint path appends to baseUrl', async () => {
    setFetchMockResponse({});
    const spyOnFetch = jest.spyOn(global, 'fetch');
    const path = 'unlock';
    await client.callDocumentenApi('POST', path);
    expect(spyOnFetch.mock.calls[0][0]).toBe('https://documenten-api/unlock');
  });

  test('Calling endpoint with full url does not append to path', async () => {
    setFetchMockResponse({});
    const spyOnFetch = jest.spyOn(global, 'fetch');
    const fullUrl = 'https://documenten-api/unlock';
    await client.callDocumentenApi('POST', fullUrl);
    expect(spyOnFetch.mock.calls[0][0]).toBe(fullUrl);
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
