import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Crown, RotateCcw, Home, Sparkles, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { Room, Player } from '../types';
import { playFanfare, playLockIn, playPop } from '../utils/sound';

interface FinalPodiumPhaseProps {
  room: Room;
  me: Player;
  onPlayAgain: () => void;
  onNewGame: () => void;
  onOpenLeaderboard?: () => void;
}

export const FinalPodiumPhase: React.FC<FinalPodiumPhaseProps> = ({
  room,
  me,
  onPlayAgain,
  onNewGame,
  onOpenLeaderboard,
}) => {
  const isHost = me.isHost;
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);


  const first = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];

  useEffect(() => {
    playFanfare();

    // Continuous celebration confetti bursts
    const end = Date.now() + 3000;
    const colors = ['#f59e0b', '#f97316', '#ec4899', '#6366f1', '#10b981'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Game Complete • Final Standings</span>
        </div>
        <h2 className="text-4xl sm:text-5xl font-display font-black text-white">
          The Grand Podium!
        </h2>
      </motion.div>

      {/* Podium Display (2nd, 1st, 3rd) */}
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-4 max-w-lg mx-auto mb-10 pt-8">
        {/* 2nd Place */}
        {second && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="text-3xl sm:text-4xl mb-1">{second.avatarEmoji}</div>
            <div className="text-xs sm:text-sm font-bold text-white truncate max-w-full px-1">
              {second.name}
            </div>
            <div className="text-xs text-amber-400 font-bold mb-2">
              {second.score} pts
            </div>

            <div className="w-full h-28 sm:h-36 bg-gradient-to-t from-slate-800 to-slate-700 rounded-t-2xl border-t-2 border-slate-400 flex flex-col items-center justify-center shadow-lg">
              <span className="font-display font-black text-2xl sm:text-3xl text-slate-300">
                2nd
              </span>
            </div>
          </motion.div>
        )}

        {/* 1st Place Champion */}
        {first && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-1">
              <Crown className="w-8 h-8 text-amber-400 fill-amber-400 absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce" />
              <div className="text-4xl sm:text-5xl">{first.avatarEmoji}</div>
            </div>
            <div className="text-sm sm:text-base font-black text-white truncate max-w-full px-1">
              {first.name}
            </div>
            <div className="text-sm text-amber-400 font-black mb-2">
              {first.score} pts
            </div>

            <div className="w-full h-36 sm:h-48 bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-2xl border-t-2 border-amber-300 flex flex-col items-center justify-center shadow-2xl shadow-amber-500/30">
              <span className="font-display font-black text-3xl sm:text-4xl text-slate-950">
                1st
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 mt-1">
                Champion
              </span>
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {third && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center"
          >
            <div className="text-3xl sm:text-4xl mb-1">{third.avatarEmoji}</div>
            <div className="text-xs sm:text-sm font-bold text-white truncate max-w-full px-1">
              {third.name}
            </div>
            <div className="text-xs text-amber-400 font-bold mb-2">
              {third.score} pts
            </div>

            <div className="w-full h-20 sm:h-28 bg-gradient-to-t from-amber-950 to-amber-900 rounded-t-2xl border-t-2 border-amber-700 flex flex-col items-center justify-center shadow-lg">
              <span className="font-display font-black text-2xl sm:text-3xl text-amber-300">
                3rd
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Full Rankings list */}
      <div className="w-full max-w-md mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-5 mb-8 text-left">
        <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">
          All Players Final Table
        </h3>
        <div className="space-y-2">
          {sortedPlayers.map((player, idx) => (
            <div
              key={player.id}
              className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold font-mono text-slate-500 w-4">#{idx + 1}</span>
                <span>{player.avatarEmoji}</span>
                <span className="font-bold text-white truncate">{player.name}</span>
                {player.id === me.id && (
                  <span className="text-[10px] uppercase font-black px-1 rounded bg-amber-400/20 text-amber-300">
                    You
                  </span>
                )}
              </div>
              <div className="font-display font-bold text-amber-400">{player.score} pts</div>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col items-center justify-center gap-3 w-full max-w-md mx-auto">
        {onOpenLeaderboard && (
          <button
            onClick={() => {
              playPop();
              onOpenLeaderboard();
            }}
            className="w-full py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-amber-500/40 text-amber-300 font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>View Global Top 100 Leaderboard</span>
          </button>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          {isHost && (
            <button
              id="final-play-again-btn"
              onClick={() => {
                playLockIn();
                onPlayAgain();
              }}
              className="w-full sm:w-1/2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-bold text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
          )}

          <button
            id="final-new-game-btn"
            onClick={() => {
              playPop();
              onNewGame();
            }}
            className="w-full sm:w-1/2 py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-base border border-slate-700 shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Leave to Home</span>
          </button>
        </div>
      </div>

    </div>
  );
};
