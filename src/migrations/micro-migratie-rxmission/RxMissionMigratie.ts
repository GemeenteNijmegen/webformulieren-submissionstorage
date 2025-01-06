import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { readFile, utils } from 'xlsx';
import { HandleRxMissionMigration } from './HandleRxMissionMigration';
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
  private baseOutputDir: string;

  constructor(inputFileName: string = 'small-sample.xlsx') {
    if (process.env.RX_ENV !== 'PREPROD') {
      throw new Error('Environment is not PREPROD. Operation aborted.');
    }

    console.log('Environment verified: PREPROD');

    const timestamp = Date.now(); // Epoch in milliseconds
    this.baseOutputDir = path.join(__dirname, 'output');
    this.outputDir = path.join(this.baseOutputDir, `migrate_${timestamp}`);
    this.inputFilePath = path.join(__dirname, 'sensitive-files', inputFileName);

    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Initialize JSON and log files
    this.jsonFilePaths = {
      [JsonFileType.SUCCESS]: this.initJsonFile(JsonFileType.SUCCESS, []),
      [JsonFileType.FAILURE]: this.initJsonFile(JsonFileType.FAILURE, []),
      [JsonFileType.PROCESSED_ROWS]: this.initJsonFile(JsonFileType.PROCESSED_ROWS, []), // Can be used to start processing from a certain row if interrupted
      [JsonFileType.CREATED_ZAAKURLS]: this.initJsonFile(JsonFileType.CREATED_ZAAKURLS, []), // Can be used to delete all created zaken
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
   * If you want to use the file from a previous migration, just put the particular PROCESSED_ROWS in output and uncomment the first lines
   */
  private isRowProcessed(row: Row): boolean {
    //const filePath = path.resolve(this.baseOutputDir, JsonFileType.PROCESSED_ROWS);
    //const processedValues = JSON.parse(fs.readFileSync(this.jsonFilePaths[JsonFileType.PROCESSED_ROWS], 'utf8'));
    const processedValues = JSON.parse(fs.readFileSync(this.jsonFilePaths[JsonFileType.PROCESSED_ROWS], 'utf8'));
    return processedValues.includes(row.openwavezaaknummer);
  }

  /**
   * Main migration process.
   */
  public async migrateData(): Promise<void> {
    const rows = this.readExcelFile();
    const handleMigration = new HandleRxMissionMigration();
    const totalRows = rows.length;
    let processedCount = 0;
    let failedRows = 0;
    let succeededRows = 0;

    console.log(`Starting migration: ${totalRows} rows to process.`);

    for (const row of rows) {
      processedCount++;

      console.log(`Processing row ${processedCount} of ${totalRows} (${((processedCount / totalRows) * 100).toFixed(2)}%)`);

      if (this.isRowProcessed(row)) {
        this.appendToLogFile(LogFileType.ERROR_LOG, `Row already processed: ${row.openwavezaaknummer}`);
        continue;
      }

      try {
        const zaak: {url: string; identification: string | undefined; zaakgeometrieAdded:boolean} = await handleMigration.createZaak(row);
        if (!zaak.url) {
          this.appendToLogFile(LogFileType.ERROR_LOG, `zaak url is undefined ${zaak}. Stop and throw error to be caught`);
          throw Error('Zaak url is undefined.');
          continue;
        }
        this.appendToJsonFile(JsonFileType.CREATED_ZAAKURLS, zaak.url);
        if (!zaak.zaakgeometrieAdded) { this.appendToLogFile(LogFileType.ERROR_LOG, `${processedCount}: No zaakgeometrie ${zaak.identification} - ${zaak.url} - ${row.openwavezaaknummer}.`); }


        // status
        const status: boolean = await handleMigration.addStatus(zaak.url);
        if (!status) { this.appendToLogFile(LogFileType.ERROR_LOG, `${processedCount}: No status added ${zaak.identification} - ${zaak.url}- ${row.openwavezaaknummer}.`); }

        // zaakeigenschappen
        const eigenschappen = await handleMigration.addZaakEigenschappen(zaak.url, row);
        if (!eigenschappen.corsa) { this.appendToLogFile(LogFileType.ERROR_LOG, `${processedCount}: No eigenschap corsa added ${zaak.identification} - ${zaak.url} - ${row.openwavezaaknummer}.`); }
        if (!eigenschappen.openwave) { this.appendToLogFile(LogFileType.ERROR_LOG, `${processedCount}: No eigenschap openwave added ${zaak.identification} - ${zaak.url} - ${row.openwavezaaknummer}.`); }

        //rol
        const rol = await handleMigration.addRol(zaak.url, row);
        if (!rol) { this.appendToLogFile(LogFileType.ERROR_LOG, `${processedCount}: No rol added ${zaak.identification} - ${zaak.url} - ${row.openwavezaaknummer}.`); }

        //zaakresultaat
        const resultaat = await handleMigration.addResultaat(zaak.url, row);
        if (!resultaat) { this.appendToLogFile(LogFileType.ERROR_LOG, `${processedCount}: No resultaat added ${zaak.identification} - ${zaak.url} - ${row.openwavezaaknummer}.`); }


        this.appendToJsonFile(JsonFileType.PROCESSED_ROWS, row.openwavezaaknummer);
        this.appendToJsonFile(JsonFileType.SUCCESS, { ...zaak, row: row.openwavezaaknummer, status: status, ...eigenschappen, rol, resultaat });
        this.appendToLogFile(LogFileType.LOGS, `Successfully processed row ${processedCount}: ${row.openwavezaaknummer}. Zaak: ${zaak.identification}, ${zaak.url}.`);
        succeededRows++;
      } catch (error: any) {
        this.appendToLogFile(LogFileType.ERROR_LOG, `Failed to process row ${processedCount}: ${row.openwavezaaknummer}. ${error.message ||error}`);
        this.appendToJsonFile(JsonFileType.FAILURE, { row, error: error.message ||error });
        failedRows++;
      }
    }

    console.log(`
      **************************************************
      *                                                
      *  Migration completed                           
      *  Success: ${succeededRows}                                    
      *  Failed: ${failedRows}                                     
      *  Total: ${processedCount}                                      
      *                                                
      **************************************************
      `);
  }
}

/**
 * Enums for JSON file types.
 */
export enum JsonFileType {
  SUCCESS = 'success.json',
  FAILURE = 'failure.json',
  CREATED_ZAAKURLS = 'createdzaakurls.json',
  PROCESSED_ROWS = 'processedrows.json',
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
 * openwave-export-20241220.xslx
 *
 */
export async function runMigration(inputFileName: string = 'openwave-export-20241220.xlsx'): Promise<void> {
  const migrator = new RxMissionMigratie(inputFileName);
  await migrator.migrateData();
}

if (require.main === module) {
  runMigration()
    .then(() => console.log('Migration finished!'))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}