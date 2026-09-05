import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Crown, ArrowRight, Swords, Sparkles, Zap, Vote } from 'lucide-react';
import { motion } from 'motion/react';
import { Room, Player, RoundResult } from '../types';
import { playFanfare, playLockIn } from '../utils/sound';

interface RevealPhaseProps {
  room: Room;
  me: Player;
  onNext: () => void;
}

export const RevealPhase: React.FC<RevealPhaseProps> = ({ room, me, onNext }) => {
  const isHost = me.isHost;
  const currentResult: RoundResult | undefined =
    room.roundHistory && room.roundHistory.length > 0
      ? room.roundHistory[room.roundHistory.length - 1]
      : undefined;

  useEffect(() => {
    playFanfare();
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.6 },
    });
  }, []);

  if (!currentResult) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 text-center text-slate-400">
        <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-3 animate-spin" />
        <p className="font-bold text-white">Loading round results...</p>
      </div>
    );
  }

  const isVoteMode = currentResult.gameMode === 'vote';
  const rankingList = currentResult.ranking || [];
  const submissionsList = currentResult.submissions || [];
  const pointsAwarded = currentResult.pointsAwarded || {};

  const championPlayerId = rankingList[0];
  const championSubmission = submissionsList.find((s) => s.playerId === championPlayerId);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 text-center">
      {/* Flavor line banner */}
      {currentResult.flavorLine && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-4 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{currentResult.flavorLine}</span>
        </motion.div>
      )}

      <motion.h2
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-3xl sm:text-4xl font-display font-black text-white mb-1"
      >
        {isVoteMode ? 'Crowd Favorite Crowned!' : 'Tournament Champion Crowned!'}
      </motion.h2>
      <p className="text-xs text-slate-400 mb-6">
        Category: <strong className="text-amber-400">{currentResult.category}</strong> •{' '}
        <span className="text-slate-400">
          {isVoteMode ? '🗳️ Crowd Vote Mode' : '⚡ Power Clash Mode'}
        </span>
      </p>

      {/* Champion Spotlight Banner */}
      {championSubmission && (
        <motion.div
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border border-amber-400/80 shadow-2xl shadow-amber-500/15 mb-6 text-left relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-3xl font-black shadow-lg shrink-0">
                {championSubmission.avatarEmoji}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                    {isVoteMode ? 'MOST VOTED PICK' : 'ROUND CHAMPION'}
                  </span>
                  {championPlayerId === me.id && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-black">
                      YOU
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-white text-lg sm:text-xl truncate mt-0.5">
                  {championSubmission.playerName}
                </h3>
                <div className="font-display font-black text-xl sm:text-2xl text-amber-300 break-words mt-1">
                  &quot;{championSubmission.pick}&quot;
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Awarded
              </span>
              <span className="text-xl sm:text-2xl font-black font-display text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                +{pointsAwarded[championPlayerId] || 3} PTS
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Official AI Judge Verdict Banner */}
      {currentResult.aiVerdict && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/40 shadow-xl mb-6 text-left"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[11px] font-black tracking-wider uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              AI Judge Final Ruling
            </span>
          </div>
          <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
            &ldquo;{currentResult.aiVerdict}&rdquo;
          </p>
        </motion.div>
      )}

      {/* Results Header */}
      <div className="text-left mb-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          {isVoteMode ? (
            <>
              <Vote className="w-3.5 h-3.5 text-indigo-400" />
              Crowd Vote Tally &amp; Scores
            </>
          ) : (
            <>
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              Tournament Placements &amp; Bracket Depth
            </>
          )}
        </h4>
      </div>

      {/* Standings List */}
      <div className="flex flex-col gap-3 mb-8">
        {rankingList.map((playerId, index) => {
          const submission = submissionsList.find((s) => s.playerId === playerId);
          const points = pointsAwarded[playerId] || 0;
          const isWinner = index === 0;
          const isMe = playerId === me.id;

          const clashWins = currentResult.bracketPlacement
            ? currentResult.bracketPlacement[playerId] || 0
            : 0;
          const votesCount = currentResult.voteCounts ? currentResult.voteCounts[playerId] || 0 : 0;

          let placementLabel = '';
          if (isVoteMode) {
            placementLabel = `${votesCount} ${votesCount === 1 ? 'vote' : 'votes'} from the group`;
          } else {
            if (index === 0) placementLabel = '👑 Round Champion';
            else if (index === 1) placementLabel = '🥈 Runner-Up Finalist';
            else if (clashWins >= 1)
              placementLabel = `🥉 Semifinalist (${clashWins} duel ${clashWins === 1 ? 'win' : 'wins'})`;
            else placementLabel = 'Eliminated Round 1';
          }

          return (
            <motion.div
              key={playerId}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 sm:p-5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all relative overflow-hidden ${
                isWinner
                  ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-amber-500/60 shadow-lg'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              {/* Placement & Submitter info */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl font-display font-black text-base flex items-center justify-center shrink-0 ${
                    index === 0
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                      : index === 1
                      ? 'bg-slate-300 text-slate-900'
                      : index === 2
                      ? 'bg-amber-700/60 text-amber-100'
                      : 'bg-slate-800 text-slate-400 text-xs'
                  }`}
                >
                  {index === 0 ? <Crown className="w-4 h-4 fill-current" /> : `#${index + 1}`}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{submission?.avatarEmoji || '❓'}</span>
                    <span className="font-bold text-white text-sm truncate">
                      {submission?.playerName || 'Player'}
                    </span>
                    {isMe && (
                      <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                        You
                      </span>
                    )}
                  </div>
                  <div className="font-display font-black text-base sm:text-lg text-white mt-0.5 break-words">
                    &quot;{submission?.pick || 'Pick'}&quot;
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{placementLabel}</div>
                </div>
              </div>

              {/* Stats & Points */}
              <div className="flex flex-col items-end shrink-0 pl-2">
                {isVoteMode ? (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[11px] font-bold text-indigo-300 mb-1">
                    <Vote className="w-3 h-3 text-indigo-400" />
                    <span>
                      {votesCount} {votesCount === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-bold text-amber-400 mb-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>
                      {clashWins} {clashWins === 1 ? 'win' : 'wins'}
                    </span>
                  </div>
                )}

                {points > 0 ? (
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    +{points} pts
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-500">0 pts</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Host advance button */}
      {isHost ? (
        <button
          id="reveal-next-btn"
          onClick={() => {
            playLockIn();
            onNext();
          }}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-bold text-lg shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer"
        >
          <span>View Cumulative Standings</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      ) : (
        <div className="text-xs text-slate-400 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Waiting for host to continue...</span>
        </div>
      )}
    </div>
  );
};
