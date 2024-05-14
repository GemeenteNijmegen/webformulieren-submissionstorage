import { MockIncludedFormDefintionComponents } from './mockIncludedFormDefinitionComponents';
import { MockIncludedFormDefintionComponentsDoubleComponents } from './mockIncludedFormDefinitionComponentsDoubleComponents';
import * as MockFormKind01 from './subm_raw_kind_01.json';
import * as MockFormVolwassen01 from './subm_raw_volwassene_01.json';
import { ParsedFormDefinition } from '../../formDefinition/FormDefinitionParser';
import { FormParser } from '../FormParser';

const sportParsedFormDefinition: ParsedFormDefinition = {
  name: 'formName',
  title: 'Formulier Sport Aanmelden',
  created: '2024-08-15T12:05:33.193Z',
  modified: '2024-08-15T12:05:33.193Z',
  includedFormDefinitionComponents: MockIncludedFormDefintionComponents,
};

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
  describe('Parse', ()=> {
    const mockKindForm = JSON.stringify(MockFormKind01);
    const mockVolwassenForm = JSON.stringify(MockFormVolwassen01);

    test('development test - enable to get logging while developing', () => {
      const formParser = new FormParser(sportParsedFormDefinition);
      const parsedForm = formParser.parseForm(mockKindForm);
      // const parsedForm = formParser.parseForm(mockVolwassenForm);
      // Combine headers with values to check results in logs
      const combinedHeadersAndParsedValues = [];
      for (let i = 0; i < formParser.getHeaders().length; i++) {
        combinedHeadersAndParsedValues.push({ [formParser.getHeaders()[i].toString()]: parsedForm[i] });
      }
      console.log('Parsed form with headers: ', combinedHeadersAndParsedValues);
    });
    test('should process kind form', () => {
      const formParser = new FormParser(sportParsedFormDefinition);
      const parsedForm = formParser.parseForm(mockKindForm);
      expect(parsedForm).toContain('aanmeldensportactiviteit');
      expect(formParser.getHeaders().length).toEqual(parsedForm.length);
      expect(parsedForm).toContain('TestAchternaamOuder01');
      expect(parsedForm).not.toContain(undefined);
    });

    test('should process volwassen form', () => {
      const formParser = new FormParser(sportParsedFormDefinition);
      const parsedForm = formParser.parseForm(mockVolwassenForm);
      expect(parsedForm).toContain('aanmeldensportactiviteit');
      expect(formParser.getHeaders().length).toEqual(parsedForm.length);
    });

    // test('should show labels of radiobuttons instead of vague values like a and b', () => {
    //   const formParser = new FormParser(sportParsedFormDefinition);
    //   const parsedForm = formParser.parseForm(mockVolwassenForm);
    // });
    // test('should show the label values of selectboxes ', () => {
    //   const formParser = new FormParser(sportParsedFormDefinition);
    //   const parsedForm = formParser.parseForm(mockVolwassenForm);
    // });
    // test('should have values that match with the headers', () => {
    //   const formParser = new FormParser(sportParsedFormDefinition);
    //   const parsedForm = formParser.parseForm(mockVolwassenForm);
    // });
  });
});