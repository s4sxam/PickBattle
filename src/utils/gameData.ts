export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  emoji: string;
  gradient: string;
  botPicks: string[];
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'anime',
    name: 'Anime Characters',
    description: 'Most powerful, iconic, or memorable anime icons',
    emoji: '⚔️',
    gradient: 'from-rose-500 to-amber-500',
    botPicks: ['Goku (Dragon Ball)', 'Saitama (One Punch Man)', 'Luffy (One Piece)', 'Gojo Satoru (JJK)', 'Naruto Uzumaki', 'Spike Spiegel (Cowboy Bebop)', 'Levi Ackerman (AOT)'],
  },
  {
    id: 'cartoons',
    name: 'Cartoon Characters',
    description: 'Nostalgic classics, animated legends, or Saturday morning heroes',
    emoji: '📺',
    gradient: 'from-amber-400 to-orange-600',
    botPicks: ['SpongeBob SquarePants', 'Bugs Bunny', 'Perry the Platypus', 'Scooby-Doo', 'Tom & Jerry', 'Finn the Human', 'Dexter (Dexter\'s Lab)'],
  },
  {
    id: 'cars',
    name: 'Cars & Vehicles',
    description: 'Dream supercars, classic muscle, or ridiculous fantasy rides',
    emoji: '🏎️',
    gradient: 'from-red-600 to-stone-800',
    botPicks: ['1969 Ford Mustang Mach 1', 'Batmobile (Tumbler)', 'Porsche 911 GT3 RS', 'DeLorean Time Machine', 'McLaren F1', 'Toyota AE86 Trueno'],
  },
  {
    id: 'musicians',
    name: 'Musicians & Bands',
    description: 'Rockstars, pop legends, rappers, or all-time icons',
    emoji: '🎸',
    gradient: 'from-violet-600 to-indigo-800',
    botPicks: ['Freddie Mercury', 'Michael Jackson', 'Daft Punk', 'Eminem', 'David Bowie', 'Jimi Hendrix', 'Beyoncé', 'Queen'],
  },
  {
    id: 'athletes',
    name: 'Athletes & Legends',
    description: 'The undisputed GOATs across all sports history',
    emoji: '🏆',
    gradient: 'from-emerald-500 to-teal-700',
    botPicks: ['Michael Jordan', 'Lionel Messi', 'Muhammad Ali', 'Usain Bolt', 'Serena Williams', 'Pelé', 'Wayne Gretzky'],
  },
  {
    id: 'games',
    name: 'Video Game Characters',
    description: 'Protagonists, bosses, or iconic game mascots',
    emoji: '🎮',
    gradient: 'from-cyan-500 to-blue-700',
    botPicks: ['Master Chief (Halo)', 'Kratos (God of War)', 'Mario', 'Geralt of Rivia', 'Link (Zelda)', 'Doom Slayer', 'Solid Snake', 'Samus Aran'],
  },
  {
    id: 'superheroes',
    name: 'Superheroes & Vigilantes',
    description: 'Caped crusaders, mutant defenders, or dark knights',
    emoji: '🦸',
    gradient: 'from-blue-600 to-rose-600',
    botPicks: ['Batman', 'Spider-Man', 'Iron Man', 'Wolverine', 'Superman', 'Deadpool', 'Doctor Strange'],
  },
  {
    id: 'villains',
    name: 'Movie Villains',
    description: 'The most terrifying, charismatic, or unforgettable antagonists',
    emoji: '🦹',
    gradient: 'from-purple-900 to-slate-900',
    botPicks: ['Darth Vader', 'The Joker (Heath Ledger)', 'Hannibal Lecter', 'Thanos', 'Hans Landa (Inglourious Basterds)', 'Sauron'],
  },
  {
    id: 'wrestlers',
    name: 'Pro Wrestlers',
    description: 'Attitude era legends, high flyers, or mic drop champions',
    emoji: '🥊',
    gradient: 'from-yellow-500 to-red-600',
    botPicks: ['The Rock', 'Stone Cold Steve Austin', 'The Undertaker', 'John Cena', 'Macho Man Randy Savage', 'Rey Mysterio', 'Ric Flair'],
  },
  {
    id: 'foods',
    name: 'Foods & Snacks',
    description: 'Late night cravings, legendary comfort food, or best snacks',
    emoji: '🍕',
    gradient: 'from-orange-500 to-amber-600',
    botPicks: ['Wood-fired Margherita Pizza', 'Double Smash Cheeseburger', 'Authentic Street Tacos', 'Warm Cinnamon Glazed Donut', 'Crunchy French Fries', 'Spicy Pork Tonkotsu Ramen'],
  },
  {
    id: 'scifi',
    name: 'Sci-Fi Inventions & Gadgets',
    description: 'Portal guns, lightsabers, or time manipulation tech',
    emoji: '🛸',
    gradient: 'from-teal-400 to-indigo-600',
    botPicks: ['Lightsaber (Star Wars)', 'Portal Gun (Portal)', 'Neuralyzer (Men in Black)', 'TARDIS (Doctor Who)', 'Hoverboard (Back to the Future)', 'Iron Man Nano Suit'],
  },
  {
    id: 'mythology',
    name: 'Mythological Gods & Beasts',
    description: 'Olympian deities, Norse beasts, or legendary dragons',
    emoji: '⚡',
    gradient: 'from-amber-500 to-violet-700',
    botPicks: ['Zeus (Thunderbolt)', 'Thor & Mjolnir', 'Anubis', 'Fenrir the Great Wolf', 'Phoenix of Fire', 'Poseidon of the Oceans'],
  },
  {
    id: 'wildcard',
    name: 'Wildcard — Anything Goes!',
    description: 'No limits. Pick anything you think wins the crowd\'s vote.',
    emoji: '🃏',
    gradient: 'from-fuchsia-600 to-pink-600',
    botPicks: ['A fresh pair of warm socks on a cold morning', 'The smell of rain on hot asphalt', 'WiFi that connects instantly', 'Finding $20 in an old coat pocket', '8 uninterrupted hours of sleep'],
  },
];

