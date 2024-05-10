import { ParsedFormDefinition } from '../../formDefinition/FormDefinitionParser';
import { FormParser } from '../FormParser';

describe('FormParser tests', () => {
  test('should instantiate', () => {
    const formParser = new FormParser({ name: 'formName' } as any as ParsedFormDefinition);
    expect(formParser).toBeTruthy();
  });
});