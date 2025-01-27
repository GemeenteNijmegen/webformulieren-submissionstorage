import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as dotenv from "dotenv";
import { readFile, utils, writeFile } from "xlsx";
import { HandleRxMissionMigration } from "./HandleRxMissionMigration";
/**
 * Load local .env file
 */
dotenv.config({ path: "./.env" });

/**
 * Run with npx ts-node ./src/migrations/micro-migratie-rxmission/RxMissionCorrectieLijsten.ts
 */
export class RxMissionCorrectieLijsten {
  private inputFilePathToRemove: string;
  private outputDir: string;
  private jsonFilePaths: { [key in JsonFileType]: string };
  private logFilePaths: { [key in LogFileType]: string };
  private baseOutputDir: string;
  private migratieType: MigratieType;
  private fullDateTimeNow: string;
  private successJsonFile: string;
  // Folder with specific success.json and list to remove
  private folderName: string;
  private originalExcel: string;

  constructor(
    originalExcelName: string = "openwave-export-20250108-lijst2.xlsx",
    folderName: string = "lijst_2_asbest",
    toRemoveFileName: string = "lijst_2_te_verwijderen.xlsx",
    migratieType: MigratieType = MigratieType.LIJST_1
  ) {
    // if (process.env.RX_ENV !== 'PREPROD') {
    //   throw new Error('Environment is not PREPROD. Operation aborted.');
    //   console.log('Running on PROD: ', process.env.RX_ENV );
    // }

    this.migratieType = migratieType;
    this.fullDateTimeNow = new Date().toLocaleString("nl-NL");

    const timestamp = Date.now(); // Epoch in milliseconds
    this.folderName = folderName;
    this.baseOutputDir = path.join(__dirname, "output");
    this.outputDir = path.join(
      this.baseOutputDir,
      `correctielijsten_${process.env.RX_ENV}_${this.migratieType}_${timestamp}`
    );
    this.originalExcel = path.join(
      __dirname,
      "sensitive-files",
      originalExcelName
    );
    this.inputFilePathToRemove = path.join(
      __dirname,
      "sensitive-files",
      this.folderName,
      toRemoveFileName
    ); // in subfolder
    this.successJsonFile = path.join(
      __dirname,
      "sensitive-files",
      folderName,
      process.env.RX_ENV!,
      "success.json"
    );

    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Initialize JSON and log files
    this.jsonFilePaths = {
      [JsonFileType.SUCCESS]: this.initJsonFile(JsonFileType.SUCCESS, []),
      [JsonFileType.FAILURE]: this.initJsonFile(JsonFileType.FAILURE, []),
      [JsonFileType.PROCESSED_ROWS]: this.initJsonFile(
        JsonFileType.PROCESSED_ROWS,
        []
      ), // Can be used to start processing from a certain row if interrupted
      [JsonFileType.VERWIJDER_ZAAK_URLS]: this.initJsonFile(
        JsonFileType.VERWIJDER_ZAAK_URLS,
        []
      ),
      [JsonFileType.OVERGEBLEVEN_ZAAK_URLS]: this.initJsonFile(
        JsonFileType.OVERGEBLEVEN_ZAAK_URLS,
        []
      ),
      [JsonFileType.VERWIJDER_EXCEL]: this.initJsonFile(
        JsonFileType.VERWIJDER_EXCEL,
        []
      ),
      [JsonFileType.OVERGEBLEVEN_EXCEL]: this.initJsonFile(
        JsonFileType.OVERGEBLEVEN_EXCEL,
        []
      ),
    };

    this.logFilePaths = {
      [LogFileType.ERROR_LOG]: this.initLogFile(
        LogFileType.ERROR_LOG,
        `ERROR LOG ${this.migratieType} ${process.env.RX_ENV} ${this.fullDateTimeNow} \n`
      ),
      [LogFileType.LOGS]: this.initLogFile(
        LogFileType.LOGS,
        `GENERAL LOGS ${this.migratieType} ${process.env.RX_ENV} ${this.fullDateTimeNow}\n`
      ),
      [LogFileType.WHEN_DELETED]: this.initLogFile(
        LogFileType.WHEN_DELETED,
        ` WHEN_DELETED ${this.migratieType} ${process.env.RX_ENV} ${this.fullDateTimeNow}\n`
      ),
    };
  }

