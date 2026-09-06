import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import {
  Player,
  Room,
  RoundResult,
  RoundSubmission,
  Duel,
  Bracket,
  GameMode,
  VotingCardOption,
  VotingStartedPayload,
  ChatMessage,
  VoicePeerState,
  WebRTCSignalPayload,
  UserProfile,
  LeaderboardEntry,
} from './src/types';

import { CATEGORIES, FLAVOR_LINES, BOT_NAMES, sanitizeText } from './src/utils/gameData';
import { GoogleGenAI } from '@google/genai';
import { fallbackJudge } from './src/utils/aiJudge';
import { checkDuplicateCharacterInMatch, getUsedAnimeCharactersForPlayer } from './src/utils/animeRules';
import { checkEqualizedMatchup } from './src/utils/matchupEqualizer';

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

const PORT = 3000;
app.use(express.json());

// System prompt provided for the AI Judge in PickBattle
const AI_JUDGE_SYSTEM_PROMPT = `You are the judge for "PickBattle," a fast-paced party game. Each round, players submit a pick within a given category (e.g. their favorite or most powerful anime character, car, athlete, etc.), and your job is to rank the picks from strongest/best to weakest within that category's context and declare a winner.

Rules for judging:
- Judge based on the most natural interpretation of the category (e.g. for "most powerful," reason about raw capability/feats within that fictional or real-world context; for "favorite," reason about broad cultural popularity and impact).
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
  "ranking": ["Pick B", "Pick A", "Pick C"],
  "verdict": "One short, punchy sentence explaining why the winner takes it."
}

Use the exact pick labels given to you (e.g. "Pick A", "Pick B") in the ranking array, ordered from winner first to last place. Do not use real player names — you will not be given any.`;

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY1;
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

// Server-side pick evaluator using Gemini with silent fallback
async function evaluatePicks(
  category: string,
  items: { label: string; pick: string }[],
  equalizedMatchup?: any
) {
  const ai = getGenAI();
  if (ai) {
    try {
      const picksDescription = items.map((it) => `${it.label}: ${it.pick}`).join('\n');
      let userContent = `Category: ${category}\n\nPicks to judge:\n${picksDescription}`;

      if (equalizedMatchup && equalizedMatchup.isEqualized) {
        userContent += `\n\n⚡ SPECIAL BATTLE HANDICAP - ARENA POWER EQUALIZER ACTIVE:
Tier Disparity Detected: ${equalizedMatchup.tierGap}
- LIMITATION TASK for ${equalizedMatchup.overpoweredContender}: ${equalizedMatchup.limitationTask}
- TACTICAL BUFF for ${equalizedMatchup.underdogContender}: ${equalizedMatchup.underdogAdvantage}
Judging Instruction for this duel: All cosmic reality-warping, planet-destroying beams, and omnipotence are strictly sealed. The combatants are scaled to human combat thresholds. Judge based strictly on martial arts technique, tactical ingenuity, combat IQ, and performance under these limitations!`;
      }

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
          return {
            ranking: parsed.ranking,
            verdict: parsed.verdict,
          };
        }
      }
    } catch (_) {
      // Gracefully fall through to reliable fallback judge
    }
  }

  return fallbackJudge(category, items, equalizedMatchup);
}

// In-memory Global Leaderboard store (Top 100)
const globalLeaderboardMap = new Map<string, UserProfile>();

function getRankTitle(score: number): string {
  if (score >= 8000) return 'Mythic Legend 🌟';
  if (score >= 3500) return 'Grandmaster ⚡';
  if (score >= 1500) return 'Master Strategist 👑';
  if (score >= 600) return 'Arena Champion 🏆';
  if (score >= 200) return 'Skilled Duelist ⚔️';
  return 'Rookie Contender 🥉';
}

// Seed community top players so the leaderboard is vibrant and competitive
const SEED_PLAYERS: Array<Partial<UserProfile>> = [
  { username: 'GokuSensei', avatarEmoji: '🔥', totalScore: 12450, gamesPlayed: 84, matchesWon: 62, roundWins: 148, trophies: 38 },
  { username: 'ShadowMonarch', avatarEmoji: '👑', totalScore: 9820, gamesPlayed: 71, matchesWon: 51, roundWins: 119, trophies: 29 },
  { username: 'ValkyrieNova', avatarEmoji: '⚡', totalScore: 8450, gamesPlayed: 65, matchesWon: 45, roundWins: 104, trophies: 25 },
  { username: 'LuffyGear5', avatarEmoji: '🏴‍☠️', totalScore: 7150, gamesPlayed: 58, matchesWon: 39, roundWins: 92, trophies: 21 },
  { username: 'CyberRonin', avatarEmoji: '⚔️', totalScore: 6320, gamesPlayed: 52, matchesWon: 34, roundWins: 80, trophies: 18 },
  { username: 'OmniJudge', avatarEmoji: '🤖', totalScore: 5490, gamesPlayed: 46, matchesWon: 29, roundWins: 67, trophies: 15 },
  { username: 'SaitamaOnePunch', avatarEmoji: '🥊', totalScore: 4890, gamesPlayed: 40, matchesWon: 28, roundWins: 62, trophies: 14 },
  { username: 'NeonPhoenix', avatarEmoji: '🦅', totalScore: 4120, gamesPlayed: 36, matchesWon: 23, roundWins: 55, trophies: 11 },
  { username: 'FrostBite', avatarEmoji: '❄️', totalScore: 3650, gamesPlayed: 33, matchesWon: 20, roundWins: 49, trophies: 10 },
  { username: 'SpeedDemon', avatarEmoji: '🏎️', totalScore: 3100, gamesPlayed: 30, matchesWon: 18, roundWins: 42, trophies: 8 },
  { username: 'AizenMastermind', avatarEmoji: '🎭', totalScore: 2680, gamesPlayed: 27, matchesWon: 16, roundWins: 38, trophies: 7 },
  { username: 'ApexPredator', avatarEmoji: '🦁', totalScore: 2240, gamesPlayed: 24, matchesWon: 14, roundWins: 33, trophies: 6 },
  { username: 'Zenith', avatarEmoji: '✨', totalScore: 1890, gamesPlayed: 21, matchesWon: 12, roundWins: 29, trophies: 5 },
  { username: 'ThunderGod', avatarEmoji: '⚡', totalScore: 1540, gamesPlayed: 19, matchesWon: 10, roundWins: 24, trophies: 4 },
  { username: 'BlazeKitsune', avatarEmoji: '🦊', totalScore: 1220, gamesPlayed: 16, matchesWon: 8, roundWins: 19, trophies: 3 },
  { username: 'IronLotus', avatarEmoji: '🌸', totalScore: 980, gamesPlayed: 14, matchesWon: 6, roundWins: 16, trophies: 2 },
  { username: 'VortexPilot', avatarEmoji: '🚀', totalScore: 760, gamesPlayed: 11, matchesWon: 5, roundWins: 12, trophies: 2 },
  { username: 'RoguePixel', avatarEmoji: '👾', totalScore: 540, gamesPlayed: 9, matchesWon: 3, roundWins: 9, trophies: 1 },
  { username: 'CrimsonNinja', avatarEmoji: '🥷', totalScore: 380, gamesPlayed: 7, matchesWon: 2, roundWins: 6, trophies: 1 },
  { username: 'StarGazer', avatarEmoji: '🔮', totalScore: 220, gamesPlayed: 5, matchesWon: 1, roundWins: 4, trophies: 0 },
];

