export interface ContenderStatBadge {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface ContenderDossier {
  name: string;
  aliases: string[];
  category: string;
  universeOrOrigin: string; // e.g. "Dragon Ball Super" or "Bugatti (Molsheim, France)" or "Naples, Italy"
  score: number; // 1 - 100 power/quality tier
  scouterPowerLevel: number; // 1,000 to 9,999,999+
  badges: ContenderStatBadge[];
  headlineFeat: string; // Key feat, review, or spec summary
  verdictSnippet: string; // Punchy rationale why it wins
  isDisqualified?: boolean;
  disqualificationReason?: string;
}
