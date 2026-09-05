import React from 'react';
import { Trophy, ArrowRight, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import { Room, Player } from '../types';
import { playLockIn } from '../utils/sound';

interface LeaderboardPhaseProps {
  room: Room;
  me: Player;
  onNextRound: () => void;
}

export const LeaderboardPhase: React.FC<LeaderboardPhaseProps> = ({
  room,
  me,
  onNextRound,
}) => {
  const isHost = me.isHost;
  const isFinalRound = room.currentRoundNumber >= room.totalRounds;

  // Sort players by total score descending
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-300 mb-2">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Round {room.currentRoundNumber} of {room.totalRounds} Complete
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-display font-black text-white">
          Scoreboard
        </h2>
      </motion.div>

      {/* Leaderboard list */}
      <div className="flex flex-col gap-2.5 mb-8">
        {sortedPlayers.map((player, index) => {
          const isMe = player.id === me.id;
          return (
            <motion.div
              key={player.id}
              initial={{ x: -15, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.08 }}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                isMe
                  ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-8 h-8 rounded-xl font-display font-bold text-sm flex items-center justify-center shrink-0 ${
                    index === 0
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : index === 1
                      ? 'bg-slate-300 text-slate-900'
                      : index === 2
                      ? 'bg-amber-800 text-amber-100'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {index === 0 ? <Crown className="w-4 h-4 fill-current" /> : index + 1}
                </span>

                <span className="text-2xl">{player.avatarEmoji}</span>

                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span className="font-bold text-white text-sm truncate">
                    {player.name}
                  </span>
                  {isMe && (
                    <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 shrink-0">
                      You
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-baseline gap-1 shrink-0">
                <span className="text-2xl font-display font-black text-amber-400">
                  {player.score}
                </span>
                <span className="text-xs text-slate-400 font-semibold">pts</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Host Controls */}
      {isHost ? (
        <button
          id="leaderboard-next-round-btn"
          onClick={() => {
            playLockIn();
            onNextRound();
          }}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-bold text-lg shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer"
        >
          <span>{isFinalRound ? 'View Final Results 🏆' : 'Next Round →'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      ) : (
        <div className="text-xs text-slate-400 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>
            {isFinalRound
              ? 'Waiting for host to reveal final podium...'
              : 'Waiting for host to begin next round...'}
          </span>
        </div>
      )}
    </div>
  );
};
