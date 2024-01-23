import { Database, SubmissionData, dynamoDBItem } from '../Database';


export class MockDatabase implements Database {
  private table;

  constructor(tableName?: string) {
    this.table = tableName;
  }

  async storeSubmission(submission: SubmissionData): Promise<any> {
    const pk = submission.userId;
    console.debug(`would store object to table ${this.table} with primary key ${pk} and contents`, submission);
    let item: any = dynamoDBItem(pk, pk, submission);
    console.debug(JSON.stringify(item, null, 2));

    return true;
  }
}
