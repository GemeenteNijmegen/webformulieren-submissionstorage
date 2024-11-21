// import { setFetchMockResponse } from './testUtils';
import { HttpMethod, ZgwHttpClient } from '../ZgwHttpClient';

describe('Configuring the client', () => {
  let fetchSpy: jest.SpyInstance;
  let defaultClient: ZgwHttpClient;
  beforeAll(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
    defaultClient = new ZgwHttpClient({
      clientId: 'testClient',
      clientSecret: 'testSecret',
    });
  });

  beforeEach(() => {
    fetchSpy.mockReset();
  });

  test('creating client succeeds', async() => {
    expect(new ZgwHttpClient({
      clientId: 'testClient',
      clientSecret: 'testSecret',
    })).toBeTruthy();
  });

  test('sending GET request doesnt add body', async() => {
    await defaultClient.request(HttpMethod.Get, 'http://localhost/');
    expect(fetchSpy.mock.calls[0].body).toBeUndefined();
  });

  test('sending POST request adds body', async() => {
    await defaultClient.request(HttpMethod.Post, 'http://localhost/', JSON.stringify({ test: 'ok' }));
    console.debug(fetchSpy.mock.calls[0]);
    expect(fetchSpy.mock.calls[0][1].body).not.toBeUndefined();
    expect(fetchSpy.mock.calls[0][1].headers['Content-type']).toBe('application/json');
  });

  test('sending POST request with non-json data doesnt add JSON content-type', async() => {
    await defaultClient.request(HttpMethod.Post, 'http://localhost/', 'test');
    expect(fetchSpy.mock.calls[0][1].body).not.toBeUndefined();
    expect(fetchSpy.mock.calls[0][1].headers['Content-type']).toBeUndefined();
  });
});
