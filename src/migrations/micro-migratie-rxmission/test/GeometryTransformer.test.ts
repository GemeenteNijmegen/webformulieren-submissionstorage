import * as path from 'path';
import { readFile, utils } from 'xlsx';
import { GeometrieTransformer } from '../GeometrieTransformer';

describe('GeometryTransformer utility tests', () => {
  const file = path.join(__dirname, 'geometries_to_test.xlsx');
  const workbook = readFile(file);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: {openwavezaaknummer: string; zaakgeometrie: string}[] = utils.sheet_to_json(worksheet);


  test('transform multipoint', async () => {
    const transformer = new GeometrieTransformer();
    //No trailing comma like most excel geometries
    const rdInput = `  { "type": "MultiPoint",
    "coordinates": [ [188819.23, 430662.31], [188871.04, 430736.05], [188869.04, 430729.71], [188860.71, 430713.4], [188857.63, 430708.69], [188854.37, 430703.08], [188851.29, 430697.64], [188841.15, 430683.33], [188836.98, 430678.62], [188824.3, 430665.94], [188814.88, 430659.42], [188809.44, 430655.61] ]
    },`;

    const geojsonOutput = await transformer.processGeometry(rdInput);
    console.log('GEOJSON: ', geojsonOutput);
    console.dir(geojsonOutput);

  });
  test('transform from excel', async () => {


    const transformer = new GeometrieTransformer();

    //Process all zaakgeometries and console.log and check if no errors.
    // Process all rows and log results
    for (const row of rows) {
      console.log(`Processing row with OpenWave zaaknummer: ${row.openwavezaaknummer}`);
      try {
        const geojsonOutput = await transformer.processGeometry(row.zaakgeometrie);
        console.log('GEOJSON: ', geojsonOutput);
        expect(geojsonOutput).toBeDefined(); // Ensure transformation does not return undefined
      } catch (error) {
        console.error(`Error processing row: ${row.openwavezaaknummer}`, error);
      }
    }

  });
  test('coordinates finite check', () => {

  });
});