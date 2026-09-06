import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Zap, Crown, ShieldAlert, Sparkles, Check, Flame, Trophy, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Room, Player, Duel } from '../types';
import { playScouterTick, playClash, playKO, playTick, playPop, playVoteCast } from '../utils/sound';
import { findPickDossier } from '../data';

interface BattleArenaProps {
  room: Room;
  me: Player;
  onVote: (duelId: string, targetPlayerId: string) => void;
}

export const BattleArena: React.FC<BattleArenaProps> = ({ room, me, onVote }) => {
  const bracket = room.bracket;
  const activeRoundIndex = bracket?.activeRoundIndex ?? 0;
  const activeDuelIndex = bracket?.activeDuelIndex ?? 0;
  const currentRoundDuels = bracket?.duelRounds[activeRoundIndex] || [];
  const duel: Duel | undefined = currentRoundDuels[activeDuelIndex];

  // Combatant data
  const playerA = room.players.find((p) => p.id === duel?.playerAId);
  const playerB = duel?.playerBId ? room.players.find((p) => p.id === duel?.playerBId) : null;
  const isBye = duel?.playerBId === null;

  const pickA = (duel && room.submissions[duel.playerAId]) || 'Wild Pick';
  const pickB = (duel && duel.playerBId && room.submissions[duel.playerBId]) || '';

  const dossierA = useMemo(() => findPickDossier(room.category, pickA), [room.category, pickA]);
  const dossierB = useMemo(() => (pickB ? findPickDossier(room.category, pickB) : null), [room.category, pickB]);

  const isCombatant = me.id === duel?.playerAId || me.id === duel?.playerBId;
  const is2PlayerGame = room.players.filter((p) => p.connected).length <= 2;

  // Local spectator vote selection
  const myVote = duel?.spectatorVotes[me.id] || null;

  // Scouter Power Level animation states
  const [displayedPowerA, setDisplayedPowerA] = useState<number>(0);
  const [displayedPowerB, setDisplayedPowerB] = useState<number>(0);
  const [hasClashed, setHasClashed] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(10);

  // Timer countdown
  useEffect(() => {
    if (!duel || !duel.deadline) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((duel.deadline! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 4 && remaining > 0 && !duel.winnerId) {
        playTick(true);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [duel]);

  // Scouter counting animation whenever a new duel begins
  useEffect(() => {
    if (!duel) return;

    setHasClashed(false);
    setDisplayedPowerA(0);
    setDisplayedPowerB(0);

    const targetA = duel.powerLevelA || 100000;
    const targetB = duel.powerLevelB || 100000;

    let frame = 0;
    const totalFrames = 28;
    const interval = setInterval(() => {
      frame++;
      const progress = Math.min(1, frame / totalFrames);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentA = Math.floor(targetA * eased);
      const currentB = Math.floor(targetB * eased);

      setDisplayedPowerA(currentA);
      setDisplayedPowerB(currentB);

      if (frame % 3 === 0) {
        playScouterTick(frame);
      }

      if (frame >= totalFrames) {
        clearInterval(interval);
        setDisplayedPowerA(targetA);
        setDisplayedPowerB(targetB);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [duel?.id]);

  // Trigger Clash & KO Audio/Visuals on winner resolution
  useEffect(() => {
    if (duel?.winnerId && !hasClashed) {
      setHasClashed(true);
      playClash();
      setTimeout(() => {
        playKO();
        if (duel.winnerId === me.id) {
          confetti({
            particleCount: 80,
            spread: 80,
            origin: { y: 0.6 },
          });
        }
      }, 400);
    }
  }, [duel?.winnerId, hasClashed, me.id]);

  if (!duel) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center text-slate-400">
        <Swords className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-spin" />
        <p className="font-bold text-white text-lg">Preparing next battle clash...</p>
      </div>
    );
  }

  // Bracket round label
  const totalRoundsInBracket = bracket?.duelRounds.length || 1;
  const isFinalDuel = activeRoundIndex > 0 && currentRoundDuels.length === 1;
  let stageLabel = `Bracket Round ${activeRoundIndex + 1}`;
  if (isFinalDuel) {
    stageLabel = '👑 CHAMPIONSHIP FINAL';
  } else if (currentRoundDuels.length === 2) {
    stageLabel = `Semifinal • Duel ${activeDuelIndex + 1} of ${currentRoundDuels.length}`;
  } else if (currentRoundDuels.length > 2) {
    stageLabel = `Round ${activeRoundIndex + 1} • Duel ${activeDuelIndex + 1} of ${currentRoundDuels.length}`;
  }

  // Spectator vote counts
  const votesForA = Object.values(duel.spectatorVotes).filter((id) => id === duel.playerAId).length;
  const votesForB = Object.values(duel.spectatorVotes).filter(
    (id) => duel.playerBId && id === duel.playerBId
  ).length;

  const handleVote = (targetId: string) => {
    if (isCombatant || duel.winnerId) return;
    playVoteCast();
    onVote(duel.id, targetId);
  };

  const isAWinner = duel.winnerId === duel.playerAId;
  const isBWinner = duel.playerBId && duel.winnerId === duel.playerBId;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 flex flex-col items-center">
      {/* Top Tournament Progress Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-400">
              {stageLabel}
            </div>
            <div className="text-xs text-slate-400">
              Category: <strong className="text-white">{room.currentCategory}</strong>
            </div>
          </div>
        </div>

        {/* Timer or Status */}
        {duel.winnerId ? (
          <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center gap-1.5 animate-pulse">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>CLASH RESOLVED!</span>
          </div>
        ) : isBye ? (
          <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            Auto-Advancing Bye
          </div>
        ) : (
          <div
            className={`px-3 py-1 rounded-full border text-xs font-black flex items-center gap-1.5 ${
              timeLeft <= 4
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-bounce'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{timeLeft}s remaining</span>
          </div>
        )}
      </div>

      {/* Sudden death / Power level banner notices */}
      {duel.resolvedReason === 'tiebreak' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full mb-4 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-200 text-xs font-black text-center flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>⚡ TIE DETECTED! RESOLVED VIA DRAMATIC SUDDEN DEATH COIN FLIP!</span>
        </motion.div>
      )}

      {duel.resolvedReason === 'powerlevel' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full mb-4 px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 text-xs font-bold text-center flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>2-Player Match: Winner decided by pure Scouter Power Level superiority!</span>
        </motion.div>
      )}

      {/* AI Judge Deliberation Indicator */}
      {duel.aiDeliberating && !duel.winnerId && !isBye && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-4 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-purple-900/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
          <span>AI Judge is comparing feats, specs & category mastery...</span>
        </motion.div>
      )}

      {/* AI Judge Official Verdict Display */}
      {duel.winnerId && duel.aiVerdict && (
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="w-full mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-950/90 via-slate-900 to-indigo-950/90 border-2 border-purple-400/60 shadow-2xl shadow-purple-950/70 text-left relative overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[11px] font-black tracking-wider uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              AI Judge Verdict
            </span>
          </div>
          <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
            &ldquo;{duel.aiVerdict}&rdquo;
          </p>
        </motion.div>
      )}

      {/* Main VS Duel Arena */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 relative my-2">
        {/* Central VS Badge (Floating in desktop, divider in mobile) */}
        <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex-col items-center pointer-events-none">
          <motion.div
            animate={{
              scale: duel.winnerId ? [1, 1.25, 1] : [1, 1.06, 1],
              rotate: duel.winnerId ? [0, -10, 10, 0] : 0,
            }}
            transition={{ repeat: duel.winnerId ? 0 : Infinity, duration: 1.8 }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-display font-black text-xl shadow-2xl border ${
              duel.winnerId
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 border-amber-300 shadow-amber-500/40'
                : 'bg-slate-950 text-amber-400 border-slate-700 shadow-slate-950/80'
            }`}
          >
            VS
          </motion.div>
        </div>

        {/* COMBATANT A CARD */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{
            x: 0,
            opacity: 1,
            scale: isAWinner ? 1.03 : duel.winnerId && !isAWinner ? 0.96 : 1,
          }}
          transition={{ duration: 0.3 }}
          className={`p-5 sm:p-6 rounded-3xl border text-left flex flex-col justify-between relative overflow-hidden transition-all ${
            isAWinner
              ? 'bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border-amber-400 shadow-2xl shadow-amber-500/20 ring-2 ring-amber-400'
              : duel.winnerId && !isAWinner
              ? 'bg-slate-900/60 border-slate-800/80 opacity-60'
              : 'bg-slate-900/90 border-slate-800 shadow-lg'
          }`}
        >
          {/* Winner KO Ribbon */}
          {isAWinner && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: -8 }}
              className="absolute top-4 right-4 z-10 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-display font-black text-sm shadow-xl flex items-center gap-1.5"
            >
              <Crown className="w-4 h-4 fill-current" />
              <span>VICTOR / ADVANCES</span>
            </motion.div>
          )}

          {/* Submitter header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shadow-inner shrink-0">
              {playerA?.avatarEmoji || '👑'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base truncate max-w-[140px] sm:max-w-[180px]">
                  {playerA?.name || 'Player 1'}
                </span>
                {me.id === duel.playerAId && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    YOU
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">Contender A</span>
            </div>
          </div>

          {/* Pick display */}
          <div className="my-3 py-3 px-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Pick Choice
            </div>
            <div className="font-display font-black text-xl sm:text-2xl text-white break-words">
              &quot;{pickA}&quot;
            </div>
          </div>

          {/* Canonical Specs Dossier */}
          {dossierA && (
            <div className="my-2.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-left">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                  {dossierA.universeOrOrigin}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold shrink-0">
                  Rating {dossierA.score}/100
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {dossierA.badges.slice(0, 4).map((b, idx) => (
                  <div
                    key={idx}
                    className={`p-1.5 rounded-lg border text-left ${
                      b.highlight
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-slate-900/70 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">
                      {b.label}
                    </div>
                    <div className="text-[11px] font-extrabold truncate text-white">
                      {b.value}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-300 leading-snug line-clamp-2 italic">
                &ldquo;{dossierA.headlineFeat}&rdquo;
              </p>
            </div>
          )}

          {/* Scouter Power Level Meter */}
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 shadow-inner relative overflow-hidden">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                SCOUTER POWER
              </span>
              <span className="font-mono text-[10px] text-emerald-500/80 uppercase">
                RADAR: ACTIVE
              </span>
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-emerald-300 tracking-wider">
              {displayedPowerA.toLocaleString()}
            </div>
            {/* Dynamic Energy Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, Math.max(15, (displayedPowerA / 9999999) * 100))}%`,
                }}
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400"
              />
            </div>
          </div>

          {/* Spectator Votes pill (if not 2-player mode) */}
          {!is2PlayerGame && !isBye && (
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 font-bold">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Crowd Votes:
              </span>
              <span className="font-black text-amber-400 px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700">
                {votesForA} {votesForA === 1 ? 'vote' : 'votes'}
              </span>
            </div>
          )}

          {/* Spectator Vote Button */}
          {!isCombatant && !duel.winnerId && !isBye && !is2PlayerGame && (
            <button
              id="vote-combatant-a-btn"
              onClick={() => handleVote(duel.playerAId)}
              className={`mt-5 w-full py-3.5 px-4 rounded-2xl font-display font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer ${
                myVote === duel.playerAId
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20 ring-2 ring-amber-300 scale-102'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-98'
              }`}
            >
              {myVote === duel.playerAId ? (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>VOTED FOR THIS PICK</span>
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4 text-amber-400" />
                  <span>Vote for &quot;{pickA}&quot;</span>
                </>
              )}
            </button>
          )}
        </motion.div>

        {/* COMBATANT B CARD */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{
            x: 0,
            opacity: 1,
            scale: isBWinner ? 1.03 : duel.winnerId && !isBWinner ? 0.96 : 1,
          }}
          transition={{ duration: 0.3 }}
          className={`p-5 sm:p-6 rounded-3xl border text-left flex flex-col justify-between relative overflow-hidden transition-all ${
            isBye
              ? 'bg-slate-900/40 border-dashed border-slate-800 justify-center items-center text-center'
              : isBWinner
              ? 'bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border-amber-400 shadow-2xl shadow-amber-500/20 ring-2 ring-amber-400'
              : duel.winnerId && !isBWinner
              ? 'bg-slate-900/60 border-slate-800/80 opacity-60'
              : 'bg-slate-900/90 border-slate-800 shadow-lg'
          }`}
        >
          {isBye ? (
            /* BYE Notice */
            <div className="py-8 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                <Crown className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-display font-black text-white mb-1">
                Tournament Bye!
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mb-4">
                Odd number of contenders in this bracket round. Contender A automatically advances to the next stage!
              </p>
              <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                Auto-advancing in a moment...
              </div>
            </div>
          ) : (
            <>
              {/* Winner KO Ribbon */}
              {isBWinner && (
                <motion.div
                  initial={{ scale: 0, rotate: 20 }}
                  animate={{ scale: 1, rotate: 8 }}
                  className="absolute top-4 right-4 z-10 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-display font-black text-sm shadow-xl flex items-center gap-1.5"
                >
                  <Crown className="w-4 h-4 fill-current" />
                  <span>VICTOR / ADVANCES</span>
                </motion.div>
              )}

              {/* Submitter header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shadow-inner shrink-0">
                  {playerB?.avatarEmoji || '😎'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base truncate max-w-[140px] sm:max-w-[180px]">
                      {playerB?.name || 'Player 2'}
                    </span>
                    {me.id === duel.playerBId && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        YOU
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">Contender B</span>
                </div>
              </div>

              {/* Pick display */}
              <div className="my-3 py-3 px-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Pick Choice
                </div>
                <div className="font-display font-black text-xl sm:text-2xl text-white break-words">
                  &quot;{pickB}&quot;
                </div>
              </div>

              {/* Canonical Specs Dossier */}
              {dossierB && (
                <div className="my-2.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-left">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                      {dossierB.universeOrOrigin}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-300 font-mono text-[10px] font-bold shrink-0">
                      Rating {dossierB.score}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    {dossierB.badges.slice(0, 4).map((b, idx) => (
                      <div
                        key={idx}
                        className={`p-1.5 rounded-lg border text-left ${
                          b.highlight
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-200'
                            : 'bg-slate-900/70 border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">
                          {b.label}
                        </div>
                        <div className="text-[11px] font-extrabold truncate text-white">
                          {b.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug line-clamp-2 italic">
                    &ldquo;{dossierB.headlineFeat}&rdquo;
                  </p>
                </div>
              )}

              {/* Scouter Power Level Meter */}
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-950 border border-orange-500/30 shadow-inner relative overflow-hidden">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-mono font-bold text-orange-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-orange-400" />
                    SCOUTER POWER
                  </span>
                  <span className="font-mono text-[10px] text-orange-500/80 uppercase">
                    RADAR: ACTIVE
                  </span>
                </div>
                <div className="font-mono font-black text-2xl sm:text-3xl text-orange-300 tracking-wider">
                  {displayedPowerB.toLocaleString()}
                </div>
                {/* Dynamic Energy Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, Math.max(15, (displayedPowerB / 9999999) * 100))}%`,
                    }}
                    className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400"
                  />
                </div>
              </div>

              {/* Spectator Votes pill (if not 2-player mode) */}
              {!is2PlayerGame && (
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-bold">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    Crowd Votes:
                  </span>
                  <span className="font-black text-amber-400 px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700">
                    {votesForB} {votesForB === 1 ? 'vote' : 'votes'}
                  </span>
                </div>
              )}

              {/* Spectator Vote Button */}
              {!isCombatant && !duel.winnerId && !is2PlayerGame && (
                <button
                  id="vote-combatant-b-btn"
                  onClick={() => duel.playerBId && handleVote(duel.playerBId)}
                  className={`mt-5 w-full py-3.5 px-4 rounded-2xl font-display font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    myVote === duel.playerBId
                      ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20 ring-2 ring-amber-300 scale-102'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-98'
                  }`}
                >
                  {myVote === duel.playerBId ? (
                    <>
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>VOTED FOR THIS PICK</span>
                    </>
                  ) : (
                    <>
                      <Swords className="w-4 h-4 text-amber-400" />
                      <span>Vote for &quot;{pickB}&quot;</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Combatant spectator advice message */}
      {isCombatant && !duel.winnerId && !isBye && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 text-center"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>You&apos;re fighting in this duel! Sit back and let the crowd vote determine the victor.</span>
        </motion.div>
      )}

      {/* Duel auto-advancing notice */}
      {duel.winnerId && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-5 text-xs text-slate-400 flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Advancing to next tournament matchup...</span>
        </motion.div>
      )}
    </div>
  );
};
