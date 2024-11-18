import { CreateTableCommand, DeleteTableCommand, DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Storage } from '@gemeentenijmegen/utils';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait } from 'testcontainers';
import { describeIntegration } from '../../app/test-utils/describeIntegration';
import { Migration, handler } from '../migration-2024-11-18-add-userType.lambda';


describeIntegration('Dynamodb migration test', () => {
  const composeFilePath = '/Users/joostvanderborg/Developer/webformulieren-submissionstorage/src/app/submission/test/';
  const composeFile = 'docker-compose-dynamodb.yml';
  let environment: StartedDockerComposeEnvironment;

  const dynamoDBClient = new DynamoDBClient({
    endpoint: 'http://localhost:8000',
    credentials: {
      accessKeyId: 'dummy',
      secretAccessKey: 'dummy',
    },
  });

  const tableName = 'submissions-local';
  const storage = new S3Storage('dummybucket');

  beforeAll(async() => {
    if (!process.env.DEBUG) {
      console.debug = jest.fn();
    }

    environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
      .withWaitStrategy('dynamodb-local', Wait.forLogMessage('CorsParams: null'))
      .up();
  }, 60000); // long timeout, can start docker image

  afterAll(async() => {
    console.debug('bringing environment down');
    await environment.down({ timeout: 10000 });
  });

  beforeEach( async () => {
    const command = new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [
        {
          AttributeName: 'pk',
          AttributeType: 'S',
        }, {
          AttributeName: 'sk',
          AttributeType: 'S',
        },
      ],
      KeySchema: [
        {
          AttributeName: 'pk',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'sk',
          KeyType: 'RANGE',
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    });

    await dynamoDBClient.send(command);
    await prefillDatabase(dynamoDBClient, tableName);
  });

  afterEach(async () => {
    const command = new DeleteTableCommand({
      TableName: tableName,
    });

    console.debug('removing table');
    await dynamoDBClient.send(command);
  });

  test('handler returns', async() => {
    process.env = {
      ...process.env,
      TABLE_NAME: 'dummytable',
      BUCKET_NAME: 'dummybucket',
    };
    expect(handler({ runlive: 'true' })).toBeTruthy();
  });

  test('can create migration', async() => {
    expect(new Migration(dynamoDBClient, tableName, storage)).toBeTruthy();
  });

  test('can perform update', async() => {
    await prefillDatabase(dynamoDBClient, tableName);
    const migration = new Migration(dynamoDBClient, tableName, storage);
    const result = await migration.run(50, false);
    expect(result).toBeTruthy();
  }, 240000);

  test('can get new attributes for updated item after update', async() => {
    const preMigrationCommand = getItemCommand(tableName, 'PERSON#testshouldupdate', 'TDL12.348');
    const preMigrationResults = await dynamoDBClient.send(preMigrationCommand);
    expect(preMigrationResults).not.toHaveProperty('Item.migrated20241106');
    expect(preMigrationResults).not.toHaveProperty('Item.userType');

    await new Migration(dynamoDBClient, tableName, storage).run(50, false);
    const command = getItemCommand(tableName, 'PERSON#testshouldupdate', 'TDL12.348');
    const results = await dynamoDBClient.send(command);
    
    expect(results).toHaveProperty('Item.migrated20241106');
    expect(results).toHaveProperty('Item.userType');
  });

  test('can get new attributes for updated items (org, person) after update', async() => {
    await new Migration(dynamoDBClient, tableName, storage).run(50, false);
    const personCommand = getItemCommand(tableName, 'PERSON#testshouldupdate', 'TDL12.348');
    const personResults = await dynamoDBClient.send(personCommand);
    expect(personResults?.Item?.userType?.S).toBe('person');
    
    const orgCommand = getItemCommand(tableName, 'ORG#test', 'TDL12.346');
    const orgResults = await dynamoDBClient.send(orgCommand);
    
    expect(orgResults).toHaveProperty('Item.migrated20241106');
    expect(orgResults?.Item?.userType?.S).toBe('organisation');

    const anonCommand = getItemCommand(tableName, 'ANONYMOUS#test', 'TDL12.347');
    const anonResults = await dynamoDBClient.send(anonCommand);
    
    expect(anonResults).toHaveProperty('Item.migrated20241106');
    expect(anonResults?.Item?.userType?.S).toBe('anonymous');
  });


  test('correct item wont update', async() => {
    const consoleSpy = jest.spyOn(console, 'info');
    await new Migration(dynamoDBClient, tableName, storage).run(50, false);
      expect(consoleSpy).not.toHaveBeenCalledWith('TDL12.345');
  });

  // test('dryrun does not actually update', async() => {
  //   await new Migration(dynamoDBClient, tableName, storage).run(50, true);
  //   const command = getItemCommand(tableName, 'TDL17.957');
  //   expect(await dynamoDBClient.send(command)).not.toHaveProperty('Item.migrated20241106');
  // });

  // test('Running migration twice should result in same table', async() => {
  //   const consoleSpy = jest.spyOn(console, 'info');
  //   await new Migration(dynamoDBClient, tableName, storage).run(50, false);
  //   expect(consoleSpy).toHaveBeenCalledWith('Updating 3 items in dynamoDB');
  //   const command = getItemCommand(tableName, 'TDL17.957');
  //   expect(await dynamoDBClient.send(command)).toHaveProperty('Item.migrated20241106');
  //   await new Migration(dynamoDBClient, tableName, storage).run(50, false);
  //   expect(consoleSpy).toHaveBeenCalledWith('Processed 0 items');
  //   const secondCommand = getItemCommand(tableName, 'TDL17.957');
  //   expect(await dynamoDBClient.send(secondCommand)).toHaveProperty('Item.migrated20241106');
  // });
});

function getItemCommand(tableName: string, pk: string, itemKey: string) {
  return new GetItemCommand({
    Key: {
      pk: { S: pk },
      sk: { S: itemKey },
    },
    TableName: tableName,
  });
}

function storeItem(tableName: string, pk: string, sk: string, additionalInfo?: any) {
  return new PutItemCommand({
    Item: {
      pk: { S: pk },
      sk: { S: sk },
      ...additionalInfo,
    },
    TableName: tableName,

  });

}

// Be able to fill up the db with enough data to have the scan be paginated (1MB per page)
async function prefillDatabase(dynamoDBClient: DynamoDBClient, tableName: string) {
  await dynamoDBClient.send(storeItem(tableName, 'PERSON#shouldntupdate', 'TDL12.345', {
      userType: { S: 'person' }
    }
  ));
  await dynamoDBClient.send(storeItem(tableName, 'ORG#test', 'TDL12.346'));
  await dynamoDBClient.send(storeItem(tableName, 'ANONYMOUS#test', 'TDL12.347'));
  await dynamoDBClient.send(storeItem(tableName, 'PERSON#testshouldupdate', 'TDL12.348'));
  await dynamoDBClient.send(storeItem(tableName, 'NONSENSE#testshouldupdate', 'NOTVALID'));

}
