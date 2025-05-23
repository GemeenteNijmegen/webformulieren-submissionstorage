import { includedFormDataTypes } from './IncludedFormDefinitionTypes';


export type FormDefinitionComponents = {
  key: string; // Only the key of the object
  keyPath: string; // The entire path to the object
  label?: string; // Optional label property
  type: string; // Type of the form object like textfield, content or html_element
  inDataGrid: boolean; // Indicates if nested in a datagrid
  parentKey?: string;
  values?: { value: string; label: string; shortcut?: string }[]; // Some components have values objects that map the value options to labels
};

/**
 * This interface defines the structure of a parsed form definition object.
 */
export interface ParsedFormDefinition {
  /**
   * The unique name of the form definition.
   */
  name: string;

  /**
   * The title or display name of the form definition.
   */
  title: string;

  /**
   * The date and time the form definition was created (typically a string representation).
   */
  created: string;

  /**
   * The date and time the form definition was last modified (typically a string representation).
   */
  modified: string;

  /**
   * An array of `FormDefinitionComponents` objects that define the components included in the form.
   */
  includedFormDefinitionComponents: FormDefinitionComponents[];
}
/**
 * This class parses a form definition object and extracts relevant information
 * for further processing. It provides methods to access both the parsed
 * form components and the overall form metadata.
 */
export class FormDefinitionParser {

  /**
   * The raw form definition object provided to the constructor.
   */
  private formDefinitionObject: any;

  /**
  * An array containing all parsed form components with details about
  * their key, key path, label, type, nesting within datagrids, and parent key.
  */
  private allParsedFormDefinitionComponents: FormDefinitionComponents[] = [];

  /**
  * Extracted metadata from the form definition, including form name, title,
  * creation date, and modification date.
  */
  private formName: string = '';
  private formTitle: string = '';
  private createdDate: string = '';
  private modifiedDate: string = '';

  /**
  * Creates a new FormDefinitionParser instance with the provided form definition object.
  * @param {any} formDefinitionObject - The form definition object to be parsed.
  */
  constructor(formDefinitionObject: any) {
    this.setFormDefinitionObject(formDefinitionObject);
    this.setFormMetaData();
    this.allParsedFormDefinitionComponents = this.extractFormDefinitionComponents();
  }

  /**
   * Returns all parsed form components as an array of objects.
   * @returns {FormDefinitionComponents[]} - An array containing information about all form components.
   */
  getAllFormDefinitionComponents(): FormDefinitionComponents[] {
    return this.allParsedFormDefinitionComponents;
  }
  getIncludedFormDefinitionComponents(): FormDefinitionComponents[] {
    return this.allParsedFormDefinitionComponents.filter(component => {
      return includedFormDataTypes.includes(component.type);
    },
    );
  }
  getParsedFormDefinition(): ParsedFormDefinition {
    const included = this.getIncludedFormDefinitionComponents();
    return {
      name: this.formName,
      title: this.formTitle,
      created: this.createdDate,
      modified: this.modifiedDate,
      includedFormDefinitionComponents: included,
    };
  }
  /**
 * Check if form definition is not undefined or not json
 */
  setFormDefinitionObject(formDefinitionObject: any): void {
    if (!formDefinitionObject) {
      throw new Error('FormDefinitionParser creation failed. FormDefinition in constructor undefined.');
    };
    if (!formDefinitionObject.components || !formDefinitionObject.components.length) {
      throw new Error('FormDefinitionParser creation failed. No components present in form definition to process.');
    }
    this.formDefinitionObject = formDefinitionObject;
  }
  /**
   * Validates the presence of required metadata keys in the form definition object
   * and throws an error if any are missing.
   */
  setFormMetaData() {
    const REQUIRED_METADATA_KEYS = ['name', 'title', 'created', 'modified'];

    const missingKeys = REQUIRED_METADATA_KEYS.filter(
      key => !this.formDefinitionObject.hasOwnProperty(key) || this.formDefinitionObject[key] === undefined,
    );
    if (missingKeys.length > 0) {
      throw new Error(
        `Parsing Form Definition failed. Missing required metadata keys: ${missingKeys.join(', ')}`,
      );
    }
    const { name, title, created, modified } = this.formDefinitionObject;

    this.formName = name;
    this.formTitle = title;
    this.createdDate = created;
    this.modifiedDate = modified;
  };


  /**
   * A getter for all extracted metadata as a single object.
   * @returns {{formName: string, formTitle: string, createdDate: string, modifiedDate: string}} - An object containing all form metadata.
   */
  get allMetadata(): { formName: string; formTitle: string; createdDate: string; modifiedDate: string } {
    return {
      formName: this.formName,
      formTitle: this.formTitle,
      createdDate: this.createdDate,
      modifiedDate: this.modifiedDate,
    };
  }

  /**
    * Checks the entire form definition object including nested objects and arrays
    * For each object with a key and type it sets an object in the results array
    * The goal is to extract all form components
    */
  extractFormDefinitionComponents(): FormDefinitionComponents[] {
    const results: FormDefinitionComponents[] = [];
    let isNestedInDataGrid = false; // Flag to track datagrid nesting because the objects can be the same. In the form it looks like "Nog een toevoegen"
    let parentKey: string | undefined = undefined; // Track the parent container name for the next traverses. Makes it possible to see the form components that are nested. In the form it might look like  "stadsdeelVolwassen": { "stadsdeel": "Nijmegen-Midden & Zuid" } parentkey is stadsDeelVolwassen in this case
    function traverse(definitionObject: any, path = '') {
      if (typeof definitionObject === 'string' || typeof definitionObject === 'number' || typeof definitionObject === 'boolean') {
        return; // Skip primitive values
      }

      if (Array.isArray(definitionObject)) {
        definitionObject.forEach((item, index) => {
          if (typeof item === 'object') {
            traverse(item, `${path}[${index}]`);
          }
        });
      } else {
        // Check if key and type properties exist before adding to results
        if (definitionObject?.key && definitionObject?.type) {
          const key = definitionObject.key; // Extract the key
          const keyPath = `${path}.${key}`; // Construct the keyPath

          results.push({
            key,
            keyPath,
            label: definitionObject.label || '',
            type: definitionObject.type,
            inDataGrid: isNestedInDataGrid, // Set inDataGrid flag
            parentKey: parentKey,
            values: definitionObject.values,
          });
        }

        // Traverse nested objects using a loop for generic handling
        for (const childKey in definitionObject) {
          // Traverse the childobject if it is an object
          if (typeof definitionObject[childKey] === 'object') {

            // Set isNestedInDataGrid flag if entering a datagrid
            if (definitionObject.type === 'datagrid') {
              isNestedInDataGrid = true;
            }
            // Container types without the key(name) container have properties that are included in forms nested in the parent
            if (definitionObject.type === 'container' && definitionObject.key !== 'container') {
              parentKey = !!parentKey ? `${parentKey}.${definitionObject.key}` : definitionObject.key;
            }

            // Process child object
            traverse(definitionObject[childKey], `${path}.${childKey}`);

            // Reset isNestedInDataGrid flag if exiting the childobject of a datagrid type
            if (definitionObject.type === 'datagrid') {
              isNestedInDataGrid = false;
            }
            // Reset parentkey if exiting the child object of a container without key(name) container
            if (definitionObject.type === 'container' && definitionObject.key !== 'container') {
              parentKey = undefined;
            }
          }
        }
      }
    }

    traverse(this.formDefinitionObject.components);
    return results;
  }
}