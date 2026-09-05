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
} from './src/types';
import { CATEGORIES, FLAVOR_LINES, BOT_NAMES, sanitizeText } from './src/utils/gameData';

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
  const bots = room.players.filter((p) => p.isBot && p.connected);
  if (bots.length === 0) return;

  const currentCat = CATEGORIES.find((c) => c.name === room.currentCategory) || CATEGORIES[0];

  bots.forEach((bot, idx) => {
    const delay = 1500 + idx * 1200 + Math.random() * 800;
    setTimeout(() => {
      const currentRoom = rooms.get(room.code);
      if (!currentRoom || currentRoom.status !== 'submitting') return;
      if (currentRoom.submissions[bot.id]) return;

      const randomPick =
        currentCat.botPicks[Math.floor(Math.random() * currentCat.botPicks.length)] ||
        `${currentCat.name} Champion`;

      currentRoom.submissions[bot.id] = randomPick;
      broadcastRoom(currentRoom);
      checkAllSubmitted(currentRoom);
    }, delay);
  });
}

// Bot auto-play helper for crowd vote mode
function handleBotVotes(room: Room) {
  const bots = room.players.filter((p) => p.isBot && p.connected);
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

  const activePlayers = room.players.filter((p) => p.connected);
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
      if (!socketPlayer) continue;

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
  const activePlayers = room.players.filter((p) => p.connected);
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

  const activePlayers = room.players.filter((p) => p.connected);
  // Ensure every active player has a submission entry
  for (const p of activePlayers) {
    if (!room.submissions[p.id]) {
      room.submissions[p.id] = `${p.name}'s Wild Pick`;
    }
  }

  const submittedPlayerIds = Object.keys(room.submissions);
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
  const eligibleSpectators = room.players.filter(
    (p) => p.connected && p.id !== currentDuel.playerAId && p.id !== currentDuel.playerBId
  );

  // If exactly 2 players in room (no spectators)
  if (eligibleSpectators.length === 0) {
    const durationMs = 3800; // Scouter power level reading animation
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
    (p) => p.connected && p.id !== currentDuel.playerAId && p.id !== currentDuel.playerBId
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

// Resolve current duel (calculate winner, broadcast clash, then queue advance)
function resolveCurrentDuel(room: Room) {
  clearRoomTimer(room.code);
  if (!room.bracket) return;

  const currentRoundDuels = room.bracket.duelRounds[room.bracket.activeRoundIndex];
  if (!currentRoundDuels) return;
  const currentDuel = currentRoundDuels[room.bracket.activeDuelIndex];
  if (!currentDuel || currentDuel.winnerId !== null) return;

  const eligibleSpectators = room.players.filter(
    (p) => p.connected && p.id !== currentDuel.playerAId && p.id !== currentDuel.playerBId
  );

  if (eligibleSpectators.length === 0) {
    // 2-player direct power level comparison
    currentDuel.resolvedReason = 'powerlevel';
    if (currentDuel.powerLevelA >= currentDuel.powerLevelB) {
      currentDuel.winnerId = currentDuel.playerAId;
    } else {
      currentDuel.winnerId = currentDuel.playerBId!;
    }
  } else {
    // Spectator vote tally
    let votesA = 0;
    let votesB = 0;
    for (const targetId of Object.values(currentDuel.spectatorVotes)) {
      if (targetId === currentDuel.playerAId) votesA++;
      else if (targetId === currentDuel.playerBId) votesB++;
    }

    if (votesA > votesB) {
      currentDuel.winnerId = currentDuel.playerAId;
      currentDuel.resolvedReason = 'vote';
    } else if (votesB > votesA) {
      currentDuel.winnerId = currentDuel.playerBId!;
      currentDuel.resolvedReason = 'vote';
    } else {
      // Tiebreak - Sudden Death
      currentDuel.winnerId = Math.random() < 0.5 ? currentDuel.playerAId : currentDuel.playerBId!;
      currentDuel.resolvedReason = 'tiebreak';
    }
  }

  // Broadcast resolution for clash and KO animations
  broadcastRoom(room);

  // Pause ~3.2s so all clients see the KO burst & victory celebration before advancing
  const timer = setTimeout(() => {
    const cur = rooms.get(room.code);
    if (cur && cur.status === 'battle' && cur.bracket) {
      advanceDuel(cur);
    }
  }, 3200);
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
  const activePlayers = room.players.filter((p) => p.connected);
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

      const newPlayerId = generateId();
      const newPlayer: Player = {
        id: newPlayerId,
        socketId: socket.id,
        name,
        avatarEmoji: payload.avatarEmoji || '😎',
        score: 0,
        isHost: room.players.length === 0,
        connected: true,
      };

      if (newPlayer.isHost) {
        room.hostId = newPlayerId;
      }

      room.players.push(newPlayer);
      socket.join(code);

      if (callback) callback({ success: true, roomCode: code, playerId: newPlayerId });
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

  // Category Selected (Host only)
  socket.on('category:select', (payload: { code: string; category: string }) => {
    const room = rooms.get(payload?.code);
    if (!room) return;

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender || !sender.isHost) return;

    room.currentCategory = payload.category;
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
    if (!sender) return;

    const { clean: pick, isValid } = sanitizeText(payload.pick || '', 60);
    room.submissions[sender.id] = isValid ? pick : 'A Mystery Pick';

    broadcastRoom(room);
    checkAllSubmitted(room);
  });

  // Submit Vote (Crowd Vote Mode)
  socket.on('vote:submit', (payload: { code: string; targetPlayerId: string }) => {
    const room = rooms.get(payload?.code);
    if (!room || room.status !== 'voting') return;

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender) return;

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
    room.submissions = {};
    room.bracket = null;
    room.votes = {};
    room.votingDeadline = null;
    room.roundHistory = [];
    room.players.forEach((p) => {
      p.score = 0;
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