SEED_PLAYERS.forEach((seed, index) => {
  const id = `seed_player_${index + 1}`;
  globalLeaderboardMap.set(id, {
    id,
    username: seed.username!,
    avatarEmoji: seed.avatarEmoji || '🎮',
    totalScore: seed.totalScore || 0,
    gamesPlayed: seed.gamesPlayed || 0,
    matchesWon: seed.matchesWon || 0,
    roundWins: seed.roundWins || 0,
    trophies: seed.trophies || 0,
    winStreak: Math.floor(Math.random() * 4),
    bestStreak: Math.floor(Math.random() * 6) + 1,
    lastPlayed: Date.now() - Math.floor(Math.random() * 86400000 * 3),
    createdAt: Date.now() - 86400000 * 14,
  });
});

function getTop100Leaderboard(): LeaderboardEntry[] {
  const all = Array.from(globalLeaderboardMap.values());
  // Sort by totalScore descending, then by trophies descending, then matchesWon
  all.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.trophies !== a.trophies) return b.trophies - a.trophies;
    return b.matchesWon - a.matchesWon;
  });

  // Take top 100 players only
  const top100 = all.slice(0, 100);
  return top100.map((p, idx) => {
    const winRate = p.gamesPlayed > 0 ? Math.round((p.matchesWon / p.gamesPlayed) * 100) : 0;
    return {
      rank: idx + 1,
      id: p.id,
      username: p.username,
      avatarEmoji: p.avatarEmoji,
      totalScore: p.totalScore,
      gamesPlayed: p.gamesPlayed,
      matchesWon: p.matchesWon,
      roundWins: p.roundWins,
      trophies: p.trophies,
      winRate,
      title: getRankTitle(p.totalScore),
      lastActive: p.lastPlayed,
    };
  });
}

// Public API endpoint for AI Judge evaluation
app.post('/api/ai-judge', async (req, res) => {
  const { category, items, equalizedMatchup } = req.body || {};
  if (!category || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid category or items' });
  }

  const result = await evaluatePicks(category, items, equalizedMatchup);
  return res.json(result);
});

// REST API endpoint for Global Top 100 Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const top100 = getTop100Leaderboard();
  return res.json({
    top100,
    totalPlayers: globalLeaderboardMap.size,
    updatedAt: Date.now(),
  });
});


// In-memory Room storage
const rooms = new Map<string, Room>();

// Active timers mapped by roomCode + phase to prevent race conditions
const roomTimers = new Map<string, NodeJS.Timeout>();

function clearRoomTimer(code: string) {
  const existing = roomTimers.get(code);
  if (existing) {
    clearTimeout(existing);
    roomTimers.delete(code);
  }
}

// Generate unambiguous 6-character room code
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
}

// Generate high-drama scouter power level (e.g., 54,200 - 9,890,000)
function generatePowerLevel(): number {
  const tier = Math.random();
  if (tier < 0.25) {
    // 50k - 500k
    return Math.floor(50000 + Math.random() * 450000);
  } else if (tier < 0.7) {
    // 500k - 3.5M
    return Math.floor(500000 + Math.random() * 3000000);
  } else {
    // 3.5M - 9.99M
    return Math.floor(3500000 + Math.random() * 6490000);
  }
}

// Clean inactive rooms older than 2 hours
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > 2 * 60 * 60 * 1000 && room.players.every((p) => !p.connected)) {
      clearRoomTimer(code);
      rooms.delete(code);
    }
  }
}, 15 * 60 * 1000);

// Helper to broadcast room update to all sockets in the room
function broadcastRoom(room: Room) {
  io.to(room.code).emit('room:updated', { room });
}

// Fisher-Yates shuffle helper
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Bot auto-play helper for submissions
function handleBotSubmissions(room: Room) {
  const bots = room.players.filter((p) => p.isBot && p.connected && !p.isSpectator);
  if (bots.length === 0) return;

  const currentCat = CATEGORIES.find((c) => c.name === room.currentCategory) || CATEGORIES[0];

  bots.forEach((bot, idx) => {
    const delay = 1500 + idx * 1200 + Math.random() * 800;
    setTimeout(() => {
      const currentRoom = rooms.get(room.code);
      if (!currentRoom || currentRoom.status !== 'submitting') return;
      if (currentRoom.submissions[bot.id]) return;

      // Filter out characters already deployed by this bot in earlier rounds of this match
      const usedByBot = getUsedAnimeCharactersForPlayer(currentRoom, bot.id).map((r) =>
        r.characterName.toLowerCase()
      );
      const availablePicks = currentCat.botPicks.filter(
        (p) => !usedByBot.some((u) => p.toLowerCase().includes(u) || u.includes(p.toLowerCase()))
      );
      const pool = availablePicks.length > 0 ? availablePicks : currentCat.botPicks;

      const randomPick =
        pool[Math.floor(Math.random() * pool.length)] ||
        `${currentCat.name} Champion`;

      currentRoom.submissions[bot.id] = randomPick;
      broadcastRoom(currentRoom);
      checkAllSubmitted(currentRoom);
    }, delay);
  });
}

// Bot auto-play helper for crowd vote mode
function handleBotVotes(room: Room) {
  const bots = room.players.filter((p) => p.isBot && p.connected && !p.isSpectator);
  if (bots.length === 0) return;

  const validTargets = Object.keys(room.submissions);

  bots.forEach((bot, idx) => {
    const delay = 1800 + idx * 1400 + Math.random() * 800;
    setTimeout(() => {
      const currentRoom = rooms.get(room.code);
      if (!currentRoom || currentRoom.status !== 'voting') return;
      if (currentRoom.votes[bot.id]) return;

      // Bot cannot vote for itself
      const eligibleTargets = validTargets.filter((id) => id !== bot.id);
      if (eligibleTargets.length > 0) {
        const target = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
        currentRoom.votes[bot.id] = target;
        broadcastRoom(currentRoom);
        checkAllVoted(currentRoom);
      }
    }, delay);
  });
}

