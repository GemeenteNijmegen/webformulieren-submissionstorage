# Documentatie submission-storage oplossing

In dit project wordt de opslag van formulierinzendingen geregeld. Deze opslag is additioneel aan de verwerking door processystemen. Voor het [webformulierenproject](https://github.com/webformulieren) is dit project een van meerdere subscribers/afnemers van inzendingen.

## Opslag
De `submissionSnsEventHandler`-functie is een subscriber op het webformulieren-submissions-SNS-topic in het webformulierenproject. Binnengekomen berichten worden geparsed, bestanden worden uit S3 opgehaald en in een eigen bucket opgeslagen, relevante metadata wordt in dynamoDB opgeslaagd met een referentie naar S3 (gekeyed op de inzender) zodat deze later op te halen is.

## Toegang
Er is een API-Gateway die toegang biedt tot inzendingen. Deze gaat gebruikt worden voor de ontsluiting in Mijn Nijmegen, en mogelijk later voor andere afnemers (managementportaal bijv.). Op dit moment is het mogelijk formulieren te 'listen' op userId.

## Downloads van bestanden
Omdat API Gateway een limiet van 10MB heeft, en we bestandsdownloads liever geen pad door lambda's laten afleggen, is een andere oplossing vereist voor de download van bestanden. Er wordt momenteel gewerkt aan een oplossing waarbij een Lambda@Edge-functie in Cloudfront authorisatie regelt voor toegang tot S3-files.[^1](#fn1)



1: https://aws.amazon.com/blogs/networking-and-content-delivery/authorizationedge-how-to-use-lambdaedge-and-json-web-tokens-to-enhance-web-application-security/
