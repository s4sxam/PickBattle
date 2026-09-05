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
} from '../types';
import { CATEGORIES, FLAVOR_LINES, BOT_NAMES, sanitizeText } from '../utils/gameData';
import { judgePicks, fallbackJudge } from '../utils/aiJudge';

export interface NetworkConnection {
  id: string; // unique socket/peer id
  send: (event: string, data: any) => void;
  isHost?: boolean;
}

export class BrowserGameEngine {
  private room: Room | null = null;
  private connections: Map<string, NetworkConnection> = new Map();
  private timers: Map<string, any> = new Map();
  private onStateChangeCallback?: (room: Room) => void;

  constructor(onStateChange?: (room: Room) => void) {
    this.onStateChangeCallback = onStateChange;
  }

  public getRoom(): Room | null {
    return this.room;
  }

  public setRoom(room: Room) {
    this.room = room;
    this.broadcastState();
  }

  public registerConnection(conn: NetworkConnection) {
    this.connections.set(conn.id, conn);
    // If room exists, mark matching player connected
    if (this.room) {
      const player = this.room.players.find((p) => p.socketId === conn.id);
      if (player) {
        player.connected = true;
        this.broadcastState();
      }
    }
  }

  public unregisterConnection(connId: string) {
    this.connections.delete(connId);
    if (this.room) {
      const player = this.room.players.find((p) => p.socketId === connId);
      if (player && !player.isBot) {
        player.connected = false;
        if (this.room.status === 'lobby' && this.room.gameMode === 'vote') {
          const activeCount = this.room.players.filter((p) => p.connected).length;
          if (activeCount <= 2) {
            this.room.gameMode = 'clash';
          }
        }
        this.broadcastState();

        if (this.room.status === 'battle') {
          this.checkAllDuelVoted();
        } else if (this.room.status === 'voting') {
          this.checkAllVoted();
        }
      }
    }
  }

  public sendTo(connId: string, event: string, data: any) {
    const conn = this.connections.get(connId);
    if (conn) {
      conn.send(event, data);
    }
  }