// Send anonymous randomized voting options to a specific player socket
function sendVotingOptionsToPlayer(socket: Socket, room: Room, player: Player) {
  if (player.isSpectator) return;
  const allSubmissions: { playerId: string; pick: string }[] = Object.entries(room.submissions).map(
    ([playerId, pick]) => ({ playerId, pick })
  );
  const otherPicks = allSubmissions.filter((s) => s.playerId !== player.id);
  const shuffled = shuffleArray(otherPicks);

  const labels = ['Pick A', 'Pick B', 'Pick C', 'Pick D', 'Pick E', 'Pick F', 'Pick G', 'Pick H', 'Pick I', 'Pick J'];
  const options: VotingCardOption[] = shuffled.map((item, index) => ({
    targetPlayerId: item.playerId,
    label: labels[index] || `Pick ${index + 1}`,
    pick: item.pick,
  }));

  const payload: VotingStartedPayload = {
    options,
    deadline: room.votingDeadline || Date.now() + 22000,
    myPick: room.submissions[player.id] || '',
  };

  socket.emit('voting:started', payload);
}

// Transition to Voting Phase (Crowd Vote Mode)
function transitionToVoting(room: Room) {
  clearRoomTimer(room.code);
  room.status = 'voting';
  room.votes = {};
  const durationMs = 22000;
  room.votingDeadline = Date.now() + durationMs;

  const activePlayers = room.players.filter((p) => p.connected && !p.isSpectator);
  for (const p of activePlayers) {
    if (!room.submissions[p.id]) {
      room.submissions[p.id] = `${p.name}'s Mystery Pick`;
    }
  }

  broadcastRoom(room);

  // Send personalized voting cards to each connected socket
  const roomSockets = io.sockets.adapter.rooms.get(room.code);
  if (roomSockets) {
    for (const socketId of roomSockets) {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket) continue;
      const socketPlayer = room.players.find((p) => p.socketId === socketId);
      if (!socketPlayer || socketPlayer.isSpectator) continue;

      sendVotingOptionsToPlayer(socket, room, socketPlayer);
    }
  }

  // Handle bot votes
  handleBotVotes(room);

  const timer = setTimeout(() => {
    const currentRoom = rooms.get(room.code);
    if (currentRoom && currentRoom.status === 'voting') {
      transitionToReveal(currentRoom);
    }
  }, durationMs);
  roomTimers.set(room.code, timer);
}

// Check if all connected players voted in Vote Mode
function checkAllVoted(room: Room) {
  const activePlayers = room.players.filter((p) => p.connected && !p.isSpectator);
  if (activePlayers.length === 0) return;
  const allVoted = activePlayers.every((p) => Boolean(room.votes[p.id]));
  if (allVoted) {
    clearRoomTimer(room.code);
    const timer = setTimeout(() => {
      const currentRoom = rooms.get(room.code);
      if (currentRoom && currentRoom.status === 'voting') {
        transitionToReveal(currentRoom);
      }
    }, 400);
    roomTimers.set(room.code, timer);
  }
}

// Helper to create round duels pairing up player IDs
function createRoundDuels(playerIds: string[], bracketRound: number): Duel[] {
  const duels: Duel[] = [];
  for (let i = 0; i < playerIds.length; i += 2) {
    const playerAId = playerIds[i];
    const playerBId = playerIds[i + 1] || null;
    const powerLevelA = generatePowerLevel();
    const powerLevelB = playerBId ? generatePowerLevel() : 0;

    duels.push({
      id: generateId(),
      bracketRound,
      playerAId,
      playerBId,
      powerLevelA,
      powerLevelB,
      spectatorVotes: {},
      winnerId: null,
      deadline: null,
    });
  }
  return duels;
}

// Transition to Battle Arena Phase
function transitionToBattle(room: Room) {
  clearRoomTimer(room.code);
  room.status = 'battle';

  const activePlayers = room.players.filter((p) => p.connected && !p.isSpectator);
  // Ensure every active player has a submission entry
  for (const p of activePlayers) {
    if (!room.submissions[p.id]) {
      room.submissions[p.id] = `${p.name}'s Wild Pick`;
    }
  }

  const submittedPlayerIds = activePlayers.map((p) => p.id);
  const shuffledIds = shuffleArray(submittedPlayerIds);

  const initialDuels = createRoundDuels(shuffledIds, 1);
  const bracket: Bracket = {
    duelRounds: [initialDuels],
    activeRoundIndex: 0,
    activeDuelIndex: 0,
  };

  room.bracket = bracket;
  broadcastRoom(room);

  // Start first duel
  startActiveDuel(room);
}

