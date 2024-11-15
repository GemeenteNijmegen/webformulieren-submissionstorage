export function setFetchMockResponse(response: any) {
    global.fetch = jest.fn(() =>
      Promise.resolve(getFetchMockResponse(response)),
    ) as jest.Mock;
  }
  
export function getFetchMockResponse(response: any = {}){
    return {
      headers: {
        test: 'test',
      },
      json: () => Promise.resolve(response),
    }
}