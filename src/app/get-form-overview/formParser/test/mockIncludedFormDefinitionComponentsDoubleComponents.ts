import { FormDefinitionComponents } from '../../formDefinition/FormDefinitionParser';

export const MockIncludedFormDefintionComponentsDoubleComponents: FormDefinitionComponents[] = [
  {
    key: 'voornaamKind',
    keyPath: '.components[1].components[2].voornaamKind',
    label: 'Voornaam kind',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'achternaamKind',
    keyPath: '.components[1].components[3].achternaamKind',
    label: 'Achternaam kind',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'achternaamKind',
    keyPath: '.components[1].components[3].achternaamKind',
    label: 'Achternaam kind',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'voornaam2',
    keyPath: '.components[3].components[2].voornaam2',
    label: 'Voornaam',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'achternaam2',
    keyPath: '.components[3].components[3].achternaam2',
    label: 'Achternaam',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'stadsdeel',
    keyPath: '.components[4].components[4].components[0].stadsdeel',
    label: 'Stadsdeel',
    type: 'select_nijmegen',
    inDataGrid: false,
    parentKey: 'stadsdeelVolwassen',
  },
  {
    key: 'stadsdeel',
    keyPath: '.components[4].components[4].components[0].stadsdeel',
    label: 'Stadsdeel',
    type: 'select_nijmegen',
    inDataGrid: false,
    parentKey: 'stadsdeelVolwassen',
  },
];