import { ContenderDossier } from './types';
import { ANIME_DATABASE } from './modes/anime';
import { CARS_DATABASE } from './modes/cars';
import { FOODS_DATABASE } from './modes/foods';
import { SUPERHEROES_DATABASE } from './modes/superheroes';
import { ATHLETES_DATABASE } from './modes/athletes';
import { GAMES_DATABASE } from './modes/games';
import { CARTOONS_DATABASE } from './modes/cartoons';
import { VILLAINS_DATABASE } from './modes/villains';
import { MYTHOLOGY_DATABASE } from './modes/mythology';
import { SCIFI_DATABASE } from './modes/scifi';
import { MUSICIANS_DATABASE } from './modes/musicians';
import { WRESTLERS_DATABASE } from './modes/wrestlers';
import { WILDCARD_DATABASE } from './modes/wildcard';

export * from './types';

// Registry of all category databases
export const ALL_CATEGORY_DATABASES: Record<string, ContenderDossier[]> = {
  anime: ANIME_DATABASE,
  cars: CARS_DATABASE,
  foods: FOODS_DATABASE,
  superheroes: SUPERHEROES_DATABASE,
  athletes: ATHLETES_DATABASE,
  games: GAMES_DATABASE,
  cartoons: CARTOONS_DATABASE,
  villains: VILLAINS_DATABASE,
  mythology: MYTHOLOGY_DATABASE,
  scifi: SCIFI_DATABASE,
  musicians: MUSICIANS_DATABASE,
  wrestlers: WRESTLERS_DATABASE,
  wildcard: WILDCARD_DATABASE,
};

// Clean string for fuzzy matching
export function normalizeText(txt: string): string {
  return txt
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
}

// Deterministic hash for consistent procedural stats on unlisted picks
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Procedurally generate realistic, authentic stats for any pick searched on Google / entered by user
 */