// Start the current active duel
function startActiveDuel(room: Room) {
  clearRoomTimer(room.code);
  if (!room.bracket) return;

  const currentRoundDuels = room.bracket.duelRounds[room.bracket.activeRoundIndex];
  if (!currentRoundDuels) return;

  const currentDuel = currentRoundDuels[room.bracket.activeDuelIndex];
  if (!currentDuel) {
    advanceDuel(room);
    return;
  }

  // If bye (playerB is null), auto-advance player A
  if (currentDuel.playerBId === null) {
    currentDuel.winnerId = currentDuel.playerAId;
    currentDuel.resolvedReason = 'bye';
    currentDuel.deadline = null;
    broadcastRoom(room);

    // Short delay so users see the bye notice, then move forward
    const timer = setTimeout(() => {
      const cur = rooms.get(room.code);
      if (cur && cur.status === 'battle' && cur.bracket) {
        advanceDuel(cur);
      }
    }, 2200);
    roomTimers.set(room.code, timer);
    return;
  }

  // Live 1-on-1 duel
  const pickA = room.submissions[currentDuel.playerAId] || 'Wild Pick';
  const pickB = (currentDuel.playerBId && room.submissions[currentDuel.playerBId]) || 'Wild Pick';

  // Compute Arena Equalization for unfair matchups (Universe tier vs Earth tier)
  if (currentDuel.playerBId) {
    const equalized = checkEqualizedMatchup(room.currentCategory, pickA, pickB);
    if (equalized) {
      currentDuel.equalizedMatchup = {
        ...equalized,
        overpoweredPlayerId:
          equalized.overpoweredContender.toLowerCase() === pickA.toLowerCase()
            ? currentDuel.playerAId
            : currentDuel.playerBId,
        underdogPlayerId:
          equalized.underdogContender.toLowerCase() === pickA.toLowerCase()
            ? currentDuel.playerAId
            : currentDuel.playerBId,
      };
      currentDuel.powerLevelA = equalized.equalizedPowerA;
      currentDuel.powerLevelB = equalized.equalizedPowerB;
    }
  }

  currentDuel.aiDeliberating = true;
  const duelId = currentDuel.id;

  // Request AI judge deliberation asynchronously
  evaluatePicks(
    room.currentCategory || 'Power Battle',
    [
      { label: 'Pick A', pick: pickA },
      { label: 'Pick B', pick: pickB },
    ],
    currentDuel.equalizedMatchup
  ).then((res) => {
    const cur = rooms.get(room.code);
    if (!cur || !cur.bracket) return;
    const d = cur.bracket.duelRounds[cur.bracket.activeRoundIndex]?.[cur.bracket.activeDuelIndex];
    if (!d || d.id !== duelId) return;
    d.aiVerdict = res.verdict;
    d.aiWinnerLabel = res.ranking[0];
    d.aiDeliberating = false;
    broadcastRoom(cur);
  });

  const eligibleSpectators = room.players.filter(
    (p) => p.connected && p.id !== currentDuel.playerAId && p.id !== currentDuel.playerBId
  );

  // If exactly 2 players in room (no spectators)
  if (eligibleSpectators.length === 0) {
    const durationMs = 4200; // Scouter reading & AI judge deliberation
    currentDuel.deadline = Date.now() + durationMs;
    broadcastRoom(room);

    const timer = setTimeout(() => {
      const cur = rooms.get(room.code);
      if (cur && cur.status === 'battle' && cur.bracket) {
        resolveCurrentDuel(cur);
      }
    }, durationMs);
    roomTimers.set(room.code, timer);
    return;
  }

  // Spectator voting duel (~12s voting window)
  const durationMs = 12000;
  currentDuel.deadline = Date.now() + durationMs;
  broadcastRoom(room);

  // Handle bot spectator votes
  const botSpectators = eligibleSpectators.filter((p) => p.isBot);
  botSpectators.forEach((bot, idx) => {
    const delay = 1400 + idx * 1000 + Math.random() * 800;
    setTimeout(() => {
      const cur = rooms.get(room.code);
      if (!cur || cur.status !== 'battle' || !cur.bracket) return;
      const d = cur.bracket.duelRounds[cur.bracket.activeRoundIndex]?.[cur.bracket.activeDuelIndex];
      if (!d || d.id !== currentDuel.id || d.winnerId !== null) return;
      if (d.spectatorVotes[bot.id]) return;

      const target = Math.random() < 0.5 ? d.playerAId : d.playerBId!;
      d.spectatorVotes[bot.id] = target;
      broadcastRoom(cur);
      checkAllDuelVoted(cur);
    }, delay);
  });

  // Set authoritative timer
  const timer = setTimeout(() => {
    const cur = rooms.get(room.code);
    if (cur && cur.status === 'battle' && cur.bracket) {
      resolveCurrentDuel(cur);
    }
  }, durationMs);
  roomTimers.set(room.code, timer);
}

// Check if all eligible spectators voted in current live duel
function checkAllDuelVoted(room: Room) {
  if (!room.bracket) return;
  const currentRoundDuels = room.bracket.duelRounds[room.bracket.activeRoundIndex];
  if (!currentRoundDuels) return;
  const currentDuel = currentRoundDuels[room.bracket.activeDuelIndex];
  if (!currentDuel || currentDuel.winnerId !== null) return;

  const eligibleSpectators = room.players.filter(
    (p) =>
      p.connected &&
      !p.isSpectator &&
      p.id !== currentDuel.playerAId &&
      p.id !== currentDuel.playerBId
  );

  if (
    eligibleSpectators.length > 0 &&
    eligibleSpectators.every((p) => Boolean(currentDuel.spectatorVotes[p.id]))
  ) {
    clearRoomTimer(room.code);
    const timer = setTimeout(() => {
      const cur = rooms.get(room.code);
      if (cur && cur.status === 'battle' && cur.bracket) {
        resolveCurrentDuel(cur);
      }
    }, 450);
    roomTimers.set(room.code, timer);
  }
}

// Resolve current duel using the authoritative AI Judge
function resolveCurrentDuel(room: Room) {
  clearRoomTimer(room.code);
  if (!room.bracket) return;

  const currentRoundDuels = room.bracket.duelRounds[room.bracket.activeRoundIndex];
  if (!currentRoundDuels) return;
  const currentDuel = currentRoundDuels[room.bracket.activeDuelIndex];
  if (!currentDuel || currentDuel.winnerId !== null) return;

  // Determine winner via authoritative AI Judge
  let winnerId = currentDuel.playerAId;
  if (currentDuel.aiWinnerLabel === 'Pick B' && currentDuel.playerBId) {
    winnerId = currentDuel.playerBId;
  } else if (currentDuel.aiWinnerLabel === 'Pick A') {
    winnerId = currentDuel.playerAId;
  } else {
    // If AI evaluation was still pending, compute instant fallback
    const pickA = room.submissions[currentDuel.playerAId] || 'Wild Pick';
    const pickB = (currentDuel.playerBId && room.submissions[currentDuel.playerBId]) || 'Wild Pick';
    const judged = fallbackJudge(
      room.currentCategory || 'Power Battle',
      [
        { label: 'Pick A', pick: pickA },
        { label: 'Pick B', pick: pickB },
      ],
      currentDuel.equalizedMatchup
    );
    currentDuel.aiVerdict = judged.verdict;
    currentDuel.aiWinnerLabel = judged.ranking[0];
    winnerId =
      judged.ranking[0] === 'Pick B' && currentDuel.playerBId
        ? currentDuel.playerBId
        : currentDuel.playerAId;
  }

  currentDuel.winnerId = winnerId;
  currentDuel.resolvedReason = currentDuel.equalizedMatchup?.isEqualized
    ? 'equalized_clash'
    : 'ai_judge';
  currentDuel.aiDeliberating = false;

  // Boost winner's Scouter Power Level visually to validate victory
  if (currentDuel.equalizedMatchup?.isEqualized) {
    if (winnerId === currentDuel.playerAId && currentDuel.powerLevelA <= currentDuel.powerLevelB) {
      currentDuel.powerLevelA = currentDuel.powerLevelB + 15000;
    } else if (currentDuel.playerBId && winnerId === currentDuel.playerBId && currentDuel.powerLevelB <= currentDuel.powerLevelA) {
      currentDuel.powerLevelB = currentDuel.powerLevelA + 15000;
    }
  } else {
    if (winnerId === currentDuel.playerAId) {
      if (currentDuel.powerLevelA <= currentDuel.powerLevelB) {
        currentDuel.powerLevelA = Math.max(currentDuel.powerLevelB + 300000, 4000000);
      }
    } else if (currentDuel.playerBId && winnerId === currentDuel.playerBId) {
      if (currentDuel.powerLevelB <= currentDuel.powerLevelA) {
        currentDuel.powerLevelB = Math.max(currentDuel.powerLevelA + 300000, 4000000);
      }
    }
  }

  // Broadcast resolution for clash, KO animations, and AI verdict display
  broadcastRoom(room);

  // Pause ~3.8s so all clients can read the AI Judge's punchy verdict before advancing
  const timer = setTimeout(() => {
    const cur = rooms.get(room.code);
    if (cur && cur.status === 'battle' && cur.bracket) {
      advanceDuel(cur);
    }
  }, 3800);
  roomTimers.set(room.code, timer);
}

