import proj4 from 'proj4';

/**
 * Class cleans the string input from empty spaces, trailing comma's
 * The cleaning is specific for the input from the migration excel
 * Transforms from Rijksdriehoek to WSG84 for ZGW api calls
 * Returns undefined if transform fails to prevent zaak creation
 */
export class GeometrieTransformer {
  constructor() {
    // Define Rijksdriehoek (EPSG:28992), not in proj4 presets
    proj4.defs([
      [
        'EPSG:28992',
        `+title=Amersfoort/Amersfoort +proj=sterea 
        +lat_0=52.15616055555555 +lon_0=5.38763888888889 
        +k=0.999908 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +no_defs 
        +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812`,
      ],
    ]);
  }

  /**
   * Cleans and parses the geometry string.
   * The excel provides a string that cannot be converted without cleaning.
   */
  private cleanAndParseGeometry(input: string): any | undefined {
    if (!input) {
      console.error('Geometry input is missing or invalid.');
      return undefined;
    }

    try {
      const cleanedInput = input
        .replace(/\\r|\\n/g, '') // Remove carriage returns and newlines if present
        .replace(/\s+/g, '') // Remove all spaces
        .replace(/,\s*$/, '') // Remove trailing commas if present
        .trim();
      return JSON.parse(cleanedInput);
    } catch (error: any) {
      console.error(`Failed to parse geometry: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Transforms coordinates from EPSG:28992 to EPSG:4326 - RD Amersfoort to World Geodetic System 1984 (WGS84).
   * Only MultiPolygon, Polygon, Point or Multipoint.
   * Omitted LineString, MultiLineString and GeometryCollection (not present in migration).
   */
  async transformCoordinates(coordinates: any, geometryType: string): Promise<any> {
    switch (geometryType) {
      case 'Point':
        // Single coordinate pair
        return proj4('EPSG:28992', 'EPSG:4326', coordinates);

      case 'MultiPoint':
        // Array of coordinate pairs
        return coordinates.map((coordinate: number[]) =>
          proj4('EPSG:28992', 'EPSG:4326', coordinate),
        );

      case 'Polygon':
        // Array of rings (each ring is an array of coordinate pairs)
        return coordinates.map((ring: any) =>
          ring.map((coordinate: number[]) =>
            proj4('EPSG:28992', 'EPSG:4326', coordinate),
          ),
        );

      case 'MultiPolygon':
        // Array of polygons (each polygon contains rings, and rings contain coordinate pairs)
        return coordinates.map((polygon: any) =>
          polygon.map((ring: any) =>
            ring.map((coordinate: number[]) =>
              proj4('EPSG:28992', 'EPSG:4326', coordinate),
            ),
          ),
        );

      default:
        throw new Error(`Unsupported geometry type: ${geometryType}`);
    }
  }

  /**
   * Transforms a GeoJSON geometry from EPSG:28992 to EPSG:4326.
   */
  async transformGeometry(geometry: any): Promise<any | undefined> {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      console.error('Invalid or unsupported geometry format.');
      return undefined;
    }

    try {
      const transformedCoordinates = await this.transformCoordinates(geometry.coordinates, geometry.type);

      return {
        ...geometry,
        coordinates: transformedCoordinates,
      };
    } catch (error: any) {
      console.error(`Error transforming geometry: ${error.message}`);
      return undefined;
    }
  }
  async hasCoordinatesWithMoreThanTwoOccurrencesForGeometry(geometry: any): Promise<boolean> {
    const flattenCoordinates = (coordinates: any): number[][] => {
      const flattened: number[][] = [];

      const recurse = (coords: any) => {
        if (Array.isArray(coords[0])) {
          coords.forEach(recurse); // Recursively flatten nested arrays
        } else {
          flattened.push(coords); // Add individual coordinate pairs
        }
      };

      recurse(coordinates);
      return flattened;
    };

    const roundToDecimals = (value: number, decimals: number): number => {
      const factor = Math.pow(10, decimals);
      return Math.round(value * factor) / factor;
    };

    const countOccurrences = (coordinates: number[][]): boolean => {
      const coordinateMap: Record<string, number> = {};

      for (const [x, y] of coordinates) {
        const roundedX = roundToDecimals(x, 3);
        const roundedY = roundToDecimals(y, 3);
        const key = `${roundedX},${roundedY}`;

        coordinateMap[key] = (coordinateMap[key] || 0) + 1;

        if (coordinateMap[key] > 2) {
          return true; // If any rounded coordinate appears more than twice
        }
      }

      return false; // No duplicates with more than two occurrences
    };

    const { type, coordinates } = geometry;

    switch (type) {
      case 'Point':
        // Single coordinate, can't have duplicates
        return false;

      case 'MultiPoint':
      case 'Polygon':
        // Flatten coordinates and count duplicates
        return countOccurrences(flattenCoordinates(coordinates));

      case 'MultiPolygon':
        // MultiPolygon: Each polygon has rings, flatten all into one list
        const flattenedCoordinates = flattenCoordinates(coordinates);
        return countOccurrences(flattenedCoordinates);

      default:
        throw new Error(`Unsupported geometry type: ${type}`);
    }
  }

  /**
   * Full pipeline: Clean, parse, and transform the geometry.
   */
  async processGeometry(input: string): Promise<any | undefined> {
    const parsedGeometry = this.cleanAndParseGeometry(input);

    if (!parsedGeometry) {
      console.error('Parsing failed. Returning undefined.');
      return undefined;
    }

    const transformedGeometry = await this.transformGeometry(parsedGeometry);

    if (!transformedGeometry) {
      console.error('Transformation failed. Returning undefined.');
      return undefined;
    }

    // if (await this.hasCoordinatesWithMoreThanTwoOccurrencesForGeometry(transformedGeometry)) {
    //   console.error('Coordinates have more than two occurences. Returning undefined.');
    //   return undefined;
    // }

    return transformedGeometry;
  }
}