function synthesizeDossier(categoryKey?: string | null, rawPick?: string): ContenderDossier {
  const norm = normalizeText(rawPick || 'Wild Pick');
  const h = hashString(norm);
  const cat = (categoryKey || 'anime').toLowerCase();

  if (cat.includes('car') || cat.includes('vehicle')) {
    const hp = 450 + (h % 900); // 450 - 1350 HP
    const speed = 175 + (h % 140); // 175 - 315 mph
    const zeroSixty = (2.2 + ((h % 22) / 10)).toFixed(1); // 2.2 - 4.4 sec
    const priceK = 65 + (h % 1400); // $65,000 - $1,465,000
    const priceStr = priceK >= 1000 ? `$${(priceK / 1000).toFixed(1)}M USD` : `$${priceK},000 USD`;

    return {
      name: rawPick,
      aliases: [norm],
      category: 'cars',
      universeOrOrigin: 'High-Performance Automotive Engineering',
      score: 75 + (h % 23),
      scouterPowerLevel: 6500000 + (h % 3000000),
      badges: [
        { label: 'Horsepower', value: `${hp} HP`, highlight: true },
        { label: 'Top Speed', value: `${speed} mph` },
        { label: '0-60 mph', value: `${zeroSixty} sec` },
        { label: 'Price', value: priceStr },
      ],
      headlineFeat: `Delivers ${hp} horsepower with an aggressive ${zeroSixty}s 0-60 launch and ${speed} mph top-end track performance.`,
      verdictSnippet: `${rawPick}'s ${hp} HP output and ${speed} mph top speed provide serious track-bred performance.`,
    };
  }

  if (cat.includes('food') || cat.includes('snack')) {
    const rating = (4.6 + ((h % 40) / 100)).toFixed(2);
    const reviews = 5000 + (h % 45000);
    const comfortScore = 88 + (h % 12);

    return {
      name: rawPick,
      aliases: [norm],
      category: 'foods',
      universeOrOrigin: 'Culinary Specialty / Gastronomy',
      score: 78 + (h % 20),
      scouterPowerLevel: 7000000 + (h % 2500000),
      badges: [
        { label: 'Review Score', value: `${rating} / 5.0 (${reviews.toLocaleString()} Google Reviews)`, highlight: true },
        { label: 'Comfort Score', value: `${comfortScore} / 100 Craving Index` },
        { label: 'Texture & Flavor', value: 'High Umami & Irresistible Aroma' },
        { label: 'Status', value: 'Celebrated Culinary Staple' },
      ],
      headlineFeat: `Universally rated ${rating}/5 stars across ${reviews.toLocaleString()} diner reviews for profound, memorable flavor execution.`,
      verdictSnippet: `${rawPick}'s stellar ${rating}/5.0 restaurant review standing and rich flavor profile satisfy the palate completely.`,
    };
  }

  if (cat.includes('anime')) {
    const tiers = ['City-Level Striker', 'Continental Threat', 'Planetary Titan', 'God-Ki Multiversal', 'Conceptual Reality Warper'];
    const tier = tiers[h % tiers.length];
    const power = 7000000 + (h % 2900000);

    return {
      name: rawPick,
      aliases: [norm],
      category: 'anime',
      universeOrOrigin: 'Legendary Anime Canon',
      score: 80 + (h % 19),
      scouterPowerLevel: power,
      badges: [
        { label: 'Power Tier', value: tier, highlight: true },
        { label: 'Combat Style', value: 'Unrelenting Aura / Transonic Martial Arts' },
        { label: 'Aura Output', value: `${(power / 100000).toFixed(0)}x Divine Ki Density` },
        { label: 'Feat', value: 'Overpowered elite foes in decisive tournament showdowns' },
      ],
      headlineFeat: `Classified as a ${tier} with formidable combat feats and reality-shaking stamina.`,
      verdictSnippet: `${rawPick}'s ${tier} mastery and relentless combat stamina overcome opponents through sheer battle prowess.`,
    };
  }

  // General default procedural dossier
  const power = 6500000 + (h % 3200000);
  return {
    name: rawPick,
    aliases: [norm],
    category: cat,
    universeOrOrigin: 'Cultural Hall of Fame',
    score: 76 + (h % 22),
    scouterPowerLevel: power,
    badges: [
      { label: 'Prestige Tier', value: 'Top-Tier Icon', highlight: true },
      { label: 'Mastery', value: 'Decisive Benchmark in its Category' },
      { label: 'Impact', value: 'Wide Public Acclaim & High Cultural Gravity' },
    ],
    headlineFeat: `Stands as a proven, highly influential contender renowned for exceptional performance and distinction.`,
    verdictSnippet: `${rawPick} demonstrates superior category execution and unmatched cultural momentum.`,
  };
}

export function getCategoryKey(category?: string | null): string {
  const cat = (category || 'anime').toLowerCase();
  if (cat.includes('anime')) return 'anime';
  if (cat.includes('cartoon')) return 'cartoons';
  if (cat.includes('car') || cat.includes('vehicle')) return 'cars';
  if (cat.includes('music') || cat.includes('band')) return 'musicians';
  if (cat.includes('athlete') || cat.includes('sport')) return 'athletes';
  if (cat.includes('game')) return 'games';
  if (cat.includes('superhero') || cat.includes('comic')) return 'superheroes';
  if (cat.includes('food') || cat.includes('snack')) return 'foods';
  if (cat.includes('villain')) return 'villains';
  if (cat.includes('myth')) return 'mythology';
  if (cat.includes('scifi') || cat.includes('sci-fi') || cat.includes('cyberpunk')) return 'scifi';
  if (cat.includes('wrestl') || cat.includes('combat')) return 'wrestlers';
  if (cat.includes('wildcard') || cat.includes('anything')) return 'wildcard';
  return 'anime';
}