// Advance to next duel or next round or reveal
function advanceDuel(room: Room) {
  clearRoomTimer(room.code);
  if (!room.bracket) return;

  const currentRoundDuels = room.bracket.duelRounds[room.bracket.activeRoundIndex];
  if (!currentRoundDuels) return;

  // More duels in this bracket round?
  if (room.bracket.activeDuelIndex + 1 < currentRoundDuels.length) {
    room.bracket.activeDuelIndex += 1;
    startActiveDuel(room);
    return;
  }

  // Current bracket round finished! Collect winners
  const roundWinners = currentRoundDuels.map((d) => d.winnerId).filter(Boolean) as string[];

  if (roundWinners.length <= 1) {
    // Tournament complete! Champion crowned
    transitionToReveal(room);
  } else {
    // Build next round of bracket
    const nextDuels = createRoundDuels(roundWinners, room.bracket.activeRoundIndex + 2);
    room.bracket.duelRounds.push(nextDuels);
    room.bracket.activeRoundIndex += 1;
    room.bracket.activeDuelIndex = 0;
    startActiveDuel(room);
  }
}

// Check if all connected players submitted picks
function checkAllSubmitted(room: Room) {
  const activePlayers = room.players.filter((p) => p.connected && !p.isSpectator);
  if (activePlayers.length === 0) return;
  const allIn = activePlayers.every((p) => Boolean(room.submissions[p.id]));
  if (allIn) {
    if (room.gameMode === 'vote') {
      transitionToVoting(room);
    } else {
      transitionToBattle(room);
    }
  }
}

// Transition to Reveal Phase & calculate scores (supports both Clash and Vote modes)
function transitionToReveal(room: Room) {
  clearRoomTimer(room.code);
  room.status = 'reveal';

  const submissionsList: RoundSubmission[] = Object.entries(room.submissions).map(
    ([playerId, pick]) => {
      const player = room.players.find((p) => p.id === playerId);
      return {
        playerId,
        playerName: player ? player.name : 'Unknown',
        avatarEmoji: player ? player.avatarEmoji : '❓',
        pick,
      };
    }
  );

  const flavorLine = FLAVOR_LINES[Math.floor(Math.random() * FLAVOR_LINES.length)];

  // Mode 2: Crowd Vote Mode Resolution
  if (room.gameMode === 'vote') {
    const voteCounts: Record<string, number> = {};
    for (const targetId of Object.values(room.votes)) {
      if (targetId) {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
      }
    }

    for (const playerId of Object.keys(room.submissions)) {
      if (voteCounts[playerId] === undefined) {
        voteCounts[playerId] = 0;
      }
    }

    // Sort ranking by vote count descending
    const ranking = Object.keys(voteCounts).sort((a, b) => {
      const countDiff = (voteCounts[b] || 0) - (voteCounts[a] || 0);
      if (countDiff !== 0) return countDiff;
      return Math.random() - 0.5;
    });

    const pointsAwarded: Record<string, number> = {};
    if (ranking.length > 0) {
      const topVotes = voteCounts[ranking[0]] || 0;
      ranking.forEach((id, idx) => {
        const votes = voteCounts[id] || 0;
        if (idx === 0 || (votes > 0 && votes === topVotes)) {
          pointsAwarded[id] = 3;
        } else if (idx === 1 && votes > 0) {
          pointsAwarded[id] = 2;
        } else if (idx === 2 && votes > 0) {
          pointsAwarded[id] = 1;
        } else {
          pointsAwarded[id] = 0;
        }
      });
    }

    for (const player of room.players) {
      const pts = pointsAwarded[player.id] || 0;
      player.score += pts;
    }

    const roundResult: RoundResult = {
      roundNumber: room.currentRoundNumber,
      category: room.currentCategory || 'Wildcard',
      gameMode: 'vote',
      submissions: submissionsList,
      voteCounts,
      ranking,
      pointsAwarded,
      flavorLine,
    };

    room.roundHistory.push(roundResult);
    broadcastRoom(room);
    return;
  }

  // Mode 1: Power Clash Tournament Bracket Placement Resolution
  const bracketPlacement: Record<string, number> = {};
  for (const player of room.players) {
    bracketPlacement[player.id] = 0;
  }

  if (room.bracket) {
    for (const round of room.bracket.duelRounds) {
      for (const duel of round) {
        if (duel.winnerId) {
          bracketPlacement[duel.winnerId] = (bracketPlacement[duel.winnerId] || 0) + 1;
        }
      }
    }
  }

  // Find champion and runner-up
  let championId: string | null = null;
  let runnerUpId: string | null = null;

  if (room.bracket && room.bracket.duelRounds.length > 0) {
    const lastRound = room.bracket.duelRounds[room.bracket.duelRounds.length - 1];
    const finalDuel = lastRound[lastRound.length - 1];
    if (finalDuel && finalDuel.winnerId) {
      championId = finalDuel.winnerId;
      runnerUpId =
        finalDuel.winnerId === finalDuel.playerAId ? finalDuel.playerBId : finalDuel.playerAId;
    }
  }

  if (!championId) {
    championId = Object.keys(room.submissions)[0] || room.players[0]?.id || '';
  }

  const submittedPlayerIds = Object.keys(room.submissions);
  const ranking = [...submittedPlayerIds].sort((a, b) => {
    if (a === championId) return -1;
    if (b === championId) return 1;
    if (runnerUpId && a === runnerUpId) return -1;
    if (runnerUpId && b === runnerUpId) return 1;
    const winsDiff = (bracketPlacement[b] || 0) - (bracketPlacement[a] || 0);
    if (winsDiff !== 0) return winsDiff;
    return Math.random() - 0.5;
  });

  // Award points based on bracket depth reached:
  // 1st (Champion) = 3 pts
  // 2nd (Runner Up) = 2 pts
  // 3rd / Semifinalist (with wins) = 1 pt
  // Others = 0 pts
  const pointsAwarded: Record<string, number> = {};
  ranking.forEach((id, idx) => {
    if (idx === 0) {
      pointsAwarded[id] = 3;
    } else if (idx === 1) {
      pointsAwarded[id] = 2;
    } else if (idx === 2 || (bracketPlacement[id] || 0) >= 1) {
      pointsAwarded[id] = 1;
    } else {
      pointsAwarded[id] = 0;
    }
  });

  // Update cumulative player scores
  for (const player of room.players) {
    const pts = pointsAwarded[player.id] || 0;
    player.score += pts;
  }

  // Find final championship duel AI verdict
  let clashVerdict: string | undefined;
  if (room.bracket && room.bracket.duelRounds.length > 0) {
    const lastRound = room.bracket.duelRounds[room.bracket.duelRounds.length - 1];
    const finalDuel = lastRound && lastRound[lastRound.length - 1];
    if (finalDuel?.aiVerdict) {
      clashVerdict = finalDuel.aiVerdict;
    }
  }

  const roundResult: RoundResult = {
    roundNumber: room.currentRoundNumber,
    category: room.currentCategory || 'Wildcard',
    gameMode: 'clash',
    submissions: submissionsList,
    bracketPlacement,
    ranking,
    pointsAwarded,
    flavorLine,
    bracketSummary: room.bracket ? JSON.parse(JSON.stringify(room.bracket)) : undefined,
    aiVerdict: clashVerdict,
  };

  room.roundHistory.push(roundResult);
  broadcastRoom(room);
}

