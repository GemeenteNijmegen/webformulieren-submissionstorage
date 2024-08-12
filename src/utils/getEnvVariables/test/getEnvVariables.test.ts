import { getEnvVariables } from '../getEnvVariables';

describe('getEnvVariables', () => {
  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
  });

  test('retrieves environment variables successfully', () => {
    process.env.NODE_ENV = 'development';
    process.env.PORT = '3000';

    const env = getEnvVariables(['NODE_ENV', 'PORT'] as const);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe('3000');
  });

  test('throws error if required environment variables are missing', () => {
    expect(() => {
      getEnvVariables(['NODE_ENV', 'PORT'] as const);
    }).toThrow('Environment variable NODE_ENV is missing');
  });

  test('uses default values when environment variables are not set', () => {
    const env = getEnvVariables(['DB_PORT'] as const, {
      DB_PORT: '5432', // Default value
    });

    expect(env.DB_PORT).toBe('5432');
  });
});