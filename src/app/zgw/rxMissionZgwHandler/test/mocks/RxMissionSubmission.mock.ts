import * as fs from 'fs';
import * as path from 'path';
import { UserType } from '../../../../shared/User';
import { SubmissionData } from '../../../../submission/Database';
import { getHashedUserId } from '../../../../submission/hash';
import { ZgwForwardEventDetail, ZgwForwardProcessedFormEvent } from '../../../shared/zgwForwardEvent.model';

// Voorbeeld testgebruik

// // Schrijf een unit test voor een specifieke mock submission
// test('Handler verwerkt Kamerverhuur Vergunning correct', async () => {
//   // Initialiseer de mock met de gewenste submission key
//   const mockSubmission = new MockRxMissionSubmission('KamerverhuurVergunning');

//   // Log informatie over de mock submission
//   mockSubmission.logMockInfo();

//   // Haal het event op dat gebruikt kan worden in de handler
//   const params = mockSubmission.getSubmissionParameters();

//   // Roep de handler aan met het mock event
//   await rxMissionZgwHandlerInstantie.sendSubmissionToRxMission(params);
//    mock de response uit database metmockedDatabaseGetSubmission()

//   // Voeg je assertions toe om te verifiëren dat de handler correct heeft gewerkt
//   // Bijvoorbeeld, controleer of een functie is aangeroepen met de juiste parameters
//   // expect(someFunction).toHaveBeenCalledWith(expectedParameters);
// });


interface MockSubmissionInfo {
  filename: string;
  formName: string;
  userType: 'person' | 'organisation';
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

    const filePath = path.join(__dirname, './mocks', filename);
    const jsonString = fs.readFileSync(filePath, 'utf8');
    this.jsonData = JSON.parse(jsonString);
    this.messageData = JSON.parse(this.jsonData.Message);

    this.detail = this.createDetail();
    this.event = this.createEvent();
  }
  public logMockInfo(): void {
    console.log(`Mock Submission Selected:
    - Form Name   : ${this.formName}
    - User Type   : ${this.userType}
    - Description : ${this.description}`);
  }


  public getJsonData(): any {
    return this.jsonData;
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
      userId: this.detail.UserId,
      userType: this.detail.UserType,
    };
  }

  /**
   * Gebruik om een mockresponse van de database te geven gebaseerd op de json
   */
  public async mockedDatabaseGetSubmission(): Promise<SubmissionData | false> {
    // Extract the mock data details
    const mockUserId = this.detail.UserId;
    const mockKey = this.detail.Key;
    const mockUserType = this.detail.UserType;


    // Extract necessary fields from the mock data
    const pdfReference = this.messageData?.pdf?.reference ?? '';
    const dateSubmitted = this.jsonData.Timestamp ?? '';
    const formName = this.messageData.formTypeId ?? 'onbekend';
    const formTitle = this.messageData.formTypeId ?? 'Onbekende aanvraag';
    const attachments =
        this.messageData.data?.toevoegen?.map((attachment: any) => attachment.reference) ?? [];

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
    const UserId = this.messageData.bsn || this.messageData.brpData?.Persoon?.BSN?.BSN || '';
    const UserType = this.userType; // Gebruik het userType uit submissionInfo
    const Key = this.messageData.reference ?? '';
    const pk = getHashedUserId(UserId, UserType);
    const sk = Key;

    return {
      Reference,
      UserId,
      pk,
      sk,
      UserType,
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