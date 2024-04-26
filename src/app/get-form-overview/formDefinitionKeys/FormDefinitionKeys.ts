
export type KeyTypeLabel = {
  key: string; // Only the key of the object
  keyPath: string; // The entire path to the object
  label?: string; // Optional label property
  type: string; // Type of the form object like textfield, content or html_element
  inDataGrid: boolean; // Indicates if nested in a datagrid
  parentKey?: string;
};
/**
 * Formdefinition ontleden en in bruikbare data indelen
 * Constructor heeft een formdefinition nodig
 * Einddoel is alle relevante formdefinition metadata snel ophalen
 * En alle mogelijke data keys die een formulier heeft bundelen (mogelijke csv headers)
 */
export class FormDefinitionKeys {

  readonly formDefinitionContentDataTypes = [
    'textfield_nijmegen',
    'textfield',
    'textarea',
    'textarea_nijmegen',
    'radio',
    'radio_nijmegen',
    'email',
    'email_nijmegen',
    'checkboxnijmegen',
    'selectboxes_nijmegen',
    'datetime_nijmegen',
    'time_nijmegen',

  ];
  formDefinitionObject: any;
  allKeyTypeLabelObjects: KeyTypeLabel[] = [];

  constructor(formDefinitionObject: any) {
    this.formDefinitionObject = formDefinitionObject;
    this.allKeyTypeLabelObjects = this.extractKeyTypeLabelPairs();
  }
  getAllKeyTypeLabelObjects(): KeyTypeLabel[] {
    return this.allKeyTypeLabelObjects;
  }

  // TODO's
  // 1. Pak alle types die je wel wil zien in een config bestand.
  // Je wil bijvoorbeeld wel textarea_nijmegen, maar niet button als type.
  // 2. Maak de namen beter, zorg voor expects in de testen, betere errorhandling
  // 3. Maak meer testbestanden om te testen
  // 4. Maak mockbestanden van ingevulde formulieren en probeer hier alle relevante data elementen uit te halen
  // Optional: omgaan met wanneer een formdefinition gewijzigd is en of het anders is
  // 5. Dynamodb ophalen van formulieren met naam
  // 6. Dynamodb ophalen van formulieren met naam en daterange
  // 7. OpenAI spec mogelijk voor endpoints?
  // 8. Endpoints voor zaken als formuliernamen
  // 9. S3 ophalen met opeghaalde formulieren uit dynamodb results
  /**
   * Hoe om te gaan met de checkboxes waardes:
   * Op formulier: "aanmeldenVoorSportactiviteitD": { "a": true, "b": true }
   *             Formdefinition
   *    "type": "selectboxes_nijmegen",
   *    "key": "aanmeldenVoorSportactiviteitD",
   *    "values": [
              {
                "label": "Kwiek wandelroute (Park Maldenborgh)",
                "value": "a",
                "shortcut": ""
              },
              {
                "label": "Nationale (diabetes) Challenge (Goffert)",
                "value": "b",
                "shortcut": ""
              }
            ],
   */

  /**
    * Checks the entire form definition object including nested objects and array
    * For each object with a key and type it sets an object in the results array
    * The goal is to extract all form components
    */
  extractKeyTypeLabelPairs(): KeyTypeLabel[] {
    const results: KeyTypeLabel[] = [];
    // TODO: verwijder counter, voor ontwikkelen bedoeld om aantal traverses te bekijken
    let counter = 0;
    let isNestedInDataGrid = false; // Flag to track datagrid nesting because the objects can be the same. In the form it looks like "Nog een toevoegen"
    let parentKey: string | undefined = undefined; // Track the parent container name for the next traverses. Makes it possible to see the form components that are nested. In the form it might look like  "stadsdeelVolwassen": { "stadsdeel": "Nijmegen-Midden & Zuid" } parentkey is stadsDeelVolwassen in this case

    function traverse(obj: any, path = '') {
      // TODO: verwijder counter, voor ontwikkelen bedoeld om aantal traverses te bekijken
      counter++;

      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return; // Skip primitive values
      }

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          if (typeof item === 'object') {
            traverse(item, `${path}[${index}]`);
          }
        });
      } else {
        // Check if key and type properties exist before adding to results
        if (obj?.key && obj?.type) {
          const key = obj.key; // Extract the key
          const keyPath = `${path}.${key}`; // Construct the keyPath

          results.push({
            key,
            keyPath,
            label: obj.label || '',
            type: obj.type,
            inDataGrid: isNestedInDataGrid, // Set inDataGrid flag
            parentKey: parentKey,
          });
        }

        // Traverse nested objects using a loop for generic handling
        for (const key in obj) {
          if (typeof obj[key] === 'object') {
            // Set isNestedInDataGrid flag if entering a datagrid
            if (obj.type === 'datagrid') {
              isNestedInDataGrid = true;
            }
            // Containers without the name container have used properties
            if (obj.type === 'container' && obj.key !== 'container') {
              parentKey = !!parentKey ? `${parentKey}.${obj.key}` : obj.key;
            }

            traverse(obj[key], `${path}.${key}`);

            // Reset isNestedInDataGrid flag if exiting a datagrid
            if (obj.type === 'datagrid') {
              isNestedInDataGrid = false;
            }
            if (obj.type === 'container' && obj.key !== 'container') {
              parentKey = undefined;
            }
          }
        }
      }
    }

    traverse(this.formDefinitionObject);
    console.log('Traverse counter: ', counter);
    return results;
  }
}