export function createDisqualifiedDossier(
  category?: string | null,
  rawPick?: string
): ContenderDossier {
  const safeName = (rawPick || 'Invalid Pick').trim();
  const catLabel = category || 'Category';
  return {
    name: safeName,
    aliases: [normalizeText(safeName)],
    category: getCategoryKey(category),
    universeOrOrigin: `Off-Topic / Not in ${catLabel} File`,
    score: 0,
    scouterPowerLevel: 0,
    isDisqualified: true,
    disqualificationReason: `"${safeName}" was not found in the official ${catLabel} database file.`,
    badges: [
      { label: 'Status', value: 'ELIMINATED / DISQUALIFIED', highlight: true },
      { label: 'Roster Violation', value: `Not in ${catLabel} File` },
      { label: 'Power Level', value: '0 (Forfeit)' },
      { label: 'Penalty', value: 'Wait for Next Round' },
    ],
    headlineFeat: `Disqualified from battle: "${safeName}" does not exist in the official ${catLabel} roster file.`,
    verdictSnippet: `Automatically eliminated due to off-topic / unlisted submission. Must wait for the next round.`,
  };
}

export interface CategoryRosterCheckResult {
  isAllowed: boolean;
  dossier: ContenderDossier;
  canonicalName: string;
  matchedFromCategoryFile: boolean;
  categoryKey: string;
  reason?: string;
}

/**
 * Validates strictly whether an entered pick is in the active category's database file.
 * If not in the category file, it is automatically marked as disqualified / eliminated.
 */
export function checkCategoryRosterMatch(
  category?: string | null,
  rawPick?: string
): CategoryRosterCheckResult {
  const catKey = getCategoryKey(category);
  const targetDb = ALL_CATEGORY_DATABASES[catKey] || [];
  const cleanPick = (rawPick || '').trim();

  if (!cleanPick) {
    const disq = createDisqualifiedDossier(category, 'Empty Pick');
    return {
      isAllowed: false,
      dossier: disq,
      canonicalName: 'Empty Pick',
      matchedFromCategoryFile: false,
      categoryKey: catKey,
      reason: 'No pick was submitted.',
    };
  }

  const cleanQuery = normalizeText(cleanPick);
  const strippedParenthesis = cleanPick.replace(/\s*\([^)]*\)/g, '').trim();
  const cleanStripped = normalizeText(strippedParenthesis);

  // 1. Exact match on name in category database file
  for (const item of targetDb) {
    const itemNorm = normalizeText(item.name);
    if (itemNorm === cleanQuery || (cleanStripped.length > 0 && itemNorm === cleanStripped)) {
      return {
        isAllowed: true,
        dossier: item,
        canonicalName: item.name,
        matchedFromCategoryFile: true,
        categoryKey: catKey,
      };
    }
  }

  // 2. Exact match on aliases in category database file
  for (const item of targetDb) {
    if (item.aliases) {
      for (const alias of item.aliases) {
        const aliasNorm = normalizeText(alias);
        if (aliasNorm === cleanQuery || (cleanStripped.length > 0 && aliasNorm === cleanStripped)) {
          return {
            isAllowed: true,
            dossier: item,
            canonicalName: item.name,
            matchedFromCategoryFile: true,
            categoryKey: catKey,
          };
        }
      }
    }
  }

  // 3. Substring / Containment match in category database file (requires length >= 3)
  for (const item of targetDb) {
    const itemNorm = normalizeText(item.name);
    if (itemNorm.length >= 3 && cleanQuery.length >= 3) {
      if (cleanQuery.includes(itemNorm) || (cleanStripped.length >= 3 && cleanStripped.includes(itemNorm))) {
        return {
          isAllowed: true,
          dossier: item,
          canonicalName: item.name,
          matchedFromCategoryFile: true,
          categoryKey: catKey,
        };
      }
      if (itemNorm.includes(cleanQuery) || (cleanStripped.length >= 3 && itemNorm.includes(cleanStripped))) {
        return {
          isAllowed: true,
          dossier: item,
          canonicalName: item.name,
          matchedFromCategoryFile: true,
          categoryKey: catKey,
        };
      }
    }

    if (item.aliases) {
      for (const alias of item.aliases) {
        const aliasNorm = normalizeText(alias);
        if (aliasNorm.length >= 3 && cleanQuery.length >= 3) {
          if (cleanQuery.includes(aliasNorm) || aliasNorm.includes(cleanQuery)) {
            return {
              isAllowed: true,
              dossier: item,
              canonicalName: item.name,
              matchedFromCategoryFile: true,
              categoryKey: catKey,
            };
          }
        }
      }
    }
  }

  // Not in the official category file -> Eliminated
  const disq = createDisqualifiedDossier(category, cleanPick);
  const catLabel = category || 'this category';
  return {
    isAllowed: false,
    dossier: disq,
    canonicalName: cleanPick,
    matchedFromCategoryFile: false,
    categoryKey: catKey,
    reason: `"${cleanPick}" is not found in the official ${catLabel} roster file. Automatically eliminated!`,
  };
}

