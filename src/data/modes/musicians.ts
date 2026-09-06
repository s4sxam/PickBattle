import { ContenderDossier } from '../types';

export const MUSICIANS_DATABASE: ContenderDossier[] = [
  {
    name: 'Michael Jackson (The King of Pop)',
    aliases: ['michael jackson', 'king of pop', 'mj music'],
    category: 'musicians',
    universeOrOrigin: 'Gary, Indiana / Global Pop Royalty',
    score: 99,
    scouterPowerLevel: 9900000,
    badges: [
      { label: 'Record Sales', value: 'Over 400 Million Records Sold', highlight: true },
      { label: 'Historic Album', value: 'Thriller (Best-selling album in human history: 70M+)' },
      { label: 'Signature Move', value: 'The Moonwalk & 45-Degree Anti-Gravity Lean' },
      { label: 'Grammys', value: '13 Grammy Awards + Grammy Legend Award' },
    ],
    headlineFeat: 'Single-handedly created the modern music video format and halted global traffic when he stepped on stage.',
    verdictSnippet: "Michael Jackson's immortal musical genius, unprecedented record sales, and hypnotic stage presence reign supreme in pop history.",
  },
  {
    name: 'Freddie Mercury & Queen',
    aliases: ['freddie mercury', 'queen band', 'queen'],
    category: 'musicians',
    universeOrOrigin: 'London, UK / Rock and Roll Hall of Fame',
    score: 98,
    scouterPowerLevel: 9800000,
    badges: [
      { label: 'Vocal Range', value: 'Four Full Octaves (Subharmonic Operatic Tenor)', highlight: true },
      { label: 'Historic Show', value: 'Live Aid at Wembley Stadium (1985 — Greatest Rock Set Ever)' },
      { label: 'Masterpiece', value: 'Bohemian Rhapsody & We Are the Champions' },
      { label: 'Crowd Command', value: 'Held 72,000 Wembley fans in the palm of his hand with "Ay-Oh"' },
    ],
    headlineFeat: 'Live Aid 1985 performance was voted the single greatest live rock performance of all time by music historians.',
    verdictSnippet: "Freddie Mercury's four-octave vocal power, theatrical bravura, and arena-commanding charisma stand unmatched.",
  },
];
