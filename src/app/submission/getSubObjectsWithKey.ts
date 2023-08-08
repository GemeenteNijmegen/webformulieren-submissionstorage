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