/**
 * Searches the active category database file for live autocomplete and allowed character suggestions.
 */
export function searchCategoryRoster(
  category?: string | null,
  query?: string,
  limit = 8
): ContenderDossier[] {
  const catKey = getCategoryKey(category);
  const targetDb = ALL_CATEGORY_DATABASES[catKey] || [];
  if (!query || !query.trim()) {
    return targetDb.slice(0, limit);
  }

  const qNorm = normalizeText(query);
  const results: ContenderDossier[] = [];
  const seen = new Set<string>();

  for (const item of targetDb) {
    if (results.length >= limit) break;
    const nameNorm = normalizeText(item.name);
    const matchesName = nameNorm.includes(qNorm);
    const matchesAlias = item.aliases?.some((a) => normalizeText(a).includes(qNorm));
    const matchesUniverse = item.universeOrOrigin && normalizeText(item.universeOrOrigin).includes(qNorm);

    if (matchesName || matchesAlias || matchesUniverse) {
      if (!seen.has(nameNorm)) {
        seen.add(nameNorm);
        results.push(item);
      }
    }
  }

  return results;
}

/**
 * Find the most accurate dossier for a pick strictly in the chosen category.
 * If not in the category file, returns an eliminated / disqualified dossier with 0 power.
 */
export function findPickDossier(category?: string | null, rawPick?: string): ContenderDossier {
  const check = checkCategoryRosterMatch(category, rawPick);
  return check.dossier;
}

/**
 * Compare two picks using their real encyclopedic data and output a decisive winner and punchy verdict.
 * Enforces automatic instant elimination if a pick is not in the official category file.
 */
