import { Room } from '../types';
import { findPickDossier, normalizeText } from '../data';

export interface UsedCharacterRecord {
  roundNumber: number;
  characterName: string;
  originalPick: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  canonicalName: string;
  matchedRound?: number;
  allUsedCharacters: UsedCharacterRecord[];
}

/**
 * Returns all unique characters used by a specific player in prior rounds of the current match.
 */
export function getUsedAnimeCharactersForPlayer(
  room: Room,
  playerId: string
): UsedCharacterRecord[] {
  if (!room || !room.roundHistory || room.roundHistory.length === 0) {
    return [];
  }

  const results: UsedCharacterRecord[] = [];
  const seenCanonical = new Set<string>();

  for (const round of room.roundHistory) {
    const sub = round.submissions?.find((s) => s.playerId === playerId);
    if (sub && sub.pick && sub.pick.trim()) {
      const dossier = findPickDossier(round.category, sub.pick);
      const canonicalName = dossier?.name || sub.pick.trim();
      const norm = normalizeText(canonicalName);

      if (!seenCanonical.has(norm)) {
        seenCanonical.add(norm);
        results.push({
          roundNumber: round.roundNumber,
          characterName: canonicalName,
          originalPick: sub.pick,
        });
      }
    }
  }

  return results;
}

/**
 * Validates whether the candidate pick has already been deployed by this player in an earlier round of the current match.
 */
export function checkDuplicateCharacterInMatch(
  room: Room,
  playerId: string,
  candidatePick: string,
  category?: string | null
): DuplicateCheckResult {
  const allUsedCharacters = getUsedAnimeCharactersForPlayer(room, playerId);
  const cleanPick = (candidatePick || '').trim();

  if (!cleanPick) {
    return {
      isDuplicate: false,
      canonicalName: '',
      allUsedCharacters,
    };
  }

  const targetCategory = category || room.currentCategory || 'Anime Characters';
  const isAnimeCategory = targetCategory.toLowerCase().includes('anime');

  // If this is an anime category, we enforce the no-duplicate-character-per-match rule
  const candidateDossier = findPickDossier(targetCategory, cleanPick);
  const candidateCanonicalName = candidateDossier?.name || cleanPick;
  const candidateNorm = normalizeText(candidateCanonicalName);
  const rawCandidateNorm = normalizeText(cleanPick);

  if (isAnimeCategory) {
    for (const record of allUsedCharacters) {
      const recordedNorm = normalizeText(record.characterName);
      const recordedOriginalNorm = normalizeText(record.originalPick);

      // Check if canonical name matches, or if either string matches normalized text
      if (
        recordedNorm === candidateNorm ||
        recordedOriginalNorm === rawCandidateNorm ||
        (candidateDossier?.aliases &&
          candidateDossier.aliases.some((a) => normalizeText(a) === recordedNorm))
      ) {
        return {
          isDuplicate: true,
          canonicalName: record.characterName,
          matchedRound: record.roundNumber,
          allUsedCharacters,
        };
      }
    }
  }

  return {
    isDuplicate: false,
    canonicalName: candidateCanonicalName,
    allUsedCharacters,
  };
}
