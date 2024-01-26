export const FORM_FILE_MOCK_WITH_BRP_FORM_REFERENDUM_01 = {
  Type: 'Notification',
  MessageId: '642b37be-edfe-5308-8e43-69be2042fb1f',
  TopicArn: 'arn:aws:sns:eu-west-1:315037222840:eform-submissions',
  Subject: null,
  Message:
    '{"formId":"472eb319-3c21-4c36-8d25-df41f8d594f0","formTypeId":"ondersteuneninleidendverzoekreferendumjanuari2024","uniqueHash":{"formName":"ondersteuneninleidendverzoekreferendumjanuari2024","hash":"e023c215c52c29f0892fba20c86140ca230b353104a439a5f139100e96db537d","ttl":1708732800},"appId":"PU2","reference":"PU219.964","data":{"geboortedatum1":"24-01-2006","continue":true,"kenmerk":"PU2-19.964","inlogmiddel":"digid","naamIngelogdeGebruiker":"F. Bultenaar","volledigeNaam":"F. Bultenaar","geboortedatum":"24-01-2006","woonplaats":"Nijmegen","summary1":{},"ikHebAlleVragenNaarWaarheidBeantwoord":true,"vorige3":false,"verzenden":true,"nonhiddenfieldsform":{"data":{"naamIngelogdeGebruiker":"F. Bultenaar","straatnaam":"","huisnummerfield":"","postcode":"","woonplaats":"Nijmegen"},"metadata":{}},"digiD":{"ikOndersteunHetInleidendVerzoekOmEenReferendum":true,"eMailadres":"","ikOndersteunHetInleidendVerzoekOmEenReferendum1":true},"volgende":true},"metadata":{"timezone":"Europe/Amsterdam","offset":60,"origin":"https://app6-accp.nijmegen.nl","referrer":"","browserName":"Netscape","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0","pathName":"/","onLine":true,"timestamp":[2023,12,23,11,58,48,108485124]},"employeeData":{},"pdf":{"reference":"3e24281d69e030328b9a296e493fe73e","location":"472eb319-3c21-4c36-8d25-df41f8d594f0/pdf/PU219.964","bucketName":"acceptance-eformgenericse-eformattuploads951db329-1s58estbegn6m"},"brpData":{"Persoon":{"BSN":{"BSN":"900222645"},"Persoonsgegevens":{"Voorletters":"F.","Voornamen":"Fortinbras","Voorvoegsel":"","Geslachtsnaam":"Bultenaar","Achternaam":"Bultenaar","Naam":"F. Bultenaar","Geboortedatum":"24-01-2006","Geslacht":"M","NederlandseNationaliteit":"Ja","Geboorteplaats":"Hellevoetsluis","Geboorteland":"Nederland"},"Adres":{"Straat":"Broerstraat","Huisnummer":"61","Gemeente":"Nijmegen","Postcode":"6511 KM","Woonplaats":"Nijmegen"},"Reisdocument":{"Documentsoort":"","Documentnummer":"","Uitgiftedatum":"","Verloopdatum":""},"ageLimits":{"over12":"Yes","over16":"Yes","over18":"No","over21":"No","over65":"No"}}},"bsn":"900222645"}',
  Timestamp: '2023-12-23T11:58:52.670Z',
  SignatureVersion: '1',
  Signature: 'P+2OyJnQQcNqMMA3JNXVSuWAy0gbX/u6SeB+RpdCjH6HPqF43vIRRMA+Ty1BJ30htfGWDxY+1+vgQcHF0BrvnRapf2ldHbV6EJt/GAhSmJFapS/mHqWGg6iA+AHPmj6GNyDFEaRByQKbu1QjUESBhzCBL+/fWdBNlOq/yvNhR5uAMvMKlcHCrWTfpvOVrcUlqu+N4BNYaxJHfdPfOxHFz2xCaRSobuZChnV2pS19retE9bOtkVa3DTlQ2/b+kpeeaS4y0v10IsvrsccktIuIlHzbVLOMwYRm6cdyqYNy5KAkU1M/pZtl4XqJjiaWsyWpDmIpjleXqjgaXZvPzDl68Q==',
  SigningCertUrl: 'https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-01d088a6f77103d0fe307c0069e40ed6.pem',
  UnsubscribeUrl: 'https://sns.eu-west-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:eu-west-1:315037222840:eform-submissions:182bcc56-eb20-4e48-92f5-972819927c6c',
  MessageAttributes: {
    BRP_data: { Type: 'String', Value: 'true' },
    AppId: { Type: 'String', Value: 'PU2' },
    SnsFilter: { Type: 'String', Value: 'steunverklaringreferendum' },
    KVK_data: { Type: 'String', Value: 'false' },
  },
};

