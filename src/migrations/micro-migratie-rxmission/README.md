#### RxMission Migration
Handig om bij de mirgatie de nieuwe zaaknummers in RxMission te koppelen aan de excel rijen (of op zijn minst openwave casenummer).
De map src/migrations/micro-migratie-rxmission/sensitive-files is in gitignore uitgesloten. Hier kunnen eventueel lokaal bestanden geplaats worden.

### Tools en benodigdheden
- Postman RxMission Collectie met RxMission preprod en prod environment
- Lokale .env file met id en secrets (gitignored)
- Excels met data om te migreren (originele excel heeft kolomnamen die moeilijk te verwerken zijn. Nieuwe kolomnamen in interface Row in ./RxMissionMigratie.ts)
- Prettig om toegang te hebben tot RxMission op preprod (via functioneel beheer)
- Info zaaktype, rol, status, product, etc...

### Doel

1200 records vanuit de excel middels api calls naar RxMission zetten. Later volgt nog een andere migratie/excel.

#### Opzet
Er wordt gebruik gemaakt van de bestaande code die in ./webformulieren-submissionstorage/src/app/zgw/rxMissionZgwHandler staat.
ZgwClient kan hergebruikt worden voor deze eenmalige migratie.
Begin gemaakt in src/migrations/micro-migratie-rxmission

#### Zaak
1. Zaaktype: Overal hetzelfde zaaktype ODRN Schaduwzaak

2. Product
Twee soorten afhankelijk van zaaktype. 
Zodra het woord "aanvraag" in de excel kolom Zaaktype (case sensisitivity) staat: product NMG-000012 Kopie verleende vergunning
Zodra het woord "melding" in de excel kolom Zaaktype staat: product NMG-000015 Kopie melding

3. Zaakgeometrie
Proberen om te zetten naar zaakgeometrie indien mogelijk. Is Geojson formaat in excel en post Zaak

4. Toelichting
Het veld toelichting is de enige die genoeg tekens toestaat om extra informatie in te plaatsen.
Voor gemak hier onderdelen uit de excel toevoegen om snel te kunnen verwerken: 
- email, telefoon, naam (want rol wil niet altijd goed werken hiermee)
- adres
- eventueel activiteiten als het mogelijk is (niet te veel tijd aan besteden als het niet past of moeilijk doet)
Niet: url's

Corsa en openwave zaaknummers gaan in eigenschappen

#### Status
Zaak gestart

#### Rol
Initiator en waar mogelijk ingevuld met bsn/kvk en contactgegevens.
Zie ook zaak: toelichting

#### Eigenschappen

- Openwave zaaknummer
- Corsa zaaknummer

#### Resultaattypen
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
Producten komen niet uit de api, wij kunnen alleen bij preprod via de applicatie network calls. Producten uit productie moet door functioneel beheer of RxMission gegeven worden.
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