import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import { HandleRxMissionMigration } from './HandleRxMissionMigration';


export class RxMissionMigratie {
  private inputFilePath: string;
  private successFilePath: string;
  private failureFilePath: string;

  constructor(inputFileName: string = 'small-sample.xlsx') {
    const outputDir = path.join(__dirname, 'output');
    const timestamp = Date.now(); // Epoch in milliseconds
    this.inputFilePath = path.join(__dirname, 'sensitive-files', inputFileName);
    this.successFilePath = path.resolve(outputDir, `success_${timestamp}.json`);
    this.failureFilePath = path.resolve(outputDir, `failure_${timestamp}.json`);

    // Maak mappen en bestanden aan
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.successFilePath)) {
      fs.writeFileSync(this.successFilePath, JSON.stringify([], null, 2), 'utf8');
    }
    if (!fs.existsSync(this.failureFilePath)) {
      fs.writeFileSync(this.failureFilePath, JSON.stringify([], null, 2), 'utf8');
    }
  }


  private readExcelFile(): any[] {
    const workbook = xlsx.readFile(this.inputFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonWorksheet = xlsx.utils.sheet_to_json(worksheet);
    console.log('JSON WORKSHEET');
    console.dir(jsonWorksheet);
    return jsonWorksheet;
  }

  /**
   * Log success
   * TODO: add something to link new zaaknummer and openwave casenumber
   */
  private logSuccess(row: any): void {
    const successData = JSON.parse(fs.readFileSync(this.successFilePath, 'utf8'));
    successData.push(row);
    fs.writeFileSync(this.successFilePath, JSON.stringify(successData, null, 2), 'utf8');
  }

  /**
   * Log fails
   */
  private logFailure(row: any, error: any): void {
    const failureData = JSON.parse(fs.readFileSync(this.failureFilePath, 'utf8'));
    failureData.push({ row, error: error.message || error });
    fs.writeFileSync(this.failureFilePath, JSON.stringify(failureData, null, 2), 'utf8');
  }

  /**
   * Check if a row has already been processed.
   * TODO: also write to a different file
   */
  private isRowProcessed(row: Row): boolean {
    const successData = JSON.parse(fs.readFileSync(this.successFilePath, 'utf8'));
    return successData.some((r: Row) => r.openwavezaaknummer === row.openwavezaaknummer);
  }

  /**
   * Migration
   */
  public async migrateData(): Promise<void> {
    const rows = this.readExcelFile();
    const handleMigration = new HandleRxMissionMigration(); 

    for (const row of rows) {
      if (this.isRowProcessed(row)) {
        console.log(`Row already processed: ${row.openwavezaaknummer}`);
        continue;
      }

      try {
        const result = await handleMigration.handleMigration(row); // Todo: hier conversie maken en api calls doen
        console.log(`Successfully processed row: ${row.openwavezaaknummer}`);
        this.logSuccess({ openwavezaaknummer: row.openwavezaaknummer, result });
      } catch (error) {
        console.error(`Failed to process row: ${row.openwavezaaknummer}`, error);
        this.logFailure(row, error);
      }
    }

    console.log('migration completed.');
  }
}


/**
 * De kolomnamen zijn aangepast, de originele staan in het OG exceldocument - hier valt moeilijk mee te werken.
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
 * Functie om de migratie eenvoudig aan te roepen.
 * Zorg dat input en output niet meegecommit worden door ze in de folders output en sensitive-files te zetten.
 * inputFileName naam van Excel-bestand in sensitive-files.
 * npx ts-node ./src/migrations/micro-migratie-rxmission/RxMissionMigratie.ts
 */
export async function runMigration(inputFileName: string = 'small-sample.xlsx'): Promise<void> {
  const migrator = new RxMissionMigratie(inputFileName);
  await migrator.migrateData();
}

// Entry point: Run migration if the script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => console.log('Migration finished successfully!'))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}