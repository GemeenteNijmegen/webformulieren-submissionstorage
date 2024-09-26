// import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
// import { DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait } from 'testcontainers';
import { MockDatabase } from './MockDatabase';
// import { describeIntegration } from '../../test-utils/describeIntegration';
// import { DynamoDBDatabase } from '../Database';

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
        'testattachment2.pdf',
      ],
      dateSubmitted: '2023-12-23T11:58:52.670Z',
      formName: 'bingoMeldenOfLoterijvergunningAanvragen',
      formTitle: 'Bingo melden of loterijvergunning aanvragen',
    })).toBeTruthy();
  });

  test('Retrieving submissions by user', async () => {
    const db = new MockDatabase('mockTable');
    expect(await db.listSubmissions({
      userId: 'testuser',
    })).toBeTruthy();
  });
});

// describeIntegration('Dynamodb integration tests', () => {
//   console.debug('running integration tests');
//   const composeFilePath = '/Users/joostvanderborg/Developer/webformulieren-submissionstorage/src/app/submission/test/';
//   const composeFile = 'docker-compose-dynamodb.yml';
//   let environment: StartedDockerComposeEnvironment;

//   const dynamoDBClient = new DynamoDBClient({
//     endpoint: 'http://localhost:8000',
//     credentials: {
//       accessKeyId: 'dummy',
//       secretAccessKey: 'dummy',
//     },
//   });

//   const tableName = 'submissions-local';
//   const database = new DynamoDBDatabase(tableName, { dynamoDBClient });

//   beforeAll(async() => {
//     environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
//       .withWaitStrategy('dynamodb-local', Wait.forLogMessage('CorsParams: null'))
//       .up();

//   }, 60000);
//   beforeEach(async() => {
//     const command = new CreateTableCommand({
//       TableName: tableName,
//       AttributeDefinitions: [
//         {
//           AttributeName: 'pk',
//           AttributeType: 'S',
//         }, {
//           AttributeName: 'sk',
//           AttributeType: 'S',
//         },
//       ],
//       KeySchema: [
//         {
//           AttributeName: 'pk',
//           KeyType: 'HASH',
//         },
//         {
//           AttributeName: 'sk',
//           KeyType: 'RANGE',
//         },
//       ],
//       ProvisionedThroughput: {
//         ReadCapacityUnits: 1,
//         WriteCapacityUnits: 1,
//       },
//     });
//     await dynamoDBClient.send(command);
//     await database.storeSubmission({
//       key: 'TDL1.234',
//       pdf: 'submission.pdf',
//       userId: '900222670',
//       dateSubmitted: '2023-12-12T00:00:00.670Z',
//       formName: 'altijdAanwezigFormulier',
//       formTitle: 'Altijd aanwezig formulier',
//       attachments: [],
//     });

//   });

//   afterEach(async() => {
//     const command = new DeleteTableCommand({
//       TableName: tableName,
//     });
//     console.debug('removing table');
//     await dynamoDBClient.send(command);
//   });

//   afterAll(async() => {
//     console.debug('bringing environment down');
//     await environment.down({ timeout: 10000 });
//   });


//   test('Add submissions to table', async() => {
//     await database.storeSubmission({
//       key: 'TDL10.002',
//       pdf: 'submission.pdf',
//       userId: '900222670',
//       dateSubmitted: '2023-12-23T11:58:52.670Z',
//       formName: 'bingoMeldenOfLoterijvergunningAanvragen',
//       formTitle: 'Bingo melden of loterijvergunning aanvragen',
//       attachments: [],
//     });
//     expect(await database.storeSubmission({
//       key: 'TDL10.001',
//       pdf: 'submission.pdf',
//       userId: '900222670',
//       dateSubmitted: '2023-12-23T11:58:52.670Z',
//       formName: 'bingoMeldenOfLoterijvergunningAanvragen',
//       formTitle: 'Bingo melden of loterijvergunning aanvragen',
//       attachments: [],
//     })).toBeTruthy();
//   });

//   test('Retrieve submissions from table', async() => {
//     await database.storeSubmission({
//       key: 'TDL10.002',
//       pdf: 'submission.pdf',
//       userId: '900222670',
//       dateSubmitted: '2023-12-23T11:58:52.670Z',
//       formName: 'bingoMeldenOfLoterijvergunningAanvragen',
//       formTitle: 'Bingo melden of loterijvergunning aanvragen',
//       attachments: [],
//     });
//     expect(await database.listSubmissions({
//       userId: '900222670',
//     })).toHaveLength(2);
//   });

//   test('Retrieve submission from table', async() => {
//     expect(await database.getSubmission({
//       userId: '900222670',
//       key: 'TDL1.234',
//     })).toHaveProperty('formName');
//   });
// });
