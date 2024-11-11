import * as crypto from 'crypto';
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Storage } from '@gemeentenijmegen/utils';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait } from 'testcontainers';
import * as submissionSampleAnonymous from './migration-2024-11-06/sample-submission-anonymous.json';
import * as submissionSampleKvk from './migration-2024-11-06/sample-submission-kvk.json';
import { DynamoDBDatabase } from '../../app/submission/Database';
import * as snsSample from '../../app/submission/test/samples/sns.sample.json';
import { describeIntegration } from '../../app/test-utils/describeIntegration';
import { Migration, handler } from '../migration-2024-11-06-fix-kvk.lambda';


const getObjectMock = (file:any) => ({
  Body: {
    // Stringify the file to simulate the AWS getObject response
    transformToString: () => Promise.resolve(JSON.stringify(file)),
  },
});

jest.mock('@gemeentenijmegen/utils', () => {
  return {
    S3Storage: jest.fn(() => {
      return {
        getBatch: async (params: string[]) => {
          console.debug('key', params);
          let returnObjects = [];
          for (const key of params) {
            if (key.includes('TDL17.100/submission')) {
              returnObjects.push(getObjectMock(submissionSampleKvk.Records[0].Sns));
            } else if (key.includes('TDL17.101/submission')) {
              returnObjects.push(getObjectMock(submissionSampleAnonymous.Records[0].Sns));
            } else {
              returnObjects.push(getObjectMock(snsSample.Records[0].Sns));
            }
          }
          console.debug('returnObjects', returnObjects);
          return returnObjects;
        },
      };
    }),
  };
});

test('Migration tests temporarily disabled', () => {
  console.warn('Migration tests temporarily disabled due to testcontainers localstack giving wrap ansi module errors');
});
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
  const database = new DynamoDBDatabase(tableName, { dynamoDBClient });
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
    await prefillDatabase(database, 1, 1);
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
    await prefillDatabase(database, 10, 10);
    const migration = new Migration(dynamoDBClient, tableName, storage);
    const result = await migration.run(50, false);
    expect(result).toBeTruthy();
  }, 240000);

  test('can get new attributes for updated item after update', async() => {
    await new Migration(dynamoDBClient, tableName, storage).run(50, false);
    const command = getItemCommand(tableName, 'TDL17.957');
    const results = await dynamoDBClient.send(command);
    const newItemcommand = getNewPersonItemCommand(tableName, 'TDL17.957');
    const resultsNew = await dynamoDBClient.send(newItemcommand);
    const newItemcommandKvk = getNewOrgItemCommand(tableName, 'TDL17.100');
    const resultsNewKvk = await dynamoDBClient.send(newItemcommandKvk);
    const newAnonItemcommand = getNewItemCommandAnon(tableName, 'TDL17.101');
    const resultsAnonNew = await dynamoDBClient.send(newAnonItemcommand);

    console.debug('all results', resultsAnonNew, resultsNew, resultsNewKvk);

    expect(results).toHaveProperty('Item.migrated20241106');
    expect(resultsNew).toHaveProperty('Item.migrated20241106');
    expect(resultsNew?.Item?.pk?.S).toMatch('PERSON#');
    expect(resultsNewKvk?.Item?.pk?.S).toMatch('ORG#');
    expect(resultsAnonNew?.Item?.pk?.S).toMatch('ANONYMOUS');
  });

  test('dryrun does not actually update', async() => {
    await new Migration(dynamoDBClient, tableName, storage).run(50, true);
    const command = getItemCommand(tableName, 'TDL17.957');
    expect(await dynamoDBClient.send(command)).not.toHaveProperty('Item.migrated20241106');
  });

  test('Running migration twice should result in same table', async() => {
    const consoleSpy = jest.spyOn(console, 'info');
    await new Migration(dynamoDBClient, tableName, storage).run(50, false);
    expect(consoleSpy).toHaveBeenCalledWith('Updating 3 items in dynamoDB');
    const command = getItemCommand(tableName, 'TDL17.957');
    expect(await dynamoDBClient.send(command)).toHaveProperty('Item.migrated20241106');
    await new Migration(dynamoDBClient, tableName, storage).run(50, false);
    expect(consoleSpy).toHaveBeenCalledWith('Processed 0 items');
    const secondCommand = getItemCommand(tableName, 'TDL17.957');
    expect(await dynamoDBClient.send(secondCommand)).toHaveProperty('Item.migrated20241106');
  });
});

function getItemCommand(tableName: string, itemKey: string) {
  return new GetItemCommand({
    Key: {
      pk: { S: 'USER#n1oy6f+PijuPsy/rXsBGkdKsaaj/WFSBP2sp/7ngmdU=' },
      sk: { S: itemKey },
    },
    TableName: tableName,
  });
}

function getNewPersonItemCommand(tableName: string, itemKey: string) {
  return new GetItemCommand({
    Key: {
      pk: { S: 'PERSON#n1oy6f+PijuPsy/rXsBGkdKsaaj/WFSBP2sp/7ngmdU=' },
      sk: { S: itemKey },
    },
    TableName: tableName,
  });
}

function getNewOrgItemCommand(tableName: string, itemKey: string) {
  return new GetItemCommand({
    Key: {
      pk: { S: 'ORG#MjPEjzEVmwGK5q0SRRG5SpvAHb6GbLhuIiqeoj5WMD4=' },
      sk: { S: itemKey },
    },
    TableName: tableName,
  });
}

function getNewItemCommandAnon(tableName: string, itemKey: string) {
  return new GetItemCommand({
    Key: {
      pk: { S: 'ANONYMOUS' },
      sk: { S: itemKey },
    },
    TableName: tableName,
  });
}

// Be able to fill up the db with enough data to have the scan be paginated (1MB per page)
async function prefillDatabase(database: DynamoDBDatabase, _items: number, startAt?: number) {
  startAt = startAt ?? 0;
  // for (let index = startAt; index < items + startAt; index++) {
  //   await database.storeSubmission({
  //     key: `TDL17.${index}`,
  //     pdf: generateRandomString(10),
  //     userId: '900026236',
  //   });
  //   console.debug('stored ', index);
  // }

  await database.storeSubmission({
    key: 'TDL17.100',
    pdf: generateRandomString(1000),
    userId: '69599084',
    userType: 'organisation',
  });

  await database.storeSubmission({
    key: 'TDL17.101',
    pdf: generateRandomString(1000),
    userId: 'anonymous',
    userType: 'anonymous',
  });

  await database.storeSubmission({
    key: 'TDL17.957',
    pdf: generateRandomString(1000),
    userId: '900026236',
    userType: 'person',
  });
}

/** Create arbitrary strings, useful for filling up dynamodb */
function generateRandomString(length: number) {
  return crypto.randomBytes(length).toString('hex');
}
