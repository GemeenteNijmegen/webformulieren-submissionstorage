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
 * Run with npx ts-node ./src/migrations/micro-migratie-rxmission/RxMissionMigratie.ts
 */
export class RxMissionMigratie {
  private inputFilePath: string;
  private outputDir: string;
  private jsonFilePaths: { [key in JsonFileType]: string };
  private logFilePaths: { [key in LogFileType]: string };
  private baseOutputDir: string;
  private migratieType: MigratieType;
  private fullDateTimeNow: string;

  constructor(inputFileName: string = 'small-sample-lijst1.xlsx', migratieType: MigratieType = MigratieType.LIJST_1) {
    if (process.env.RX_ENV !== 'PREPROD') {
      throw new Error('Environment is not PREPROD. Operation aborted.');
      console.log('Running on PROD: ', process.env.RX_ENV );
    }

    this.migratieType = migratieType;
    this.fullDateTimeNow = new Date().toLocaleString('nl-NL');

    const timestamp = Date.now(); // Epoch in milliseconds
    this.baseOutputDir = path.join(__dirname, 'output');
    this.outputDir = path.join(this.baseOutputDir, `migrate_${process.env.RX_ENV}_${this.migratieType}_${timestamp}`);
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
      [LogFileType.ERROR_LOG]: this.initLogFile(LogFileType.ERROR_LOG, `ERROR LOG ${this.migratieType} ${process.env.RX_ENV} ${this.fullDateTimeNow} \n`),
      [LogFileType.LOGS]: this.initLogFile(LogFileType.LOGS, `GENERAL LOGS ${this.migratieType} ${process.env.RX_ENV} ${this.fullDateTimeNow}\n`),
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
  private isRowProcessed(uniqueID: string): boolean {
    //const filePath = path.resolve(this.baseOutputDir, JsonFileType.PROCESSED_ROWS);
    //const processedValues = JSON.parse(fs.readFileSync(this.jsonFilePaths[JsonFileType.PROCESSED_ROWS], 'utf8'));
    const processedValues = JSON.parse(fs.readFileSync(this.jsonFilePaths[JsonFileType.PROCESSED_ROWS], 'utf8'));
    return processedValues.includes(uniqueID);
  }

  /**
   * Main migration process.
   */
  public async migrateData(): Promise<void> {
    const rows = this.readExcelFile();
    const handleMigration = new HandleRxMissionMigration(process.env.RX_ENV === 'PROD', this.migratieType);
    const totalRows = rows.length;
    let processedCount = 0;
    let failedRows = 0;
    let succeededRows = 0;

    // Record start time
    const startTime = Date.now();
    console.log(`Starting migration ${this.migratieType}: ${totalRows} rows to process.`);

    for (const row of rows) {
      processedCount++;

      console.log(`Processing row ${processedCount} of ${totalRows} (${((processedCount / totalRows) * 100).toFixed(2)}%)`);
      await new Promise(resolve => setTimeout(resolve, 500)); // To prevent Rate Limit error

      if (this.isRowProcessed(`${processedCount.toString()}${row.openwavezaaknummer}`)) {
        this.appendToLogFile(LogFileType.ERROR_LOG, `Row already processed: ${row.openwavezaaknummer}`);
        continue;
      }

      try {
        const successLog: any = {}; // add properties to the successlog
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
        let rol: any = undefined;
        switch (this.migratieType) {
          case MigratieType.LIJST_1:
            rol = await handleMigration.addRol(zaak.url, row, 'INITIATOR');
            break;
          case MigratieType.LIJST_2:
            rol = await handleMigration.addRol(zaak.url, row, 'BELANGHEBBENDE');
            break;
          default:
            rol = undefined;
        }
        if (!rol) { this.appendToLogFile(LogFileType.ERROR_LOG, `${processedCount}: No rol added ${zaak.identification} - ${zaak.url} - ${row.openwavezaaknummer}.`); }

        // TODO: nu wordt er geen resultaat toegevoegd
        if (this.migratieType === MigratieType.LIJST_1) {
          //zaakresultaat
          const resultaat = await handleMigration.addResultaat(zaak.url, row);
          if (!resultaat) { this.appendToLogFile(LogFileType.ERROR_LOG, `${processedCount}: No resultaat added ${zaak.identification} - ${zaak.url} - ${row.openwavezaaknummer}.`); }
          successLog.resultaat = resultaat;
        }

        this.appendToJsonFile(JsonFileType.PROCESSED_ROWS, `${processedCount.toString()}${row.openwavezaaknummer}`);
        this.appendToJsonFile(JsonFileType.SUCCESS, { ...zaak, row: row.openwavezaaknummer, status: status, ...eigenschappen, rol, ...successLog });
        this.appendToLogFile(LogFileType.LOGS, `Successfully processed row ${processedCount}: ${row.openwavezaaknummer}. Zaak: ${zaak.identification}, ${zaak.url}.`);
        succeededRows++;
      } catch (error: any) {
        this.appendToLogFile(LogFileType.ERROR_LOG, `Failed to process row ${processedCount}: ${row.openwavezaaknummer}. ${error.message ||error}`);
        this.appendToJsonFile(JsonFileType.FAILURE, { row, error: error.message ||error });
        failedRows++;
      }
    }
    const endTime = Date.now();
    const elapsedMilliseconds = endTime - startTime;
    const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const summary = `
      **************************************************
      *                                                
      *  Migration ${this.migratieType} completed for ${process.env.RX_ENV}                          
      *  Success: ${succeededRows}                                    
      *  Failed: ${failedRows}                                     
      *  Total: ${processedCount}
      *  
      *  Started: ${this.fullDateTimeNow}
      *  ElapsedTime: ${minutes} minutes and ${seconds} seconds.                                       
      *                                                
      **************************************************
      `;
    console.log(summary);
    this.appendToLogFile(LogFileType.LOGS, summary);

    const success = JSON.parse(fs.readFileSync(this.jsonFilePaths[JsonFileType.SUCCESS], 'utf8'));
    const report = generateMissingOverviewWithCounts(success);
    this.appendToLogFile(LogFileType.LOGS, report);
  }
}

/**
 * Maak een rapport
 */

interface SuccessItem {
  identification: string;
  row: string;
  zaakgeometrieAdded?: boolean;
  corsa?: string;
  rol?: string;
}

export function generateMissingOverviewWithCounts(data: SuccessItem[]): string {
  const missingZaakgeometrie: { identification: string; row: string }[] = [];
  const missingRol: { identification: string; row: string }[] = [];
  const missingCorsa: { identification: string; row: string }[] = [];

  data.forEach((item) => {
    if (!item.zaakgeometrieAdded) {
      missingZaakgeometrie.push({ identification: item.identification, row: item.row });
    }
    if (!item.rol) {
      missingRol.push({ identification: item.identification, row: item.row });
    }
    if (!item.corsa) {
      missingCorsa.push({ identification: item.identification, row: item.row });
    }
  });

  let report = 'Missing Overview:\n\n';

  if (missingZaakgeometrie.length > 0) {
    report += `Geen Zaakgeometrie (${missingZaakgeometrie.length}):\n`;
    missingZaakgeometrie.forEach((item) => {
      report += `- ${item.identification} - ${item.row}\n`;
    });
  }

  if (missingRol.length > 0) {
    report += `\nGeen Rol (${missingRol.length}):\n`;
    missingRol.forEach((item) => {
      report += `- ${item.identification} - ${item.row}\n`;
    });
  }

  if (missingCorsa.length > 0) {
    report += `\nGeen Corsa (${missingCorsa.length}):\n`;
    missingCorsa.forEach((item) => {
      report += `- ${item.identification} - ${item.row}\n`;
    });
  }

  report += '\nTotaal ontbrekende onderdelen:\n';
  report += `- Geen Zaakgeometrie: ${missingZaakgeometrie.length}\n`;
  report += `- Geen Rol: ${missingRol.length}\n`;
  report += `- Geen Corsa: ${missingCorsa.length}\n`;

  return report;
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
  zaakomschrijving: any;
  zaaktype?: any;
  bsn?: any;
  kvk?: any;
  contactpersoon?: any;
  email?: any;
  telefoon?: any;
  typecontact?: 'Niet-natuurlijk persoon' | 'Natuurlijk persoon' | '';
  urlopenwave?: any;
  urlcorsa?: any;
  locatie?: any;
  zaakgeometrie?: any;
  activiteiten?: any;
  producten?: any;
  oorsprong?: any;

  // Lijst_1
  cbopenwavezaaknummer?: any;
  zaakresultaat?: any;

  // Lijst_2
  rol?: any;
  behandelaar?: any;
  medezaakverantwoordelijke?: any;
  notities?: any;
  bagrelevant?: any;
  zakengroep?: any;
  openstaandeadviezen?: any;
  afgehandeldeadviezen?: any;
}


/**
 * De migraties kunnen verschillen afhankelijk van de geexporteerde lijst.
 * Op basis daarvan wordt de zaak anders aangemaakt. Bijvoorbeeld een ander product, verschillende rollen en resultaat.
 * Deze type lijsten kunnen later weer terugkomen, dus onderscheid wordt gemaakt door deze enum waar nodig.
 */
export enum MigratieType {
  LIJST_1 = 'LIJST_1',
  LIJST_2 = 'LIJST_2',
};

/**
 * Entry point for the script.
 * one-row-lijst1.xlsx en small-sample-lijst1.xlsx voor testen
 * openwave-export-20241220-lijst-1.xlsx
 *
 * npx ts-node ./src/migrations/micro-migratie-rxmission/RxMissionMigratie.ts
 */
export async function runMigration(inputFileName: string = 'openwave-export-20250108-lijst2.xlsx', migratieType: MigratieType = MigratieType.LIJST_2): Promise<void> {
  const confirm = await confirmProdEnvironment(inputFileName);
  if (!confirm) {
    console.log('Migration aborted.');
    process.exit(0);
  }
  const migrator = new RxMissionMigratie(inputFileName, migratieType);
  await migrator.migrateData();
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
  runMigration()
    .then(() => console.log('Migration finished!'))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}