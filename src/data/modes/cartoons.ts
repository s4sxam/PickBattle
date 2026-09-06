import { ContenderDossier } from '../types';

export const CARTOONS_DATABASE: ContenderDossier[] = [
  {
    name: 'Bugs Bunny',
    aliases: ['bugs bunny', 'bugs'],
    category: 'cartoons',
    universeOrOrigin: 'Looney Tunes (Warner Bros.)',
    score: 98,
    scouterPowerLevel: 9800000,
    badges: [
      { label: 'Tier', value: 'High Toon Force Reality Manipulator', highlight: true },
      { label: 'Signature Gag', value: '"What’s up, Doc?" & Animating the Animator' },
      { label: 'Durability', value: 'Immortal Toon Physics' },
      { label: 'Feat', value: 'Sawed Florida off into the ocean with a hand-saw' },
    ],
    headlineFeat: 'Erased his own animator with an eraser in Duck Amuck, proving complete fourth-wall narrative control.',
    verdictSnippet: "Bugs Bunny's fourth-wall breaking Toon Force rewrites the script and warps physics to ensure he always gets the last laugh.",
  },
  {
    name: 'SpongeBob SquarePants',
    aliases: ['spongebob', 'spongebob squarepants'],
    category: 'cartoons',
    universeOrOrigin: 'Bikini Bottom (Nickelodeon)',
    score: 94,
    scouterPowerLevel: 9200000,
    badges: [
      { label: 'Tier', value: 'Cellular Sponge Regeneration', highlight: true },
      { label: 'Signature Feat', value: 'Unraveled the entire universe with a loose string' },
      { label: 'Defense', value: 'Absorbs physical blunt trauma as tickles' },
      { label: 'Vocation', value: '374 Consecutive Fry Cook of the Month Awards' },
    ],
    headlineFeat: 'Flats the Flounder punched him non-stop until passing out from exhaustion while SpongeBob giggled.',
    verdictSnippet: "SpongeBob's cellular elasticity and complete immunity to blunt trauma absorb all physical attacks effortlessly.",
  },
  {
    name: 'Perry the Platypus',
    aliases: ['perry the platypus', 'perry', 'agent p'],
    category: 'cartoons',
    universeOrOrigin: 'O.W.C.A. (Danville / Phineas & Ferb)',
    score: 89,
    scouterPowerLevel: 8500000,
    badges: [
      { label: 'Tier', value: 'Master Secret Agent / Fedora Operative', highlight: true },
      { label: 'Signature Move', value: 'Tail Whip & Grappling Hook Escape' },
      { label: 'Rivalry', value: '100% Win Rate Against Dr. Doofenshmirtz’s Inators' },
      { label: 'Cover', value: 'Mindless teal platypus that doesn\'t do much' },
    ],
    headlineFeat: 'Foil after foil, dismantled high-tech doomsday devices using only a fedora, improvised physics, and martial arts.',
    verdictSnippet: "Agent P's stealth martial arts and high-IQ gadgetry outsmart cartoon supervillains before they can activate their traps.",
  },
];
