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
      const errorSpy = jest.spyOn(console, 'error');

      const formParser = new FormParser({ name: 'formNameDouble', includedFormDefinitionComponents: MockIncludedFormDefintionComponentsDoubleComponents } as any as ParsedFormDefinition);
      expect(formParser.getHeaders()).toContain('Achternaam kind achternaamKind');
      expect(formParser.getHeaders()).toContain('Stadsdeel stadsdeel');
      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Achternaam kind achternaamKind'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Stadsdeel stadsdeel'));
      errorSpy.mockRestore();
    });
  });
  describe('Parse', ()=> {
    const mockKindForm = JSON.stringify(MockFormKind01);
    const mockVolwassenForm = JSON.stringify(MockFormVolwassen01);

    xtest('development test - enable to get logging while developing', () => {
      const formParser = new FormParser(sportParsedFormDefinition);
      // const parsedForm = formParser.parseForm(mockKindForm);
      const parsedForm = formParser.parseForm(mockVolwassenForm);

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
    });

    test('should process volwassen form', () => {
      const formParser = new FormParser(sportParsedFormDefinition);
      const parsedForm = formParser.parseForm(mockVolwassenForm);
      expect(parsedForm).toContain('aanmeldensportactiviteit');
      expect(formParser.getHeaders().length).toEqual(parsedForm.length);
    });
    test('should not have any undefined values', () => {
      const formParser = new FormParser(sportParsedFormDefinition);

      const parsedForm = formParser.parseForm(mockKindForm);
      expect(parsedForm).not.toContain(undefined);

      const parsedVolwassenForm = formParser.parseForm(mockVolwassenForm);
      expect(parsedVolwassenForm).not.toContain(undefined);
    });

    test('should show labels of radiobuttons instead of vague values like a and b', () => {
      const formParser = new FormParser(sportParsedFormDefinition);

      const parsedForm = formParser.parseForm(mockKindForm);
      expect(parsedForm).toContain('een kind (17 jaar of jonger)');
      expect(parsedForm).toContain('basisonderwijs');

      const parsedVolwassenForm = formParser.parseForm(mockVolwassenForm);
      expect(parsedVolwassenForm).toContain('een volwassene (18 jaar of ouder)');
    });
    test('should show the label values of selectboxes ', () => {
      const formParser = new FormParser(sportParsedFormDefinition);
      const parsedForm = formParser.parseForm(mockVolwassenForm);
      expect(parsedForm).toContain('Checkbox Kwiek wandelroute (Park Maldenborgh) is true. Checkbox Nationale (diabetes) Challenge (Goffert) is true.');
    });
    test('should backslash a comma in a string', () => {
      const commastring = 'TestOuder01 \\, eneenkommabackslash';
      const formParser = new FormParser(sportParsedFormDefinition);
      const parsedForm = formParser.parseForm(mockKindForm);
      expect(parsedForm).toContain(commastring);
    });
    test('should have values that match with the headers', () => {
      const formParser = new FormParser(sportParsedFormDefinition);
      const parsedForm = formParser.parseForm(mockVolwassenForm);

      // Combine headers with values to enable tests
      const combinedHeadersAndParsedValues = [];
      for (let i = 0; i < formParser.getHeaders().length; i++) {
        combinedHeadersAndParsedValues.push({ [formParser.getHeaders()[i].toString()]: parsedForm[i] });
      }
      //Steekproef
      expect(combinedHeadersAndParsedValues).toContainEqual({ 'E-mailadres eMailadres': 'test@nijmegen.nl' });
      expect(combinedHeadersAndParsedValues).toContainEqual( { 'Ik heb alle vragen naar waarheid beantwoord': 'true' });
      expect(combinedHeadersAndParsedValues).toContainEqual( { 'Stadsdeel stadsdeel': 'Nijmegen-Midden & Zuid' });
      expect(combinedHeadersAndParsedValues).toContainEqual( { appId: 'SP3' });
      expect(combinedHeadersAndParsedValues).toContainEqual( { Geboortedatum: '08-05-1996' });
      expect(combinedHeadersAndParsedValues).toContainEqual( {
        'Geeft u toestemming dat uw gegevens bewaard worden voor het seizoen 2023-2024?': 'ja',
      });
    });
  });
});