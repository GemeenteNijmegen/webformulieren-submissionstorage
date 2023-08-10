import { FormIoFormConnector, MockFormConnector } from '../FormConnector';

describe('Form definition', () => {
  test('Creating a new formdefinition object', async () => {
    expect(new MockFormConnector()).toBeTruthy();
  });

  test('Retrieving a form definition return json file', async () => {
    const formDefinition = new MockFormConnector();
    expect(await formDefinition.definition('someForm')).toHaveProperty('title');
  });


  test('Retrieving a live form definition return json file', async () => {
    if (!process.env.FORMIO_API_KEY || !process.env.FORMIO_BASE_URL) {
      console.debug('Not performing live test, no api key or base url set');
      return;
    }
    const formDefinition = new FormIoFormConnector(new URL(process.env.FORMIO_BASE_URL), process.env.FORMIO_API_KEY);
    const form = await formDefinition.definition('subsidieaanvragen');
    expect(form).toHaveProperty('title');
    console.debug(form);
  });
});
