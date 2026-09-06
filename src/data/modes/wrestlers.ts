import { ContenderDossier } from '../types';

export const WRESTLERS_DATABASE: ContenderDossier[] = [
  {
    name: 'The Undertaker (The Deadman)',
    aliases: ['the undertaker', 'undertaker', 'the deadman', 'mark calaway'],
    category: 'wrestlers',
    universeOrOrigin: 'Death Valley / WWE',
    score: 98,
    scouterPowerLevel: 9800000,
    badges: [
      { label: 'WrestleMania Streak', value: 'The Streak: 21-0 Undefeated Legendary Run', highlight: true },
      { label: 'Finishing Moves', value: 'Tombstone Piledriver, Chokeslam, Last Ride' },
      { label: 'Longevity', value: '30 Years of WWE Locker Room Leadership' },
      { label: 'Entrance', value: 'Tolling Funeral Bell & Eerie Fog Lights' },
    ],
    headlineFeat: 'Built a 21-0 WrestleMania winning streak that stands as the greatest record in sports entertainment history.',
    verdictSnippet: "The Undertaker's chilling aura, legendary WrestleMania streak, and devastating Tombstone Piledriver conquer any ring.",
  },
  {
    name: '"Stone Cold" Steve Austin',
    aliases: ['stone cold steve austin', 'stone cold', 'steve austin', 'texas rattlesnake'],
    category: 'wrestlers',
    universeOrOrigin: 'Victoria, Texas / WWE Attitude Era',
    score: 97,
    scouterPowerLevel: 9700000,
    badges: [
      { label: 'Attitude Era', value: 'Highest Grossing Box Office Draw in Wrestling History', highlight: true },
      { label: 'Finishing Move', value: 'The Stone Cold Stunner' },
      { label: 'Iconic Catchphrase', value: '"Austin 3:16 says I just whipped your ass!"' },
      { label: 'Championships', value: '6x WWE Champion, 3x Royal Rumble Winner' },
    ],
    headlineFeat: 'Rode a beer truck into the arena to hose down Mr. McMahon and sparked the highest TV ratings era of all time.',
    verdictSnippet: "Stone Cold's anti-authority rebellion, beer-swilling fury, and explosive Stunner deliver instant crowd-roaring knockouts.",
  },
  {
    name: 'The Rock (Dwayne Johnson)',
    aliases: ['the rock', 'dwayne johnson', 'the people\'s champion', 'the great one'],
    category: 'wrestlers',
    universeOrOrigin: 'Miami, Florida / WWE & Hollywood',
    score: 96,
    scouterPowerLevel: 9600000,
    badges: [
      { label: 'Moniker', value: '"The Most Electrifying Man in Sports Entertainment"', highlight: true },
      { label: 'Finishing Move', value: 'Rock Bottom & The People’s Elbow' },
      { label: 'Mic Skills', value: 'Unrivaled Arena Promo Charisma' },
      { label: 'Cultural Reach', value: 'Wrestling Icon turned #1 Hollywood Box Office Star' },
    ],
    headlineFeat: 'Possesses electrifying mic command that turns entire stadium crowds of 80,000 into a thunderous choir.',
    verdictSnippet: "The Rock's electrifying charisma, blistering promo roasts, and seismic Rock Bottom dominate both the ring and the box office.",
  },
];
