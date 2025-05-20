import { S3Storage, Storage } from '@gemeentenijmegen/utils';
import { Database, DynamoDBDatabase } from '../../submission/Database';
import { DDBFormOverviewDatabase, FormOverviewDatabase } from '../database/FormOverviewDatabase';

export async function handler(event: any) {

  const environment = getEvironmentVariables();
  const [database, downloadStorage, formOverviewDatabase] = setup(environment);

  // Retrieve forms that are at least 11 months old or older than the date given by the event
  const date = new Date();
  date.setMonth(new Date().getMonth()-11);
  const formsRetrievedBeforeDate = event.date ?? date.toISOString().substring(0, 'yyyy-mm-dd'.length);

  const items = await database.getExpiredForms(formsRetrievedBeforeDate);

  const counter: Record <string, number> = {};

  if (!items || !Array.isArray(items)) {
    throw Error('Cannot retrieve formOverview. DatabaseResult is false or not the expected array.');
  }

  items.forEach((item) => {
    if (counter[item.formName]) {
      counter[item.formName] += 1;
    } else {
      counter[item.formName] = 1;
    }
  });

  const csvFile = transformToCSV(counter);
  console.log('CsvContent count expired forms ', formsRetrievedBeforeDate, ' /n ', csvFile);
  const epochTime = new Date().getTime();
  const csvFileName = `ExpiringFormsOverview-${formsRetrievedBeforeDate}-${epochTime}.csv`;
  await downloadStorage.store(csvFileName, csvFile);
  await formOverviewDatabase.storeFormOverview({
    fileName: csvFileName,
    createdBy: 'default_change_to_api_queryparam',
    formName: `ExpiringFormsOverview-${formsRetrievedBeforeDate}-${epochTime}`,
    formTitle: `ExpiringFormsOverview ${formsRetrievedBeforeDate}`,
    queryStartDate: formsRetrievedBeforeDate,
    queryEndDate: 'onbekend',
  });

}
function transformToCSV(countedForms: Record <string, number>): string {
  let csvContent: string = 'Formuliernaam; Aantal; \n';
  for (const key in countedForms) {
    csvContent += `${key}; ${countedForms[key]};\n`;
  }
  console.log(`Done processing csv file. Number of processed rows: ${(countedForms.length - 1)}.`);
  return csvContent;
}
function getEvironmentVariables() {
  if (process.env.TABLE_NAME == undefined) {
    throw Error('No submissions table NAME provided, retrieving submissions will fail.');
  }
  if (process.env.DOWNLOAD_BUCKET_NAME == undefined) {
    throw Error('No download bucket NAME provided, storing formOverview will fail.');
  }
  if (process.env.FORM_OVERVIEW_TABLE_NAME == undefined) {
    throw Error('No form overview table NAME provided, storing formOverview metadata will fail.');
  }
  return {
    tableName: process.env.TABLE_NAME,
    downloadBucketName: process.env.DOWNLOAD_BUCKET_NAME,
    formOverviewTableName: process.env.FORM_OVERVIEW_TABLE_NAME,
  };
}

function setup(environment: { tableName: string; downloadBucketName: string; formOverviewTableName: string } ):
[Database, Storage, FormOverviewDatabase] {
  const database = new DynamoDBDatabase(environment.tableName);
  const downloadStorage = new S3Storage(environment.downloadBucketName);
  const formOverviewDatabase = new DDBFormOverviewDatabase(environment.formOverviewTableName);
  return [database, downloadStorage, formOverviewDatabase];
}
