/**
 * Submissions have a 'timestamp' value of form [2024, 2, 1, 12, 14, 22, 123456]
 * This function creates a javascript Date object out of an array of that form.
 *
 * @param inputArray number[]
 * @returns `Date` converted date
 */
export function dateArrayToDate(inputArray: number[]): Date {
  let dateArray: [number, number, number, number, number, number];
  if (inputArray.length == 7) {
    // Slice last element, unnecessary (sub-second precision is not required)
    dateArray = inputArray.slice(0, -1) as [number, number, number, number, number, number];
  } else {
    throw Error('timestamp array expected to be 7 elements long');
  }
  // second element is month. Javascript expects a monthindex, 0-11, instead of 1-12. Modify
  dateArray[1] = dateArray[1] - 1;
  // Convert to timestamp (UTC) and then pass that timestamp to Date constructor
  return new Date(Date.UTC(...dateArray));
}
