import { FormDefinitionComponents, ParsedFormDefinition } from '../formDefinition/FormDefinitionParser';

/**
 * Takes data from a parsed Form Definition and processes one or multiple forms to structure its data
 * The result is an object that can easily be converted to a csv, but also returned just as an object to display on an html page for example
 * Might have to make the name more specific
 */
export class FormParser {
  parsedFormDefinition: ParsedFormDefinition;
  private headerArray: string[] = ['Formuliernaam', 'DatumTijdOntvangen', 'Kenmerk'];

  constructor(parsedFormDefinition: ParsedFormDefinition) {
    this.parsedFormDefinition = parsedFormDefinition;
    this.setFormDefinitionHeaders();
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

  /**
   * @param formBody string containing the body of a form. Can be obtained from a S3File with await bucketObject.Body.transformToString();
   * Maybe refactor to receiving the  GetObjectCommandOutput.Body or both
   * In doubt about making it async, can be done later on.
   */
  parseForm(formBody: string): string[] {
    const parsedForm = [];
    try {
      // Body contains metadata and the message with specific form data that still has to be parsed to JSON
      const jsonBody = JSON.parse(formBody);
      const jsonMessage = JSON.parse(jsonBody.Message);
      parsedForm.push(
        jsonMessage.formTypeId,
        jsonBody.Timestamp,
        jsonMessage.reference);
      parsedForm.push(...this.parseMessage(jsonMessage));
    } catch {
      console.debug(`[FormParser ${this.parsedFormDefinition.name}] JSON parse failed`);
    }
    return parsedForm;
  }
  private parseMessage(jsonMessage: any): string[] {
    const parsedMessage: string[] = [];
    // Check each component in the parsedFormDefinition and add a value from the form if it is in the JSONbody
    this.parsedFormDefinition.includedFormDefinitionComponents.forEach((component) => {
      let value: any = '';

      // Does the component have a parent key and is the parentKey present in the form data being parsed?
      if (component.parentKey && jsonMessage.data[`${component.parentKey}`]) {
        value = jsonMessage.data[`${component.parentKey}`][`${component.key}`] ?? '';
      } else {
        value = jsonMessage.data[`${component.key}`] ?? '';
      }

      value = this.processNonStandardValueToString(value, component);
      parsedMessage.push(value);
    });
    return parsedMessage;
  }


  private processNonStandardValueToString(value: any, component: FormDefinitionComponents): string {
    // Radio button are strings and have to be checked first
    if (component.type === 'radio_nijmegen' || component.type === 'radio' && component.values) {
      const radioValue = component.values?.find((radioObject) => {
        return radioObject.value === value;
      });

      return radioValue?.label ? radioValue.label : value;
    }

    // If the value is a string it can be returned immediately
    {if (typeof value == 'string') return value;}


    // Convert booleans to string
    if (typeof value === 'boolean') {
      return value.toString();
    }


    // Process select_boxes that have object values
    if (typeof value === 'object' && component.type === 'selectboxes_nijmegen') {
      let selectBoxStringValue = '';
      component.values?.forEach((v: { label: string; value: string; shortcut?: string}) => {
        // Check each checkbox value and add to the string
        // value example { "a": true, "b": true } --> from submitted form
        // Form Definition component has values which maps the answer values to labels
        const processedValue = value[`${v.value}`];
        selectBoxStringValue += `Checkbox ${v.label} is ${processedValue.toString()}. `;
      });
      return selectBoxStringValue.trim();
    }

    return `Unable to process non-string value for ${component.key} ${component.parentKey}`;
  }
}