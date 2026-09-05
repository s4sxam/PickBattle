export interface JudgeItem {
  label: string; // e.g. "Pick A", "Pick B"
  pick: string;
}

export interface JudgeResult {
  ranking: string[]; // Ordered from 1st place to last, using labels (e.g. ["Pick A", "Pick B"])
  verdict: string; // One short, punchy sentence explaining why the winner takes it
}

// Built-in intelligent fallback judge when server or Gemini API is not reachable
export function fallbackJudge(category: string, items: JudgeItem[]): JudgeResult {
  if (items.length === 0) {
    return { ranking: [], verdict: 'No picks submitted to judge.' };
  }

  if (items.length === 1) {
    return {
      ranking: [items[0].label],
      verdict: `"${items[0].pick}" claims an uncontested victory by default.`,
    };
  }

  const catLower = category.toLowerCase();

  // Known power tiers for instant authentic ranking
  const carTiers: Record<string, number> = {
    koenigsegg: 100,
    jesko: 99,
    bugatti: 98,
    chiron: 97,
    veyron: 96,
    rimac: 95,
    nevera: 94,
    pagani: 93,
    hennessey: 92,
    ferrari: 90,
    mclaren: 89,
    porsche: 88,
    lamborghini: 87,
    gt: 85,
    corvette: 80,
    gtr: 79,
    supra: 75,
    mustang: 72,
    bmw: 70,
    audi: 69,
    mercedes: 68,
    tesla: 78,
    civic: 50,
    prius: 40,
    bicycle: 10,
    feet: 5,
  };

  const animeTiers: Record<string, number> = {
    zeno: 100,
    saitama: 99,
    goku: 98,
    whis: 97,
    beerus: 96,
    rimuru: 95,
    anos: 94,
    anti: 92,
    madara: 85,
    gojo: 86,
    sukuna: 84,
    naruto: 82,
    sasuke: 81,
    ichigo: 80,
    luffy: 78,
    gear: 79,
    zoro: 76,
    vegeta: 90,
    deku: 68,
    tanjiro: 65,
    eren: 70,
    yamcha: 40,
    mr: 35,
  };

  const foodTiers: Record<string, number> = {
    pizza: 95,
    tacos: 94,
    ramen: 93,
    sushi: 92,
    burger: 91,
    pasta: 90,
    curry: 89,
    dumplings: 88,
    bbq: 87,
    steak: 88,
    biryani: 89,
    pho: 86,
    lasagna: 85,
    tacosalpastor: 94,
    friedchicken: 87,
    salad: 60,
    water: 40,
    bread: 50,
  };

  const scoreItem = (pick: string): number => {
    const p = pick.trim().toLowerCase();
    if (!p || p.length < 2) return -100;
    // Nonsensical or keyboard smash
    if (/^[a-z]{1,3}$/.test(p) || /^[0-9]+$/.test(p)) return -50;

    let base = 50 + (p.length % 7);

    if (catLower.includes('car') || catLower.includes('speed') || catLower.includes('vehicle')) {
      for (const [key, val] of Object.entries(carTiers)) {
        if (p.includes(key)) {
          base = Math.max(base, val);
        }
      }
    } else if (
      catLower.includes('anime') ||
      catLower.includes('power') ||
      catLower.includes('character') ||
      catLower.includes('hero') ||
      catLower.includes('villain')
    ) {
      for (const [key, val] of Object.entries(animeTiers)) {
        if (p.includes(key)) {
          base = Math.max(base, val);
        }
      }
    } else if (catLower.includes('food') || catLower.includes('dish') || catLower.includes('meal')) {
      for (const [key, val] of Object.entries(foodTiers)) {
        if (p.includes(key)) {
          base = Math.max(base, val);
        }
      }
    } else {
      // General heuristic: quality words vs generic
      if (/legend|god|champion|king|pro|prime|supreme|ultra|max/.test(p)) base += 20;
      if (/super|best|fast|mighty|epic|great/.test(p)) base += 10;
      if (/trash|bad|weak|boring|slow|none/.test(p)) base -= 25;
    }

    return base;
  };

  // Sort by score descending
  const scored = items.map((item) => ({
    item,
    score: scoreItem(item.pick),
  }));

  scored.sort((a, b) => b.score - a.score);

  const ranking = scored.map((s) => s.item.label);
  const winner = scored[0].item;
  const runnerUp = scored[1]?.item;

  let verdict = '';
  if (catLower.includes('car') || catLower.includes('speed')) {
    verdict = `${winner.pick}'s blistering top-end horsepower and race-proven engineering pedigree dominates this matchup.`;
  } else if (catLower.includes('anime') || catLower.includes('power')) {
    verdict = runnerUp
      ? `${winner.pick}'s overwhelming destructive feats easily surpass ${runnerUp.pick}'s combat limits.`
      : `${winner.pick} unleashes god-tier power that completely eclipses the opposition.`;
  } else if (catLower.includes('food')) {
    verdict = `${winner.pick}'s legendary global popularity and unmatched savory profile crown it as the ultimate culinary staple.`;
  } else {
    verdict = runnerUp
      ? `With decisively superior credentials in ${category}, "${winner.pick}" decisively edges out "${runnerUp.pick}".`
      : `"${winner.pick}" stands head and shoulders above the field as the clear benchmark in ${category}.`;
  }

  return { ranking, verdict };
}

// Calls server-side Gemini 3.8 Flash endpoint, automatically falling back to client heuristic
export async function judgePicks(category: string, items: JudgeItem[]): Promise<JudgeResult> {
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
      body: JSON.stringify({ category, items }),
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
  return fallbackJudge(category, items);
}
