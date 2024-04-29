import { FormParser } from '../FormParser';

describe('FormParser tests', () => {
  test('should instantiate', () => {
    const formParser = new FormParser();
    expect(formParser).toBeTruthy();
  });
});