import { getSubObjectsWithKey } from '../getSubObjectsWithKey';
import * as snsSample from './samples/sns.sample.json';
const messages = snsSample.Records.map(record => record.Sns);
const message = JSON.parse(messages.pop()!.Message);

test('Find subobjects with `bucketName` keys', async () => {
  const results = getSubObjectsWithKey(message.data, 'bucketName');
  console.debug(results);
  expect(results).toHaveLength(2);
});

test('Find subobjects with nonexistent keys', async () => {
  const results = getSubObjectsWithKey(message.data, 'thisKeyDoesNotExist');
  console.debug(results);
  expect(results).toHaveLength(0);
});