  /**
   * Initialize a JSON file with a default array value.
   */
  private initJsonFile(fileType: JsonFileType, defaultValue: any): string {
    const filePath = path.resolve(this.outputDir, fileType);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
    }
    return filePath;
  }

  /**
   * Initialize a log file with a default string value.
   */
  private initLogFile(fileType: LogFileType, defaultValue: string): string {
    const filePath = path.resolve(this.outputDir, fileType);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, defaultValue, "utf8");
    }
    return filePath;
  }

  /**
   * Append data to a JSON file.
   */
  private appendToJsonFile(fileType: JsonFileType, data: any): void {
    const filePath = this.jsonFilePaths[fileType];
    const existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    existingData.push(data);
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), "utf8");
  }

  /**
   * Append a message to a log file.
   */
  private appendToLogFile(fileType: LogFileType, message: string): void {
    const filePath = this.logFilePaths[fileType];
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(filePath, logMessage, "utf8");
  }

  /**
   * Read the Excel file and convert it to JSON.
   */
  private readExcelFile(file: string): any[] {
    const workbook = readFile(file);
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
    const processedValues = JSON.parse(
      fs.readFileSync(this.jsonFilePaths[JsonFileType.PROCESSED_ROWS], "utf8")
    );
    return processedValues.includes(uniqueID);
  }

  /**
   * Main migration process.
   */
  public async generateCorrectieLijsten(): Promise<void> {
    const rows = this.readExcelFile(this.originalExcel); // Originele excel
    const toBeDeletedRows = this.readExcelFile(this.inputFilePathToRemove); // Moeten verwijderd worden
    const successFile: ZaakSuccessJson[] = JSON.parse(
      fs.readFileSync(this.successJsonFile, "utf8")
    ); // De geslaagde aangemaakte zaken

    const teVerwijderenUrls: string[] = [];
    const overgeblevenUrls: string[] = [];

    const handleMigration = new HandleRxMissionMigration(
      process.env.RX_ENV === "PROD",
      this.migratieType
    ); // Nodig om zaak op te halen
    const totalRows = rows.length;
    let processedCount = 0;
    let failedRows = 0;
    let succeededRows = 0;
    let deleted = 0;
    let overgebleven = 0;

    // Record start time
    const startTime = Date.now();
    console.log(
      `Starting correction lists ${this.migratieType}: ${totalRows} rows to process.`
    );

    // Add headers
    this.appendToJsonFile(JsonFileType.VERWIJDER_EXCEL, [
      "openwavezaaknummer",
      "rxmissionzaaknummer",
      "redenverwijderen",
      "zaakurl",
    ]);
    this.appendToJsonFile(JsonFileType.OVERGEBLEVEN_EXCEL, [
      "openwavezaaknummer",
      "rxmissionzaaknummer",
      "redenoverblijven",
      "zaakurl",
    ]);

    for (const row of rows) {
      this.appendToLogFile(
        LogFileType.LOGS,
        `Start processing row ${processedCount} of ${totalRows} (${(
          (processedCount / totalRows) *
          100
        ).toFixed(2)}%)`
      );
      processedCount++;

      console.log(
        `Processing row ${processedCount} of ${totalRows} (${(
          (processedCount / totalRows) *
          100
        ).toFixed(2)}%)`
      );

      if (
        this.isRowProcessed(
          `${processedCount.toString()}${row.openwavezaaknummer}`
        )
      ) {
        this.appendToLogFile(
          LogFileType.ERROR_LOG,
          `Row already processed: ${row.openwavezaaknummer}`
        );
        continue;
      }

      try {
        // row.openzaaknummer objecten ophalen uit success
        const foundRxMissionZaken = successFile.filter(
          (success) => success.row == row.openwavezaaknummer
        );
        if (!foundRxMissionZaken || foundRxMissionZaken.length < 1) {
          this.appendToLogFile(
            LogFileType.ERROR_LOG,
            `Failed to process row ${processedCount}: ${row.openwavezaaknummer}. Row not found in successjson.`
          );
          throw Error(
            `[1] Failed to process row ${processedCount}: ${row.openwavezaaknummer}. Row not found in successjson.`
          );
        }

        const removeRows = async (
          foundZaken: ZaakSuccessJson[],
          cause: string = "unknown"
        ) => {
          for (const foundZaak of foundZaken) {
            if (teVerwijderenUrls.includes(foundZaak.url)) {
              // foundZaak has already been included in to be deleted
              this.appendToLogFile(
                LogFileType.LOGS,
                `Present in toVerwijderenUrls: ${foundZaak.row} ${foundZaak.identification} ${foundZaak.url} `
              );
              // Niet nog een keer toevoegen deze is al verwerkt
            } else {
              // Nog niet in te verwijderen, dus toevoegen
              teVerwijderenUrls.push(foundZaak.url);
              this.appendToJsonFile(
                JsonFileType.VERWIJDER_ZAAK_URLS,
                foundZaak.url
              );
              this.appendToJsonFile(JsonFileType.VERWIJDER_EXCEL, [
                foundZaak.row,
                foundZaak.identification,
                cause,
                foundZaak.url,
              ]);
              deleted++;
              this.appendToLogFile(
                LogFileType.WHEN_DELETED,
                `${processedCount}: DELETED ${foundZaak.identification} ${cause} ${foundZaak.row} ${row.openwavezaaknummer}`
              );
            }
          }
        };
        const overgeblevenExcel = async (
          foundZaak: ZaakSuccessJson,
          cause: string = "unknown"
        ) => {
          if (overgeblevenUrls.includes(foundZaak.url)) {
            // foundZaak has already been included in to be deleted
            this.appendToLogFile(
              LogFileType.LOGS,
              `Present in overgeblevenUrls: ${foundZaak.row} ${foundZaak.identification} ${foundZaak.url} `
            );
            // Niet nog een keer toevoegen deze is al verwerkt
          } else {
            overgeblevenUrls.push(foundZaak.url);
            this.appendToJsonFile(
              JsonFileType.OVERGEBLEVEN_ZAAK_URLS,
              foundZaak.url
            );
            // Add to overgebleven excel. Die is dus verwerkt
            this.appendToJsonFile(JsonFileType.OVERGEBLEVEN_EXCEL, [
              foundZaak.row,
              foundZaak.identification,
              cause,
              foundZaak.url,
            ]);
            overgebleven++;
            this.appendToLogFile(
              LogFileType.WHEN_DELETED,
              `${processedCount}: OVERGEBLEVEN ${foundZaak.identification} ${cause} ${foundZaak.row} ${row.openwavezaaknummer}`
            );
          }
        };

        const rowInToBeDeleted: Row | undefined = toBeDeletedRows.find(
          (deleteRow) => deleteRow.openwavezaaknummer == row.openwavezaaknummer
        );
        if (rowInToBeDeleted) {
          await removeRows(foundRxMissionZaken, "Excel");
        } else if (foundRxMissionZaken.length == 1) {
          // Niet in to be deleted en maar 1 zaak gevonden, dus blijft over
          await overgeblevenExcel(foundRxMissionZaken[0], "1 Zaak in success");
        } else {
          // Meerdere zaken, bewaar alleen die met rol: aanvrager hiervoor is een call naar RxMission nodig.
          await new Promise((resolve) => setTimeout(resolve, 500)); // To prevent Rate Limit error

          for (const foundZaak of foundRxMissionZaken) {
            let zaak: any | undefined;
            try {
              const singleZaak = await handleMigration.getSingleZaak(
                foundZaak.url
              );
              if (!!singleZaak) {
                zaak = singleZaak;
              }
            } catch (error: any) {
              this.appendToLogFile(
                LogFileType.ERROR_LOG,
                `Ophalen van singlezaak failed: ${processedCount}: ${foundZaak.identification} ${foundZaak.url} ${row.openwavezaaknummer}.`
              );
            }

            if (!!zaak && zaak.toelichting) {
              const toelichting = zaak.toelichting.toLowerCase();
              let aanvrager: boolean = false;
              let rol: string | undefined = undefined;
              if (toelichting.includes("rol:")) {
                const startIndex = toelichting.indexOf("rol:") + "rol:".length;
                // Haal de substring van 30 tekens na "rol:" (of tot het einde als minder dan 30 karakters)
                rol = toelichting.substring(startIndex, startIndex + 30);
                aanvrager = !!rol && rol.includes("aanvrager");
              }

              if (!rol) {
                this.appendToLogFile(
                  LogFileType.ERROR_LOG,
                  `!!!!Dubbele zaak, maar geen rol in toelichting: ${processedCount}: ${foundZaak.identification} ${foundZaak.url} ${row.openwavezaaknummer}.`
                );
                throw Error(
                  `[2] !!!!Dubbele zaak, maar geen rol in toelichting: ${processedCount}: ${foundZaak.identification} ${foundZaak.url} ${row.openwavezaaknummer}.`
                );
              }
              if (aanvrager) {
                await overgeblevenExcel(foundZaak, "aanvrager rol");
              } else {
                // Geen aanvrager in rol. Dus dubbele zaak zonder aanvrager
                await removeRows([foundZaak], "geen aanvrager in rol");
              }
            } else {
              this.appendToLogFile(
                LogFileType.ERROR_LOG,
                `Geen zaak of toelichting in zaak: ${processedCount}: ${foundZaak.identification} ${foundZaak.url} ${row.openwavezaaknummer}.`
              );
              throw Error(
                `[3]Geen zaak of toelichting in zaak: ${processedCount}: ${foundZaak.identification} ${foundZaak.url} ${row.openwavezaaknummer}.`
              );
            }
          }
        }

        this.appendToJsonFile(
          JsonFileType.PROCESSED_ROWS,
          `${processedCount.toString()}${row.openwavezaaknummer}`
        );
        this.appendToLogFile(
          LogFileType.LOGS,
          `Successfully processed row ${processedCount}: ${row.openwavezaaknummer}.`
        );
        succeededRows++;
      } catch (error: any) {
        this.appendToLogFile(
          LogFileType.ERROR_LOG,
          `Failed to process row ${processedCount}: ${
            row.openwavezaaknummer
          }. ${error.message || error}`
        );
        this.appendToJsonFile(JsonFileType.FAILURE, {
          row,
          error: error.message || error,
        });
        failedRows++;
      }
    }

    /**
     * Logging end result
     */
    const endTime = Date.now();
    const elapsedMilliseconds = endTime - startTime;
    const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const summary = `
      **************************************************
      *                                                
      *  CorrectieLijst ${this.migratieType} completed for ${process.env.RX_ENV}                          
      *  Success: ${succeededRows}                                    
      *  Failed: ${failedRows}                                     
      *  Total: ${processedCount}
      * 
      *  Deleted: ${deleted}
      *  Overgebleven: ${overgebleven}   
      *  
      *  Started: ${this.fullDateTimeNow}
      *  ElapsedTime: ${minutes} minutes and ${seconds} seconds.                                       
      *                                                
      **************************************************
      `;
    console.log(summary);
    this.appendToLogFile(LogFileType.LOGS, summary);

    // Make excel in this.outputdir with two tabs
    const verwijderdeZaken: any[][] = JSON.parse(
      fs.readFileSync(this.jsonFilePaths[JsonFileType.VERWIJDER_EXCEL], "utf8")
    ); // Array of arrays with headers in first one
    const overgeblevenZaken: any[][] = JSON.parse(
      fs.readFileSync(
        this.jsonFilePaths[JsonFileType.OVERGEBLEVEN_EXCEL],
        "utf8"
      )
    ); // Array of arrays with headers in first one

    const workbook = utils.book_new();
    const worksheetVerwijderd = utils.aoa_to_sheet(verwijderdeZaken);
    const worksheetOvergebleven = utils.aoa_to_sheet(overgeblevenZaken);
    utils.book_append_sheet(workbook, worksheetVerwijderd, "Verwijderd");
    utils.book_append_sheet(workbook, worksheetOvergebleven, "Overgebleven");
    writeFile(
      workbook,
      path.join(
        this.outputDir,
        `RxMission_Overview_${process.env.RX_ENV}_${
          (this, this.migratieType)
        }.xlsx`
      )
    );

    // Check of te verwijderen overeenkomt
    const urlsForDeleteJSON: string[] = JSON.parse(
      fs.readFileSync(
        this.jsonFilePaths[JsonFileType.VERWIJDER_ZAAK_URLS],
        "utf8"
      )
    );

    const deleteCheck = `
    **************************************************
    *                                                
    *  CorrectieLijst ${this.migratieType} deletecheck
    *  Bestand: ${urlsForDeleteJSON.length}
    *  Excel: ${verwijderdeZaken.length}
    *  Code: ${teVerwijderenUrls.length}                                                          
    *                                                
    **************************************************
    `;
    console.log(deleteCheck);
    this.appendToLogFile(LogFileType.LOGS, deleteCheck);
  }
}

