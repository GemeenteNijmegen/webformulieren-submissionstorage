## RxMission Migratie
De scripts kunnen lokaal uitgevoerd worden. Niks hoeft gedeployed te worden.

De map src/migrations/micro-migratie-rxmission/sensitive-files is in gitignore uitgesloten. 
Hier kunnen de excels geplaatst worden die gemigreerd moeten worden.
De huidige setup is specifiek voor twee type migratie excels - Lijst 1 en Lijst 2. Gebaseerd op de kolomnamen en mappings met mogelijke velden (zaaktype en zaakresultaat).
Bij hergebruik moet dus goed gekeken worden of de kolommen en inhoud ervan nog overeen komen en eventueel een nieuw migratietype toegevoegd worden.
Met name checken: zaaktype, product, zaakresultaat, zaakgeometrie en velden die de rol aanmaken.

### Locatie code
Deze repo is niet perse logisch voor deze code. Nu gedaan omdat de ZGWClient in deze repo al ingericht was.
Afspraak om het geheel te verhuizen indien er na 1 april nog meer migraties op de planning staan.
In dat geval is aan te raden om werk te steken in een goede auto-generated ZGW-client module die hergebruikt kan worden op meerdere plekken.
En natuurlijk een plek voor de migratie, in een aparte repo of een scripts repo. Aparte repo maakt archiveren gemakkelijker.

### Tools en benodigdheden
- Postman RxMission Collectie met RxMission preprod en prod environment
- Lokale .env file met id en secrets (gitignored) bij teamgenoot verkrijgen of met Postman settings invullen. Kijk in env.example voor benodigdheden.
- Excels met data om te migreren (originele excel heeft kolomnamen die moeilijk te verwerken zijn. Nieuwe kolomnamen in interface Row in ./RxMissionMigratie.ts)
- Prettig om toegang te hebben tot RxMission op preprod (via functioneel beheer) om te kunnen checken of ze goed landen
- Info zaaktype, rol, status, product, etc...
- Commando om uit te voeren staat boven RxMissionMigratie class en RxMissionDeleteZaken class.

Specifieke projenrc libraries nodig hiervoor. 
- xlsx met specifieke versie, anders pakt projen een versie boven 1 die onjuist is
- proj4 voor conversie zaakgeometrie
- ts-node voor lokaal uitvoeren van script

### Doel
Migraties vanuit excel uit kunnen voeren naar RxMission.
Momenteel zijn dat twee type lijsten. 

### Veiligheid productie
Om er zeker van te zijn dat de migratie niet lukraak op productie uitgevoerd wordt zijn er wat extra checks ingevoerd.
- .env moet naar PROD wijzen in RX_ENV
- In HandleRxMissionMigration staat een standaard error die gegooid wordt als prod gebruikt wordt. Comment deze.
- Er volgt een prompt waarbij je met yes moet antwoorden als je op prod uit wil voeren.

### Delete
De Delete kan in principe niet uitgevoerd worden op productie. Hier zijn geen rechten voor.
De RxMissionDeleteZaken is gemaakt om bij het testen snel alle gemaakte zaken op preprod te kunnen verwijderen. 
En als backup om op prod een fout te herstellen indien nodig, maar dan moeten eerst Delete rechten toegekend worden.
Commanda staat boven de class RxMissionDeleteZaken

#### Opzet
Er wordt gebruik gemaakt van de bestaande code die in ./webformulieren-submissionstorage/src/app/zgw/rxMissionZgwHandler staat.
ZgwClient kan hergebruikt worden voor deze eenmalige migratie.


#### Zaak
1. Zaaktype: Overal hetzelfde zaaktype ODRN Schaduwzaak

2. Product
Twee soorten afhankelijk van zaaktype bij lijst 1 
Zodra het woord "aanvraag", "besluit" of "beschik" in de excel kolom Zaaktype (case sensisitivity) staat: product NMG-000012 Kopie verleende vergunning
Zodra het woord "melding" in de excel kolom Zaaktype staat: product NMG-000015 Kopie melding

Bij lijst 2 is het product toezicht //NMG-00013 Kopie toezichtzaak - Lijst 2

3. Zaakgeometrie
Proberen om te zetten naar zaakgeometrie indien mogelijk. RD naar WSG84 conversie.
- Indien de conversie faalt wordt undefined teruggegeven
- Indien de api call createzaak faalt, dan wordt nog een poging gedaan zonder zaakgeometrie (conversie kan goed gegaan, maar api call daarna niet)
- Indien zaakgeometrie undefined is, zal dit gemeld worden in de error log

4. Toelichting
Het veld toelichting is de enige die genoeg tekens toestaat om extra informatie in te plaatsen.
Voor gemak hier onderdelen uit de excel toevoegen om snel te kunnen verwerken: 
- email, telefoon, naam (want rol wil niet altijd goed werken hiermee)
- locatie
- andere velden uit de excel
- doet een check of er meer dan 1000 chars zijn en haalt alles weg na die 1000. Zet te belangrijkste velden dus aan het begin.
- geen bsn of kvk nummer, alleen of deze aanwezig is

Lijst 2 heeft meer velden die te vinden zijn in de method createToelichting.

#### Status
Zaak gestart

#### Rol
Lijst 1: Initiator 
Lijst 2: Belanghebbende
En waar mogelijk ingevuld met bsn/kvk en contactgegevens. Zie ook zaak: toelichting

#### Eigenschappen

- Openwave zaaknummer
- Corsa zaaknummer

#### Resultaattypen
** Voor lijst 2
Afgebroken

** Voor lijst 1
Uit kolom zaakresultaat. Hier is BRIKS functioneel beheer nog mee bezig.

Afgebroken
Afgebroken (G) – 1 jaar

Afgesloten
Afgebroken (G) 1 jaar

Buiten behandeling gelaten
Buiten behandeling gesteld (G) – 1 jaar

Geaccepteerd
Geaccepteerd (G) – 1 jaar

Gedeeltelijk verleend
Zelfde aanhouden als voor ‘verleend’

Niet geaccepteerd
Geweigerd (G) – 5 jaar (alleen deze variant zie ik, maar mag ook 1 jaar zijn eigenlijk).

Toegekend
Verleend (G) – 1 jaar

Vergunningsvrij
Niet nodig (G) – 1 jaar



#### Producten
Producten komen niet uit de api, wij kunnen alleen bij preprod via de applicatie network calls (browser developer tools Network Call product op de juiste omgeving). Producten uit productie moet door functioneel beheer of RxMission gegeven worden.
Bijvoorbeeld:
  {
    "url": "https://producten.preprod-rx-services.nl/api/v1/product/fe7c825a-4a8c-4f11-18e1-08dcce4a3fa1",
    "id": "fe7c825a-4a8c-4f11-18e1-08dcce4a3fa1",
    "code": "NMG-00012",
    "description": "Kopie verleende vergunning",
    "streeftermijn": "P0D",
    "uiterlijkeTermijn": "P0D"
  },

    {
    "url": "https://producten.preprod-rx-services.nl/api/v1/product/e55f1af2-f1f1-45b2-18e3-08dcce4a3fa1",
    "id": "e55f1af2-f1f1-45b2-18e3-08dcce4a3fa1",
    "code": "NMG-00015",
    "description": "Kopie melding",
    "streeftermijn": "P0D",
    "uiterlijkeTermijn": "P0D"
  },