// REST endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

app.get('/api/room/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found or expired' });
  }
  res.json({
    code: room.code,
    status: room.status,
    playerCount: room.players.filter((p) => p.connected).length,
  });
});

// Socket.io Game logic
io.on('connection', (socket: Socket) => {
  // Create Room
  socket.on('room:create', (payload: { hostName: string; avatarEmoji: string }, callback) => {
    const { clean: name, isValid, error } = sanitizeText(payload?.hostName || '', 18);
    if (!isValid) {
      if (callback) callback({ success: false, error: error || 'Invalid name' });
      return;
    }

    const code = generateRoomCode();
    const hostId = generateId();
    const hostPlayer: Player = {
      id: hostId,
      socketId: socket.id,
      name,
      avatarEmoji: payload.avatarEmoji || '👑',
      score: 0,
      isHost: true,
      connected: true,
    };

    const room: Room = {
      code,
      hostId,
      players: [hostPlayer],
      status: 'lobby',
      gameMode: 'clash',
      currentRoundNumber: 0,
      totalRounds: 6,
      currentCategory: null,
      category: null,
      submissions: {},
      bracket: null,
      votes: {},
      submissionDeadline: null,
      votingDeadline: null,
      roundHistory: [],
      createdAt: Date.now(),
    };

    rooms.set(code, room);
    socket.join(code);

    if (callback) callback({ success: true, roomCode: code, playerId: hostId });
    broadcastRoom(room);
  });

  // Join Room
  socket.on(
    'room:join',
    (payload: { code: string; name: string; avatarEmoji: string; playerId?: string }, callback) => {
      const code = (payload?.code || '').toUpperCase().trim();
      const room = rooms.get(code);

      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found or expired. Check the code!' });
        return;
      }

      // Reconnect check if playerId was provided
      if (payload.playerId) {
        const existingPlayer = room.players.find((p) => p.id === payload.playerId);
        if (existingPlayer) {
          existingPlayer.socketId = socket.id;
          existingPlayer.connected = true;
          socket.join(code);
          if (callback) callback({ success: true, roomCode: code, playerId: existingPlayer.id });
          broadcastRoom(room);

          if (room.status === 'voting') {
            sendVotingOptionsToPlayer(socket, room, existingPlayer);
          }
          return;
        }
      }

      // Validate name
      const { clean: name, isValid, error } = sanitizeText(payload.name || '', 18);
      if (!isValid) {
        if (callback) callback({ success: false, error: error || 'Invalid name' });
        return;
      }

      // Don't allow duplicate active names in the same room
      const nameExists = room.players.some((p) => p.connected && p.name.toLowerCase() === name.toLowerCase());
      if (nameExists) {
        if (callback) callback({ success: false, error: 'That name is already taken in this room!' });
        return;
      }

      const isOngoingMatch = room.status !== 'lobby';
      const isSpectator = isOngoingMatch || Boolean((payload as any)?.isSpectator);

      const newPlayerId = generateId();
      const newPlayer: Player = {
        id: newPlayerId,
        socketId: socket.id,
        name,
        avatarEmoji: payload.avatarEmoji || '😎',
        score: 0,
        isHost: room.players.length === 0,
        connected: true,
        isSpectator,
      };

      if (newPlayer.isHost) {
        room.hostId = newPlayerId;
      }

      room.players.push(newPlayer);
      socket.join(code);

      if (callback) callback({ success: true, roomCode: code, playerId: newPlayerId, isSpectator });
      broadcastRoom(room);
    }
  );

  // Add Test Player (Bot) for effortless solo testing/preview
  socket.on('bot:add', (payload: { code: string }) => {
    const room = rooms.get(payload?.code);
    if (!room) return;

    const botConfig = BOT_NAMES[room.players.filter((p) => p.isBot).length % BOT_NAMES.length];
    const botId = 'bot_' + generateId();
    const botPlayer: Player = {
      id: botId,
      socketId: 'bot_socket_' + botId,
      name: botConfig.name,
      avatarEmoji: botConfig.emoji,
      score: 0,
      isHost: false,
      connected: true,
      isBot: true,
    };

    room.players.push(botPlayer);
    broadcastRoom(room);
  });

  // Remove Bot
  socket.on('bot:remove', (payload: { code: string; botId: string }) => {
    const room = rooms.get(payload?.code);
    if (!room) return;
    room.players = room.players.filter((p) => p.id !== payload.botId);
    broadcastRoom(room);
  });

  // --- In-Game Text Chat Handlers ---
  socket.on('chat:send', (payload: { code: string; text: string }) => {
    const room = rooms.get(payload?.code);
    if (!room) return;

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender) return;

    const { clean: text, isValid } = sanitizeText(payload.text || '', 200);
    if (!isValid || !text.trim()) return;

    const message: ChatMessage = {
      id: generateId(),
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatarEmoji,
      text: text.trim(),
      timestamp: Date.now(),
    };

    if (!room.messages) {
      room.messages = [];
    }
    room.messages.push(message);
    if (room.messages.length > 100) {
      room.messages.shift(); // Keep last 100 messages
    }

    io.to(room.code).emit('chat:message', message);
  });

  // --- In-Game P2P WebRTC Voice Call Signaling Handlers ---
  socket.on('voice:join', (payload: { code: string }) => {
    const room = rooms.get(payload?.code);
    if (!room) return;

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender) return;

    if (!room.voiceStates) {
      room.voiceStates = {};
    }

    room.voiceStates[sender.id] = {
      playerId: sender.id,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      inVoiceCall: true,
    };

    // Notify other peers in the room that a new peer joined voice call
    socket.to(room.code).emit('voice:peer_joined', {
      playerId: sender.id,
      player: sender,
    });

    // Send the list of existing active voice participants to the joining player
    const activeVoicePeers = Object.values(room.voiceStates).filter(
      (v) => v.inVoiceCall && v.playerId !== sender.id
    );
    socket.emit('voice:active_peers', { peers: activeVoicePeers });

    broadcastRoom(room);
  });

  socket.on('voice:leave', (payload: { code: string }) => {
    const room = rooms.get(payload?.code);
    if (!room) return;

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender) return;

    if (room.voiceStates && room.voiceStates[sender.id]) {
      room.voiceStates[sender.id].inVoiceCall = false;
      room.voiceStates[sender.id].isSpeaking = false;
    }

    socket.to(room.code).emit('voice:peer_left', { playerId: sender.id });
    broadcastRoom(room);
  });

  socket.on(
    'voice:update_state',
    (payload: { code: string; isMuted?: boolean; isDeafened?: boolean; isSpeaking?: boolean }) => {
      const room = rooms.get(payload?.code);
      if (!room) return;

      const sender = room.players.find((p) => p.socketId === socket.id);
      if (!sender) return;

      if (!room.voiceStates) {
        room.voiceStates = {};
      }

      const currentState = room.voiceStates[sender.id] || {
        playerId: sender.id,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        inVoiceCall: true,
      };

      if (typeof payload.isMuted === 'boolean') currentState.isMuted = payload.isMuted;
      if (typeof payload.isDeafened === 'boolean') currentState.isDeafened = payload.isDeafened;
      if (typeof payload.isSpeaking === 'boolean') currentState.isSpeaking = payload.isSpeaking;

      room.voiceStates[sender.id] = currentState;

      socket.to(room.code).emit('voice:peer_state', {
        playerId: sender.id,
        state: currentState,
      });
      broadcastRoom(room);
    }
  );

  // Direct WebRTC SDP Offer / Answer / ICE Candidate exchange
  socket.on(
    'voice:signal',
    (payload: {
      code: string;
      targetPlayerId: string;
      signal: any;
      type: 'offer' | 'answer' | 'ice-candidate';
    }) => {
      const room = rooms.get(payload?.code);
      if (!room) return;

      const sender = room.players.find((p) => p.socketId === socket.id);
      if (!sender) return;

      const targetPlayer = room.players.find((p) => p.id === payload.targetPlayerId);
      if (targetPlayer && targetPlayer.socketId && targetPlayer.connected) {
        io.to(targetPlayer.socketId).emit('voice:signal', {
          fromPlayerId: sender.id,
          signal: payload.signal,
          type: payload.type,
        });
      }
    }
  );

  // --- Global Top 100 Leaderboard Handlers ---
  socket.on('leaderboard:get', () => {
    const top100 = getTop100Leaderboard();
    socket.emit('leaderboard:data', {
      top100,
      totalPlayers: globalLeaderboardMap.size,
    });
  });

  socket.on('leaderboard:sync_profile', (profile: UserProfile) => {
    if (!profile || !profile.id || !profile.username) return;
    const { clean: cleanName, isValid } = sanitizeText(profile.username, 24);
    if (!isValid || !cleanName.trim()) return;

    const existing = globalLeaderboardMap.get(profile.id) || {
      id: profile.id,
      username: cleanName,
      avatarEmoji: profile.avatarEmoji || '🎮',
      totalScore: 0,
      gamesPlayed: 0,
      matchesWon: 0,
      roundWins: 0,
      trophies: 0,
      winStreak: 0,
      bestStreak: 0,
      lastPlayed: Date.now(),
      createdAt: Date.now(),
    };

    existing.username = cleanName;
    if (profile.avatarEmoji) existing.avatarEmoji = profile.avatarEmoji;
    existing.totalScore = Math.max(existing.totalScore, profile.totalScore || 0);
    existing.gamesPlayed = Math.max(existing.gamesPlayed, profile.gamesPlayed || 0);
    existing.matchesWon = Math.max(existing.matchesWon, profile.matchesWon || 0);
    existing.roundWins = Math.max(existing.roundWins, profile.roundWins || 0);
    existing.trophies = Math.max(existing.trophies, profile.trophies || 0);
    existing.winStreak = Math.max(existing.winStreak, profile.winStreak || 0);
    existing.bestStreak = Math.max(existing.bestStreak, profile.bestStreak || 0);
    existing.lastPlayed = Date.now();

    globalLeaderboardMap.set(profile.id, existing);

    const top100 = getTop100Leaderboard();
    // Return updated leaderboard to sender
    socket.emit('leaderboard:data', {
      top100,
      totalPlayers: globalLeaderboardMap.size,
      myRank: top100.find((e) => e.id === profile.id)?.rank || null,
    });
  });



  // Change Game Mode (Host only) - 'clash' or 'vote' (vote requires > 2 players)
  socket.on('gamemode:set', (payload: { code: string; mode: GameMode }) => {
    const room = rooms.get(payload?.code);
    if (!room || room.status !== 'lobby') return;

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender || !sender.isHost) return;

    if (payload.mode === 'vote') {
      const activeCount = room.players.filter((p) => p.connected).length;
      if (activeCount <= 2) {
        socket.emit('error:message', {
          message: 'Crowd Vote mode requires more than 2 players in the lobby (3+ players).',
        });
        return;
      }
    }

    room.gameMode = payload.mode;
    broadcastRoom(room);
  });

  // Start Game (Host only)
  socket.on('game:start', (payload: { code: string; totalRounds?: number; gameMode?: GameMode }) => {
    const room = rooms.get(payload?.code);
    if (!room) return;

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender || !sender.isHost) return;

    if (payload.totalRounds && payload.totalRounds >= 3 && payload.totalRounds <= 10) {
      room.totalRounds = payload.totalRounds;
    }

    if (payload.gameMode) {
      const activeCount = room.players.filter((p) => p.connected).length;
      if (payload.gameMode === 'vote' && activeCount > 2) {
        room.gameMode = 'vote';
      } else {
        room.gameMode = 'clash';
      }
    } else if (room.gameMode === 'vote') {
      const activeCount = room.players.filter((p) => p.connected).length;
      if (activeCount <= 2) {
        room.gameMode = 'clash'; // Fallback if players dropped <= 2
      }
    }

    room.currentRoundNumber = 1;
    room.roundHistory = [];
    room.status = 'category-select';
    broadcastRoom(room);
  });

  // Category Selected (Any player in the room can choose or roll random)
  socket.on('category:select', (payload: { code: string; category: string }) => {
    const room = rooms.get(payload?.code);
    if (!room || room.status !== 'category-select') return;

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender) return;

    const { clean: selectedCategory, isValid } = sanitizeText(payload.category || '', 40);
    const finalCategory = isValid ? selectedCategory : 'Anime Characters';

    room.currentCategory = finalCategory;
    room.category = finalCategory;
    room.submissions = {};
    room.bracket = null;
    room.votes = {};
    room.status = 'submitting';

    const durationMs = 30000;
    room.submissionDeadline = Date.now() + durationMs;
    broadcastRoom(room);

    // Bot submissions
    handleBotSubmissions(room);

    // Submission auto-close timer
    clearRoomTimer(room.code);
    const timer = setTimeout(() => {
      const currentRoom = rooms.get(room.code);
      if (currentRoom && currentRoom.status === 'submitting') {
        if (currentRoom.gameMode === 'vote') {
          transitionToVoting(currentRoom);
        } else {
          transitionToBattle(currentRoom);
        }
      }
    }, durationMs);
    roomTimers.set(room.code, timer);
  });

  // Submit Pick
  socket.on('pick:submit', (payload: { code: string; pick: string }) => {
    const room = rooms.get(payload?.code);
    if (!room || room.status !== 'submitting') return;

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender || sender.isSpectator) return;

    const { clean: pick, isValid } = sanitizeText(payload.pick || '', 60);
    const candidatePick = isValid ? pick : 'A Mystery Pick';

    // Duplicate anime character validation across this match
    const dupCheck = checkDuplicateCharacterInMatch(
      room,
      sender.id,
      candidatePick,
      room.currentCategory
    );
    if (dupCheck.isDuplicate) {
      socket.emit('error', {
        message: `"${dupCheck.canonicalName}" was already used by you in Round ${dupCheck.matchedRound}! Each anime character can only be used once per match.`,
      });
      return;
    }

    room.submissions[sender.id] = candidatePick;

    broadcastRoom(room);
    checkAllSubmitted(room);
  });

  // Submit Vote (Crowd Vote Mode)
  socket.on('vote:submit', (payload: { code: string; targetPlayerId: string }) => {
    const room = rooms.get(payload?.code);
    if (!room || room.status !== 'voting') return;

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender || sender.isSpectator) return;

    // Cannot vote for self
    if (sender.id === payload.targetPlayerId) return;

    // Validate target is in submissions
    if (!room.submissions[payload.targetPlayerId]) return;

    room.votes[sender.id] = payload.targetPlayerId;
    broadcastRoom(room);
    checkAllVoted(room);
  });

  // Spectator Vote in Live Duel (Power Clash Mode)
  socket.on(
    'duel:vote',
    (payload: { code: string; duelId: string; votedForPlayerId: string }) => {
      const room = rooms.get(payload?.code);
      if (!room || room.status !== 'battle' || !room.bracket) return;

      const sender = room.players.find((p) => p.socketId === socket.id);
      if (!sender) return;

      const currentRoundDuels = room.bracket.duelRounds[room.bracket.activeRoundIndex];
      if (!currentRoundDuels) return;
      const currentDuel = currentRoundDuels[room.bracket.activeDuelIndex];
      if (!currentDuel || currentDuel.id !== payload.duelId || currentDuel.winnerId !== null) return;

      // Combatants cannot vote on their own duel
      if (sender.id === currentDuel.playerAId || sender.id === currentDuel.playerBId) return;

      // Must vote for either A or B
      if (
        payload.votedForPlayerId !== currentDuel.playerAId &&
        payload.votedForPlayerId !== currentDuel.playerBId
      ) {
        return;
      }

      currentDuel.spectatorVotes[sender.id] = payload.votedForPlayerId;
      broadcastRoom(room);
      checkAllDuelVoted(room);
    }
  );

  // Next Round / Standings progression (Host only)
  socket.on('round:next', (payload: { code: string }) => {
    const room = rooms.get(payload?.code);
    if (!room) return;

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender || !sender.isHost) return;

    if (room.status === 'reveal') {
      room.status = 'leaderboard';
      broadcastRoom(room);
    } else if (room.status === 'leaderboard') {
      if (room.currentRoundNumber < room.totalRounds) {
        room.currentRoundNumber += 1;
        room.status = 'category-select';
        room.currentCategory = null;
        room.category = null;
        room.submissions = {};
        room.bracket = null;
        room.votes = {};
        room.votingDeadline = null;
        broadcastRoom(room);
      } else {
        room.status = 'final';
        broadcastRoom(room);
      }
    }
  });

  // Play Again (Host only)
  socket.on('game:playAgain', (payload: { code: string }) => {
    const room = rooms.get(payload?.code);
    if (!room) return;

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender || !sender.isHost) return;

    room.currentRoundNumber = 0;
    room.status = 'lobby';
    room.currentCategory = null;
    room.category = null;
    room.submissions = {};
    room.bracket = null;
    room.votes = {};
    room.votingDeadline = null;
    room.roundHistory = [];
    room.players.forEach((p) => {
      p.score = 0;
      p.isSpectator = false;
    });

    broadcastRoom(room);
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    for (const room of rooms.values()) {
      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) {
        player.connected = false;

        // If host disconnected, assign host to another connected player
        if (player.isHost) {
          const nextPlayer = room.players.find((p) => p.connected && !p.isBot);
          if (nextPlayer) {
            player.isHost = false;
            nextPlayer.isHost = true;
            room.hostId = nextPlayer.id;
          }
        }

        // If in lobby and gameMode was vote, check if connected players fell to <= 2
        if (room.status === 'lobby' && room.gameMode === 'vote') {
          const activeCount = room.players.filter((p) => p.connected).length;
          if (activeCount <= 2) {
            room.gameMode = 'clash';
          }
        }

        broadcastRoom(room);

        // If in battle phase, check if disconnected player was the last pending spectator
        if (room.status === 'battle') {
          checkAllDuelVoted(room);
        } else if (room.status === 'voting') {
          checkAllVoted(room);
        }
        break;
      }
    }
  });
});

// Vite Middleware integration for dev and production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`PickBattle server running on port ${PORT}`);
  });
}

startServer();

