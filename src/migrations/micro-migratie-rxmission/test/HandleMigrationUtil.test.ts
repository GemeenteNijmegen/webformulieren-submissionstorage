describe('Utils in handlemigration', () => {
  test('product melding of aanvraag', () => {
    const zaaktypesExcel: string[] = [
      '(2.2) Melding behandelen',
      '(2.3.1) Vergunningaanvraag',
      '(2.3.2) Besluiten',
      'Aanvraag beschikking',
      'Ambtshalve beschikken',
      'Melding activiteit behandelen',
    ];

    let productResult: string[] = [];
    for (const zaaktype of zaaktypesExcel) {
      const product =
            zaaktype &&
            (zaaktype.toLowerCase().includes('aanvraag') ||
              zaaktype.toLowerCase().includes('besluit') ||
              zaaktype.toLowerCase().includes('beschik'))
              ? 'NMG-00012 Kopie verleende vergunning'
              : 'NMG-00015 Kopie melding';
      productResult.push(`${zaaktype} : ${product}`);
    }
    console.debug(productResult);
  });
});