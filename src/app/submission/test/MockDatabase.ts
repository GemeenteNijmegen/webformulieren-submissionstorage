import { Database, GetSubmissionParameters, GetSubmissionsByFormNameParameters, ListSubmissionParameters, SubmissionData, dynamoDBItem } from '../Database';
import { hashString } from '../hash';


export class MockDatabase implements Database {
  private table;

  constructor(tableName?: string) {
    this.table = tableName;
  }
  async getSubmission(parameters: GetSubmissionParameters): Promise<SubmissionData> {
    return {
      userId: parameters.userId,
      key: 'TDL123.001',
      pdf: 'submission.pdf',
      dateSubmitted: '2023-12-23T11:58:52.670Z',
      formName: 'bingoMeldenOfLoterijvergunningAanvragen',
      formTitle: 'Bingo melden of loterijvergunning aanvragen',
    };
  }

  async storeSubmission(submission: SubmissionData): Promise<any> {
    const pk = hashString(submission.userId);
    const sk = `${submission.key}`;
    console.debug(`would store object to table ${this.table} with primary key ${pk} and contents`, submission);
    let item: any = dynamoDBItem(pk, sk, submission);
    console.debug('DynamoDB insert Item', JSON.stringify(item, null, 2));

    return true;
  }

  async listSubmissions(parameters: ListSubmissionParameters): Promise<SubmissionData[]> {
    return [{
      userId: parameters.userId,
      key: 'TDL123.001',
      pdf: 'submission.pdf',
      dateSubmitted: '2023-12-23T11:58:52.670Z',
      formName: 'bingoMeldenOfLoterijvergunningAanvragen',
      formTitle: 'Bingo melden of loterijvergunning aanvragen',
    }];
  }

  async getSubmissionsByFormName(parameters: GetSubmissionsByFormNameParameters) {
    return [{
      key: 'DMS123.001',
      dateSubmitted: '2024-04-11T13:53:34.120Z',
      formName: parameters.formName,
      formTitle: `Titel ${parameters.formName}`,
    },
    {
      key: 'DMS123.002',
      dateSubmitted: '2024-04-12T13:53:34.120Z',
      formName: parameters.formName,
      formTitle: `Titel ${parameters.formName}`,
    }];
  }

}
