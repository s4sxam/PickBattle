import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Vote, CheckCircle, Clock, ShieldCheck, EyeOff } from 'lucide-react';
import { Room, Player, VotingCardOption } from '../types';
import { playVoteCast, playTick, playLockIn } from '../utils/sound';

interface VotingPhaseProps {
  room: Room;
  me: Player;
  votingOptions?: VotingCardOption[];
  options?: VotingCardOption[];
  myPick?: string | null;
  onVote: (targetPlayerId: string) => void;
  hasVoted?: boolean;
  votedTargetId?: string | null;
}

export const VotingPhase: React.FC<VotingPhaseProps> = ({
  room,
  me,
  votingOptions,
  options,
  myPick,
  onVote,
  hasVoted: propHasVoted,
  votedTargetId: propVotedTargetId,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(propVotedTargetId || null);
  const [hasVoted, setHasVoted] = useState<boolean>(propHasVoted || false);
  const [timeLeft, setTimeLeft] = useState<number>(20);

  // Check if server already recorded my vote
  const serverVote = room.votes?.[me.id];

  useEffect(() => {
    if (serverVote) {
      setHasVoted(true);
      setSelectedId(serverVote);
    } else if (propVotedTargetId) {
      setHasVoted(true);
      setSelectedId(propVotedTargetId);
    }
  }, [serverVote, propVotedTargetId]);

  // Timer countdown
  useEffect(() => {
    if (!room.votingDeadline) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((room.votingDeadline! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 4 && remaining > 0 && !hasVoted) {
        playTick(true);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [room.votingDeadline, hasVoted]);

  const handleSelect = (targetPlayerId: string) => {
    if (hasVoted) return;
    setSelectedId(targetPlayerId);
    playVoteCast();
  };

  const handleConfirmVote = () => {
    if (!selectedId || hasVoted) return;
    setHasVoted(true);
    playLockIn();
    onVote(selectedId);
  };

  // Safe fallback to reconstruct card options if socket payload was pending or missed
  const providedOptions = options || votingOptions || [];
  const cardOptions: VotingCardOption[] =
    providedOptions.length > 0
      ? providedOptions
      : Object.entries(room.submissions || {})
          .filter(([playerId]) => playerId !== me.id)
          .map(([targetPlayerId, pick], idx) => {
            const labels = [
              'Pick A',
              'Pick B',
              'Pick C',
              'Pick D',
              'Pick E',
              'Pick F',
              'Pick G',
              'Pick H',
            ];
            return {
              targetPlayerId,
              label: labels[idx] || `Pick ${idx + 1}`,
              pick,
            };
          });

  const activePlayers = (room.players || []).filter((p) => p.connected);
  const totalVotesCast = Object.keys(room.votes || {}).length;
  const progressPercent =
    activePlayers.length > 0 ? (totalVotesCast / activePlayers.length) * 100 : 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4 sm:py-6 flex flex-col items-center text-center">
      {/* Top Header & Timer */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-left">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Vote className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
              Crowd Vote Mode
            </div>
            <div className="text-xs text-slate-400">
              Category: <strong className="text-white">{room.currentCategory}</strong>
            </div>
          </div>
        </div>

        {/* Countdown Badge */}
        <div
          className={`px-3 py-1 rounded-full border text-xs font-black flex items-center gap-1.5 ${
            timeLeft <= 4
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-bounce'
              : 'bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{timeLeft}s remaining</span>
        </div>
      </div>

      {/* Title & Instructions */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-2xl sm:text-3xl font-display font-black text-white mb-1">
          Pick Your Favorite Submission!
        </h2>
        <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
          All picks are anonymous and shuffled. You cannot vote for your own pick.
        </p>
      </motion.div>

      {/* My Submission Reminder */}
      {myPick && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full mb-6 p-3 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center text-sm font-bold shrink-0">
              {me.avatarEmoji}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider">
                Your Secret Pick
              </span>
              <div className="text-sm font-bold text-slate-200 truncate">
                &quot;{myPick}&quot;
              </div>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 shrink-0">
            Hidden from your cards
          </span>
        </motion.div>
      )}

      {/* Voting Cards Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
        {cardOptions.map((option, index) => {
          const isSelected = selectedId === option.targetPlayerId;
          return (
            <motion.button
              key={option.targetPlayerId}
              id={`vote-card-${index}`}
              type="button"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => handleSelect(option.targetPlayerId)}
              disabled={hasVoted}
              className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden cursor-pointer active:scale-98 ${
                isSelected
                  ? 'bg-gradient-to-br from-indigo-500/20 via-slate-900 to-slate-950 border-indigo-400 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-400'
                  : hasVoted
                  ? 'bg-slate-900/40 border-slate-800/60 opacity-60 cursor-default'
                  : 'bg-slate-900 hover:bg-slate-850 hover:border-slate-700 border-slate-800 shadow-md'
              }`}
            >
              {/* Option Tag */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-lg ${
                    isSelected
                      ? 'bg-indigo-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {option.label}
                </span>

                {isSelected && (
                  <div className="flex items-center gap-1 text-indigo-300 text-xs font-black">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    <span>{hasVoted ? 'VOTED' : 'SELECTED'}</span>
                  </div>
                )}
              </div>

              {/* Pick Content */}
              <div className="my-2">
                <div className="font-display font-black text-lg sm:text-xl text-white break-words">
                  &quot;{option.pick}&quot;
                </div>
              </div>

              <div className="mt-2 text-[11px] text-slate-400">
                {isSelected
                  ? hasVoted
                    ? 'Your vote has been submitted'
                    : 'Click confirm below to cast vote'
                  : 'Click to select this submission'}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Lock in Action or Voted Status */}
      <div className="w-full max-w-md mx-auto">
        {hasVoted ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-center gap-2 text-sm font-bold shadow-lg"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Vote Locked In! Waiting for others to finish...</span>
          </motion.div>
        ) : (
          <button
            id="confirm-vote-btn"
            type="button"
            onClick={handleConfirmVote}
            disabled={!selectedId}
            className={`w-full py-4 px-6 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl ${
              selectedId
                ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white shadow-indigo-500/20 active:scale-98 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            <Vote className="w-5 h-5" />
            <span>{selectedId ? 'Lock In Vote' : 'Select a card above to vote'}</span>
          </button>
        )}
      </div>

      {/* Live vote progress bar */}
      <div className="w-full max-w-md mt-6">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>Voting Progress</span>
          <span className="font-bold text-slate-300">
            {totalVotesCast} of {activePlayers.length} voted
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
          />
        </div>
      </div>
    </div>
  );
};
