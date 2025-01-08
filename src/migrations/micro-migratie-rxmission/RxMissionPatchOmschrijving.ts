import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { readFile, utils } from 'xlsx';
import { HandleRxMissionMigration } from './HandleRxMissionMigration';
/**
 * Load local .env file
 */
dotenv.config({ path: './.env' });

/**
 * Run with npx ts-node ./src/migrations/micro-migratie-rxmission/RxMissionPatchOmschrijving.ts
 */
export class RxMissionPatchOmschrijving {
  private inputFilePath: string;
  private inputZakenFilePath: string;
  private outputDir: string;
  private jsonFilePaths: { [key in JsonFileTypePatch]: string };
  private logFilePaths: { [key in LogFileType]: string };
  private baseOutputDir: string;

  constructor(inputFileName: string = 'small-sample.xlsx', zaakFile: string = 'success.json') {
    if (process.env.RX_ENV !== 'PREPROD') {
      throw new Error('Environment is not PREPROD. Operation aborted.');
      console.log('Running on PROD: ', process.env.RX_ENV );
    }

    const timestamp = Date.now(); // Epoch in milliseconds
    this.baseOutputDir = path.join(__dirname, 'output');
    this.outputDir = path.join(this.baseOutputDir, `patch_${process.env.RX_ENV}_${timestamp}`);
    this.inputFilePath = path.join(__dirname, 'sensitive-files', inputFileName);
    this.inputZakenFilePath = path.join(__dirname, 'sensitive-files', zaakFile);

    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Initialize JSON and log files
    this.jsonFilePaths = {
      [JsonFileTypePatch.SUCCESS]: this.initJsonFile(JsonFileTypePatch.SUCCESS, []),
      [JsonFileTypePatch.FAILURE]: this.initJsonFile(JsonFileTypePatch.FAILURE, []),
      [JsonFileTypePatch.TO_PATCH]: this.initJsonFile(JsonFileTypePatch.TO_PATCH, []),
      [JsonFileTypePatch.PROCESSED_ROWS]: this.initJsonFile(JsonFileTypePatch.PROCESSED_ROWS, []), // Can be used to start processing from a certain row if interrupted
      [JsonFileTypePatch.PATCHED_ZAAKURLS]: this.initJsonFile(JsonFileTypePatch.PATCHED_ZAAKURLS, []), // Can be used to delete all created zaken
    };

    this.logFilePaths = {
      [LogFileType.ERROR_LOG]: this.initLogFile(LogFileType.ERROR_LOG, 'ERROR-LOG-FILE-TITLE \n'),
      [LogFileType.LOGS]: this.initLogFile(LogFileType.LOGS, 'GENERAL LOGS \n'),
    };
  }

