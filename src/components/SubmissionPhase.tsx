import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Send, CheckCircle2, ShieldCheck, AlertCircle, Scale, History, Search, Sparkles, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Room, Player } from '../types';
import { CATEGORIES } from '../utils/gameData';
import { playPop, playLockIn, playTick } from '../utils/sound';
import { checkDuplicateCharacterInMatch, getUsedAnimeCharactersForPlayer } from '../utils/animeRules';
import { checkCategoryRosterMatch, searchCategoryRoster, ContenderDossier } from '../data';

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
  const [showRosterBrowser, setShowRosterBrowser] = useState(false);

  const categoryInfo =
    CATEGORIES.find((c) => c.name === room.currentCategory) || {
      name: room.currentCategory || 'Wildcard',
      emoji: '🎯',
      description: 'Submit your best pick for this category!',
    };

  const isAnimeCategory = (room.currentCategory || '').toLowerCase().includes('anime');
  const usedCharacters = getUsedAnimeCharactersForPlayer(room, me.id);
  const dupCheck = checkDuplicateCharacterInMatch(room, me.id, pick, room.currentCategory);

  // Strict category roster check
  const rosterCheck = useMemo(() => {
    if (!pick.trim()) return null;
    return checkCategoryRosterMatch(room.currentCategory, pick);
  }, [room.currentCategory, pick]);

  // Autocomplete suggestions based on input
  const suggestions = useMemo(() => {
    if (!pick.trim() || pick.trim().length < 2) return [];
    return searchCategoryRoster(room.currentCategory, pick, 5);
  }, [room.currentCategory, pick]);

  // Sample characters for quick roster browsing
  const popularCategoryRoster = useMemo(() => {
    return searchCategoryRoster(room.currentCategory, '', 16);
  }, [room.currentCategory]);

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
    if (!pick.trim() || hasSubmitted || dupCheck.isDuplicate) return;
    playLockIn();
    onSubmitPick(pick.trim());
  };

  const selectSuggestion = (item: ContenderDossier) => {
    setPick(item.name);
    playPop();
  };

  const activePlayers = room.players.filter((p) => p.connected && !p.isSpectator);
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
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
          {categoryInfo.description}
        </p>

        {/* Strict Category File Limitation Rule Notice */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-1.5 text-left bg-slate-950/40 -mx-6 -mb-6 p-4 rounded-b-3xl">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Strict Category Roster: Only fighters in the official {categoryInfo.name} database file are allowed!</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Submitting off-topic characters or random text (e.g. typing numbers or unlisted characters) results in <span className="text-rose-400 font-bold">immediate automatic elimination</span>.
          </div>
          {isAnimeCategory && (
            <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-medium mt-1">
              <Scale className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>Equalizer Active: Universe vs Earth matchups receive power limitation tasks. Fighters cannot be reused.</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Used characters badge bar for current match */}
      {isAnimeCategory && usedCharacters.length > 0 && !hasSubmitted && !me.isSpectator && (
        <div className="mb-4 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-2">
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Your Previously Deployed Fighters (Cannot Reuse This Match):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {usedCharacters.map((c, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold"
              >
                {c.characterName} <span className="text-slate-500 font-normal">(Rd {c.roundNumber})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Spectator View vs Submission Form vs Locked In view */}
      {me.isSpectator ? (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-6 shadow-xl text-center flex flex-col items-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 text-2xl">
            👀
          </div>

          <div className="text-xs uppercase font-extrabold tracking-wider text-indigo-400 mb-1">
            Spectator Mode Active
          </div>

          <div className="text-lg sm:text-xl font-display font-black text-white mb-2">
            Watching Live Submissions
          </div>

          <p className="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed">
            You joined while Round {room.currentRoundNumber} is underway. Contenders are locking in their secret fighters. You will watch the live arena battles and automatically enter the active roster when the next match starts!
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 text-xs font-bold text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{submittedCount} of {activePlayers.length} contenders submitted</span>
          </div>
        </motion.div>
      ) : !hasSubmitted ? (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Your Secret Pick
            </label>
            <button
              type="button"
              onClick={() => setShowRosterBrowser(!showRosterBrowser)}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Search className="w-3 h-3" />
              <span>{showRosterBrowser ? 'Hide Roster' : 'Browse Allowed Roster'}</span>
            </button>
          </div>

          {/* Quick Roster Browser Drawer */}
          {showRosterBrowser && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-left"
            >
              <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between">
                <span>Allowed {categoryInfo.name} Characters in File:</span>
                <span className="text-[10px] text-slate-500 font-mono">Click to select</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {popularCategoryRoster.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => selectSuggestion(item)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-500/20 border border-slate-700/80 hover:border-amber-500/40 text-slate-200 hover:text-amber-300 text-xs font-semibold cursor-pointer transition-all text-left"
                  >
                    <span>{item.name}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5 font-normal">({item.universeOrOrigin})</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                id="submission-pick-input"
                type="text"
                maxLength={60}
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                placeholder="Type a character from the official roster..."
                autoFocus
                required
                className={`w-full bg-slate-950 border rounded-2xl px-4 py-3.5 text-white font-semibold placeholder-slate-500 text-base outline-none transition-colors ${
                  dupCheck.isDuplicate
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : rosterCheck && !rosterCheck.isAllowed
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : rosterCheck && rosterCheck.isAllowed
                    ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                    : 'border-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                }`}
              />
            </div>

            {/* Live Autocomplete suggestions */}
            {suggestions.length > 0 && pick.trim().length >= 2 && !rosterCheck?.isAllowed && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-left"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Matching Official Characters:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => selectSuggestion(item)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({item.universeOrOrigin})</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Real-Time Roster Verification Status */}
            {rosterCheck && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  rosterCheck.isAllowed
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                {rosterCheck.isAllowed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  {rosterCheck.isAllowed ? (
                    <div>
                      <strong className="font-bold text-white">{rosterCheck.canonicalName}</strong> is verified in the official{' '}
                      <span className="text-emerald-400 font-bold">{categoryInfo.name}</span> database! ({rosterCheck.dossier.universeOrOrigin})
                    </div>
                  ) : (
                    <div>
                      <strong className="font-bold text-white">⚠️ Not in Official Roster:</strong> &quot;{pick}&quot; is not found in the {categoryInfo.name} database file. Submitting this will result in{' '}
                      <span className="underline font-bold text-rose-200">AUTOMATIC ELIMINATION</span> this round!
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Duplicate character warning */}
            {dupCheck.isDuplicate && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Duplicate Character Detected:</strong> You already used{' '}
                  <span className="underline font-bold text-white">&quot;{dupCheck.canonicalName}&quot;</span> in Round{' '}
                  {dupCheck.matchedRound} of this match. Please choose a different contender!
                </div>
              </motion.div>
            )}

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Your pick stays anonymous during voting so nobody knows who chose what!
              </span>
            </div>

            <button
              id="submit-pick-btn"
              type="submit"
              disabled={!pick.trim() || dupCheck.isDuplicate}
              className={`w-full py-3.5 px-6 rounded-2xl font-display font-bold text-base shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer ${
                dupCheck.isDuplicate
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  : rosterCheck && !rosterCheck.isAllowed
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 shadow-amber-500/20'
              }`}
            >
              <span>
                {dupCheck.isDuplicate
                  ? `Already Used in Round ${dupCheck.matchedRound}`
                  : rosterCheck && !rosterCheck.isAllowed
                  ? 'Submit Anyway (Will Be Eliminated)'
                  : 'Lock In My Pick'}
              </span>
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
