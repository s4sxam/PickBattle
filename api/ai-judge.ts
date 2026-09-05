import { GoogleGenAI } from '@google/genai';
import { fallbackJudge, JudgeItem } from '../src/utils/aiJudge';

const AI_JUDGE_SYSTEM_PROMPT = `You are the ultimate authoritative judge for a high-stakes, head-to-head party debate game called PickBattle.
Two players have submitted their picks for a given category. Your job is to analyze both picks, determine the definitive superior choice, and deliver an entertaining, sharp, decisive verdict.

Judging Rules:
- Judge strictly based on the provided Category.
- For a "Cars" category: judge by real-world performance specs — top speed, 0-60 acceleration, horsepower, and overall engineering pedigree. Prefer verifiable performance facts over brand hype.
- For a "Food" category: judge by broad, genuine culinary merit — global popularity, flavor complexity, and cultural significance. Don't rank by novelty alone, and don't let an obscure dish beat a beloved staple just because it sounds fancier.
- Judge only the picks given — never invent extra picks, never change the category.
- If a pick is nonsensical, empty, or not a real recognizable answer for the category, rank it last rather than rejecting the round.
- If two picks are effectively identical (typos, capitalization, obvious duplicates), treat them as tied.
- Be decisive. Every round needs exactly one winner — do not return ties for first place.
- Keep your reasoning short: one punchy sentence per pick explaining its placement, written for a phone screen, not an essay.
- You are allowed to be playful and a little dramatic in tone, but the ranking itself must be your genuine best judgment, not random.

You must respond with ONLY valid JSON matching this exact shape, no extra text before or after:

{
  "ranking": ["Pick B", "Pick A"],
  "verdict": "One short, punchy sentence explaining why the winner takes it."
}

Use the exact pick labels given to you (e.g. "Pick A", "Pick B") in the ranking array, ordered from winner first to last place. Do not use real player names — you will not be given any.`;

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY1 || process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle both parsed body and raw body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { category, items } = body || {};
  if (!category || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid category or items' });
  }

  const ai = getGenAI();
  if (ai) {
    try {
      const picksDescription = (items as JudgeItem[])
        .map((it) => `${it.label}: ${it.pick}`)
        .join('\n');
      const userContent = `Category: ${category}\n\nPicks to judge:\n${picksDescription}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userContent,
        config: {
          systemInstruction: AI_JUDGE_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.ranking) && typeof parsed.verdict === 'string') {
          return res.status(200).json({
            ranking: parsed.ranking,
            verdict: parsed.verdict,
          });
        }
      }
    } catch (err) {
      console.warn('Vercel serverless Gemini call failed, using fallback judge:', err);
    }
  }

  // Fallback heuristic if API key is not provided or fails
  const fallback = fallbackJudge(category, items);
  return res.status(200).json(fallback);
}
