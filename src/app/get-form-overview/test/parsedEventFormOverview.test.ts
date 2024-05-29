import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { EventParameters, parsedEvent } from '../parsedEvent';

describe('formOverview parsedEvent', () => {
  it('should parse valid event data with all parameters', () => {
    const mockEvent: APIGatewayProxyEventV2 = {
      queryStringParameters: {
        formuliernaam: 'My formulier',
        startdatum: '2024-06-25',
        einddatum: '2024-05-20',
      },
    } as any as APIGatewayProxyEventV2;

    const expectedData: EventParameters = {
      formuliernaam: 'My formulier',
      startdatum: '2024-06-25',
      einddatum: '2024-05-20',
    };

    expect(parsedEvent(mockEvent)).toEqual(expectedData);
  });

  it('should parse valid event data with only formuliernaam', () => {
    const mockEvent: APIGatewayProxyEventV2 = {
      queryStringParameters: {
        formuliernaam: 'My formulier',
      },
    } as any as APIGatewayProxyEventV2;

    const expectedData: EventParameters = {
      formuliernaam: 'My formulier',
      startdatum: undefined,
      einddatum: undefined,
    };

    expect(parsedEvent(mockEvent)).toEqual(expectedData);
  });
  it('should throw error for missing queryStringParameters', () => {
    const mockEvent: any = {}; // Cast to any as queryStringParameters might not be defined
    expect(() => parsedEvent(mockEvent)).toThrow('formuliernaam is vereist'); // Might need to adjust based on specific error handling
  });
  it('should throw error for formuliernaam wrong type', () => {
    const mockEvent: any = { queryStringParameters: { formuliernaam: 3 } };
    expect(() => parsedEvent(mockEvent)).toThrow('formuliernaam moet een string zijn');
  });

  it('should parse valid event data with formuliernaam and startdatum', () => {
    const mockEvent: APIGatewayProxyEventV2 = {
      queryStringParameters: {
        formuliernaam: 'My formulier',
        startdatum: '2024-05-25',
      },
    } as any as APIGatewayProxyEventV2;

    const expectedData: EventParameters = {
      formuliernaam: 'My formulier',
      startdatum: '2024-05-25',
      einddatum: undefined,
    };

    expect(parsedEvent(mockEvent)).toEqual(expectedData);
  });

  it('should parse valid event data with formuliernaam and einddatum', () => {
    const mockEvent: APIGatewayProxyEventV2 = {
      queryStringParameters: {
        formuliernaam: 'My formulier',
        einddatum: '2024-06-20',
      },
    } as any as APIGatewayProxyEventV2;

    const expectedData: EventParameters = {
      formuliernaam: 'My formulier',
      startdatum: undefined,
      einddatum: '2024-06-20',
    };

    expect(parsedEvent(mockEvent)).toEqual(expectedData);
  });


  it('should throw error for empty string startdatum', () => {
    const mockEvent: APIGatewayProxyEventV2 = {
      queryStringParameters: {
        formuliernaam: 'My formulier',
        startdatum: '2024-20-06',
      },
    } as any as APIGatewayProxyEventV2;

    expect(() => parsedEvent(mockEvent)).toThrow('Startdatum moet het formaat JJJJ-MM-DD hebben'); // Zod default error
  });

  it('should throw error for empty string einddatum', () => {
    const mockEvent: APIGatewayProxyEventV2 = {
      queryStringParameters: {
        formuliernaam: 'My formulier',
        einddatum: '',
      },
    } as any as APIGatewayProxyEventV2;

    expect(() => parsedEvent(mockEvent)).toThrow('Einddatum moet het formaat JJJJ-MM-DD hebben'); // Zod default error
  });

  describe('parsedEvent: startdatum and einddatum validation', () => {
    const scenarios = [
      {
        startdatum: '2024-05-24',
        einddatum: '2024-05-24',
        expectedError: null,
      },
      {
        startdatum: '2024-05-24',
        einddatum: '2024-05-20',
        expectedError: null, // No error expected
      },
      {
        startdatum: '2024-05-20',
        einddatum: '2024-05-24',
        expectedError: 'Einddatum mag niet na startdatum zijn',
      },
    ];

    it.each(scenarios)('should handle various startdatum and einddatum scenarios', ({ startdatum, einddatum, expectedError }) => {
      const mockEvent: APIGatewayProxyEventV2 = {
        queryStringParameters: {
          formuliernaam: 'My formulier',
          startdatum,
          einddatum,
        },
      } as any as APIGatewayProxyEventV2;

      try {
        parsedEvent(mockEvent);
        if (expectedError) {
          fail('Expected error was not thrown');
        }
      } catch (error: any) {
        if (!expectedError) {
          throw error; // Rethrow unexpected errors
        }
        expect(error.message).toEqual(expectedError);
      }
    });
  });


});