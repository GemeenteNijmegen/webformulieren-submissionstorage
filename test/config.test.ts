import { getConfiguration } from "../src/Configuration";

test('Get config', () => {
  expect(typeof getConfiguration('main')).toBe('object');
});
