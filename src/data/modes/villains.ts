import { ContenderDossier } from '../types';

export const VILLAINS_DATABASE: ContenderDossier[] = [
  {
    name: 'Darth Vader (Anakin Skywalker)',
    aliases: ['darth vader', 'vader', 'lord vader', 'anakin'],
    category: 'villains',
    universeOrOrigin: 'Star Wars (Galactic Empire)',
    score: 97,
    scouterPowerLevel: 9650000,
    badges: [
      { label: 'Tier', value: 'Sith Lord / The Chosen One', highlight: true },
      { label: 'Signature Move', value: 'Telekinetic Force Choke & Red Saber Mastery' },
      { label: 'Feat', value: 'Ripped a flying starship out of the sky with the Force' },
      { label: 'Aura', value: 'Hallway scene sheer dread and mechanical breathing' },
    ],
    headlineFeat: 'Surrounded by rebel troops in the comics and declared: "All I am surrounded by is fear. And dead men."',
    verdictSnippet: "Darth Vader's terrifying Dark Side telekinesis and crimson lightsaber ruthlessness overwhelm foes with suffocating dread.",
  },
  {
    name: 'Thanos (The Mad Titan)',
    aliases: ['thanos', 'the mad titan'],
    category: 'villains',
    universeOrOrigin: 'Marvel Comics / MCU (Titan)',
    score: 96,
    scouterPowerLevel: 9550000,
    badges: [
      { label: 'Tier', value: 'Cosmic Conqueror / Infinity Wielder', highlight: true },
      { label: 'Signature Gear', value: 'Infinity Gauntlet (6 Stones) & Double-Edged Sword' },
      { label: 'Feat', value: 'Wiped half of all life in the universe with a snap' },
      { label: 'Strength', value: 'Battered the Hulk into submission in hand-to-hand combat' },
    ],
    headlineFeat: 'Unfazed by planetary heroes, harnessed the full cosmic spectrum of the Infinity Stones to achieve his destiny.',
    verdictSnippet: "Thanos's cold cosmic inevitability and overwhelming physical titan strength crush rebellion across galaxies.",
  },
  {
    name: 'The Joker',
    aliases: ['the joker', 'joker', 'heath ledger joker', 'clown prince of crime'],
    category: 'villains',
    universeOrOrigin: 'DC Comics (Gotham City)',
    score: 93,
    scouterPowerLevel: 9050000,
    badges: [
      { label: 'Tier', value: 'Psychological Anarchist / Chaos Incarnate', highlight: true },
      { label: 'Signature Weapon', value: 'Joker Venom, Concealed Blades & Anarchy' },
      { label: 'Feat', value: 'Pushed Gotham to the brink of moral collapse' },
      { label: 'Mindset', value: '"Some men just want to watch the world burn"' },
    ],
    headlineFeat: 'Possesses unpredictable psychological warfare so potent that even superpowered metahumans fear his schemes.',
    verdictSnippet: "The Joker's brilliant nihilistic chaos and complete disregard for self-preservation unnerve and outmaneuver rational opponents.",
  },
];
