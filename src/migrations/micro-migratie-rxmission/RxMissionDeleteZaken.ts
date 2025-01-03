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
 */
export class RxMissionDeleteZaken {
  private deleteFolder: string;
  private baseOutputDir: string;
  private zaakurls: string[];

  constructor(folderName = 'ztobedeleted') {
    // Ensure the environment is PREPROD
    if (process.env.RX_ENV !== 'PREPROD') {
      throw new Error('Environment is not PREPROD. Operation aborted.');
    }

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
    const handleMigration = new HandleRxMissionMigration();
    const totalZaken = this.zaakurls.length; // Total number of zaakUrls
    let processedCount = 0;
    let notFound = 0;
    let deleted = 0;

    console.log(`Starting migration: ${totalZaken} rows to process.`);

    for (const zaakUrl of this.zaakurls) {

      processedCount++;
      console.log(`Processing row ${processedCount} of ${totalZaken} (${((processedCount / totalZaken) * 100).toFixed(2)}%)`);
      let zaakPresent = false;

      try {
        const zaak = await handleMigration.getSingleZaak(zaakUrl);
        if (!!zaak) {
          zaakPresent = true;
        }
      } catch (error: any) {
        if (!(error instanceof ZaakNotFoundError)) {
          console.error(`Get Zaak failed (not ZaakNotFoundError): ${error.message}`);
        } else {
          notFound++;
        }
      }

      if (zaakPresent) {
        try {
          await handleMigration.deleteZaak(zaakUrl);
          deleted++;
        } catch (error: any) {
          console.error(`Failed to delete zaak ${zaakUrl}: ${error.message}`);
        }
      }
    }

    console.log(`
      **************************************************
      *  Delete completed                              
      *  NotFound: ${notFound}                         
      *  Deleted: ${deleted}                           
      *  Total Processed: ${processedCount}            
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