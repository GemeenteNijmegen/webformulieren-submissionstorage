/**
 *
 * @param object The object to be searched
 * @param searchKey a string, any subobject containing this key will be returned
 *
 * @returns an array of (sub)objects containing a key-value pair with the `searchKey`
 */

export function getSubObjectsWithKey(object: any, searchKey: string): any;
export function getSubObjectsWithKey(object: any, searchKey: string, results: any[]): any;
export function getSubObjectsWithKey(object: any, searchKey: string, results: any[] = []): any {
  for (let key in object) {
    if (typeof object[key] == 'object') {
      results = getSubObjectsWithKey(object[key], searchKey, results);
    }
    if (key == searchKey) {
      results.push(object);
    }
  }
  return results;
}
