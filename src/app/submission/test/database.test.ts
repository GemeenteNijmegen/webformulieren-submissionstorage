import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { MockDatabase } from './MockDatabase';
import { DynamoDBDatabase } from '../Database';

describe('Save object', () => {
  test('Creating database object', async () => {
    expect(new MockDatabase('mockTable')).toBeTruthy();
  });

  test('Storing a new submission', async () => {
    const db = new MockDatabase('mockTable');
    expect(await db.storeSubmission({
      userId: 'testuser',
      key: 'TDL.1234',
      pdf: 'test.pdf',
      attachments: [
        {
          bucket: 'testbucket',
          key: 'testattachment.pdf',
          originalName: 'testattachment2.pdf',
        },
      ],
    })).toBeTruthy();
  });

  test('Retrieving submissions by user', async () => {
    const db = new MockDatabase('mockTable');
    expect(await db.listSubmissions({
      userId: 'testuser',
    })).toBeTruthy();
  });
});

describe('Dynamodb integration tests', () => {
  const tableName = 'Test';
  const dynamoDBClient = new DynamoDBClient({ endpoint: 'http://localhost:8000' });
  const database = new DynamoDBDatabase(tableName, { dynamoDBClient });
  beforeAll(async() => {
    const command = new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [
        {
          AttributeName: "pk",
          AttributeType: "S",
        },{
          AttributeName: "sk",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "pk",
          KeyType: "HASH",
        },
        {
          AttributeName: "sk",
          KeyType: "RANGE",
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    });
  
    console.debug(await dynamoDBClient.send(command));
  });
  test('Add submissions to table', async() => {
    await database.storeSubmission({
      key: 'TDL10.002',
      pdf: 'submission.pdf',
      userId: '900222670'
    });
    expect(await database.storeSubmission({
      key: 'TDL10.001',
      pdf: 'submission.pdf',
      userId: '900222670'
    })).toBeTruthy();
  });

  test('Retrieve submission from table', async() => {
    expect(await database.listSubmissions({
      userId: '900222670'
    })).toHaveLength(2);
  });

  afterAll(async () => {
    const command = new DeleteTableCommand({
      TableName: tableName,
    });
  
    const response = await dynamoDBClient.send(command);
    return response;
  });
});
