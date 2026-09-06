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
  isSpectator?: boolean;
}

export interface RoundSubmission {
  playerId: string;
  playerName: string;
  avatarEmoji: string;
  pick: string;
}

export interface EqualizedMatchup {
  isEqualized: boolean;
  tierGap: string;
  overpoweredContender: string;
  underdogContender: string;
  limitationTask: string;
  underdogAdvantage: string;
  handicapRuleTitle: string;
  originalDiff: number;
  equalizedPowerA: number;
  equalizedPowerB: number;
  overpoweredPlayerId?: string | null;
  underdogPlayerId?: string | null;
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
  resolvedReason?: 'ai_judge' | 'vote' | 'tiebreak' | 'powerlevel' | 'bye' | 'forfeit' | 'equalized_clash';
  aiVerdict?: string;
  aiWinnerLabel?: string;
  aiDeliberating?: boolean;
  equalizedMatchup?: EqualizedMatchup | null;
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

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface VoicePeerState {
  playerId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  inVoiceCall: boolean;
}

export interface WebRTCSignalPayload {
  fromPlayerId: string;
  targetPlayerId: string;
  signal: any;
  type: 'offer' | 'answer' | 'ice-candidate';
}

export interface UserProfile {
  id: string;
  username: string;
  avatarEmoji: string;
  pin?: string;
  totalScore: number;
  gamesPlayed: number;
  matchesWon: number;
  roundWins: number;
  trophies: number;
  winStreak: number;
  bestStreak: number;
  lastPlayed: number;
  createdAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  avatarEmoji: string;
  totalScore: number;
  gamesPlayed: number;
  matchesWon: number;
  roundWins: number;
  trophies: number;
  winRate: number;
  title: string;
  lastActive: number;
}

export interface Room {

  code: string;
  hostId: string;
  players: Player[];
  status: RoomStatus;
  gameMode: GameMode;
  currentRoundNumber: number;
  totalRounds: number;
  currentCategory: string | null;
  category?: string | null;
  submissions: Record<string, string>; // playerId -> pick
  bracket: Bracket | null;
  votes: Record<string, string>; // voterId -> targetPlayerId (for vote mode)
  submissionDeadline: number | null;
  votingDeadline: number | null;
  roundHistory: RoundResult[];
  createdAt: number;
  messages?: ChatMessage[];
  voiceStates?: Record<string, VoicePeerState>; // playerId -> voice state
}

