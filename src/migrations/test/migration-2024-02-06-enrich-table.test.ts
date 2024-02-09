import * as crypto from 'crypto';
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
// import { S3Client } from '@aws-sdk/client-s3';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait } from 'testcontainers';
import * as formDefinitionSample from './sample-formdefinition.json';
import * as submissionSampleNoTimestamp from './sample-submission-no-timestamp.json';
import { DynamoDBDatabase } from '../../app/submission/Database';
import { S3Storage } from '../../app/submission/Storage';
import * as snsSample from '../../app/submission/test/samples/sns.sample.json';
import { describeIntegration } from '../../app/test-utils/describeIntegration';
import { Migration, handler } from '../migration-2024-02-06-enrich-table.lambda';


const getObjectMock = (file:any) => ({
  Body: {
    // Stringify the file to simulate the AWS getObject response
    transformToString: () => Promise.resolve(JSON.stringify(file)),
  },
});

jest.mock('../../app/submission/Storage', () => {
  return {
    S3Storage: jest.fn(() => {
      return {
        getBatch: async (params: string[]) => {
          let returnObjects = [];
          for (const key of params) {
            if (key.includes('TDL17.1/submission')) {
              returnObjects.push(getObjectMock(submissionSampleNoTimestamp));
            } else if (key.includes('submission')) {
              returnObjects.push(getObjectMock(snsSample.Records[0].Sns));
            }
            if (key.includes('formdefinition')) {returnObjects.push(getObjectMock(formDefinitionSample)); }
          }
          return returnObjects;
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
    await prefillDatabase(database, 10);
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
    await prefillDatabase(database, 20000, 2000);
    const migration = new Migration(dynamoDBClient, tableName, storage);
    const result = await migration.run(50, false);
    expect(result).toBeTruthy();
  }, 240000);

  test('can get new attributes for updated item after update', async() => {
    await new Migration(dynamoDBClient, tableName, storage).run(50, false);
    const command = getItemCommand(tableName, 'TDL17.957');
    expect(await dynamoDBClient.send(command)).toHaveProperty('Item.dateSubmitted');
    expect(await dynamoDBClient.send(command)).toHaveProperty('Item.formTitle');
  });

  test('dryrun does not actually update', async() => {
    await new Migration(dynamoDBClient, tableName, storage).run(50, true);
    const command = getItemCommand(tableName, 'TDL17.957');
    expect(await dynamoDBClient.send(command)).not.toHaveProperty('Item.dateSubmitted');
    expect(await dynamoDBClient.send(command)).not.toHaveProperty('Item.formTitle');
  });

  test('item without S3 item shouldnt have been updated but still exist', async() => {
    await new Migration(dynamoDBClient, tableName, storage).run(50, false);
    const command = getItemCommand(tableName, 'TDL17.2');
    expect(await dynamoDBClient.send(command)).toHaveProperty('Item.pdfKey');
    expect(await dynamoDBClient.send(command)).not.toHaveProperty('Item.dateSubmitted');
  });

  test('item without timestamp in submission uses sns timestamp', async() => {
    await new Migration(dynamoDBClient, tableName, storage).run(50, false);
    const command = getItemCommand(tableName, 'TDL17.1');
    expect(await dynamoDBClient.send(command)).toHaveProperty('Item.pdfKey');
    expect(await dynamoDBClient.send(command)).toHaveProperty('Item.dateSubmitted');
  });

  test('Running migration twice should result in same table', async() => {
    const consoleSpy = jest.spyOn(console, 'info');
    await new Migration(dynamoDBClient, tableName, storage).run(50, false);
    expect(consoleSpy).toHaveBeenCalledWith('Updating 2 items in dynamoDB');
    const command = getItemCommand(tableName, 'TDL17.2');
    expect(await dynamoDBClient.send(command)).toHaveProperty('Item.pdfKey');
    expect(await dynamoDBClient.send(command)).not.toHaveProperty('Item.dateSubmitted');
    await new Migration(dynamoDBClient, tableName, storage).run(50, false);
    expect(consoleSpy).toHaveBeenCalledWith('Updating 0 items in dynamoDB');
    const secondCommand = getItemCommand(tableName, 'TDL17.957');
    expect(await dynamoDBClient.send(secondCommand)).toHaveProperty('Item.dateSubmitted');
    expect(await dynamoDBClient.send(secondCommand)).toHaveProperty('Item.formTitle');
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
async function prefillDatabase(database: DynamoDBDatabase, items: number, startAt?: number) {
  startAt = startAt ?? 0;
  for (let index = startAt; index < items + startAt; index++) {
    await database.storeSubmission({
      key: `TDL17.${index}`,
      pdf: generateRandomString(10),
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
