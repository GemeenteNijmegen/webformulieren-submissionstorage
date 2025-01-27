import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { HandleRxMissionMigration } from './HandleRxMissionMigration';
import { ZaakNotFoundError } from '../../app/zgw/zgwClient/ZgwClient';

/**
 * Load local .env file
 */
dotenv.config({ path: './.env' });

/**
 * Run with npx ts-node ./src/migrations/micro-migratie-rxmission/RxMissionDeleteZaken.ts
 * Deletes all zaken in all files in the `folderName` with default ztobedeleted
 * Expects an array of zaakUrls in the files - which the migration creates in createdzaakurls.json
 * If the zaak is not found it will not delete. You can place as many files in the folder, even if they already have been deleted.
 */
export class RxMissionDeleteZaken {
  private deleteFolder: string;
  private baseOutputDir: string;
  private zaakurls: string[];

  constructor(folderName = 'ztobedeleted') {
    // Ensure the environment is PREPROD
    // if (process.env.RX_ENV !== 'PREPROD') {
    //   throw new Error('Environment is not PREPROD. Operation aborted.');
    // }

    console.log('Environment verified: PREPROD');

    this.baseOutputDir = path.join(__dirname, 'output');
    this.deleteFolder = path.join(this.baseOutputDir, folderName);
    this.zaakurls = this.loadZaakUrls(); // Load zaak URLs from the folder
  }

  /**
   * Load zaak URLs from all JSON files in the deleteFolder
   */
  private loadZaakUrls(): string[] {
    if (!fs.existsSync(this.deleteFolder)) {
      throw new Error(`Delete folder does not exist: ${this.deleteFolder}`);
    }

    const files = fs.readdirSync(this.deleteFolder);
    console.log(`Found ${files.length} file(s) in delete folder.`);

    const zaakUrls: string[] = [];

    files.forEach((file) => {
      const filePath = path.join(this.deleteFolder, file);

      if (path.extname(file) === '.json') {
        try {
          const fileContents = fs.readFileSync(filePath, 'utf-8');
          const urls = JSON.parse(fileContents);

          if (Array.isArray(urls)) {
            zaakUrls.push(...urls);
          } else {
            console.warn(`File ${file} does not contain an array. Skipping.`);
          }
        } catch (error: any) {
          console.error(`Error reading or parsing file ${file}: ${error.message}`);
        }
      } else {
        console.warn(`File ${file} is not a JSON file. Skipping.`);
      }
    });

    console.log(`Loaded ${zaakUrls.length} zaak URLs.`);
    return zaakUrls;
  }

  /**
   * Delete all zaken in the loaded zaakurls
   */
  public async deleteZaken() {
    const handleMigration = new HandleRxMissionMigration(process.env.RX_ENV === "PROD");
    const totalZaken = this.zaakurls.length; // Total number of zaakUrls
    let processedCount = 0;
    let notFound = 0;
    let deleted = 0;

    // Record start time
    const startTime = Date.now();
    console.log(`Starting delete: ${totalZaken} rows to process.`);

    for (const zaakUrl of this.zaakurls) {

      processedCount++;
      console.log(`Processing row ${processedCount} of ${totalZaken} (${((processedCount / totalZaken) * 100).toFixed(2)}%)`);
      await new Promise(resolve => setTimeout(resolve, 500)); // To prevent Rate Limit error
      let zaak: any | undefined = undefined;

      try {
        const singleZaak = await handleMigration.getSingleZaak(zaakUrl);
        if (!!singleZaak) {
          zaak = singleZaak;
        }
      } catch (error: any) {
        if (!(error instanceof ZaakNotFoundError)) {
          console.error(`Get Zaak failed (not ZaakNotFoundError): ${error.message}`);
        } else {
          notFound++;
        }
      }

      if (!!zaak) {
        // Verwijder rollen, resultaten en eigenschappen voordat de zaak verwijderd wordt
        try {
          if (zaak.rollen) {
            for (const rol of zaak.rollen) {
              await handleMigration.deleteZaakApiObject(rol, 'rol');
            }
          }
          if (zaak.eigenschappen) {
            for (const eigenschap of zaak.eigenschappen) {
              await handleMigration.deleteZaakApiObject(eigenschap, 'eigenschap');
            }
          }
          if (zaak.resultaten) {
            for (const resultaat of zaak.resultaten) {
              await handleMigration.deleteZaakApiObject(resultaat, 'resultaat');
            }
          }
        } catch (error: any) {
          console.error(`Failed to delete rollen, resultaten and or eigenschappen from zaak ${zaakUrl}: ${error.message}`);
        }

        try {
          await handleMigration.deleteZaakApiObject(zaakUrl);
          deleted++;
        } catch (error: any) {
          console.error(`Failed to delete zaak ${zaakUrl}: ${error.message}`);
        }
      }
    }
    const endTime = Date.now();
    const elapsedMilliseconds = endTime - startTime;
    const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    console.log(`
      **************************************************
      *  Delete completed on ${process.env.RX_ENV}                              
      *  NotFound: ${notFound}                         
      *  Deleted: ${deleted}                           
      *  Total Processed: ${processedCount}     
      * 
      *  ElapsedTime: ${minutes} minutes and ${seconds} seconds.          
      **************************************************
    `);
  }
}

/**
 * Run the cleanup process
 */
export async function runCleanUp(): Promise<void> {
  const deleteZaken = new RxMissionDeleteZaken();
  await deleteZaken.deleteZaken();
}

if (require.main === module) {
  runCleanUp()
    .then(() => console.log('Cleanup completed!'))
    .catch((error) => {
      console.error('Cleanup failed:', error.message);
      process.exit(1);
    });
}