import * as fs from 'fs';
import * as path from 'path';
import { UserType } from '../../../../shared/UserType';
import { SubmissionData } from '../../../../submission/Database';
import { getHashedUserId } from '../../../../submission/hash';
import { ZgwForwardEventDetail, ZgwForwardProcessedFormEvent } from '../../../shared/zgwForwardEvent.model';

/**
 * MockRxMissionSubmission: A helper class to simulate and manage mock submission data for RxMission integration tests.
 *
 * This class is designed to facilitate testing of RxMission integrations by providing a streamlined way to
 * access, manipulate, and use mock submission data. It includes methods to generate mock events, database
 * responses, and other resources that mimic real-world scenarios. This makes it easier to test handlers
 * and workflows end-to-end without relying on live data or external dependencies.
 *
 * ### Key Features:
 * - Load mock submission data based on a key from a predefined set of submissions.
 * - Generate mock events and database responses for seamless integration testing.
 * - Access information in various forms (e.g., raw JSON, event objects, database-like structures).
 * - Designed to test RxMission handlers and related processes, such as ZgwForward processing.
 *
 * ### Example Usage:
 *
 * ```typescript
 * import { MockRxMissionSubmission } from './MockRxMissionSubmission';
 *
 * // Unit test for a specific submission type
 * test('Handler processes Kamerverhuur Vergunning correctly', async () => {
 *   // Initialize the mock submission
 *   const mockSubmission = new MockRxMissionSubmission('KamerverhuurVergunning');
 *
 *   // Log the details of the mock submission
 *   mockSubmission.logMockInfo();
 *
 *   // Retrieve parameters for calling the handler
 *   const params = mockSubmission.getSubmissionParameters();
 * });
 * ```
 *
 * ### Constructor:
 * The class is initialized with a key corresponding to a mock submission defined in `MockSubmissions`.
 *
 * @param submissionKey {keyof typeof MockSubmissions} - The key to select a predefined mock submission.
 *
 * ### Example Mock Submission Key:
 * `KamerverhuurVergunning`
 *
 * ### Methods Overview:
 * - `logMockInfo`: Logs submission metadata (form name, user type, description).
 * - `getJsonData`: Returns raw JSON data of the mock submission.
 * - `getMockStorageSubmission`: Simulates retrieving a mock submission from storage.
 * - `getMockStorageBlob`: Returns a mock binary file (e.g., for testing file uploads).
 * - `getSubmissionParameters`: Provides parameters for calling handlers based on mock data.
 * - `mockedDatabaseGetSubmission`: Generates a simulated database response based on the mock data.
 * - `createDetail`: Creates a mock `ZgwForwardEventDetail` object.
 * - `createEvent`: Generates a mock `ZgwForwardProcessedFormEvent` to call the lambda handler directly
 *
 * By using this class, developers can test integrations and workflows comprehensively in an isolated and predictable manner.
 */
interface MockSubmissionInfo {
  filename: string;
  formName: string;
  userType: UserType;
  description: string;
}

export const MockSubmissions: { [key: string]: MockSubmissionInfo } = {
  KamerverhuurVergunning: {
    filename: 'R0130.863.json',
    formName: 'Kamerverhuur Vergunning Aanvragen',
    userType: 'person',
    description: 'Formulier voor het aanvragen van een kamerhuurvergunning door een persoon.',
  },
  VerhurenWoonruimte: {
    filename: 'R0330.868.json',
    formName: 'Aanvragen Verhuren Woonruimte',
    userType: 'person',
    description: 'Verhuren Woonruimte met een bsn',
  },
  Vooroverleg: {
    filename: 'R0430.870.json',
    formName: 'Vooroverleg Omgevingsvergunning Aanvragen',
    userType: 'person',
    description: 'Vooroverleg Omgevingsvergunning met een bsn',
  },
  VooroverlegOrganisatie: {
    filename: 'R0430.878.json',
    formName: 'Vooroverleg Omgevingsvergunning Aanvragen',
    userType: 'organisation',
    description: 'Vooroverleg Omgevingsvergunning met een kvk en refererend naar ander zaaknummer',
  },
  Bouwmaterialen: {
    filename: 'R0530.873.json',
    formName: 'Bowumaterialen Openbaar terrein melden of vergunning aanvragen',
    userType: 'person',
    description: 'Persoon bouwmaterialen, melden gaat naar O18',
  },
  HadGeenBetrokkene: {
    filename: 'R0531.151.json',
    formName: 'Bij acc test had deze geen betrokkene. Bouwmaterialen Openbaar terrein melden of vergunning aanvragen',
    userType: 'person',
    description: 'Geen betrokkene in test',
  },
};

