import * as fs from 'fs';
import { FormDefinitionKeys, KeyTypeLabel } from '../FormDefinitionKeys';
describe('formDefinitionKeysTests', ()=> {


  //   const formDefinitionMock01 = JSON.parse(fs.readFileSync(__dirname + '/mockFormDefinition_01.json', 'utf-8'));
  const formDefinitionMockSportAanmelden = JSON.parse(fs.readFileSync(__dirname + '/mockFormDefinitionAanmeldenSport.json', 'utf-8'));

  test('get key type label pairs', ()=> {
    const formDefinitionKeys = new FormDefinitionKeys(formDefinitionMockSportAanmelden);
    const output: KeyTypeLabel[] = formDefinitionKeys.getAllKeyTypeLabelObjects();
    console.log('test output: ', output);

    // Log all unique types for overview
    const uniqueTypes = new Set<string>();
    output.forEach(item => uniqueTypes.add(item.type));
    console.log('All types:', Array.from(uniqueTypes));

  });
},
);