import * as fs from 'fs';
import * as path from 'path';
import { readFile, utils } from 'xlsx';
import { HandleRxMissionMigration } from './HandleRxMissionMigration';
import * as dotenv from 'dotenv';
/**
 * Load local .env file
 */
dotenv.config({ path: './.env' });

/**
 * Run with npx ts-node ./src/migrations/micro-migratie-rxmission/RxMissionMigratie.ts
 */
export class RxMissionMigratie {
  private inputFilePath: string;
  private outputDir: string;
  private jsonFilePaths: { [key in JsonFileType]: string };
  private logFilePaths: { [key in LogFileType]: string };

  constructor(inputFileName: string = 'small-sample.xlsx') {
    const baseOutputDir = path.join(__dirname, 'output');
    const timestamp = Date.now(); // Epoch in milliseconds
    this.outputDir = path.join(baseOutputDir, `migrate_${timestamp}`);
    this.inputFilePath = path.join(__dirname, 'sensitive-files', inputFileName);

    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Initialize JSON and log files
    this.jsonFilePaths = {
      [JsonFileType.SUCCESS]: this.initJsonFile(JsonFileType.SUCCESS, []),
      [JsonFileType.FAILURE]: this.initJsonFile(JsonFileType.FAILURE, []),
      [JsonFileType.CREATED_ZAKEN]: this.initJsonFile(JsonFileType.CREATED_ZAKEN, []),
    };

    this.logFilePaths = {
      [LogFileType.ERROR_LOG]: this.initLogFile(LogFileType.ERROR_LOG, 'ERROR-LOG-FILE-TITLE \n'),
      [LogFileType.LOGS]: this.initLogFile(LogFileType.LOGS, 'GENERAL LOGS \n'),
    };
  }

  /**
   * Initialize a JSON file with a default array value.
   */
  private initJsonFile(fileType: JsonFileType, defaultValue: any): string {
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
  private appendToJsonFile(fileType: JsonFileType, data: any): void {
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
   * Check if a row has already been processed.
   */
  private isRowProcessed(row: Row): boolean {
    const successData = JSON.parse(fs.readFileSync(this.jsonFilePaths[JsonFileType.SUCCESS], 'utf8'));
    return successData.some((r: Row) => r.openwavezaaknummer === row.openwavezaaknummer);
  }

  /**
   * Main migration process.
   */
  public async migrateData(): Promise<void> {
    const rows = this.readExcelFile();
    const handleMigration = new HandleRxMissionMigration();
    const totalRows = rows.length;
    let processedCount = 0;
  
    console.log(`Starting migration: ${totalRows} rows to process.`);
  
    for (const row of rows) {
      processedCount++;
  
      console.log(`Processing row ${processedCount} of ${totalRows} (${((processedCount / totalRows) * 100).toFixed(2)}%)`);
  
      if (this.isRowProcessed(row)) {
        this.appendToLogFile(LogFileType.ERROR_LOG, `Row already processed: ${row.openwavezaaknummer}`);
        continue;
      }
  
      try {
        const zaakUrl: string = await handleMigration.createZaak(row);
        this.appendToJsonFile(JsonFileType.CREATED_ZAKEN, zaakUrl);
        this.appendToLogFile(LogFileType.LOGS, `Successfully processed row ${processedCount}: ${row.openwavezaaknummer}. Zaak: ${zaakUrl}.`);
      } catch (error: any) {
        this.appendToLogFile(LogFileType.ERROR_LOG, `Failed to process row ${processedCount}: ${row.openwavezaaknummer}. ${error}`);
        this.appendToJsonFile(JsonFileType.FAILURE, { row, error: error.message || error });
      }
    }
  
    console.log('Migration completed.');
  }
}

/**
 * Enums for JSON file types.
 */
export enum JsonFileType {
  SUCCESS = 'success.json',
  FAILURE = 'failure.json',
  CREATED_ZAKEN = 'createdzaken.json'
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
 */
export async function runMigration(inputFileName: string = 'one-row.xlsx'): Promise<void> {
  console.log('Node.js Arguments:', process.execArgv);
  const migrator = new RxMissionMigratie(inputFileName);
  await migrator.migrateData();
}

if (require.main === module) {
  runMigration()
    .then(() => console.log('Migration finished successfully!'))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}