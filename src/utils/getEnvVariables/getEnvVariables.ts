export function getEnvVariables<T extends readonly string[]>(
  keys: T,
  defaults: Partial<Record<T[number], string>> = {}): {
    [K in T[number]]: string;
  } {
  const env = {} as {
    [K in T[number]]: string;
  };

  keys.forEach((key) => {
    // Type assertion to ensure TypeScript understands key is a valid key for defaults
    const typedKey = key as T[number];
    const value = process.env[typedKey] ?? defaults[typedKey] ?? '';

    if (!value) {
      throw new Error(`Environment variable ${typedKey} is missing`);
    }

    env[typedKey] = value;
  });

  return env;
}