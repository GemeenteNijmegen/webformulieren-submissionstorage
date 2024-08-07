import { FormDefinitionComponents } from '../../formDefinition/FormDefinitionParser';

export const MockIncludedFormDefintionComponents: FormDefinitionComponents[] = [
  {
    key: 'ikMeldAan',
    keyPath: '.components[0].components[1].ikMeldAan',
    label: 'Ik meld aan:',
    type: 'radio_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
    values: [
      {
        label: 'een volwassene (18 jaar of ouder)',
        value: 'a',
        shortcut: '',
      },
      {
        label: 'een kind (17 jaar of jonger)',
        value: 'b',
        shortcut: '',
      },
    ],
  },
  {
    key: 'voornaamKind',
    keyPath: '.components[1].components[2].voornaamKind',
    label: 'Voornaam kind',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'achternaamKind',
    keyPath: '.components[1].components[3].achternaamKind',
    label: 'Achternaam kind',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'leeftijdKind',
    keyPath: '.components[1].components[4].leeftijdKind',
    label: 'Leeftijd kind',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'soortOnderwijsDatUwKindVolgt',
    keyPath: '.components[1].components[5].soortOnderwijsDatUwKindVolgt',
    label: 'Soort onderwijs dat uw kind volgt',
    type: 'radio_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
    values: [
      { label: 'basisonderwijs', value: 'a', shortcut: '' },
      { label: 'voortgezet onderwijs', value: 'b', shortcut: '' },
      {
        label: 'mijn kind volgt (nog) geen onderwijs',
        value: 'c',
        shortcut: '',
      },
    ],
  },
  {
    key: 'basisonderwijs',
    keyPath: '.components[1].components[6].components[0].basisonderwijs',
    label: 'School',
    type: 'select_nijmegen',
    inDataGrid: false,
    parentKey: 'bo',
  },
  {
    key: 'voortgezetOnderwijs',
    keyPath: '.components[1].components[7].components[0].voortgezetOnderwijs',
    label: 'School',
    type: 'select_nijmegen',
    inDataGrid: false,
    parentKey: 'vo',
  },
  {
    key: 'voornaam',
    keyPath: '.components[2].components[3].voornaam',
    label: 'Voornaam',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'achternaam',
    keyPath: '.components[2].components[4].achternaam',
    label: 'Achternaam',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'geboortedatum',
    keyPath: '.components[2].components[5].geboortedatum',
    label: 'Geboortedatum',
    type: 'datetime_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'telefoonnummer',
    keyPath: '.components[2].components[6].telefoonnummer',
    label: 'Telefoonnummer',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'eMailadres',
    keyPath: '.components[2].components[7].eMailadres',
    label: 'E-mailadres',
    type: 'email_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'contactpersoon',
    keyPath: '.components[2].components[8].contactpersoon',
    label: 'Voornaam en achternaam van de persoon met wie contact opgenomen kan worden bij noodgevallen',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'telefoonnummerBijNoodgevallen',
    keyPath: '.components[2].components[9].telefoonnummerBijNoodgevallen',
    label: 'Telefoonnummer bij noodgevallen',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'voornaam2',
    keyPath: '.components[3].components[2].voornaam2',
    label: 'Voornaam',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'achternaam2',
    keyPath: '.components[3].components[3].achternaam2',
    label: 'Achternaam',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'telefoonnummer2',
    keyPath: '.components[3].components[4].telefoonnummer2',
    label: 'Telefoonnummer',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'eMailadres2',
    keyPath: '.components[3].components[5].eMailadres2',
    label: 'E-mailadres',
    type: 'email_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'appId',
    keyPath: '.components[4].components[1].appId',
    label: 'appId',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'stadsdeel',
    keyPath: '.components[4].components[4].components[0].stadsdeel',
    label: 'Stadsdeel',
    type: 'select_nijmegen',
    inDataGrid: false,
    parentKey: 'stadsdeelVolwassen',
  },
  {
    key: 'stadsdeel1',
    keyPath: '.components[4].components[5].components[0].stadsdeel1',
    label: 'Stadsdeel',
    type: 'select_nijmegen',
    inDataGrid: false,
    parentKey: 'stadsdeelKind',
  },
  {
    key: 'aanmeldenVoorSportactiviteitA',
    keyPath: '.components[4].components[6].aanmeldenVoorSportactiviteitA',
    label: 'Aanmelden voor sportactiviteit A',
    type: 'selectboxes_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
    values: [{ label: '-', value: 'a', shortcut: '' }],
  },
  {
    key: 'aanmeldenVoorSportactiviteitB',
    keyPath: '.components[4].components[7].aanmeldenVoorSportactiviteitB',
    label: 'Aanmelden voor sportactiviteit B',
    type: 'selectboxes_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
    values: [{ label: '-', value: 'a', shortcut: '' }],
  },
  {
    key: 'aanmeldenVoorSportactiviteitC',
    keyPath: '.components[4].components[8].aanmeldenVoorSportactiviteitC',
    label: 'Aanmelden voor sportactiviteit',
    type: 'selectboxes_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
    values: [
      { label: 'Onbeperkt Wijksporten', value: 'a', shortcut: '' },
    ],
  },
  {
    key: 'aanmeldenVoorSportactiviteitD',
    keyPath: '.components[4].components[9].aanmeldenVoorSportactiviteitD',
    label: 'Aanmelden voor sportactiviteit',
    type: 'selectboxes_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
    values: [
      {
        label: 'Kwiek wandelroute (Park Maldenborgh)',
        value: 'a',
        shortcut: '',
      },
      {
        label: 'Nationale (diabetes) Challenge (Goffert)',
        value: 'b',
        shortcut: '',
      },
    ],
  },
  {
    key: 'aanmeldenVoorSportactiviteitE',
    keyPath: '.components[4].components[10].aanmeldenVoorSportactiviteitE',
    label: 'Aanmelden voor sportactiviteit',
    type: 'selectboxes_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
    values: [{ label: 'MixSports', value: 'a', shortcut: '' }],
  },
  {
    key: 'aanmeldenVoorSportactiviteitF',
    keyPath: '.components[4].components[11].aanmeldenVoorSportactiviteitF',
    label: 'Aanmelden voor sportactiviteit',
    type: 'selectboxes_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
    values: [
      {
        label: 'Onbeperkt Wijksporten (Sporthal Meijhorst)',
        value: 'a',
        shortcut: '',
      },
      {
        label: 'Sport & spel (Wijkcentrum Dukenburg)',
        value: 'b',
        shortcut: '',
      },
      {
        label: 'Sport & spel (Gymzaal Malvert)',
        value: 'c',
        shortcut: '',
      },
    ],
  },
  {
    key: 'aanmeldenVoorSportactiviteitG',
    keyPath: '.components[4].components[12].aanmeldenVoorSportactiviteitG',
    label: 'Aanmelden voor sportactiviteit',
    type: 'selectboxes_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
    values: [
      {
        label: 'Onbeperkt Wijksporten (Sporthal Horstacker)',
        value: 'a',
        shortcut: '',
      },
    ],
  },
  {
    key: 'naamAmbulantBegeleider',
    keyPath: '.components[4].components[13].naamAmbulantBegeleider',
    label: 'Naam ambulant begeleider',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'organisatieAmbulantBegeleider1',
    keyPath: '.components[4].components[14].organisatieAmbulantBegeleider1',
    label: 'Organisatie ambulant begeleider',
    type: 'textfield_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'sportUwKindBijEenSporvereniging',
    keyPath: '.components[4].components[15].sportUwKindBijEenSporvereniging',
    label: 'Sport uw kind bij een sporvereniging?',
    type: 'radio_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
    values: [
      { label: 'ja', value: 'ja', shortcut: '' },
      { label: 'nee', value: 'nee', shortcut: '' },
    ],
  },
  {
    key: 'geeftUToestemmingDatUwGegevensBewaardWordenVoorHetSeizoen',
    keyPath: '.components[5].components[1].components[0].geeftUToestemmingDatUwGegevensBewaardWordenVoorHetSeizoen',
    label: 'Geeft u toestemming dat uw gegevens bewaard worden voor het seizoen 2023-2024?',
    type: 'radio_nijmegen',
    inDataGrid: false,
    parentKey: 'volwassen',
    values: [
      { label: 'ja', value: 'ja', shortcut: '' },
      { label: 'nee', value: 'nee', shortcut: '' },
    ],
  },
  {
    key: 'geeftUToestemmingVoorHetMakenVanFotosBijDeSportactiviteitenDieMisschienGebruiktWordenVoorReclame',
    keyPath: '.components[5].components[1].components[1].geeftUToestemmingVoorHetMakenVanFotosBijDeSportactiviteitenDieMisschienGebruiktWordenVoorReclame',
    label: 'Geeft u toestemming voor het maken van foto’s bij de sportactiviteiten die misschien gebruikt worden voor reclame?',
    type: 'radio_nijmegen',
    inDataGrid: false,
    parentKey: 'volwassen',
    values: [
      { label: 'ja', value: 'ja', shortcut: '' },
      { label: 'nee', value: 'nee', shortcut: '' },
    ],
  },
  {
    key: 'geeftUToestemmingDatUGedurendeSeizoenBenaderdKanWordenVoorDePromotieVanAndereSportactiviteiten',
    keyPath: '.components[5].components[1].components[2].geeftUToestemmingDatUGedurendeSeizoenBenaderdKanWordenVoorDePromotieVanAndereSportactiviteiten',
    label: 'Geeft u toestemming dat u gedurende seizoen 2023-2024 benaderd kan worden voor de promotie van andere sportactiviteiten?',
    type: 'radio_nijmegen',
    inDataGrid: false,
    parentKey: 'volwassen',
    values: [
      { label: 'ja', value: 'ja', shortcut: '' },
      { label: 'nee', value: 'nee', shortcut: '' },
    ],
  },
  {
    key: 'geeftUToestemmingDatUwKindMagMeedoenAanDeSportactiviteitenEnMogenWijDaaroverMetUContactOpnemen',
    keyPath: '.components[5].components[2].components[0].geeftUToestemmingDatUwKindMagMeedoenAanDeSportactiviteitenEnMogenWijDaaroverMetUContactOpnemen',
    label: 'Geeft u toestemming dat uw kind mag meedoen aan de sportactiviteiten en mogen wij daarover met u contact opnemen? ',
    type: 'radio_nijmegen',
    inDataGrid: false,
    parentKey: 'kind',
    values: [
      { label: 'ja', value: 'ja', shortcut: '' },
      { label: 'nee', value: 'nee', shortcut: '' },
    ],
  },
  {
    key: 'geeftUToestemmingDatDeGegevensVanUwKindBewaardWordenVoorHetSchooljaar',
    keyPath: '.components[5].components[2].components[1].geeftUToestemmingDatDeGegevensVanUwKindBewaardWordenVoorHetSchooljaar',
    label: 'Geeft u toestemming dat de gegevens van uw kind bewaard worden voor het schooljaar 2023-2024?',
    type: 'radio_nijmegen',
    inDataGrid: false,
    parentKey: 'kind',
    values: [
      { label: 'ja', value: 'ja', shortcut: '' },
      { label: 'nee', value: 'nee', shortcut: '' },
    ],
  },
  {
    key: 'geeftUToestemmingVoorHetMakenVanFotosVanUwKindDieMisschienGebruiktWordenVoorReclame',
    keyPath: '.components[5].components[2].components[2].geeftUToestemmingVoorHetMakenVanFotosVanUwKindDieMisschienGebruiktWordenVoorReclame',
    label: 'Geeft u toestemming voor het maken van foto’s van uw kind die misschien gebruikt worden voor reclame?',
    type: 'radio_nijmegen',
    inDataGrid: false,
    parentKey: 'kind',
    values: [
      { label: 'ja', value: 'ja', shortcut: '' },
      { label: 'nee', value: 'nee', shortcut: '' },
    ],
  },
  {
    key: 'opmerkingen',
    keyPath: '.components[5].components[3].opmerkingen',
    label: 'Opmerkingen',
    type: 'textarea_nijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
  {
    key: 'ikHebAlleVragenNaarWaarheidBeantwoord',
    keyPath: '.components[6].components[2].ikHebAlleVragenNaarWaarheidBeantwoord',
    label: 'Ik heb alle vragen naar waarheid beantwoord',
    type: 'checkboxnijmegen',
    inDataGrid: false,
    parentKey: undefined,
  },
];