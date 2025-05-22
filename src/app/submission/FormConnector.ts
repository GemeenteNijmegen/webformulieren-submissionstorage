import axios, { AxiosInstance } from 'axios';
export interface FormConnector {
  definition(formName: string): Promise<any>;
}

export class MockFormConnector implements FormConnector {
  async definition(formName: string) {
    return Promise.resolve({
      name: formName,
      title: formName,
    });
  }
}

export class FormIoFormConnector implements FormConnector {
  private axios: AxiosInstance;

  constructor(baseUrl: URL, apiKey: string, axiosInstance?: AxiosInstance) {
    this.axios = this.initAxios({ axiosInstance, apiKey, baseUrl });
  }

  async definition(formName: string) {
    return this.getFormDefinition(formName);
  }

  private initAxios(config: {
    axiosInstance?: AxiosInstance | undefined;
    apiKey: string;
    baseUrl: URL;
  }): AxiosInstance {
    if (config.axiosInstance) {
      return config.axiosInstance;
    } else {
      return axios.create(
        {
          baseURL: config.baseUrl.toString(),
          headers: {
            'x-token': config.apiKey,
          },
        },
      );
    }
  }

  private async getFormDefinition(formName: string) {
    try {
      const response = await this.axios.get(formName);
      if (response.status != 200) {
        console.debug(response.request.responseURL);
        throw Error('Unexpected response: ' + response.status);
      }
      return response.data;
    } catch (error: any) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.status);
        console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message);
      }
      console.log(error.config);
      return error;
    }
  }
}
