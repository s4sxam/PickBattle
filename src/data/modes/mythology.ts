import { ContenderDossier } from '../types';

export const MYTHOLOGY_DATABASE: ContenderDossier[] = [
  {
    name: 'Zeus (King of Olympus)',
    aliases: ['zeus', 'king zeus', 'jupiter'],
    category: 'mythology',
    universeOrOrigin: 'Greek Mythology (Mount Olympus)',
    score: 98,
    scouterPowerLevel: 9800000,
    badges: [
      { label: 'Domain', value: 'Sky, Thunder & King of the Gods', highlight: true },
      { label: 'Divine Weapon', value: 'Master Thunderbolt (Forged by the Cyclopes)' },
      { label: 'Feat', value: 'Overthrew the Titans and imprisoned Kronos in Tartarus' },
      { label: 'Power', value: 'Can split the heavens and shake Earth with his nod' },
    ],
    headlineFeat: 'Cast down the colossal Typhon and buried him beneath Mount Etna with a barrage of celestial thunderbolts.',
    verdictSnippet: "Zeus's primordial Master Thunderbolt and cosmic dominion over Olympus overpower mortal and mythical challengers.",
  },
  {
    name: 'Thor (Norse Thunder God)',
    aliases: ['thor norse', 'thor & mjolnir', 'thor mythology'],
    category: 'mythology',
    universeOrOrigin: 'Norse Mythology (Asgard)',
    score: 96,
    scouterPowerLevel: 9550000,
    badges: [
      { label: 'Domain', value: 'Thunder, Lightning, Storms & Strength', highlight: true },
      { label: 'Divine Weapon', value: 'Mjolnir (Crushes mountains into valleys)' },
      { label: 'Feat', value: 'Nearly drank the entire ocean dry during Utgarda-Loki’s trial' },
      { label: 'Nemesis', value: 'Fated to slay Jörmungandr the Midgard Serpent' },
    ],
    headlineFeat: 'Struck giant stone peaks with Mjolnir and flattened them into deep ravines in a single blow.',
    verdictSnippet: "Thor's mountain-cracking hammer Mjolnir and storm-bringing thunder hammer through any mystical shield.",
  },
  {
    name: 'Sun Wukong (The Monkey King)',
    aliases: ['sun wukong', 'monkey king', 'wukong'],
    category: 'mythology',
    universeOrOrigin: 'Chinese Mythology / Journey to the West',
    score: 99,
    scouterPowerLevel: 9900000,
    badges: [
      { label: 'Domain', value: 'Victorious Fighting Buddha / Immortal Sage', highlight: true },
      { label: 'Divine Weapon', value: 'Ruyi Jingu Bang (17,550 lb Compliant Staff)' },
      { label: 'Immortality', value: '7 Layers of Stacking Immortality' },
      { label: 'Feat', value: 'Wreaked havoc in Heaven and somersaults 108,000 li' },
    ],
    headlineFeat: 'Erased his name from the Book of Life and Death and wields 72 earthly transformations.',
    verdictSnippet: "Sun Wukong's 7-fold stacked immortality and reality-crushing Ruyi Jingu Bang staff overcome all physical limits.",
  },
];
