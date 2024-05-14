import { MockIncludedFormDefintionComponents } from './mockIncludedFormDefinitionComponents';
import { MockIncludedFormDefintionComponentsDoubleComponents } from './mockIncludedFormDefinitionComponentsDoubleComponents';
import { ParsedFormDefinition } from '../../formDefinition/FormDefinitionParser';
import { FormParser } from '../FormParser';

describe('FormParser tests', () => {
  test('should instantiate', () => {
    const formParser = new FormParser({ name: 'formName', includedFormDefinitionComponents: [] } as any as ParsedFormDefinition);
    expect(formParser).toBeTruthy();
  });
  describe('Headers', ()=> {
    test('should set formDefinition headers in constructor', () => {
      const formParser = new FormParser({ name: 'formName', includedFormDefinitionComponents: MockIncludedFormDefintionComponents } as any as ParsedFormDefinition);
      expect(formParser.getHeaders()).toContain('Formuliernaam');
    });
    test('should not set double labels', () => {
      const formParser = new FormParser({ name: 'formName', includedFormDefinitionComponents: MockIncludedFormDefintionComponents } as any as ParsedFormDefinition);
      expect(formParser.getHeaders()).toContain('Stadsdeel stadsdeel1');
      expect(formParser.getHeaders()).toContain('Stadsdeel stadsdeel');
      expect(formParser.getHeaders()).not.toContain('Stadsdeel');
    });
    test('should not add double headers', () => {
      const debugSpy = jest.spyOn(console, 'debug');

      const formParser = new FormParser({ name: 'formNameDouble', includedFormDefinitionComponents: MockIncludedFormDefintionComponentsDoubleComponents } as any as ParsedFormDefinition);
      expect(formParser.getHeaders()).toContain('Achternaam kind achternaamKind');
      expect(formParser.getHeaders()).toContain('Stadsdeel stadsdeel');
      expect(debugSpy).toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Achternaam kind achternaamKind'));
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Stadsdeel stadsdeel'));
      debugSpy.mockRestore();
    });
  });
  describe('Parse Happyflow', ()=> {});
});