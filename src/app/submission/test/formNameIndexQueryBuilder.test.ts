import { FormNameIndexQueryBuilder } from '../FormNameIndexQueryBuilder';

describe('FormNameIndexQueryBuilder', () => {
  test('should build a query only with formName', () => {
    const builder = new FormNameIndexQueryBuilder('myTable');
    const query = builder.withFormName('testForm').build();

    expect(query).toEqual({
      TableName: 'myTable',
      IndexName: 'formNameIndex',
      ExpressionAttributeNames: { '#formName': 'formName' },
      ExpressionAttributeValues: { ':name': { S: 'testForm' } },
      KeyConditionExpression: '#formName = :name',
    });
  });
  test('should build a query only with formName when dates undefined', () => {
    const builder = new FormNameIndexQueryBuilder('myTable');
    const query = builder.withFormName('testForm').withDateRange(undefined, undefined).build();

    expect(query).toEqual({
      TableName: 'myTable',
      IndexName: 'formNameIndex',
      ExpressionAttributeNames: { '#formName': 'formName' },
      ExpressionAttributeValues: { ':name': { S: 'testForm' } },
      KeyConditionExpression: '#formName = :name',
    });
  });
  test('should build a query only with formName when dates empty', () => {
    const builder = new FormNameIndexQueryBuilder('myTable');
    const query = builder.withFormName('testForm').withDateRange(undefined, undefined).build();

    expect(query).toEqual({
      TableName: 'myTable',
      IndexName: 'formNameIndex',
      ExpressionAttributeNames: { '#formName': 'formName' },
      ExpressionAttributeValues: { ':name': { S: 'testForm' } },
      KeyConditionExpression: '#formName = :name',
    });
  });

  test('should build a query with start date only', () => {
    const builder = new FormNameIndexQueryBuilder('myTable');
    const query = builder.withFormName('testForm').withDateRange('2024-05-28', undefined).build();

    expect(query).toEqual({
      TableName: 'myTable',
      IndexName: 'formNameIndex',
      ExpressionAttributeNames: {
        '#formName': 'formName',
        '#sortKeyName': 'dateSubmitted',
      },
      ExpressionAttributeValues: {
        ':name': { S: 'testForm' },
        ':startDate': { S: '2024-05-28' },
      },
      KeyConditionExpression: '#formName = :name AND #sortKeyName >= :startDate',
    });
  });
  test('should build a query with end date only', () => {
    const builder = new FormNameIndexQueryBuilder('myTable');
    const query = builder.withFormName('testForm').withDateRange(undefined, '2024-05-28').build();

    expect(query).toEqual({
      TableName: 'myTable',
      IndexName: 'formNameIndex',
      ExpressionAttributeNames: {
        '#formName': 'formName',
        '#sortKeyName': 'dateSubmitted',
      },
      ExpressionAttributeValues: {
        ':name': { S: 'testForm' },
        ':endDate': { S: '2024-05-28' },
      },
      KeyConditionExpression: '#formName = :name AND #sortKeyName <= :endDate',
    });
  });
  test('should build a query with both dates', () => {
    const builder = new FormNameIndexQueryBuilder('myTable');
    const query = builder.withFormName('testForm').withDateRange('2024-05-28', '2024-05-24').build();

    expect(query).toEqual({
      TableName: 'myTable',
      IndexName: 'formNameIndex',
      ExpressionAttributeNames: {
        '#formName': 'formName',
        '#sortKeyName': 'dateSubmitted',
      },
      ExpressionAttributeValues: {
        ':name': { S: 'testForm' },
        ':startDate': { S: '2024-05-28' },
        ':endDate': { S: '2024-05-24' },
      },
      KeyConditionExpression: '#formName = :name AND #sortKeyName BETWEEN :endDate AND :startDate',
    });
  });
});