export const FORM_FILE_MOCK_WITH_BRP_NOT_FORM_REFERENDUM_02 = {
  Type: 'Notification',
  MessageId: '642b37be-edfe-5308-8e43-69be2042fb1f',
  TopicArn: 'arn:aws:sns:eu-west-1:315037222840:eform-submissions',
  Subject: null,
  Message:
    '{"formId":"472eb319-3c21-4c36-8d25-df41f8d594f0","formTypeId":"nietondersteunenformulier","uniqueHash":{"formName":"ondersteuneninleidendverzoekreferendumjanuari2024","hash":"e023c215c52c29f0892fba20c86140ca230b353104a439a5f139100e96db537d","ttl":1708732800},"appId":"PU2","reference":"PU219.965","data":{"geboortedatum1":"24-01-2006","continue":true,"kenmerk":"PU2-19.965","inlogmiddel":"digid","naamIngelogdeGebruiker":"F. Bultenaar","volledigeNaam":"F. Bultenaar","geboortedatum":"24-01-2006","woonplaats":"Nijmegen","summary1":{},"ikHebAlleVragenNaarWaarheidBeantwoord":true,"vorige3":false,"verzenden":true,"nonhiddenfieldsform":{"data":{"naamIngelogdeGebruiker":"F. Bultenaar","straatnaam":"","huisnummerfield":"","postcode":"","woonplaats":"Nijmegen"},"metadata":{}},"digiD":{"ikOndersteunHetInleidendVerzoekOmEenReferendum":true,"eMailadres":"","ikOndersteunHetInleidendVerzoekOmEenReferendum1":true},"volgende":true},"metadata":{"timezone":"Europe/Amsterdam","offset":60,"origin":"https://app6-accp.nijmegen.nl","referrer":"","browserName":"Netscape","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0","pathName":"/","onLine":true,"timestamp":[2023,12,23,11,58,48,108485124]},"employeeData":{},"pdf":{"reference":"3e24281d69e030328b9a296e493fe73e","location":"472eb319-3c21-4c36-8d25-df41f8d594f0/pdf/PU219.965","bucketName":"acceptance-eformgenericse-eformattuploads951db329-1s58estbegn6m"},"brpData":{"Persoon":{"BSN":{"BSN":"900222645"},"Persoonsgegevens":{"Voorletters":"F.","Voornamen":"Fortinbras","Voorvoegsel":"","Geslachtsnaam":"Bultenaar","Achternaam":"Bultenaar","Naam":"F. Bultenaar","Geboortedatum":"24-01-2006","Geslacht":"M","NederlandseNationaliteit":"Ja","Geboorteplaats":"Hellevoetsluis","Geboorteland":"Nederland"},"Adres":{"Straat":"Broerstraat","Huisnummer":"61","Gemeente":"Nijmegen","Postcode":"6511 KM","Woonplaats":"Nijmegen"},"Reisdocument":{"Documentsoort":"","Documentnummer":"","Uitgiftedatum":"","Verloopdatum":""},"ageLimits":{"over12":"Yes","over16":"Yes","over18":"No","over21":"No","over65":"No"}}},"bsn":"900222645"}',
  Timestamp: '2023-12-23T11:58:52.670Z',
  SignatureVersion: '1',
  Signature: 'P+2OyJnQQcNqMMA3JNXVSuWAy0gbX/u6SeB+RpdCjH6HPqF43vIRRMA+Ty1BJ30htfGWDxY+1+vgQcHF0BrvnRapf2ldHbV6EJt/GAhSmJFapS/mHqWGg6iA+AHPmj6GNyDFEaRByQKbu1QjUESBhzCBL+/fWdBNlOq/yvNhR5uAMvMKlcHCrWTfpvOVrcUlqu+N4BNYaxJHfdPfOxHFz2xCaRSobuZChnV2pS19retE9bOtkVa3DTlQ2/b+kpeeaS4y0v10IsvrsccktIuIlHzbVLOMwYRm6cdyqYNy5KAkU1M/pZtl4XqJjiaWsyWpDmIpjleXqjgaXZvPzDl68Q==',
  SigningCertUrl: 'https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-01d088a6f77103d0fe307c0069e40ed6.pem',
  UnsubscribeUrl: 'https://sns.eu-west-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:eu-west-1:315037222840:eform-submissions:182bcc56-eb20-4e48-92f5-972819927c6c',
  MessageAttributes: {
    BRP_data: { Type: 'String', Value: 'true' },
    AppId: { Type: 'String', Value: 'PU2' },
    SnsFilter: { Type: 'String', Value: 'steunverklaringreferendum' },
    KVK_data: { Type: 'String', Value: 'false' },
  },
};
export const FORM_FILE_MOCK_WITHOUT_BRP_WITH_REFERENDUM_03 = {
  Type: 'Notification',
  MessageId: '642b37be-edfe-5308-8e43-69be2042fb1f',
  TopicArn: 'arn:aws:sns:eu-west-1:315037222840:eform-submissions',
  Subject: null,
  Message:
    '{"formId":"472eb319-3c21-4c36-8d25-df41f8d594f0","formTypeId":"ondersteuneninleidendverzoekreferendumjanuari2024","uniqueHash":{"formName":"ondersteuneninleidendverzoekreferendumjanuari2024","hash":"e023c215c52c29f0892fba20c86140ca230b353104a439a5f139100e96db537d","ttl":1708732800},"appId":"PU2","reference":"PU219.966","data":{"geboortedatum1":"24-01-2006","continue":true,"kenmerk":"PU2-19.966","inlogmiddel":"digid","naamIngelogdeGebruiker":"F. Bultenaar","volledigeNaam":"F. Bultenaar","geboortedatum":"24-01-2006","woonplaats":"Nijmegen","summary1":{},"ikHebAlleVragenNaarWaarheidBeantwoord":true,"vorige3":false,"verzenden":true,"nonhiddenfieldsform":{"data":{"naamIngelogdeGebruiker":"F. Bultenaar","straatnaam":"","huisnummerfield":"","postcode":"","woonplaats":"Nijmegen"},"metadata":{}},"digiD":{"ikOndersteunHetInleidendVerzoekOmEenReferendum":true,"eMailadres":"","ikOndersteunHetInleidendVerzoekOmEenReferendum1":true},"volgende":true},"metadata":{"timezone":"Europe/Amsterdam","offset":60,"origin":"https://app6-accp.nijmegen.nl","referrer":"","browserName":"Netscape","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0","pathName":"/","onLine":true,"timestamp":[2023,12,23,11,58,48,108485124]},"employeeData":{},"pdf":{"reference":"3e24281d69e030328b9a296e493fe73e","location":"472eb319-3c21-4c36-8d25-df41f8d594f0/pdf/PU219.966","bucketName":"acceptance-eformgenericse-eformattuploads951db329-1s58estbegn6m"},"bsn":"900222645"}',
  Timestamp: '2023-12-23T11:58:52.670Z',
  SignatureVersion: '1',
  Signature: 'P+2OyJnQQcNqMMA3JNXVSuWAy0gbX/u6SeB+RpdCjH6HPqF43vIRRMA+Ty1BJ30htfGWDxY+1+vgQcHF0BrvnRapf2ldHbV6EJt/GAhSmJFapS/mHqWGg6iA+AHPmj6GNyDFEaRByQKbu1QjUESBhzCBL+/fWdBNlOq/yvNhR5uAMvMKlcHCrWTfpvOVrcUlqu+N4BNYaxJHfdPfOxHFz2xCaRSobuZChnV2pS19retE9bOtkVa3DTlQ2/b+kpeeaS4y0v10IsvrsccktIuIlHzbVLOMwYRm6cdyqYNy5KAkU1M/pZtl4XqJjiaWsyWpDmIpjleXqjgaXZvPzDl68Q==',
  SigningCertUrl: 'https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-01d088a6f77103d0fe307c0069e40ed6.pem',
  UnsubscribeUrl: 'https://sns.eu-west-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:eu-west-1:315037222840:eform-submissions:182bcc56-eb20-4e48-92f5-972819927c6c',
  MessageAttributes: {
    BRP_data: { Type: 'String', Value: 'false' },
    AppId: { Type: 'String', Value: 'PU2' },
    SnsFilter: { Type: 'String', Value: 'steunverklaringreferendum' },
    KVK_data: { Type: 'String', Value: 'false' },
  },
};
