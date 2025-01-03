import proj4 from 'proj4';

/**
 * Class cleans the string input from empty spaces, trailing comma's 
 * Transforms from Rijksdriehoek to GeoJSON fo ZGW api calls
 * Returns undefined if transform fails
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
        +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812`
      ]
    ]);
  }

  /**
   * Cleans and parses the geometry string.
   * The excel provides a string that cannot be converted without cleaning
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
   * Transforms coordinates from EPSG:28992 to EPSG:4326.
   * Only MultiPolygon, Polygon, Point or Multipoint
   * Omitted LineString, MultiLineString and GeometryCollection (not present in migration)
   */
  private transformCoordinates(coordinates: any): any {
    if (Array.isArray(coordinates[0][0])) {
      // MultiPolygon or Polygon
      return coordinates.map((ring: any) =>
        ring.map((coordinate: number[]) =>
          proj4('EPSG:28992', 'EPSG:4326', coordinate)
        )
      );
    } else {
      // Point or MultiPoint
      return coordinates.map((coordinate: number[]) =>
        proj4('EPSG:28992', 'EPSG:4326', coordinate)
      );
    }
  }

  /**
   * Transforms a GeoJSON geometry from EPSG:28992 to EPSG:4326.
   */
  private transformGeometry(geometry: any): any | undefined {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      console.error('Invalid or unsupported geometry format.');
      return undefined;
    }

    try {
      const transformedCoordinates = this.transformCoordinates(geometry.coordinates);

      return {
        ...geometry,
        coordinates: transformedCoordinates,
      };
    } catch (error: any) {
      console.error(`Error transforming geometry: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Full pipeline: Clean, parse, and transform the geometry.
   */
  public processGeometry(input: string): any | undefined {
    const parsedGeometry = this.cleanAndParseGeometry(input);

    if (!parsedGeometry) {
      console.error('Parsing failed. Returning undefined.');
      return undefined;
    }

    const transformedGeometry = this.transformGeometry(parsedGeometry);

    if (!transformedGeometry) {
      console.error('Transformation failed. Returning undefined.');
      return undefined;
    }

    return transformedGeometry;
  }
}