import React, { useState } from 'react';
import {
  Users,
  Play,
  Copy,
  Check,
  QrCode,
  Bot,
  Trash2,
  Crown,
  Sparkles,
  Swords,
  Vote,
  Lock,
  Zap,
  Mic,
  MicOff,
} from 'lucide-react';

import { motion } from 'motion/react';
import { Room, Player, GameMode } from '../types';
import { playPop, playLockIn } from '../utils/sound';

interface LobbyPhaseProps {
  room: Room;
  me: Player;
  onStartGame: (totalRounds: number, gameMode: GameMode) => void;
  onSetGameMode: (mode: GameMode) => void;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
  onOpenQR: () => void;
}

export const LobbyPhase: React.FC<LobbyPhaseProps> = ({
  room,
  me,
  onStartGame,
  onSetGameMode,
  onAddBot,
  onRemoveBot,
  onOpenQR,
}) => {
  const [totalRounds, setTotalRounds] = useState<number>(room.totalRounds || 6);
  const [copied, setCopied] = useState(false);
  const [voteModeWarning, setVoteModeWarning] = useState<string | null>(null);

  const isHost = me.isHost;
  const connectedPlayers = room.players.filter((p) => p.connected);
  const playerCount = connectedPlayers.length;
  const canStart = playerCount >= 2;
  const isVoteModeAllowed = playerCount > 2; // Strictly more than 2 persons (3+)
  const activeMode: GameMode = room.gameMode || 'clash';

  const handleCopyLink = () => {
    playPop();
    const joinUrl = `${window.location.origin}?room=${room.code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleModeChange = (mode: GameMode) => {
    if (mode === 'vote' && !isVoteModeAllowed) {
      playPop();
      setVoteModeWarning('Crowd Vote mode requires more than 2 players in the lobby (3+ players). Add a test bot or invite a friend!');
      setTimeout(() => setVoteModeWarning(null), 4000);
      return;
    }
    playPop();
    setVoteModeWarning(null);
    onSetGameMode(mode);
  };

  const handleStart = () => {
    if (!canStart) return;
    playLockIn();
    onStartGame(totalRounds, activeMode);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 flex flex-col items-center text-center">
      {/* Room code display */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden"
      >
        <div className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-1">
          Room Code to Join
        </div>
        <div className="text-4xl sm:text-6xl font-display font-black tracking-widest text-amber-400 mb-4 select-all">
          {room.code}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          <button
            id="lobby-copy-link-btn"
            onClick={handleCopyLink}
            className="flex items-center gap-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>

          <button
            id="lobby-open-qr-btn"
            onClick={() => {
              playPop();
              onOpenQR();
            }}
            className="flex items-center gap-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>Show QR Code</span>
          </button>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Hosted directly in your browser • Serverless &amp; Vercel ready</span>
        </div>
      </motion.div>

      {/* Mode Selector Card */}
      <div className="w-full mb-6 text-left">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-display font-bold text-white text-sm">
              Select Game Mode
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {isHost ? 'Host controls the game mode' : 'Selected by host'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Mode 1: Power Clash */}
          <button
            id="mode-select-clash-btn"
            type="button"
            disabled={!isHost}
            onClick={() => handleModeChange('clash')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              activeMode === 'clash'
                ? 'bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 border-amber-500/60 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 opacity-80'
            } ${isHost ? 'cursor-pointer active:scale-98' : 'cursor-default'}`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${activeMode === 'clash' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
                    <Swords className="w-4 h-4" />
                  </div>
                  <span className="font-display font-black text-white text-base">
                    Power Clash
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  2+ Players
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2">
                1-on-1 bracket duels with scouter power levels, head-to-head clashes &amp; live spectator judging.
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-amber-400/80 font-bold">
                {activeMode === 'clash' ? '✓ Active Mode' : isHost ? 'Click to select' : ''}
              </span>
              <span className="text-slate-400 text-[10px]">Head-to-head tournament</span>
            </div>
          </button>

          {/* Mode 2: Crowd Vote */}
          <button
            id="mode-select-vote-btn"
            type="button"
            disabled={!isHost}
            onClick={() => handleModeChange('vote')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              activeMode === 'vote'
                ? 'bg-gradient-to-br from-indigo-500/15 via-slate-900 to-slate-950 border-indigo-500/60 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10'
                : isVoteModeAllowed
                ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 opacity-80'
                : 'bg-slate-950/60 border-slate-850 opacity-60'
            } ${isHost ? 'cursor-pointer active:scale-98' : 'cursor-default'}`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${activeMode === 'vote' ? 'bg-indigo-400 text-slate-950' : 'bg-slate-800 text-indigo-400'}`}>
                    <Vote className="w-4 h-4" />
                  </div>
                  <span className="font-display font-black text-white text-base">
                    Crowd Vote
                  </span>
                </div>

                {isVoteModeAllowed ? (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    3+ Players
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> &gt; 2 Players
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 line-clamp-2">
                All submissions revealed secretly in a card grid. Every player votes for their favorite pick.
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className={isVoteModeAllowed ? 'text-indigo-400/80 font-bold' : 'text-rose-400/80 font-bold'}>
                {activeMode === 'vote'
                  ? '✓ Active Mode'
                  : isVoteModeAllowed
                  ? isHost ? 'Click to select' : ''
                  : 'Locked (Needs > 2 players)'}
              </span>
              <span className="text-slate-400 text-[10px]">Anonymous card grid</span>
            </div>
          </button>
        </div>

        {/* Warning notification when attempting to select Crowd Vote with <= 2 players */}
        {voteModeWarning && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
          >
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{voteModeWarning}</span>
          </motion.div>
        )}
      </div>

      {/* Players list header */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <span className="font-display font-bold text-white text-sm sm:text-base">
            Players Joined ({connectedPlayers.length})
          </span>
        </div>

        {/* Solo test bot helper */}
        {isHost && (
          <button
            id="lobby-add-bot-btn"
            onClick={() => {
              playPop();
              onAddBot();
            }}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title="Add a test bot to play or unlock Crowd Vote mode (requires 3+ players)"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Add Bot</span>
          </button>
        )}
      </div>

      {/* Players grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8">
        {room.players.map((player) => {
          const isMe = player.id === me.id;
          return (
            <motion.div
              key={player.id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                isMe
                  ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <span className={`text-2xl sm:text-3xl p-1.5 bg-slate-800/80 rounded-xl border border-slate-700/60 aspect-square flex items-center justify-center transition-all ${
                    room.voiceStates?.[player.id]?.isSpeaking ? 'ring-2 ring-emerald-400 animate-pulse' : ''
                  }`}>
                    {player.avatarEmoji}
                  </span>
                  {room.voiceStates?.[player.id]?.inVoiceCall && (
                    <span className={`absolute -bottom-1 -right-1 p-0.5 rounded-full text-[9px] border shadow-sm ${
                      room.voiceStates[player.id].isMuted
                        ? 'bg-rose-900 border-rose-500 text-rose-300'
                        : 'bg-emerald-900 border-emerald-500 text-emerald-300'
                    }`} title={room.voiceStates[player.id].isMuted ? 'Muted' : 'In Voice'}>
                      {room.voiceStates[player.id].isMuted ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
                    </span>
                  )}
                </div>
                <div className="flex flex-col text-left truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm truncate">
                      {player.name}
                    </span>
                    {player.isHost && (
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" title="Host" />
                    )}
                    {room.voiceStates?.[player.id]?.inVoiceCall && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Voice
                      </span>
                    )}
                    {player.isSpectator && (
                      <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Spectator
                      </span>
                    )}
                    {isMe && (
                      <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {player.isBot ? '🤖 Test Player' : player.connected ? 'Ready in lobby' : 'Reconnecting...'}
                  </span>
                </div>
              </div>


              {isHost && player.isBot && (
                <button
                  id={`remove-bot-${player.id}`}
                  onClick={() => onRemoveBot(player.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Remove bot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Host Game Controls or Waiting state */}
      {isHost ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-5"
        >
          {/* Round Selector */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-left">
              <div className="font-display font-bold text-white text-sm">Number of Rounds</div>
              <div className="text-xs text-slate-400">Quick game or full party tournament</div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[3, 5, 6, 8, 10].map((num) => (
                <button
                  key={num}
                  id={`rounds-select-${num}`}
                  type="button"
                  onClick={() => {
                    playPop();
                    setTotalRounds(num);
                  }}
                  className={`w-9 h-9 rounded-lg font-display font-bold text-xs transition-all cursor-pointer ${
                    totalRounds === num
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Start button */}
          <button
            id="lobby-start-game-btn"
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full py-4 px-6 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2.5 transition-all shadow-xl ${
              canStart
                ? activeMode === 'vote'
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white shadow-indigo-500/20 active:scale-98 cursor-pointer'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20 active:scale-98 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>
              {canStart
                ? `Start PickBattle (${activeMode === 'vote' ? 'Crowd Vote' : 'Power Clash'})!`
                : 'Need at least 2 players to start'}
            </span>
          </button>

          {!canStart && (
            <p className="text-xs text-amber-300/80 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Tip: Click <strong>&quot;+ Add Bot&quot;</strong> above to quickly test solo!
            </p>
          )}
        </motion.div>
      ) : (
        <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 text-center">
          <div className="animate-pulse inline-flex items-center gap-2 text-amber-400 text-sm font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Waiting for host to start the game ({activeMode === 'vote' ? 'Crowd Vote Mode' : 'Power Clash Mode'})...
          </div>
          <p className="text-xs text-slate-400">
            Tell your host to hit Start once everyone has joined!
          </p>
        </div>
      )}
    </div>
  );
};
