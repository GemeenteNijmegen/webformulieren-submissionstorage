import * as formDefinitionMock01 from './mockFormDefinition_01.json';
import * as formDefinitionMockSportAanmelden from './mockFormDefinitionAanmeldenSport.json';
import { FormDefinitionParser } from '../FormDefinitionParser';
describe('Form Definition Parser Tests', ()=> {
  describe('Development tests - disable after use to prevent logging', () => {
    test('should show logs to enable development with logged outputs', ()=> {
      const parsedFormDefinition = new FormDefinitionParser(formDefinitionMockSportAanmelden);
      // const parsedFormDefinition = new FormDefinitionParser(formDefinitionMock01);

      // Logging of parsed components for development purposes
      console.log('All FormDefintionComponents: ', parsedFormDefinition.getAllFormDefinitionComponents());
      console.log('Included FormDefintionComponents: ', parsedFormDefinition.getIncludedFormDefinitionComponents());

      // Log type overview for debugging purpose
      // What types does the parsed form definition have and which ones are included and excluded for content overview geenration
      console.log('Form Definition types:', parsedFormDefinition.getFormDefinitionTypeOverview());
    });
  });

  describe('Aanmelden Sport Definition', () => {
    const parsedFormDefinition = new FormDefinitionParser(formDefinitionMockSportAanmelden);
    test('should have metadata', () => {
      ;
      const metadata = parsedFormDefinition.allMetadata;
      expect(metadata).toEqual({
        formName: 'aanmeldenSportactiviteit',
        formTitle: 'Aanmelden sportactiviteit',
        createdDate: '2023-10-09T12:52:39.521Z',
        modifiedDate: '2023-10-11T07:32:48.916Z',
      });
    });
    test('should return parsed components', ()=> {
      const allParsedFormDefinitionComponents = parsedFormDefinition.getAllFormDefinitionComponents();
      expect(allParsedFormDefinitionComponents.length).toBeGreaterThanOrEqual(1);
      // Basic component
      expect(allParsedFormDefinitionComponents).toContainEqual({
        key: 'voornaam',
        keyPath: '.components[2].components[3].voornaam',
        label: 'Voornaam',
        type: 'textfield_nijmegen',
        inDataGrid: false,
      });

      // Button component included in all components
      expect(allParsedFormDefinitionComponents).toContainEqual( {
        key: 'volgende1',
        keyPath: '.components[2].components[10].columns[1].components[0].volgende1',
        label: 'Volgende',
        type: 'button',
        inDataGrid: false,
        parentKey: undefined,
      });
    });

    test('should return nested properties in parsed component', ()=> {
      const allParsedFormDefinitionComponents = parsedFormDefinition.getAllFormDefinitionComponents();
      expect(allParsedFormDefinitionComponents.length).toBeGreaterThanOrEqual(1);


      expect(allParsedFormDefinitionComponents).toContainEqual( {
        key: 'stadsdeel',
        keyPath: '.components[4].components[4].components[0].stadsdeel',
        label: 'Stadsdeel',
        type: 'select_nijmegen',
        inDataGrid: false,
        parentKey: 'stadsdeelVolwassen',
      });

    });

    test('should only return included type parsed components', ()=> {
      const includedParsedFormDefinitionComponents = parsedFormDefinition.getIncludedFormDefinitionComponents();

      // Basic textfield component
      expect(includedParsedFormDefinitionComponents).toContainEqual({
        key: 'voornaam',
        keyPath: '.components[2].components[3].voornaam',
        label: 'Voornaam',
        type: 'textfield_nijmegen',
        inDataGrid: false,
      });

      // Not included button component
      expect(includedParsedFormDefinitionComponents).not.toContainEqual( {
        key: 'volgende1',
        keyPath: '.components[2].components[10].columns[1].components[0].volgende1',
        label: 'Volgende',
        type: 'button',
        inDataGrid: false,
        parentKey: undefined,
      });
    });
  });

  describe('Mock 01 Form Definition', () => {
    const parsedFormDefinition = new FormDefinitionParser(formDefinitionMock01);
    test('should have metadata', () => {
      const metadata = parsedFormDefinition.allMetadata;
      expect(metadata).toEqual({
        formName: 'testFormulierNaam',
        formTitle: 'Test formulier titel',
        createdDate: '2022-08-15T12:05:33.193Z',
        modifiedDate: '2023-06-20T11:52:15.275Z',
      });
    });
    test('should return inDataGrid parsed components', ()=> {
      const allParsedFormDefinitionComponents = parsedFormDefinition.getAllFormDefinitionComponents();
      expect(allParsedFormDefinitionComponents.length).toBeGreaterThanOrEqual(1);

      // Component with inDataGrid
      // Datagrids can have multiple objects/components with the same names
      // In a form the user can use 'Nog een toevoegen' to add another of the same object
      // For example another person with fields name and email
      // There can be one or many
      expect(allParsedFormDefinitionComponents).toContainEqual( {
        key: 'voornaam',
        keyPath: '.components[1].components[1].components[0].components[0].voornaam',
        label: 'Voornaam',
        type: 'textfield_nijmegen',
        inDataGrid: true,
        parentKey: undefined,
      });
    });
  });

  describe('setFormMetaData method errors', () => {
    const startErrorMessage = 'Parsing Form Definition failed. Missing required metadata keys:';
    test('throws error for empty object in constructor', () => {
      expect(() => {new FormDefinitionParser({});}).toThrow({ name: 'Error', message: `${startErrorMessage} name, title, created, modified` } );

    });

    // Test each one
    const requiredMetadataKeys = ['name', 'title', 'created', 'modified'];

    requiredMetadataKeys.forEach(missingKey => {
      const missingKeyObject = {
        name: missingKey !== 'name' ? 'testFormulierNaam' : undefined,
        title: missingKey !== 'title' ? 'Test formulier titel' : undefined,
        created: missingKey !== 'created' ? '2022-08-15T12:05:33.193Z' : undefined,
        modified: missingKey !== 'modified' ? '2023-06-20T11:52:15.275Z' : undefined,
      };

      test(`throws error for missing key: ${missingKey}`, () => {
        expect(() => {new FormDefinitionParser(missingKeyObject);}).toThrow({ name: 'Error', message: `${startErrorMessage} ${missingKey}` } );
      });
    });
  });
});
