import * as crypto from 'crypto';
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
// import { S3Client } from '@aws-sdk/client-s3';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait } from 'testcontainers';
import { Migration } from './migration-2024-02-06-enrich-table.lambda';
import { DynamoDBDatabase } from '../app/submission/Database';
import { S3Storage } from '../app/submission/Storage';
import * as snsSample from '../app/submission/test/samples/sns.sample.json';
import { describeIntegration } from '../app/test-utils/describeIntegration';


const getObjectMock = (file:any) => ({
  Body: {
    // Stringify the file to simulate the AWS getObject response
    transformToString: () => Promise.resolve(JSON.stringify(file)),
  },
});

jest.mock('../app/submission/Storage', () => {
  return {
    S3Storage: jest.fn(() => {
      return {
        getBatch: async () => {
          return [getObjectMock(snsSample.Records[0].Sns)];
        },
      };
    }),
  };
});


describeIntegration('Dynamodb migration test', () => {
  const composeFilePath = '/Users/joostvanderborg/Developer/webformulieren-submissionstorage/src/app/submission/test/';
  const composeFile = 'docker-compose.yml';
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

    console.debug(await dynamoDBClient.send(command));
    await prefillDatabase(database, 1000);
  }, 60000); // long timeout, can start docker image
  afterAll(async() => {
    const command = new DeleteTableCommand({
      TableName: tableName,
    });

    const response = await dynamoDBClient.send(command);
    console.debug(response);
    console.debug('bringing environment down');
    await environment.down({ timeout: 10000 });
  });

  test('can create migration', async() => {
    expect(new Migration(dynamoDBClient, tableName, storage)).toBeTruthy();
  });

  test('can perform update', async() => {
    const migration = new Migration(dynamoDBClient, tableName, storage);
    await expect(migration.run()).resolves.not.toThrow();
  });

  test('can get dateSubmitted for updated item after update', async() => {
    const command = getItemCommand(tableName, 'TDL17.957');
    expect(await dynamoDBClient.send(command)).toHaveProperty('Item.dateSubmitted');
  });

  test('item without S3 item shouldnt have been updated but still exist', async() => {
    const command = getItemCommand(tableName, 'TDL17.1');
    expect(await dynamoDBClient.send(command)).toHaveProperty('Item.pdfKey');
    expect(await dynamoDBClient.send(command)).not.toHaveProperty('Item.dateSubmitted');
  });
});

function getItemCommand(tableName: string, itemKey: string) {
  return new GetItemCommand({
    Key: {
      pk: { S: 'USER#L835xGBbKWV6fKX226xP3/X3vU/JanfcDFutJXfyvB4=' },
      sk: { S: itemKey },
    },
    TableName: tableName,
  });
}

// Be able to fill up the db with enough data to have the scan be paginated (1MB per page)
async function prefillDatabase(database: DynamoDBDatabase, items: number) {
  for (let index = 0; index < items; index++) {
    await database.storeSubmission({
      key: `TDL17.${index}`,
      pdf: generateRandomString(1000),
      userId: '900222670',
    });
  }

  await database.storeSubmission({
    key: 'TDL17.957',
    pdf: generateRandomString(1000),
    userId: '900222670',
  });
}

/** Create arbitrary strings, useful for filling up dynamodb */
function generateRandomString(length: number) {
  return crypto.randomBytes(length).toString('hex');
}
