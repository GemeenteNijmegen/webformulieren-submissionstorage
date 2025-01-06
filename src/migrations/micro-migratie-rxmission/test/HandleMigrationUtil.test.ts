describe('Utils in handlemigration', () => {
    test('product melding of aanvraag', () => {
        const zaaktypesExcel: string[] = [
            "(2.2) Melding behandelen",
            "(2.3.1) Vergunningaanvraag",
            "(2.3.2) Besluiten",
            "Aanvraag beschikking",
            "Ambtshalve beschikken",
            "Melding activiteit behandelen",
          ];

          let productResult: string[] = [];
          for(const zaaktype of zaaktypesExcel){
          const product =
            zaaktype && zaaktype.toLowerCase().includes('aanvraag')
            ? 'Aanvraag'
            : 'Melding';
            productResult.push(`${zaaktype} : ${product}`);
          }
          console.log(productResult);
    });
});