/**
 * Enums for JSON file types.
 */
export enum JsonFileType {
  VERWIJDER_ZAAK_URLS = "verwijder_zaak_urls.json",
  OVERGEBLEVEN_ZAAK_URLS = "overgebleven_zaak_urls.json",
  VERWIJDER_EXCEL = "verwijder_excel.json",
  OVERGEBLEVEN_EXCEL = "overgebleven.json",
  PROCESSED_ROWS = "processedrows.json",
  FAILURE = "failure.json",
  SUCCESS = "success.json",
}

/**
 * Enums for log file types.
 */
export enum LogFileType {
  ERROR_LOG = "errors.log",
  LOGS = "general_logs.log",
  WHEN_DELETED = "when_deleted.log",
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
  typecontact?: "Niet-natuurlijk persoon" | "Natuurlijk persoon" | "";
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

export interface ZaakSuccessJson {
  url: string;
  identification: string;
  zaakgeometrieAdded?: boolean;
  row: string;
  status?: boolean;
  corsa?: string;
  openwave?: string;
  rol?: string;
  resultaat?: string;
}
/**
 * De migraties kunnen verschillen afhankelijk van de geexporteerde lijst.
 * Op basis daarvan wordt de zaak anders aangemaakt. Bijvoorbeeld een ander product, verschillende rollen en resultaat.
 * Deze type lijsten kunnen later weer terugkomen, dus onderscheid wordt gemaakt door deze enum waar nodig.
 */
export enum MigratieType {
  LIJST_1 = "LIJST_1",
  LIJST_2 = "LIJST_2",
}

/**
 * Entry point for the script.
 *
 * npx ts-node ./src/migrations/micro-migratie-rxmission/RxMissionCorrectieLijsten.ts
 * 'lijst_2_asbest', inputFileName: string = 'lijst_2_te_verwijderen.xlsx', migratieType: MigratieType = MigratieType.LIJST_1, ontdubbelen: boolean = false) {
 */

export async function runCorrectieLijsten(
    originalExcel: string = "openwave-export-20241220-lijst-1.xlsx",
    folderName: string = "lijst_1_asbest",
    inputFileName: string = "lijst_1_te_verwijderen.xlsx",
    migratieType: MigratieType = MigratieType.LIJST_1
  ): Promise<void> {


// export async function runCorrectieLijsten(
//   originalExcel: string = "openwave-export-20250108-lijst2.xlsx",
//   folderName: string = "lijst_2_asbest",
//   inputFileName: string = "lijst_2_te_verwijderen.xlsx",
//   migratieType: MigratieType = MigratieType.LIJST_2
// ): Promise<void> {
  const confirm = await confirmProdEnvironment(inputFileName);
  if (!confirm) {
    console.log("Correctielijsten aborted.");
    process.exit(0);
  }
  const migrator = new RxMissionCorrectieLijsten(
    originalExcel,
    folderName,
    inputFileName,
    migratieType
  );
  await migrator.generateCorrectieLijsten();
}

/**
 * Prompt user for confirmation when running on PROD
 */
async function confirmProdEnvironment(fileName: string): Promise<boolean> {
  if (process.env.RX_ENV !== "PROD") {
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
        resolve(answer.toLowerCase() === "yes");
      }
    );
  });
}

if (require.main === module) {
  runCorrectieLijsten()
    .then(() => console.log("Migration finished!"))
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