  public broadcastState() {
    if (!this.room) return;
    const roomCopy: Room = JSON.parse(JSON.stringify(this.room));
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(roomCopy);
    }
    for (const conn of this.connections.values()) {
      conn.send('room:updated', { room: roomCopy });
    }
  }

  private clearTimer(name: string) {
    const t = this.timers.get(name);
    if (t) {
      clearTimeout(t);
      this.timers.delete(name);
    }
  }

  private generatePowerLevel(): number {
    const tier = Math.random();
    if (tier < 0.25) {
      return Math.floor(50000 + Math.random() * 450000);
    } else if (tier < 0.7) {
      return Math.floor(500000 + Math.random() * 3000000);
    } else {
      return Math.floor(3500000 + Math.random() * 6490000);
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Handle all inbound events from host or guests
  public handleEvent(
    connId: string,
    event: string,
    payload: any,
    callback?: (res: any) => void
  ) {
    switch (event) {
      case 'room:create':
        this.handleCreateRoom(connId, payload, callback);
        break;
      case 'room:join':
        this.handleJoinRoom(connId, payload, callback);
        break;
      case 'gamemode:set':
        this.handleSetGameMode(connId, payload);
        break;
      case 'game:start':
        this.handleStartGame(connId, payload);
        break;
      case 'category:select':
        this.handleSelectCategory(connId, payload);
        break;
      case 'pick:submit':
        this.handleSubmitPick(connId, payload);
        break;
      case 'vote:submit':
        this.handleSubmitVote(connId, payload);
        break;
      case 'duel:vote':
        this.handleDuelVote(connId, payload);
        break;
      case 'round:next':
        this.handleNextRound(connId);
        break;
      case 'game:playAgain':
        this.handlePlayAgain(connId);
        break;
      case 'bot:add':
        this.handleAddBot(connId);
        break;
      case 'bot:remove':
        this.handleRemoveBot(connId, payload);
        break;
      default:
        break;
    }
  }

  private handleCreateRoom(
    connId: string,
    payload: { hostName: string; avatarEmoji: string; roomCode?: string },
    callback?: (res: any) => void
  ) {
    const hostSanitized = sanitizeText(payload?.hostName || 'Host', 16);
    const hostName = hostSanitized.isValid ? hostSanitized.clean : 'Host';
    const avatarEmoji = payload?.avatarEmoji || '👑';
    const hostId = 'p_' + Math.random().toString(36).substring(2, 9);
    const code = payload?.roomCode || this.generateCode();

    const hostPlayer: Player = {
      id: hostId,
      socketId: connId,
      name: hostName,
      avatarEmoji,
      score: 0,
      isHost: true,
      connected: true,
      isBot: false,
    };

    this.room = {
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

    this.broadcastState();
    if (callback) callback({ success: true, roomCode: code, playerId: hostId });
  }

  private handleJoinRoom(
    connId: string,
    payload: { code: string; name: string; avatarEmoji: string; playerId?: string },
    callback?: (res: any) => void
  ) {
    if (!this.room) {
      if (callback) callback({ success: false, error: 'Room not found.' });
      return;
    }

    const code = (payload?.code || '').toUpperCase().trim();
    if (code !== this.room.code) {
      if (callback) callback({ success: false, error: 'Incorrect room code.' });
      return;
    }

    // Reconnection check
    if (payload?.playerId) {
      const existing = this.room.players.find((p) => p.id === payload.playerId);
      if (existing) {
        existing.socketId = connId;
        existing.connected = true;
        if (payload.name) {
          const san = sanitizeText(payload.name, 16);
          if (san.isValid) existing.name = san.clean;
        }
        if (payload.avatarEmoji) existing.avatarEmoji = payload.avatarEmoji;
        if (callback) callback({ success: true, roomCode: code, playerId: existing.id });
        this.broadcastState();

        if (this.room.status === 'voting') {
          this.sendVotingOptionsToPlayer(connId, existing);
        }
        return;
      }
    }

    if (this.room.status !== 'lobby') {
      if (callback) callback({ success: false, error: 'Game is already in progress.' });
      return;
    }

    const playerSanitized = sanitizeText(payload?.name || 'Player', 16);
    const playerName = playerSanitized.isValid ? playerSanitized.clean : 'Player';
    const avatarEmoji = payload?.avatarEmoji || '🎮';
    const newPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);

    const newPlayer: Player = {
      id: newPlayerId,
      socketId: connId,
      name: playerName,
      avatarEmoji,
      score: 0,
      isHost: false,
      connected: true,
      isBot: false,
    };

    this.room.players.push(newPlayer);
    this.broadcastState();
    if (callback) callback({ success: true, roomCode: code, playerId: newPlayerId });
  }

  private handleSetGameMode(connId: string, payload: { mode: GameMode }) {
    if (!this.room || this.room.status !== 'lobby') return;
    const sender = this.room.players.find((p) => p.socketId === connId);
    if (!sender || !sender.isHost) return;

    if (payload.mode === 'vote') {
      const activeCount = this.room.players.filter((p) => p.connected).length;
      if (activeCount <= 2) {
        this.sendTo(connId, 'error:message', {
          message: 'Crowd Vote mode requires more than 2 players in the lobby (3+ players).',
        });
        return;
      }
    }

    this.room.gameMode = payload.mode;
    this.broadcastState();
  }

  private handleStartGame(connId: string, payload: { totalRounds?: number; gameMode?: GameMode }) {
    if (!this.room) return;
    const sender = this.room.players.find((p) => p.socketId === connId);
    if (!sender || !sender.isHost) return;

    if (payload.totalRounds && payload.totalRounds >= 1 && payload.totalRounds <= 20) {
      this.room.totalRounds = payload.totalRounds;
    }

    if (payload.gameMode) {
      const activeCount = this.room.players.filter((p) => p.connected).length;
      if (payload.gameMode === 'vote' && activeCount > 2) {
        this.room.gameMode = 'vote';
      } else {
        this.room.gameMode = 'clash';
      }
    } else if (this.room.gameMode === 'vote') {
      const activeCount = this.room.players.filter((p) => p.connected).length;
      if (activeCount <= 2) {
        this.room.gameMode = 'clash';
      }
    }

    this.room.currentRoundNumber = 1;
    this.room.roundHistory = [];
    this.room.status = 'category-select';
    this.broadcastState();
  }

  private handleSelectCategory(connId: string, payload: { category: string }) {
    if (!this.room || this.room.status !== 'category-select') return;
    const sender = this.room.players.find((p) => p.socketId === connId);
    if (!sender || !sender.isHost) return;

    this.room.currentCategory = payload.category;
    this.room.submissions = {};
    this.room.bracket = null;
    this.room.votes = {};
    this.room.status = 'submitting';

    const durationMs = 30000;
    this.room.submissionDeadline = Date.now() + durationMs;
    this.broadcastState();

    this.handleBotSubmissions();

    this.clearTimer('submitting');
    const timer = setTimeout(() => {
      if (this.room && this.room.status === 'submitting') {
        if (this.room.gameMode === 'vote') {
          this.transitionToVoting();
        } else {
          this.transitionToBattle();
        }
      }
    }, durationMs);
    this.timers.set('submitting', timer);
  }

  private handleSubmitPick(connId: string, payload: { pick: string }) {
    if (!this.room || this.room.status !== 'submitting') return;
    const sender = this.room.players.find((p) => p.socketId === connId);
    if (!sender) return;

    const san = sanitizeText(payload?.pick || '', 50);
    this.room.submissions[sender.id] = san.isValid ? san.clean : 'Mystery Pick';
    this.broadcastState();
    this.checkAllSubmitted();
  }

  private checkAllSubmitted() {
    if (!this.room || this.room.status !== 'submitting') return;
    const activePlayers = this.room.players.filter((p) => p.connected);
    if (activePlayers.length === 0) return;
    const allIn = activePlayers.every((p) => Boolean(this.room!.submissions[p.id]));
    if (allIn) {
      this.clearTimer('submitting');
      if (this.room.gameMode === 'vote') {
        this.transitionToVoting();
      } else {
        this.transitionToBattle();
      }
    }
  }

  private handleBotSubmissions() {
    if (!this.room) return;
    const bots = this.room.players.filter((p) => p.isBot && p.connected);
    if (bots.length === 0) return;

    const currentCat =
      CATEGORIES.find((c) => c.name === this.room!.currentCategory) || CATEGORIES[0];

    bots.forEach((bot, idx) => {
      const delay = 1500 + idx * 1200 + Math.random() * 800;
      setTimeout(() => {
        if (!this.room || this.room.status !== 'submitting') return;
        if (this.room.submissions[bot.id]) return;

        const randomPick =
          currentCat.botPicks[Math.floor(Math.random() * currentCat.botPicks.length)] ||
          `${currentCat.name} Champion`;

        this.room.submissions[bot.id] = randomPick;
        this.broadcastState();
        this.checkAllSubmitted();
      }, delay);
    });
  }

  // Crowd Vote Mode
  private transitionToVoting() {
    if (!this.room) return;
    this.clearTimer('all');
    this.room.status = 'voting';
    this.room.votes = {};
    const durationMs = 22000;
    this.room.votingDeadline = Date.now() + durationMs;

    const activePlayers = this.room.players.filter((p) => p.connected);
    for (const p of activePlayers) {
      if (!this.room.submissions[p.id]) {
        this.room.submissions[p.id] = `${p.name}'s Mystery Pick`;
      }
    }

    this.broadcastState();

    // Send options to every player connection
    for (const p of this.room.players) {
      if (p.connected && !p.isBot) {
        this.sendVotingOptionsToPlayer(p.socketId, p);
      }
    }

    this.handleBotVotes();

    this.clearTimer('voting');
    const timer = setTimeout(() => {
      if (this.room && this.room.status === 'voting') {
        this.transitionToReveal();
      }
    }, durationMs);
    this.timers.set('voting', timer);
  }

  private sendVotingOptionsToPlayer(connId: string, player: Player) {
    if (!this.room) return;
    const allSubmissions = Object.entries(this.room.submissions).map(([playerId, pick]) => ({
      playerId,
      pick,
    }));
    const otherPicks = allSubmissions.filter((s) => s.playerId !== player.id);
    const shuffled = this.shuffleArray(otherPicks);

    const labels = [
      'Pick A',
      'Pick B',
      'Pick C',
      'Pick D',
      'Pick E',
      'Pick F',
      'Pick G',
      'Pick H',
      'Pick I',
      'Pick J',
    ];
    const options: VotingCardOption[] = shuffled.map((item, index) => ({
      targetPlayerId: item.playerId,
      label: labels[index] || `Pick ${index + 1}`,
      pick: item.pick,
    }));

    const payload: VotingStartedPayload = {
      options,
      deadline: this.room.votingDeadline || Date.now() + 22000,
      myPick: this.room.submissions[player.id] || '',
    };

    this.sendTo(connId, 'voting:started', payload);
  }

  private handleBotVotes() {
    if (!this.room) return;
    const bots = this.room.players.filter((p) => p.isBot && p.connected);
    if (bots.length === 0) return;

    const validTargets = Object.keys(this.room.submissions);

    bots.forEach((bot, idx) => {
      const delay = 1800 + idx * 1400 + Math.random() * 800;
      setTimeout(() => {
        if (!this.room || this.room.status !== 'voting') return;
        if (this.room.votes[bot.id]) return;

        const eligible = validTargets.filter((id) => id !== bot.id);
        if (eligible.length > 0) {
          const target = eligible[Math.floor(Math.random() * eligible.length)];
          this.room.votes[bot.id] = target;
          this.broadcastState();
          this.checkAllVoted();
        }
      }, delay);
    });
  }

  private handleSubmitVote(connId: string, payload: { targetPlayerId: string }) {
    if (!this.room || this.room.status !== 'voting') return;
    const sender = this.room.players.find((p) => p.socketId === connId);
    if (!sender) return;

    if (sender.id === payload?.targetPlayerId) return;
    if (!this.room.submissions[payload?.targetPlayerId]) return;

    this.room.votes[sender.id] = payload.targetPlayerId;
    this.broadcastState();
    this.checkAllVoted();
  }

  private checkAllVoted() {
    if (!this.room || this.room.status !== 'voting') return;
    const activePlayers = this.room.players.filter((p) => p.connected);
    if (activePlayers.length === 0) return;
    const allVoted = activePlayers.every((p) => Boolean(this.room!.votes[p.id]));
    if (allVoted) {
      this.clearTimer('voting');
      const timer = setTimeout(() => {
        if (this.room && this.room.status === 'voting') {
          this.transitionToReveal();
        }
      }, 400);
      this.timers.set('voting', timer);
    }
  }

  // Power Clash Mode (Tournaments & Brackets)
  private transitionToBattle() {
    if (!this.room) return;
    this.clearTimer('all');
    this.room.status = 'battle';

    const activePlayers = this.room.players.filter((p) => p.connected);
    for (const p of activePlayers) {
      if (!this.room.submissions[p.id]) {
        this.room.submissions[p.id] = `${p.name}'s Wild Pick`;
      }
    }

    const submittedPlayerIds = Object.keys(this.room.submissions);
    const shuffledIds = this.shuffleArray(submittedPlayerIds);
    const initialDuels = this.createRoundDuels(shuffledIds, 1);

    const bracket: Bracket = {
      duelRounds: [initialDuels],
      activeRoundIndex: 0,
      activeDuelIndex: 0,
    };

    this.room.bracket = bracket;
    this.broadcastState();
    this.startActiveDuel();
  }

  private createRoundDuels(playerIds: string[], bracketRound: number): Duel[] {
    const duels: Duel[] = [];
    for (let i = 0; i < playerIds.length; i += 2) {
      const playerAId = playerIds[i];
      const playerBId = playerIds[i + 1] || null;
      const powerLevelA = this.generatePowerLevel();
      const powerLevelB = playerBId ? this.generatePowerLevel() : 0;

      duels.push({
        id: 'd_' + Math.random().toString(36).substring(2, 9),
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

  private startActiveDuel() {
    if (!this.room || !this.room.bracket) return;
    const currentRoundDuels = this.room.bracket.duelRounds[this.room.bracket.activeRoundIndex];
    if (!currentRoundDuels) return;

    const currentDuel = currentRoundDuels[this.room.bracket.activeDuelIndex];
    if (!currentDuel) {
      this.advanceDuel();
      return;
    }

    // Handle bye
    if (currentDuel.playerBId === null) {
      currentDuel.winnerId = currentDuel.playerAId;
      currentDuel.resolvedReason = 'bye';
      currentDuel.deadline = null;
      this.broadcastState();

      const timer = setTimeout(() => {
        if (this.room && this.room.status === 'battle' && this.room.bracket) {
          this.advanceDuel();
        }
      }, 2200);
      this.timers.set('duel', timer);
      return;
    }

    const eligibleSpectators = this.room.players.filter(
      (p) => p.connected && p.id !== currentDuel.playerAId && p.id !== currentDuel.playerBId
    );

    // AI Judge Deliberation (asynchronous with instant fallback)
    currentDuel.aiDeliberating = true;
    const duelId = currentDuel.id;
    const pickA = this.room.submissions[currentDuel.playerAId] || 'Wild Pick';
    const pickB = (currentDuel.playerBId && this.room.submissions[currentDuel.playerBId]) || 'Wild Pick';

    judgePicks(this.room.currentCategory || 'Power Battle', [
      { label: 'Pick A', pick: pickA },
      { label: 'Pick B', pick: pickB },
    ]).then((res) => {
      if (!this.room || !this.room.bracket) return;
      const d =
        this.room.bracket.duelRounds[this.room.bracket.activeRoundIndex]?.[
          this.room.bracket.activeDuelIndex
        ];
      if (!d || d.id !== duelId) return;

      d.aiVerdict = res.verdict;
      d.aiWinnerLabel = res.ranking[0];
      d.aiDeliberating = false;
      this.broadcastState();
    });

    // If 2-player direct duel
    if (eligibleSpectators.length === 0) {
      const durationMs = 4200;
      currentDuel.deadline = Date.now() + durationMs;
      this.broadcastState();

      const timer = setTimeout(() => {
        if (this.room && this.room.status === 'battle' && this.room.bracket) {
          this.resolveCurrentDuel();
        }
      }, durationMs);
      this.timers.set('duel', timer);
      return;
    }

    // Spectator voting duel
    const durationMs = 12000;
    currentDuel.deadline = Date.now() + durationMs;
    this.broadcastState();

    // Bot spectator votes
    const botSpectators = eligibleSpectators.filter((p) => p.isBot);
    botSpectators.forEach((bot, idx) => {
      const delay = 1400 + idx * 1000 + Math.random() * 800;
      setTimeout(() => {
        if (!this.room || this.room.status !== 'battle' || !this.room.bracket) return;
        const d =
          this.room.bracket.duelRounds[this.room.bracket.activeRoundIndex]?.[
            this.room.bracket.activeDuelIndex
          ];
        if (!d || d.id !== currentDuel.id || d.winnerId !== null) return;
        if (d.spectatorVotes[bot.id]) return;

        const target = Math.random() < 0.5 ? d.playerAId : d.playerBId!;
        d.spectatorVotes[bot.id] = target;
        this.broadcastState();
        this.checkAllDuelVoted();
      }, delay);
    });

    const timer = setTimeout(() => {
      if (this.room && this.room.status === 'battle' && this.room.bracket) {
        this.resolveCurrentDuel();
      }
    }, durationMs);
    this.timers.set('duel', timer);
  }

  private handleDuelVote(
    connId: string,
    payload: { duelId: string; votedForPlayerId: string }
  ) {
    if (!this.room || !this.room.bracket) return;
    const sender = this.room.players.find((p) => p.socketId === connId);
    if (!sender) return;

    const currentRoundDuels = this.room.bracket.duelRounds[this.room.bracket.activeRoundIndex];
    if (!currentRoundDuels) return;
    const currentDuel = currentRoundDuels[this.room.bracket.activeDuelIndex];
    if (!currentDuel || currentDuel.id !== payload?.duelId || currentDuel.winnerId !== null) return;

    if (sender.id === currentDuel.playerAId || sender.id === currentDuel.playerBId) return;

    currentDuel.spectatorVotes[sender.id] = payload.votedForPlayerId;
    this.broadcastState();
    this.checkAllDuelVoted();
  }

  private checkAllDuelVoted() {
    if (!this.room || !this.room.bracket) return;
    const currentRoundDuels = this.room.bracket.duelRounds[this.room.bracket.activeRoundIndex];
    if (!currentRoundDuels) return;
    const currentDuel = currentRoundDuels[this.room.bracket.activeDuelIndex];
    if (!currentDuel || currentDuel.winnerId !== null) return;

    const eligibleSpectators = this.room.players.filter(
      (p) => p.connected && p.id !== currentDuel.playerAId && p.id !== currentDuel.playerBId
    );

    if (
      eligibleSpectators.length > 0 &&
      eligibleSpectators.every((p) => Boolean(currentDuel.spectatorVotes[p.id]))
    ) {
      this.clearTimer('duel');
      const timer = setTimeout(() => {
        if (this.room && this.room.status === 'battle' && this.room.bracket) {
          this.resolveCurrentDuel();
        }
      }, 450);
      this.timers.set('duel', timer);
    }
  }

  private resolveCurrentDuel() {
    if (!this.room || !this.room.bracket) return;
    this.clearTimer('duel');

    const currentRoundDuels = this.room.bracket.duelRounds[this.room.bracket.activeRoundIndex];
    if (!currentRoundDuels) return;
    const currentDuel = currentRoundDuels[this.room.bracket.activeDuelIndex];
    if (!currentDuel || currentDuel.winnerId !== null) return;

    // Determine winner via authoritative AI Judge
    let winnerId = currentDuel.playerAId;
    if (currentDuel.aiWinnerLabel === 'Pick B' && currentDuel.playerBId) {
      winnerId = currentDuel.playerBId;
    } else if (currentDuel.aiWinnerLabel === 'Pick A') {
      winnerId = currentDuel.playerAId;
    } else {
      // If AI evaluation was still pending, compute instant fallback
      const pickA = this.room.submissions[currentDuel.playerAId] || 'Wild Pick';
      const pickB =
        (currentDuel.playerBId && this.room.submissions[currentDuel.playerBId]) || 'Wild Pick';
      const judged = fallbackJudge(this.room.currentCategory || 'Power Battle', [
        { label: 'Pick A', pick: pickA },
        { label: 'Pick B', pick: pickB },
      ]);
      currentDuel.aiVerdict = judged.verdict;
      currentDuel.aiWinnerLabel = judged.ranking[0];
      winnerId =
        judged.ranking[0] === 'Pick B' && currentDuel.playerBId
          ? currentDuel.playerBId
          : currentDuel.playerAId;
    }

    currentDuel.winnerId = winnerId;
    currentDuel.resolvedReason = 'ai_judge';
    currentDuel.aiDeliberating = false;

    // Boost winner's Scouter Power Level visually to reflect victory
    if (winnerId === currentDuel.playerAId) {
      if (currentDuel.powerLevelA <= currentDuel.powerLevelB) {
        currentDuel.powerLevelA = Math.max(currentDuel.powerLevelB + 300000, 4000000);
      }
    } else if (currentDuel.playerBId && winnerId === currentDuel.playerBId) {
      if (currentDuel.powerLevelB <= currentDuel.powerLevelA) {
        currentDuel.powerLevelB = Math.max(currentDuel.powerLevelA + 300000, 4000000);
      }
    }

    this.broadcastState();

    const timer = setTimeout(() => {
      if (this.room && this.room.status === 'battle' && this.room.bracket) {
        this.advanceDuel();
      }
    }, 3800);
    this.timers.set('duel', timer);
  }

  private advanceDuel() {
    if (!this.room || !this.room.bracket) return;
    this.clearTimer('duel');

    const currentRoundDuels = this.room.bracket.duelRounds[this.room.bracket.activeRoundIndex];
    if (!currentRoundDuels) return;

    if (this.room.bracket.activeDuelIndex + 1 < currentRoundDuels.length) {
      this.room.bracket.activeDuelIndex += 1;
      this.startActiveDuel();
      return;
    }

    const roundWinners = currentRoundDuels
      .map((d) => d.winnerId)
      .filter((id): id is string => Boolean(id));

    if (roundWinners.length <= 1) {
      this.transitionToReveal();
    } else {
      const nextDuels = this.createRoundDuels(roundWinners, this.room.bracket.activeRoundIndex + 2);
      this.room.bracket.duelRounds.push(nextDuels);
      this.room.bracket.activeRoundIndex += 1;
      this.room.bracket.activeDuelIndex = 0;
      this.startActiveDuel();
    }
  }

  private transitionToReveal() {
    if (!this.room) return;
    this.clearTimer('all');
    this.room.status = 'reveal';

    const submissionsList: RoundSubmission[] = Object.entries(this.room.submissions).map(
      ([playerId, pick]) => {
        const player = this.room!.players.find((p) => p.id === playerId);
        return {
          playerId,
          playerName: player ? player.name : 'Unknown',
          avatarEmoji: player ? player.avatarEmoji : '❓',
          pick,
        };
      }
    );

    const flavorLine = FLAVOR_LINES[Math.floor(Math.random() * FLAVOR_LINES.length)];

    // Crowd Vote Mode Scoring
    if (this.room.gameMode === 'vote') {
      const voteCounts: Record<string, number> = {};
      for (const targetId of Object.values(this.room.votes)) {
        if (targetId) {
          voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
        }
      }

      for (const playerId of Object.keys(this.room.submissions)) {
        if (voteCounts[playerId] === undefined) {
          voteCounts[playerId] = 0;
        }
      }

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

      for (const player of this.room.players) {
        const pts = pointsAwarded[player.id] || 0;
        player.score += pts;
      }

      const roundResult: RoundResult = {
        roundNumber: this.room.currentRoundNumber,
        category: this.room.currentCategory || 'Wildcard',
        gameMode: 'vote',
        submissions: submissionsList,
        voteCounts,
        ranking,
        pointsAwarded,
        flavorLine,
      };

      this.room.roundHistory.push(roundResult);
      this.broadcastState();
      return;
    }

    // Power Clash Tournament Scoring
    const bracketPlacement: Record<string, number> = {};
    for (const player of this.room.players) {
      bracketPlacement[player.id] = 0;
    }

    if (this.room.bracket) {
      for (const roundDuels of this.room.bracket.duelRounds) {
        for (const duel of roundDuels) {
          if (duel.winnerId) {
            bracketPlacement[duel.winnerId] = (bracketPlacement[duel.winnerId] || 0) + 1;
          }
        }
      }
    }

    const ranking = Object.keys(bracketPlacement).sort((a, b) => {
      const diff = (bracketPlacement[b] || 0) - (bracketPlacement[a] || 0);
      if (diff !== 0) return diff;
      return Math.random() - 0.5;
    });

    const pointsAwarded: Record<string, number> = {};
    if (ranking.length > 0) {
      const champId = ranking[0];
      pointsAwarded[champId] = 3;
      if (ranking.length > 1) {
        const runnerUpId = ranking[1];
        pointsAwarded[runnerUpId] = 2;
      }
      for (let i = 2; i < ranking.length; i++) {
        const pid = ranking[i];
        const wins = bracketPlacement[pid] || 0;
        pointsAwarded[pid] = wins > 0 ? 1 : 0;
      }
    }

    for (const player of this.room.players) {
      const pts = pointsAwarded[player.id] || 0;
      player.score += pts;
    }

    // Find final championship duel AI verdict
    let clashVerdict: string | undefined;
    if (this.room.bracket && this.room.bracket.duelRounds.length > 0) {
      const lastRound = this.room.bracket.duelRounds[this.room.bracket.duelRounds.length - 1];
      const finalDuel = lastRound && lastRound[lastRound.length - 1];
      if (finalDuel?.aiVerdict) {
        clashVerdict = finalDuel.aiVerdict;
      }
    }

    const roundResult: RoundResult = {
      roundNumber: this.room.currentRoundNumber,
      category: this.room.currentCategory || 'Wildcard',
      gameMode: 'clash',
      submissions: submissionsList,
      bracketPlacement,
      ranking,
      pointsAwarded,
      flavorLine,
      bracketSummary: this.room.bracket ? JSON.parse(JSON.stringify(this.room.bracket)) : undefined,
      aiVerdict: clashVerdict,
    };

    this.room.roundHistory.push(roundResult);
    this.broadcastState();
  }

  private handleNextRound(connId: string) {
    if (!this.room) return;
    const sender = this.room.players.find((p) => p.socketId === connId);
    if (!sender || !sender.isHost) return;

    if (this.room.status === 'reveal') {
      this.room.status = 'leaderboard';
      this.broadcastState();
      return;
    }

    if (this.room.status === 'leaderboard') {
      if (this.room.currentRoundNumber < this.room.totalRounds) {
        this.room.currentRoundNumber++;
        this.room.status = 'category-select';
        this.room.currentCategory = null;
        this.room.submissions = {};
        this.room.bracket = null;
        this.room.votes = {};
        this.room.votingDeadline = null;
        this.broadcastState();
      } else {
        this.room.status = 'final';
        this.broadcastState();
      }
    }
  }

  private handlePlayAgain(connId: string) {
    if (!this.room) return;
    const sender = this.room.players.find((p) => p.socketId === connId);
    if (!sender || !sender.isHost) return;

    this.room.status = 'lobby';
    this.room.currentRoundNumber = 0;
    this.room.currentCategory = null;
    this.room.submissions = {};
    this.room.bracket = null;
    this.room.votes = {};
    this.room.votingDeadline = null;
    this.room.roundHistory = [];
    this.room.players.forEach((p) => {
      p.score = 0;
    });

    this.broadcastState();
  }

  private handleAddBot(connId: string) {
    if (!this.room || this.room.status !== 'lobby') return;
    const sender = this.room.players.find((p) => p.socketId === connId);
    if (!sender || !sender.isHost) return;

    const usedNames = new Set(this.room.players.map((p) => p.name));
    const available = BOT_NAMES.filter((b) => !usedNames.has(b.name));
    const template =
      available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : { name: `Bot ${this.room.players.length + 1}`, emoji: '🤖' };

    const botId = 'bot_' + Math.random().toString(36).substring(2, 9);
    const botPlayer: Player = {
      id: botId,
      socketId: 'bot_' + botId,
      name: template.name,
      avatarEmoji: template.emoji,
      score: 0,
      isHost: false,
      connected: true,
      isBot: true,
    };

    this.room.players.push(botPlayer);
    this.broadcastState();
  }

  private handleRemoveBot(connId: string, payload: { botId: string }) {
    if (!this.room || this.room.status !== 'lobby') return;
    const sender = this.room.players.find((p) => p.socketId === connId);
    if (!sender || !sender.isHost) return;

    this.room.players = this.room.players.filter((p) => p.id !== payload?.botId);
    if (this.room.gameMode === 'vote') {
      const activeCount = this.room.players.filter((p) => p.connected).length;
      if (activeCount <= 2) {
        this.room.gameMode = 'clash';
      }
    }

    this.broadcastState();
  }

  private generateCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }
}
