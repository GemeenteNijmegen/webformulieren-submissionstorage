import { ParsedFormDefinition } from '../formDefinition/FormDefinitionParser';

/**
 * Takes data from a parsed Form Definition and processes one or multiple forms to structure its data
 * The result is an object that can easily be converted to a csv, but also returned just as an object to display on an html page for example
 * Might have to make the name more specific
 */
export class FormParser {
  constructor(parsedFormDefinition: ParsedFormDefinition) {
    console.log('Parse forms with name: ', parsedFormDefinition.name);
  }
}