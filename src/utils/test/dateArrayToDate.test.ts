import { dateArrayToDate } from '../dateArrayToDate';

describe('Passing an array of numbers', () => {
  test('Returns a date if the array is valid', async () => {
    const dateArray = [2024, 2, 1, 13, 19, 4, 11811229];
    expect(dateArrayToDate(dateArray).toISOString()).toBe('2024-02-01T13:19:04.000Z');
  });

  test('Throws if the array is too short', async () => {
    const dateArray = [2024, 2, 1, 13, 19, 4];
    expect(() => { dateArrayToDate(dateArray); }).toThrow();
  });


  test('Throws if the array does not contain numbers', async () => {
    const dateArray = [2024, 1, 'test', 13, 19, 4];
    //@ts-ignore so we can test this;
    expect(() => { dateArrayToDate(dateArray); }).toThrow();
  });

  test('Passing a date in January works', async () => {
    const dateArray = [2024, 1, 1, 0, 0, 0, 0];
    expect(dateArrayToDate(dateArray).toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  test('Passing a date in December works', async () => {
    const dateArray = [2024, 12, 31, 0, 0, 0, 0];
    expect(dateArrayToDate(dateArray).toISOString()).toBe('2024-12-31T00:00:00.000Z');
  });

  test('Passing a feb 29 in a year it exists works', async () => {
    const dateArray = [2024, 2, 29, 0, 0, 0, 0];
    expect(dateArrayToDate(dateArray).toISOString()).toBe('2024-02-29T00:00:00.000Z');
  });

  test('Passing a feb 29 in a year it does not exist returns march 1st', async () => {
    const dateArray = [2025, 2, 29, 0, 0, 0, 0];
    expect(dateArrayToDate(dateArray).toISOString()).toBe('2025-03-01T00:00:00.000Z');
  });
});
