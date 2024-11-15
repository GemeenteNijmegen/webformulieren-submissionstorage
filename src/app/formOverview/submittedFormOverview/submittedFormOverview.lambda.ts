import { environmentVariables, S3Storage, Storage } from '@gemeentenijmegen/utils';
import { Database, DynamoDBDatabase } from '../../submission/Database';
import { FormOverviewDatabase, DDBFormOverviewDatabase } from '../database/FormOverviewDatabase';
import { Statics } from '../../../statics';
import { SSM } from '@aws-sdk/client-ssm';

const envKeys = [
  'TABLE_NAME',
  'DOWNLOAD_BUCKET_NAME',
  'FORM_OVERVIEW_TABLE_NAME'
] as const;

/**
 * Retrieve an overview of all submitted forms with basic information.
 * Overviews can be used to check if all submitted forms have been processed properly in the backend.
 * Only based on database information (not S3 Bucket) and saved to the downloads.
 */
export async function handler(_event: any) {
  const env = environmentVariables(envKeys);
  const database = new DynamoDBDatabase(env.TABLE_NAME);
  const downloadStorage = new S3Storage(env.DOWNLOAD_BUCKET_NAME);
  const formOverviewDatabase = new DDBFormOverviewDatabase(env.FORM_OVERVIEW_TABLE_NAME);

  try {
    const { startDate, endDate } = getLast30DaysDateRange();

    // Alle subsidieformulieren
    // Retrieve form names directly from SSM, needs no caching. Lambda hardly ever runs.
    const ssm = new SSM();
    const formNamesParam = await ssm.getParameter({ Name: Statics.ssmSubmittedFormoverviewFormnames })
    const formNames = formNamesParam?.Parameter?.Value?.split(',').map(name => name.trim()) || [];

    
    if (!formNames || formNames.length === 0) {
      throw new Error('No form names available for query.');
    }

    // Get all submitted forms for the past 30 days
    const submissions = (
        await Promise.all(
          formNames.map(formName =>
            getFormSubmissionsFromDatabase(database, {
              formName,
              startDate,
              endDate,
            })
          )
        )
      ).flat();

    if (submissions.length === 0) {
      return {
        statusCode: 204,
        body: JSON.stringify({ message: 'No submissions found in the past 30 days.' }),
      };
    }

    // Compile CSV from submissions
    const csvContent = await compileCsvFile([
      ['Key', 'Date Submitted', 'Form Name', 'Form Title'], // Headers
      ...submissions.map(submission => [
        submission.key,
        submission.dateSubmitted,
        submission.formName,
        submission.formTitle,
      ]),
    ]);

    // Save the CSV file to S3 and database
    const csvFileName = await saveCsvFile(downloadStorage, formOverviewDatabase, csvContent, {
      startDate,
      endDate,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'CSV generated successfully.', fileName: csvFileName }),
    };
  } catch (error) {
    console.error('Error generating form overview:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Problemen bij het maken van het submitted formoverview overzicht' }),
    };
  }
}

/**
 * Compiles an array of strings into a CSV format.
 */
async function compileCsvFile(submissionsArray: string[][]): Promise<string> {
  let csvContent = '';
  submissionsArray.forEach(row => {
    csvContent += row.join(';') + '\n';
  });
  return csvContent;
}

/**
 * Saves the CSV file to S3 and logs its metadata in the database.
 */
async function saveCsvFile(
  downloadStorage: Storage,
  formOverviewDatabase: FormOverviewDatabase,
  csvFile: string,
  params: { startDate: string; endDate: string }
): Promise<string> {
  const epochTime = new Date().getTime();
  const csvFileName = `SubmittedFormOverview-${epochTime}.csv`;

  await downloadStorage.store(csvFileName, csvFile);
  await formOverviewDatabase.storeFormOverview({
    fileName: csvFileName,
    createdBy: 'event', // Replace this with dynamic user information if needed
    formName: 'overview',
    formTitle: 'Submitted Form Overview',
    queryStartDate: params.startDate,
    queryEndDate: params.endDate,
  });
  return csvFileName;
}

/**
 * 
 * @param database 
 * @param formName 
 * @returns 
 */
async function getFormSubmissionsFromDatabase(database: Database, params: GetSubmissionsByFormNameParams){
    const databaseResult = await database.getSubmissionsByFormName({
      formName: params.formName,
      startDate: params.startDate,
      endDate: params.endDate,
    });
    if (!databaseResult || !Array.isArray(databaseResult)) {
      throw Error(`Cannot retrieve submitted forms for ${params.formName}. DatabaseResult is false or not the expected array. No results would give an empty array, not this error.`);
    }
    // No results from database should return an empty object to throw a 204
    if (!databaseResult.length) return [];
    // Sort databaseResult by dateSubmitted in descending order (newest first)
    databaseResult.sort((a, b) => {
      return b.dateSubmitted > a.dateSubmitted ? 1 : -1;
    });
    return databaseResult;
  }

  /**
 * Generates a start date and end date string for querying the last 30 days.
 * The end date is today, and the start date is exactly 30 days prior.
 *
 * @returns An object containing `startDate` and `endDate` in YYYY-MM-DD format.
 */
function getLast30DaysDateRange(): { startDate: string; endDate: string } {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  
    // Subtract 30 days from today
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);
  
    // Return both dates in YYYY-MM-DD format
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate,
    };
  }
  
  export interface GetSubmissionsByFormNameParams {
    formName: string;
    startDate?: string;
    endDate?: string;
  }