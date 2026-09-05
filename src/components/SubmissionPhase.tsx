import React, { useState, useEffect } from 'react';
import { Clock, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { Room, Player } from '../types';
import { CATEGORIES } from '../utils/gameData';
import { playPop, playLockIn, playTick } from '../utils/sound';

interface SubmissionPhaseProps {
  room: Room;
  me: Player;
  onSubmitPick: (pick: string) => void;
}

export const SubmissionPhase: React.FC<SubmissionPhaseProps> = ({
  room,
  me,
  onSubmitPick,
}) => {
  const [pick, setPick] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(30);

  const categoryInfo =
    CATEGORIES.find((c) => c.name === room.currentCategory) || {
      name: room.currentCategory || 'Wildcard',
      emoji: '🎯',
      description: 'Submit your best pick for this category!',
    };

  const mySubmission = room.submissions[me.id];
  const hasSubmitted = Boolean(mySubmission);

  // Authoritative server timer calculation
  useEffect(() => {
    if (!room.submissionDeadline) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((room.submissionDeadline! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 5 && remaining > 0) {
        playTick(true);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [room.submissionDeadline]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pick.trim() || hasSubmitted) return;
    playLockIn();
    onSubmitPick(pick.trim());
  };

  const activePlayers = room.players.filter((p) => p.connected);
  const submittedCount = activePlayers.filter((p) => Boolean(room.submissions[p.id])).length;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 text-center">
      {/* Category Banner Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-xs uppercase tracking-wider font-bold text-amber-400">
            Round {room.currentRoundNumber} Category
          </div>

          {/* Countdown timer badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
              timeLeft <= 5
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        <div className="text-5xl mb-2">{categoryInfo.emoji}</div>
        <h2 className="text-2xl sm:text-3xl font-display font-black text-white mb-1">
          {categoryInfo.name}
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {categoryInfo.description}
        </p>
      </motion.div>

      {/* Submission Form or Locked in view */}
      {!hasSubmitted ? (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Your Secret Pick
            </label>
            <span className="text-[11px] text-slate-500 font-mono">
              {pick.length}/60
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              id="submission-pick-input"
              type="text"
              maxLength={60}
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              placeholder="e.g. Goku, 1969 Mustang, SpongeBob..."
              autoFocus
              required
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-2xl px-4 py-3.5 text-white font-semibold placeholder-slate-500 text-base outline-none transition-colors"
            />

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Your pick stays anonymous during voting so nobody knows who chose what!
              </span>
            </div>

            <button
              id="submit-pick-btn"
              type="submit"
              disabled={!pick.trim()}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-display font-bold text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <span>Lock In My Pick</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl text-center flex flex-col items-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="text-xs uppercase font-bold tracking-wider text-emerald-400 mb-1">
            Pick Locked In!
          </div>

          <div className="text-xl sm:text-2xl font-display font-black text-white bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 mb-3 max-w-full break-words">
            &quot;{mySubmission}&quot;
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Waiting for other players to finish locking in their candidates...
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 text-xs font-bold text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{submittedCount} of {activePlayers.length} submitted</span>
          </div>
        </motion.div>
      )}

      {/* Players submission status indicators */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {activePlayers.map((player) => {
          const isDone = Boolean(room.submissions[player.id]);
          return (
            <div
              key={player.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <span>{player.avatarEmoji}</span>
              <span className="max-w-[80px] truncate">{player.name}</span>
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-pulse ml-0.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