export class MockRxMissionSubmission {
  public jsonData: any;
  public messageData: any;
  public detail: ZgwForwardEventDetail;
  public event: ZgwForwardProcessedFormEvent;
  public formName: string;
  public userType: UserType;
  public description: string;

  // De constructor accepteert een key van MockSubmissions
  constructor(submissionKey: keyof typeof MockSubmissions) {
    const submissionInfo = MockSubmissions[submissionKey];
    const filename = submissionInfo.filename;
    this.formName = submissionInfo.formName;
    this.userType = submissionInfo.userType;
    this.description = submissionInfo.description;

    const filePath = path.join(__dirname, filename);
    const jsonString = fs.readFileSync(filePath, 'utf8');
    this.jsonData = JSON.parse(jsonString);
    this.messageData = JSON.parse(this.jsonData.Message);

    this.detail = this.createDetail();
    this.event = this.createEvent();
  }

  public debugLogMockInfo(): void {
    console.debug(`Mock Submission Selected:
    - Form Name   : ${this.formName}
    - User Type   : ${this.userType}
    - User Id   : ${this.detail.userId}
    - Description : ${this.description}`);
  }

  public getAppId(): string {
    return this.detail.Key.substring(0, 3);
  }
  public getJsonData(): any {
    return this.jsonData;
  }

  public getMockStorageSubmission(): any {
    return { Body: { transformToString: () => { return JSON.stringify(this.jsonData); } } };
  }

  /**
   * Mocks a file with bytes containing Hello
   */
  public getMockStorageBlob(): any {
    return {
      Body: {
        transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array([72, 101, 108, 108, 111])), // "Hello" in bytes
      },
    };
  }

  public getMessageData(): any {
    return this.messageData;
  }

  public getEventDetail(): ZgwForwardEventDetail {
    return this.detail;
  }

  public getEvent(): ZgwForwardProcessedFormEvent {
    return this.event;
  }

  /**
   * Gebruik om gemakkelijk RxMissionZgwHandler aan te roepen met params gebaseerd op de json
   */
  public getSubmissionParameters(): { key: string; userId: string; userType: UserType } {
    return {
      key: this.detail.Key,
      userId: this.detail.userId,
      userType: this.detail.userType,
    };
  }

  /**
   * Gebruik om een mockresponse van de database te geven gebaseerd op de json
   */
  public mockedDatabaseGetSubmission(): SubmissionData {
    // Extract the mock data details
    const mockUserId = this.detail.userId;
    const mockKey = this.detail.Key;
    const mockUserType = this.detail.userType;


    // Extract necessary fields from the mock data
    const pdfReference = this.messageData?.pdf?.reference ?? '';
    const dateSubmitted = this.jsonData.Timestamp ?? '';
    const formName = this.messageData.formTypeId ?? 'onbekend';
    const formTitle = this.messageData.formTypeId ?? 'Onbekende aanvraag';
    const attachments: string[] = this.messageData.data?.toevoegen?.map((attachment: any) => attachment.reference) ?? [];

    // Construct the SubmissionData object
    const submissionData: SubmissionData = {
      userId: mockUserId,
      userType: mockUserType,
      key: mockKey,
      pdf: pdfReference,
      dateSubmitted: dateSubmitted,
      formName: formName,
      formTitle: formTitle,
      attachments: attachments,
    };

    return submissionData;
  }

  // details van event dat ingeschoten wordt met deze submission
  private createDetail(): ZgwForwardEventDetail {
    const Reference = this.messageData.reference ?? '';
    const userId = this.messageData.bsn || this.messageData.brpData?.Persoon?.BSN?.BSN || '';
    const userType = this.userType; // Gebruik het userType uit submissionInfo
    const Key = this.messageData.reference ?? '';
    const pk = getHashedUserId(userId, userType);
    const sk = Key;

    return {
      Reference,
      userId,
      pk,
      sk,
      userType,
      Key,
    };
  }

  // Event gebruikt in de lambda handler
  private createEvent(): ZgwForwardProcessedFormEvent {
    const event = {
      'id': this.jsonData.MessageId || 'mock-id',
      'time': this.jsonData.Timestamp || new Date().toISOString(),
      'detail': this.detail,
      'detail-type': 'New Form Processed',
    } as any as ZgwForwardProcessedFormEvent;

    return event;
  }
}
