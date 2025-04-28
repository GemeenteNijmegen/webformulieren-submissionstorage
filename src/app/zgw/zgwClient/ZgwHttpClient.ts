import * as jwt from 'jsonwebtoken';

export enum HttpMethod {
  Get = 'GET',
  Head = 'HEAD',
  Post = 'POST',
  Put = 'PUT',
  Delete = 'DELETE',
  Patch = 'PATCH',
}

interface ZgwHttpClientConfig {
  clientId: string;
  clientSecret: string;
}

export class ZgwHttpClient {
  private clientId: string;
  private clientSecret: string;

  constructor(config: ZgwHttpClientConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  async request(method: HttpMethod, url: string, data?: any, headers?: Record<string, string>) {
    const token = this.createToken();
    const body = data ?? undefined;

    const contentTypeHeader = (this.isJson(body)) ? { 'Content-type': 'application/json' } : null;
    try {
      const response = await fetch(url, {
        method: method,
        body,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Crs': 'EPSG:4326',
          'Accept-Crs': 'EPSG:4326',
          ...contentTypeHeader,
          ...headers,
        },
      });
      console.debug('response', response);
      const json = await response.json() as any;

      if (response.status < 200 || response.status >= 300) {
        console.error(`Error of type ${json.type}: ${json.title}, `, json);
        throw Error('Not a 2xx response');
      }
      if (method == HttpMethod.Post || method == HttpMethod.Put) {
        if (json.url) {
          console.debug(`Created object with url ${json.url}`);
        }
      }
      return json;
    } catch (error) {
      console.error(error);
    }
  }

  private isJson(body: any) {
    let isJson = false;
    try {
      JSON.parse(body);
      isJson = true;
      console.debug('is json', body);
    } catch (error) {
      console.debug('not json', body);
      isJson = false;
    }
    return isJson;
  }

  private createToken() {

    const token = jwt.sign(
      {
        iss: this.clientId,
        iat: Date.now(),
        client_id: this.clientId,
        user_id: this.clientId,
        user_representation: this.clientId,
      },
      this.clientSecret,
      {
        expiresIn: '12h',
      },
    );
    return token;
  }

  // private joinUrl(start: string, ...args: string[]) {
  //   if (!start.endsWith('/')) {
  //     start = `${start}/`;
  //   }
  //   return start + args.map( pathPart => pathPart.replace(/(^\/|\/$)/g, '') ).join('/');
  // }
}
