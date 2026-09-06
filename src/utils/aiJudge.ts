import { findPickDossier, compareContenders } from '../data';
import { EqualizedMatchup } from '../types';

export interface JudgeItem {
  label: string; // e.g. "Pick A", "Pick B"
  pick: string;
}

export interface JudgeResult {
  ranking: string[]; // Ordered from 1st place to last, using labels (e.g. ["Pick A", "Pick B"])
  verdict: string; // One short, punchy sentence explaining why the winner takes it
}

// Built-in intelligent encyclopedic judge with comprehensive data across Anime, Cars, Foods, and all modes
export function fallbackJudge(
  category: string,
  items: JudgeItem[],
  equalizedMatchup?: EqualizedMatchup | null
): JudgeResult {
  if (items.length === 0) {
    return { ranking: [], verdict: 'No picks submitted to judge.' };
  }

  if (items.length === 1) {
    const d = findPickDossier(category, items[0].pick);
    return {
      ranking: [items[0].label],
      verdict: `"${d.name}" claims victory: ${d.headlineFeat}`,
    };
  }

  if (items.length === 2) {
    const comp = compareContenders(category, items[0].pick, items[1].pick);
    const ranking = comp.ranking.map((r) => (r === 'Pick A' ? items[0].label : items[1].label));

    if (equalizedMatchup && equalizedMatchup.isEqualized) {
      return {
        ranking,
        verdict: `⚡ [EQUALIZED MATCHUP] ${comp.verdict}`,
      };
    }

    return {
      ranking,
      verdict: comp.verdict,
    };
  }

  // Multi-pick ranking: sort by dossier score & scouter power level
  const scored = items.map((it) => {
    const dossier = findPickDossier(category, it.pick);
    return {
      item: it,
      dossier,
      totalScore: dossier.score * 10000000 + dossier.scouterPowerLevel,
    };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);

  const ranking = scored.map((s) => s.item.label);
  const winner = scored[0];
  const runnerUp = scored[1];

  const catLower = category.toLowerCase();
  let verdict = '';

  if (catLower.includes('car') || catLower.includes('vehicle')) {
    const hp = winner.dossier.badges.find((b) => b.label.includes('Horsepower'))?.value || 'blistering power';
    const spd = winner.dossier.badges.find((b) => b.label.includes('Top Speed'))?.value || 'extreme top speed';
    verdict = `${winner.dossier.name} claims 1st place with ${hp} and a ${spd} top speed, outperforming ${runnerUp?.dossier.name}.`;
  } else if (catLower.includes('food') || catLower.includes('snack')) {
    const rev = winner.dossier.badges.find((b) => b.label.includes('Review'))?.value || 'elite 4.9/5 stars';
    verdict = `${winner.dossier.name} dominates with a ${rev} review standing and irresistible flavor profile over ${runnerUp?.dossier.name}.`;
  } else if (catLower.includes('anime')) {
    verdict = `${winner.dossier.name} out-scales the field: ${winner.dossier.headlineFeat}`;
  } else {
    verdict = `${winner.dossier.name} triumphs over the competition: ${winner.dossier.headlineFeat}`;
  }

  return { ranking, verdict };
}

// Calls server-side Gemini 3.8 Flash endpoint, automatically falling back to client heuristic
export async function judgePicks(
  category: string,
  items: JudgeItem[],
  equalizedMatchup?: EqualizedMatchup | null
): Promise<JudgeResult> {
  if (items.length === 0) {
    return { ranking: [], verdict: 'No picks submitted.' };
  }

  if (items.length === 1) {
    return {
      ranking: [items[0].label],
      verdict: `"${items[0].pick}" wins decisively as the undisputed champion.`,
    };
  }

  try {
    const res = await fetch('/api/ai-judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, items, equalizedMatchup }),
    });

    if (res.ok) {
      const data = await res.json();
      if (
        data &&
        Array.isArray(data.ranking) &&
        data.ranking.length > 0 &&
        typeof data.verdict === 'string'
      ) {
        return {
          ranking: data.ranking,
          verdict: data.verdict,
        };
      }
    }
  } catch (_) {
    // Silently proceed to resilient fallback judge
  }

  // Graceful fallback with zero user errors
  return fallbackJudge(category, items, equalizedMatchup);
}