export function compareContenders(
  category: string | undefined | null,
  pickA: string,
  pickB: string
): { ranking: ['Pick A', 'Pick B'] | ['Pick B', 'Pick A']; verdict: string } {
  const safeCategory = category || 'Anime Characters';
  const checkA = checkCategoryRosterMatch(safeCategory, pickA);
  const checkB = checkCategoryRosterMatch(safeCategory, pickB);
  const dossierA = checkA.dossier;
  const dossierB = checkB.dossier;

  // Case 1: Both disqualified
  if (dossierA.isDisqualified && dossierB.isDisqualified) {
    return {
      ranking: ['Pick A', 'Pick B'],
      verdict: `🚨 [DOUBLE ELIMINATION] Both "${pickA}" and "${pickB}" are disqualified for not being in the official ${safeCategory} roster file! Neither contender advances.`,
    };
  }

  // Case 2: Pick A is disqualified (e.g., "98" or "doraemon" in Anime), Pick B is valid
  if (dossierA.isDisqualified && !dossierB.isDisqualified) {
    return {
      ranking: ['Pick B', 'Pick A'],
      verdict: `🚨 [AUTOMATIC ELIMINATION] "${pickA}" is disqualified and eliminated (not in the official ${safeCategory} file)! ${dossierB.name} wins by automatic forfeit!`,
    };
  }

  // Case 3: Pick B is disqualified, Pick A is valid
  if (!dossierA.isDisqualified && dossierB.isDisqualified) {
    return {
      ranking: ['Pick A', 'Pick B'],
      verdict: `🚨 [AUTOMATIC ELIMINATION] "${pickB}" is disqualified and eliminated (not in the official ${safeCategory} file)! ${dossierA.name} wins by automatic forfeit!`,
    };
  }

  // Case 4: Both are valid contenders in the category roster
  const diff = dossierA.score - dossierB.score;
  const aWins = diff !== 0 ? diff > 0 : dossierA.scouterPowerLevel >= dossierB.scouterPowerLevel;

  const winner = aWins ? dossierA : dossierB;
  const loser = aWins ? dossierB : dossierA;
  const ranking: ['Pick A', 'Pick B'] | ['Pick B', 'Pick A'] = aWins
    ? ['Pick A', 'Pick B']
    : ['Pick B', 'Pick A'];

  // Craft an in-depth, authentic verdict based on the real specs
  const cat = safeCategory.toLowerCase();

  if (cat.includes('car') || cat.includes('vehicle')) {
    const hpBadgeWin = winner.badges.find((b) => b.label.includes('Horsepower'))?.value || 'monstrous horsepower';
    const speedWin = winner.badges.find((b) => b.label.includes('Top Speed'))?.value || 'extreme top speed';
    const zeroSixtyWin = winner.badges.find((b) => b.label.includes('0-60'))?.value;

    const hpBadgeLose = loser.badges.find((b) => b.label.includes('Horsepower'))?.value || 'lower horsepower';
    const speedLose = loser.badges.find((b) => b.label.includes('Top Speed'))?.value;

    if (zeroSixtyWin && speedLose) {
      return {
        ranking,
        verdict: `${winner.name} dominates with ${hpBadgeWin} and a blisteringly fast ${zeroSixtyWin} 0-60 sprint, out-accelerating ${loser.name} (${hpBadgeLose}, ${speedLose}) on tarmac.`,
      };
    }

    return {
      ranking,
      verdict: `${winner.name}'s engineering pedigree (${hpBadgeWin}, ${speedWin}) outpowers ${loser.name}'s ${hpBadgeLose} in sheer top-end performance.`,
    };
  }

  if (cat.includes('food') || cat.includes('snack')) {
    const revWin = winner.badges.find((b) => b.label.includes('Review'))?.value || '4.9/5 stars';
    const revLose = loser.badges.find((b) => b.label.includes('Review'))?.value || 'acclaimed standing';

    return {
      ranking,
      verdict: `${winner.name} claims the culinary crown with an elite ${revWin} rating, overwhelming ${loser.name} in flavor complexity and universal diner acclaim.`,
    };
  }

  if (cat.includes('anime')) {
    const isTierGap = Math.abs(dossierA.score - dossierB.score) >= 35;
    if (isTierGap) {
      const isWinnerOverpowered = winner.score > loser.score;
      if (isWinnerOverpowered) {
        return {
          ranking,
          verdict: `Under Equalized Arena rules (cosmic powers sealed to 1% mortal limits), ${loser.name}'s tactical technique pushes the duel to the brink before ${winner.name}'s martial arts mastery claims a razor-thin victory!`,
        };
      } else {
        return {
          ranking,
          verdict: `Under Equalized Arena rules, ${winner.name}'s tactical terrain mastery and weakness exploitation out-maneuver ${loser.name}'s heavily suppressed power in an astonishing tactical upset!`,
        };
      }
    }

    return {
      ranking,
      verdict: `${winner.name} (${winner.badges[0]?.value || 'Cosmic Tier'}) out-scales ${loser.name}: ${winner.headlineFeat}`,
    };
  }

  if (cat.includes('athlete') || cat.includes('sport')) {
    const featWin = winner.badges[0]?.value || 'legendary championship haul';
    return {
      ranking,
      verdict: `${winner.name} takes it with ${featWin} and an untouchable clutch pedigree that outshines ${loser.name}.`,
    };
  }

  // Universal high-stakes verdict
  return {
    ranking,
    verdict: `${winner.name} decisively prevails over ${loser.name}: ${winner.verdictSnippet}`,
  };
}