describe('FormNameIndexQueryBuilder with Prefix Filter', () => {
  test('should build a query with prefix filter only', () => {
    const builder = new FormNameIndexQueryBuilder('myTable');
    const query = builder.withFormName('testForm').withPrefixFilter('SP1').build();

    expect(query).toEqual({
      TableName: 'myTable',
      IndexName: 'formNameIndex',
      ExpressionAttributeNames: {
        '#formName': 'formName',
        '#sk': 'sk',
      },
      ExpressionAttributeValues: {
        ':name': { S: 'testForm' },
        ':prefix': { S: 'SP1' },
      },
      KeyConditionExpression: '#formName = :name',
      FilterExpression: 'begins_with(#sk, :prefix)',
    });
  });

  test('should build a query with formName, date range, and prefix filter', () => {
    const builder = new FormNameIndexQueryBuilder('myTable');
    const query = builder
      .withFormName('testForm')
      .withDateRange('2024-05-28', '2024-05-24')
      .withPrefixFilter('SP1')
      .build();

    expect(query).toEqual({
      TableName: 'myTable',
      IndexName: 'formNameIndex',
      ExpressionAttributeNames: {
        '#formName': 'formName',
        '#sortKeyName': 'dateSubmitted',
        '#sk': 'sk',
      },
      ExpressionAttributeValues: {
        ':name': { S: 'testForm' },
        ':startDate': { S: '2024-05-28' },
        ':endDate': { S: '2024-05-24' },
        ':prefix': { S: 'SP1' },
      },
      KeyConditionExpression: '#formName = :name AND #sortKeyName BETWEEN :endDate AND :startDate',
      FilterExpression: 'begins_with(#sk, :prefix)',
    });
  });

  test('should build a query with prefix filter and no date range', () => {
    const builder = new FormNameIndexQueryBuilder('myTable');
    const query = builder.withFormName('testForm').withPrefixFilter('SP1').build();

    expect(query).toEqual({
      TableName: 'myTable',
      IndexName: 'formNameIndex',
      ExpressionAttributeNames: {
        '#formName': 'formName',
        '#sk': 'sk',
      },
      ExpressionAttributeValues: {
        ':name': { S: 'testForm' },
        ':prefix': { S: 'SP1' },
      },
      KeyConditionExpression: '#formName = :name',
      FilterExpression: 'begins_with(#sk, :prefix)',
    });
  });


  test.each([
    undefined,
    null,
    '',
  ])('should build a query with prefix filter and prefix value %p', (prefix) => {
    const builder = new FormNameIndexQueryBuilder('myTable');
    const query = builder.withFormName('testForm').withPrefixFilter(prefix as any).build();
    const expectedQuery = { TableName: 'myTable', IndexName: 'formNameIndex', ExpressionAttributeNames: { '#formName': 'formName' }, ExpressionAttributeValues: { ':name': { S: 'testForm' } }, KeyConditionExpression: '#formName = :name' };
    expect(query).toEqual(expectedQuery);
  });

  describe('FormNameIndexQueryBuilder with UserType Not Empty', () => {

    test('should build a query with date range and userType not empty filter', () => {
      const builder = new FormNameIndexQueryBuilder('myTable');
      const query = builder
        .withFormName('testForm')
        .withDateRange('2024-05-28', '2024-05-24')
        .withUserTypeNotEmpty()
        .build();

      expect(query).toEqual({
        TableName: 'myTable',
        IndexName: 'formNameIndex',
        ExpressionAttributeNames: {
          '#formName': 'formName',
          '#sortKeyName': 'dateSubmitted',
        },
        ExpressionAttributeValues: {
          ':name': { S: 'testForm' },
          ':startDate': { S: '2024-05-28' },
          ':endDate': { S: '2024-05-24' },
        },
        KeyConditionExpression: '#formName = :name AND #sortKeyName BETWEEN :endDate AND :startDate',
        FilterExpression: 'attribute_exists(userType)',
      });
    });

    test('should build a query with formName, date range, prefix filter, and userType not empty filter', () => {
      const builder = new FormNameIndexQueryBuilder('myTable');
      const query = builder
        .withFormName('testForm')
        .withDateRange('2024-05-28', '2024-05-24')
        .withPrefixFilter('SP1')
        .withUserTypeNotEmpty()
        .build();

      expect(query).toEqual({
        TableName: 'myTable',
        IndexName: 'formNameIndex',
        ExpressionAttributeNames: {
          '#formName': 'formName',
          '#sortKeyName': 'dateSubmitted',
          '#sk': 'sk',
        },
        ExpressionAttributeValues: {
          ':name': { S: 'testForm' },
          ':startDate': { S: '2024-05-28' },
          ':endDate': { S: '2024-05-24' },
          ':prefix': { S: 'SP1' },
        },
        KeyConditionExpression: '#formName = :name AND #sortKeyName BETWEEN :endDate AND :startDate',
        FilterExpression: 'begins_with(#sk, :prefix) AND attribute_exists(userType)',
      });
    });
  });

});