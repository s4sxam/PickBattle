export type GameMode = 'clash' | 'vote';

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatarEmoji: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  isBot?: boolean;
}

export interface RoundSubmission {
  playerId: string;
  playerName: string;
  avatarEmoji: string;
  pick: string;
}

export interface Duel {
  id: string;
  bracketRound: number; // 1 = first duel round, 2 = next round, etc.
  playerAId: string;
  playerBId: string | null; // null = bye, auto-advances playerAId
  powerLevelA: number;
  powerLevelB: number;
  spectatorVotes: Record<string, string>; // voterId -> playerId they voted for
  winnerId: string | null;
  deadline: number | null;
  resolvedReason?: 'ai_judge' | 'vote' | 'tiebreak' | 'powerlevel' | 'bye' | 'forfeit';
  aiVerdict?: string;
  aiWinnerLabel?: string;
  aiDeliberating?: boolean;
}

export interface Bracket {
  duelRounds: Duel[][]; // duelRounds[0] = first round of duels, etc.
  activeRoundIndex: number;
  activeDuelIndex: number; // which duel within the active round is currently live
}

export interface VotingCardOption {
  targetPlayerId: string;
  label: string; // e.g. "Pick A", "Pick B"
  pick: string;
}

export interface VotingStartedPayload {
  options: VotingCardOption[];
  deadline: number;
  myPick: string;
}

export interface RoundResult {
  roundNumber: number;
  category: string;
  gameMode: GameMode;
  submissions: RoundSubmission[];
  bracketPlacement?: Record<string, number>; // For clash mode: playerId -> duels won this round
  voteCounts?: Record<string, number>; // For vote mode: playerId -> votes received
  ranking: string[]; // playerIds, 1st place first
  pointsAwarded: Record<string, number>;
  flavorLine: string;
  bracketSummary?: Bracket;
  aiVerdict?: string;
}

export type RoomStatus =
  | 'lobby'
  | 'category-select'
  | 'submitting'
  | 'battle'
  | 'voting'
  | 'reveal'
  | 'leaderboard'
  | 'final';

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  status: RoomStatus;
  gameMode: GameMode;
  currentRoundNumber: number;
  totalRounds: number;
  currentCategory: string | null;
  submissions: Record<string, string>; // playerId -> pick
  bracket: Bracket | null;
  votes: Record<string, string>; // voterId -> targetPlayerId (for vote mode)
  submissionDeadline: number | null;
  votingDeadline: number | null;
  roundHistory: RoundResult[];
  createdAt: number;
}
