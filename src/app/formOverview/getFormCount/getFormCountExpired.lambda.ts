import { Database, DynamoDBDatabase } from '../../submission/Database';
import { S3Storage, Storage } from '../../submission/Storage';
import { DDBFormOverviewDatabase, FormOverviewDatabase } from '../database/FormOverviewDatabase';

export async function handler(event: any) {

  const environment = getEvironmentVariables();
  const [database, _downloadStorage, _formOveriewDatabase] = setup(environment);

  const date = new Date();
  date.setMonth(new Date().getMonth()-11);

  const items = await database.getExpiredForms(event.date ?? date.toISOString().substring(0, 10));

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

  console.log(JSON.stringify(counter));
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

function setup(environment: {tableName: string; downloadBucketName: string; formOverviewTableName: string} ):
[Database, Storage, FormOverviewDatabase] {
  const database = new DynamoDBDatabase(environment.tableName);
  const downloadStorage = new S3Storage(environment.downloadBucketName);
  const formOverviewDatabase = new DDBFormOverviewDatabase(environment.formOverviewTableName);
  return [database, downloadStorage, formOverviewDatabase];
}