export const FLAVOR_LINES = [
  'The votes are in — no bribery detected... probably.',
  'Democracy has spoken. The verdict is indisputable.',
  'Controversial? Absolutely. Final? Yes.',
  'Certified by the peer review committee with zero conflicts of interest.',
  'The debate was heated, but a champion has emerged.',
  'Friendships were tested. The crowd has chosen their king.',
  'The people’s tribunal has delivered its righteous judgment.',
  'Statisticians have reviewed the counts. No recount allowed.',
];

export const EMOJI_AVATARS = [
  '😎', '🤠', '🦊', '🐯', '🤖', '👾', '🚀', '🔥', 
  '🍕', '🌮', '🎸', '👑', '⚡', '🐉', '🎯', '🥑', 
  '🦄', '🐼', '👻', '💎', '🛸', '🦁', '🌟', '🎩'
];

export const BOT_NAMES = [
  { name: 'PickMaster_99', emoji: '🤖' },
  { name: 'Captain_Hype', emoji: '🤠' },
  { name: 'VibeCheck_Bot', emoji: '👾' },
  { name: 'HotTake_Hero', emoji: '🔥' },
  { name: 'Wildcard_Wes', emoji: '🃏' },
];

// Clean profanity filter checking for common offensive slurs/harassment
const BANNED_WORDS = [
  'nigger', 'nigga', 'faggot', 'fag', 'kike', 'chink', 'retard', 'cunt', 'whore', 'slut'
];

export function sanitizeText(text: string, maxLen = 60): { clean: string; isValid: boolean; error?: string } {
  if (!text) return { clean: '', isValid: false, error: 'Cannot be empty' };
  const trimmed = text.trim();
  if (trimmed.length === 0) return { clean: '', isValid: false, error: 'Cannot be empty' };
  if (trimmed.length > maxLen) {
    return { clean: trimmed.slice(0, maxLen), isValid: true };
  }

  const lower = trimmed.toLowerCase();
  for (const banned of BANNED_WORDS) {
    if (lower.includes(banned)) {
      return { clean: '', isValid: false, error: 'Please keep it friendly and respectful!' };
    }
  }

  return { clean: trimmed, isValid: true };
}
