import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { S3Storage, Storage, AWS } from '@gemeentenijmegen/utils';
import { DynamoDBDatabase } from './Database';
import { FormIoFormConnector } from './FormConnector';
import { Submission } from './Submission';


export class SubmissionHandler {
  private storage!: Storage;
  private database!: DynamoDBDatabase;
  private apiKeyPromise!: Promise<string>;

  constructor() {
    this.setup();
    if (!this.storage || !this.apiKeyPromise || !this.database) {
      throw Error('Storage, database or form Connector empty');
    }
  }

  /**
   * Check for required environment variables, and create
   * storage and database objects to pass to handler.
   */
  private setup() {
    if (process.env.BUCKET_NAME == undefined) {
      throw Error('No bucket NAME provided, storing submissions will fail.');
    }
    if (process.env.TABLE_NAME == undefined) {
      throw Error('No table NAME provided, storing submissions will fail.');
    }
    if (process.env.FORMIO_API_KEY_ARN == undefined) {
      throw Error('No FORMIO_API_KEY_ARN or FORMIO_BASE_URL provided, retrieving form definitions will fail.');
    }
    this.storage = new S3Storage(process.env.BUCKET_NAME);
    this.database = new DynamoDBDatabase(process.env.TABLE_NAME);
    this.apiKeyPromise = AWS.getSecret(process.env.FORMIO_API_KEY_ARN);
  }

  /**
   * A number of actions is performed:
   * - Retrieve form definition and store in S3
   * - Retrieve attachments and store in S3
   * - Store submission in DynamoDB
   * @param message
   */
  async handleRequest(message: any) {
    const key = await this.apiKeyPromise;
    if (process.env.FORMIO_BASE_URL == undefined) {
      throw Error('No formio base url set');
    }
    const formConnector = new FormIoFormConnector(new URL(process.env.FORMIO_BASE_URL), key); //TODO: Only create once
    const storage = this.storage;
    const database = this.database;
    const submission = new Submission({ storage, formConnector, database });

    await submission.parse(message);
    await submission.save();

    if (submission.reference) {
      await this.sendEvent(submission.reference);
    }
  }

  async sendEvent(reference: string) {
    const client = new EventBridgeClient();
    await client.send(new PutEventsCommand({
      Entries: [
        {
          Source: 'Submissionstorage',
          DetailType: 'New Form Submitted',
          Detail: JSON.stringify({
            Reference: reference,
          }),
        },
      ],
    }));
  }

}


