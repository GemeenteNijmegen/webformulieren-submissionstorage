import { Database, ListSubmissionParameters, SubmissionData, dynamoDBItem } from '../Database';
import { hashString } from '../hash';


export class MockDatabase implements Database {
  private table;

  constructor(tableName?: string) {
    this.table = tableName;
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
}
