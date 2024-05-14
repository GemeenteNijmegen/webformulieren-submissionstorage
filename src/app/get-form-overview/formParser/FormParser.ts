import { ParsedFormDefinition } from '../formDefinition/FormDefinitionParser';

/**
 * Takes data from a parsed Form Definition and processes one or multiple forms to structure its data
 * The result is an object that can easily be converted to a csv, but also returned just as an object to display on an html page for example
 * Might have to make the name more specific
 */
export class FormParser {
  parsedFormDefinition: ParsedFormDefinition;
  private headerArray: string[] = ['Formuliernaam', 'DatumTijdOntvangen', 'Kenmerk'];

  constructor(parsedFormDefinition: ParsedFormDefinition) {
    console.log('Parse forms with name: ', parsedFormDefinition.name);
    this.parsedFormDefinition = parsedFormDefinition;
    this.setFormDefinitionHeaders();
    //TODO: standaardvelden ophalen          Message.formTypeId, Message.Data.Timestamp, Message.reference,
    //TODO: ophalen velden met formDefinition en leeg laten als het veld er niet is
    //TODO: hoe om te gaan met values van checkboxes a en b
  }

  setFormDefinitionHeaders(): void {
    const allLabels: string[] = this.parsedFormDefinition.includedFormDefinitionComponents?.map(component => component.label)
      .filter((label): label is string => label !== undefined) ?? [];
    this.parsedFormDefinition.includedFormDefinitionComponents.forEach((component) => {
      let header = '';
      // Check if the component has a label and if that label is unique in the components. Otherwise you get double headers, which gets confusing.
      if (component.label && allLabels.indexOf(component.label) === allLabels.lastIndexOf(component.label)) {
        header = component.label;
      } else {
        header = component.label ? `${component.label} ${component.key}` : component.key;
      }
      // Check if headerArray already has this header. Only add when unique
      if (this.headerArray.includes(header)) {
        console.debug(`[FormParser ${this.parsedFormDefinition.name}] Did not push ${header} to headerArray, because it already exists.`);
      } else {
        this.headerArray.push(header);
      }
    });
  }
  getHeaders(): string[] {
    return this.headerArray;
  }
}