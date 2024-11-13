import { QueryCommandInput } from '@aws-sdk/client-dynamodb';

/**
 * This class simplifies building DynamoDB queries specifically for submissions
 * indexed by `formName` with optional date filters (startDate and/or endDate).
 * It utilizes method chaining.
 */
export class FormNameIndexQueryBuilder {
  private readonly tableName: string;
  private expressionAttributeNames: { [key: string]: string } = {};
  private expressionAttributeValues: { [key: string]: { S: string } } = {};
  private keyConditionExpression: string = '';
  private filterExpression: string = '';

  /**
   * Constructor to initialize the query builder with the DynamoDB table name.
   *
   * @param tableName The name of the DynamoDB table containing form submissions.
   */
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  private setExpressionAttributeName(attributeName: string, columnName: string): void {
    this.expressionAttributeNames['#' + attributeName] = columnName;
  }

  private setExpressionAttributeStringValue(attributeName: string, attributeValue: string): void {
    this.expressionAttributeValues[':' + attributeName] = { S: attributeValue };
  }

  /**
   * Adds the `formName` condition to the query.
   *
   * @param formName The name of the form to filter submissions by.
   * @returns This instance of the query builder for method chaining.
   */
  withFormName(formName: string): FormNameIndexQueryBuilder {
    this.setExpressionAttributeName('formName', 'formName');
    this.setExpressionAttributeStringValue('name', formName);
    this.keyConditionExpression += '#formName = :name';
    return this;
  }

  /**
   * Adds optional date filters (startDate and/or endDate) to the query.
   *
   * @param startDate The optional start date for filtering submissions (ISO 8601 format).
   * @param endDate The optional end date for filtering submissions (ISO 8601 format).
   * @returns This instance of the query builder for method chaining.
   */
  withDateRange(startDate?: string, endDate?: string): FormNameIndexQueryBuilder {
    if (startDate || endDate) {
      this.setExpressionAttributeName('sortKeyName', 'dateSubmitted');
      this.keyConditionExpression += ' AND #sortKeyName ';
    }
    if (startDate) this.expressionAttributeValues[':startDate'] = { S: startDate };
    if (endDate) this.expressionAttributeValues[':endDate'] = { S: endDate };

    if (startDate && !endDate) this.keyConditionExpression += '>= :startDate';
    if (endDate && !startDate) this.keyConditionExpression += '<= :endDate';
    if (startDate && endDate) this.keyConditionExpression += 'BETWEEN :endDate AND :startDate';

    return this;
  }

  /**
 * Adds an optional filter for the `sk` value to start with a given prefix.
 * The prefix is the appId. For example SP1.
 *
 * @param prefix The optional prefix for filtering the `sk` value.
 * @returns This instance of the query builder for method chaining.
 */
  withPrefixFilter(prefix?: string): FormNameIndexQueryBuilder {
    if (prefix) {
      this.setExpressionAttributeName('sk', 'sk');
      this.setExpressionAttributeStringValue('prefix', prefix); // Ensure prefix is a string
      this.filterExpression += 'begins_with(#sk, :prefix)';
    }
    return this;
  }

  /**
   * Adds a filter to ensure the `userType` attribute is not empty.
   * After the database migration, records were duplicated.
   * New records will have a userType (person | organisation | anonymous)
   *
   * @returns This instance of the query builder for method chaining.
   */
  withUserTypeNotEmpty(): FormNameIndexQueryBuilder {
    this.filterExpression += this.filterExpression ? ' AND ' : ''; // Add "AND" if there's an existing filter expression
    this.filterExpression += 'attribute_exists(userType)'; // Check for the existence of the userType attribute
    return this;
  }

  /**
   * Builds the final DynamoDB query input object based on the specified parameters.
   *
   * @returns The query input object containing all necessary parameters for the DynamoDB query.
   */
  build(): QueryCommandInput {
    const queryInput: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'formNameIndex', // Assuming you have a secondary index named formNameIndex
      ExpressionAttributeNames: this.expressionAttributeNames,
      ExpressionAttributeValues: this.expressionAttributeValues,
      KeyConditionExpression: this.keyConditionExpression,
    };

    // Only add FilterExpression if it's defined
    if (this.filterExpression) {
      queryInput.FilterExpression = this.filterExpression;
    }

    return queryInput;
  }
}