  /**
   * Initialize a JSON file with a default array value.
   */
  private initJsonFile(fileType: JsonFileTypePatch, defaultValue: any): string {
    const filePath = path.resolve(this.outputDir, fileType);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
    }
    return filePath;
  }

  /**
   * Initialize a log file with a default string value.
   */
  private initLogFile(fileType: LogFileType, defaultValue: string): string {
    const filePath = path.resolve(this.outputDir, fileType);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, defaultValue, 'utf8');
    }
    return filePath;
  }

  /**
   * Append data to a JSON file.
   */
  private appendToJsonFile(fileType: JsonFileTypePatch, data: any): void {
    const filePath = this.jsonFilePaths[fileType];
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    existingData.push(data);
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf8');
  }

  /**
   * Append a message to a log file.
   */
  private appendToLogFile(fileType: LogFileType, message: string): void {
    const filePath = this.logFilePaths[fileType];
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(filePath, logMessage, 'utf8');
  }

  /**
   * Read the Excel file and convert it to JSON.
   */
  private readExcelFile(): any[] {
    const workbook = readFile(this.inputFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return utils.sheet_to_json(worksheet);
  }

  /**
   * Read zakenFile as json
   */
  private readZakenFile(): any[] {
    return JSON.parse(fs.readFileSync(this.inputZakenFilePath, 'utf8'));
  }

  /**
   * Check if a row has already been processed.
   * If you want to use the file from a previous migration, just put the particular PROCESSED_ROWS in output and uncomment the first lines
   */
  private isRowProcessed(row: Row): boolean {
    //const filePath = path.resolve(this.baseOutputDir, JsonFileTypePatch.PROCESSED_ROWS);
    //const processedValues = JSON.parse(fs.readFileSync(this.jsonFilePaths[JsonFileTypePatch.PROCESSED_ROWS], 'utf8'));
    const processedValues = JSON.parse(fs.readFileSync(this.jsonFilePaths[JsonFileTypePatch.PROCESSED_ROWS], 'utf8'));
    return processedValues.includes(row.openwavezaaknummer);
  }

  /**
   * Main migration process.
   */
  public async patchOmschrijving(): Promise<void> {
    const rows = this.readExcelFile();
    const handleMigration = new HandleRxMissionMigration(process.env.RX_ENV === 'PROD');
    const totalRows = rows.length;
    let processedCount = 0;
    let failedRows = 0;
    let succeededRows = 0;

    // Record start time
    const startTime = Date.now();
    console.log(`Starting migration: ${totalRows} rows to process.`);

    for (const row of rows) {
      processedCount++;

      console.log(`Processing row ${processedCount} of ${totalRows} (${((processedCount / totalRows) * 100).toFixed(2)}%)`);
      await new Promise(resolve => setTimeout(resolve, 500)); // To prevent Rate Limit error

      if (this.isRowProcessed(row)) {
        this.appendToLogFile(LogFileType.ERROR_LOG, `Row already processed: ${row.openwavezaaknummer}`);
        continue;
      }

      try {
        const successJson: any[] = this.readZakenFile();
        const foundZaak = successJson.find((record) => row.openwavezaaknummer === record.row);
        if (!foundZaak || !foundZaak.url) {
          this.appendToLogFile(LogFileType.ERROR_LOG, `no zaak found in successjson ${row.openwavezaaknummer}. Stop and throw error to be caught`);
          throw Error(`Successjson does not have the row with ${row.openwavezaaknummer}.`);
          continue;
        }
        const zaakurl = foundZaak.url;
        // PATCH omschrijving
        const zaak: {url: string; identification: string | undefined} = await handleMigration.patchOmschrijvingZaak(zaakurl, row.zaakomschrijving);
        if (!zaak.url) {
          this.appendToLogFile(LogFileType.ERROR_LOG, `zaak url is undefined ${zaak} - ${row.openwavezaaknummer}. Stop and throw error to be caught`);
          throw Error('Zaak url is undefined.');
          continue;
        }
        this.appendToJsonFile(JsonFileTypePatch.PATCHED_ZAAKURLS, zaak.url);
        this.appendToJsonFile(JsonFileTypePatch.PROCESSED_ROWS, row.openwavezaaknummer);
        this.appendToJsonFile(JsonFileTypePatch.SUCCESS, { ...zaak, row: row.openwavezaaknummer });
        this.appendToLogFile(LogFileType.LOGS, `Successfully processed patch row ${processedCount}: ${row.openwavezaaknummer}. Zaak: ${zaak.identification}, ${zaak.url}.`);
        succeededRows++;
      } catch (error: any) {
        this.appendToLogFile(LogFileType.ERROR_LOG, `Failed to process patch row ${processedCount}: ${row.openwavezaaknummer}. ${error.message ||error}`);
        this.appendToJsonFile(JsonFileTypePatch.FAILURE, { row, error: error.message ||error });
        failedRows++;
      }
    }
    const endTime = Date.now();
    const elapsedMilliseconds = endTime - startTime;
    const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    console.log(`
      **************************************************
      *                                                
      *  Patch completed for ${process.env.RX_ENV}                          
      *  Success: ${succeededRows}                                    
      *  Failed: ${failedRows}                                     
      *  Total: ${processedCount}
      * 
      *  ElapsedTime: ${minutes} minutes and ${seconds} seconds.                                       
      *                                                
      **************************************************
      `);
  }
}

/**
 * Enums for JSON file types.
 */
export enum JsonFileTypePatch {
  SUCCESS = 'success.json',
  FAILURE = 'failure.json',
  PATCHED_ZAAKURLS = 'patchedzaakurls.json',
  PROCESSED_ROWS = 'processedrows.json',
  TO_PATCH = 'to_patch.json'
}

/**
 * Enums for log file types.
 */
export enum LogFileType {
  ERROR_LOG = 'errors.log',
  LOGS = 'general_logs.log'
}

/**
 * Row interface for Excel data.
 */
export interface Row {
  openwavezaaknummer?: any;
  corsazaaknummer?: any;
  cbopenwavezaaknummer?: any;
  zaakomschrijving?: any;
  zaaktype?: any;
  bsn?: any;
  kvk?: any;
  contactpersoon?: any;
  email?: any;
  telefoon?: any;
  typecontact?: any;
  urlopenwave?: any;
  urlcorsa?: any;
  locatie?: any;
  zaakgeometrie?: any;
  activiteiten?: any;
  producten?: any;
  oorsprong?: any;
  zaakresultaat?: any;
}

/**
 * Entry point for the script.
 * one-row.xlsx en small-sample.xlsx voor testen
 * openwave-export-20241220-lijst-1.xlsx
 * npx ts-node ./src/migrations/micro-migratie-rxmission/RxMissionPatchOmschrijving.ts
 *
 */
export async function runPatch(inputFileName: string = 'openwave-export-20241220-lijst-1.xlsx', zaakFile: string = 'success_prod_lijst1.json'): Promise<void> {
  const confirm = await confirmProdEnvironment(inputFileName);
  if (!confirm) {
    console.log('Migration aborted.');
    process.exit(0);
  }
  const migrator = new RxMissionPatchOmschrijving(inputFileName, zaakFile);
  await migrator.patchOmschrijving();
}

/**
 * Prompt user for confirmation when running on PROD
 */
async function confirmProdEnvironment(fileName: string): Promise<boolean> {
  if (process.env.RX_ENV !== 'PROD') {
    return true; // Skip confirmation if not PROD
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `WARNING: You are about to run the migration ${fileName} on PROD. Are you sure you want to proceed? (yes/no): `,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      },
    );
  });
}

if (require.main === module) {
  runPatch()
    .then(() => console.log('Migration finished!'))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}