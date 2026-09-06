import { EqualizedMatchup } from '../types';
import { findPickDossier } from '../data';

// Helper to determine if a contender is Universe / Cosmic / God Tier
function isUniverseTier(dossier: any): boolean {
  if (!dossier) return false;
  if (dossier.score >= 65) return true;

  const tierText = (dossier.badges?.[0]?.value || '').toLowerCase();
  const featText = (dossier.headlineFeat || '').toLowerCase();
  const allBadgesText = (dossier.badges || []).map((b: any) => `${b.label} ${b.value}`).join(' ').toLowerCase();

  const cosmicKeywords = [
    'multiversal',
    'universal',
    'god',
    'planetary',
    'cosmic',
    'reality warper',
    'solar',
    'galaxy',
    'omni',
    'anti-spiral',
    'god ki',
    'dimension',
    'titan',
    'hollow purple',
  ];

  return cosmicKeywords.some((k) => tierText.includes(k) || featText.includes(k) || allBadgesText.includes(k));
}

// Helper to determine if a contender is Earth / Mortal / Street Tier
function isEarthTier(dossier: any): boolean {
  if (!dossier) return false;
  if (dossier.score <= 40) return true;

  const tierText = (dossier.badges?.[0]?.value || '').toLowerCase();
  const originText = (dossier.universeOrOrigin || '').toLowerCase();
  const allBadgesText = (dossier.badges || []).map((b: any) => `${b.label} ${b.value}`).join(' ').toLowerCase();

  const earthKeywords = [
    'human',
    'street',
    'earth',
    'swordsman',
    'martial artist',
    'mortal',
    'hunter',
    'scout',
    'hashira',
    'breathing',
    'soldier',
    'agent',
    'athlete',
    'bounty hunter',
    'vessel',
    'assassin',
    'ninja',
  ];

  return (
    earthKeywords.some((k) => tierText.includes(k) || originText.includes(k) || allBadgesText.includes(k)) &&
    dossier.score < 60
  );
}

const LIMITATION_TASKS = [
  '🔒 Grand Arena Ki Suppressor: All God-Ki, planetary-scale blasts, and reality warping are sealed to 1% mortal baseline. Flight forbidden. Must defeat opponent strictly through close-quarters hand-to-hand martial technique.',
  '⚖️ 100G Heavy Gravity Shackle Challenge: Equipped with high-density combat dampeners restricting speed to human reaction thresholds. Must land a clean technical disarm without breaking the arena ring boundary.',
  '🛡️ Mortal Vulnerability Protocol: Invulnerability negated — mortal pressure points, weapon cuts, and stamina exhaustion are active. Must parry and counter every tactical weapon strike rather than tanking damage.',
  '⚔️ Pure Martial Arts Restriction: All supernatural forms and dimension-tearing transformations disabled. Confined to human-scale physical martial arts and defensive footwork.',
];

const UNDERDOG_ADVANTAGES = [
  '⚡ Tactical Terrain & Weapon Buff: Speed, poise, and weapon lethality scaled to arena combat range. Granted full spatial awareness, environmental traps, and counter-strike openings.',
  '🎯 Weakness Exploitation Advantage: Opponent dampeners induce recovery lag. Every calculated dodge and parry grants a 2x stagger bonus and lethal strike window.',
  '🥋 Battle Strategy & Stamina Mastery: High-tier opponent suffers rapid stamina depletion under dampeners. Tactical positioning, agility, and combat IQ dictate the outcome.',
];

/**
 * Checks if a duel between two contenders constitutes an unfair tier gap (e.g. Universe/God tier vs Earth/Mortal tier)
 * and generates an official Arena Equalization Protocol with specific limitation tasks and tactical buffs.
 */
export function checkEqualizedMatchup(
  category: string | null | undefined,
  pickA: string,
  pickB: string
): EqualizedMatchup | null {
  if (!pickA || !pickB) return null;

  const safeCategory = category || 'Anime Characters';
  const dossierA = findPickDossier(safeCategory, pickA);
  const dossierB = findPickDossier(safeCategory, pickB);

  if (!dossierA || !dossierB) return null;

  const scoreA = dossierA.score || 50;
  const scoreB = dossierB.score || 50;
  const scoreDiff = Math.abs(scoreA - scoreB);

  const aIsUniverse = isUniverseTier(dossierA);
  const bIsUniverse = isUniverseTier(dossierB);
  const aIsEarth = isEarthTier(dossierA);
  const bIsEarth = isEarthTier(dossierB);

  // Trigger equalization if:
  // 1. One is Universe/God tier and the other is Earth/Street tier, OR
  // 2. The score difference is 35 points or higher
  const shouldEqualize = (aIsUniverse && bIsEarth) || (bIsUniverse && aIsEarth) || scoreDiff >= 35;

  if (!shouldEqualize) return null;

  const aIsHigher = scoreA >= scoreB;
  const overpoweredDossier = aIsHigher ? dossierA : dossierB;
  const underdogDossier = aIsHigher ? dossierB : dossierA;

  const overpoweredTier = overpoweredDossier.badges?.[0]?.value || 'Cosmic Tier';
  const underdogTier = underdogDossier.badges?.[0]?.value || 'Earth Tier';

  // Deterministic index based on character names
  const hash = Math.abs(
    (overpoweredDossier.name + underdogDossier.name).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  );

  const limitationTask = LIMITATION_TASKS[hash % LIMITATION_TASKS.length];
  const underdogAdvantage = UNDERDOG_ADVANTAGES[(hash + 1) % UNDERDOG_ADVANTAGES.length];

  // Normalized power level between 1,150,000 and 1,320,000 for tight scouter competition
  const baseNormalized = 1200000;
  const tierAdvantageBonus = Math.min(120000, scoreDiff * 1500);
  const underdogBuff = 65000 + (hash % 35000);

  const equalizedPowerA = aIsHigher
    ? baseNormalized + tierAdvantageBonus
    : baseNormalized + underdogBuff;

  const equalizedPowerB = aIsHigher
    ? baseNormalized + underdogBuff
    : baseNormalized + tierAdvantageBonus;

  return {
    isEqualized: true,
    tierGap: `${overpoweredTier} vs ${underdogTier}`,
    overpoweredContender: overpoweredDossier.name,
    underdogContender: underdogDossier.name,
    limitationTask,
    underdogAdvantage,
    handicapRuleTitle: '⚖️ Grand Arena Equalizer & Martial Arts Protocol',
    originalDiff: scoreDiff,
    equalizedPowerA,
    equalizedPowerB,
  };
}
