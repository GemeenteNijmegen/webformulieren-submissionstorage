export interface s3Object {
  /** Name of an S3 bucket */
  bucket: string;
  /** the key (entire path) to the file in S3 */
  key: string;
  /** The filename this file was uploaded as */
  originalName?: string;

}
