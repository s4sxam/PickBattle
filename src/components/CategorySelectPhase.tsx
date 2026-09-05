import React from 'react';
import { Dices, Sparkles, Wand2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Room, Player } from '../types';
import { CATEGORIES, CategoryInfo } from '../utils/gameData';
import { playPop, playLockIn } from '../utils/sound';

interface CategorySelectPhaseProps {
  room: Room;
  me: Player;
  onSelectCategory: (categoryName: string) => void;
}

export const CategorySelectPhase: React.FC<CategorySelectPhaseProps> = ({
  room,
  me,
  onSelectCategory,
}) => {
  const isHost = me.isHost;

  const handleSelect = (categoryName: string) => {
    playLockIn();
    onSelectCategory(categoryName);
  };

  const handleRandom = () => {
    playPop();
    const randomIndex = Math.floor(Math.random() * CATEGORIES.length);
    const chosen = CATEGORIES[randomIndex];
    onSelectCategory(chosen.name);
  };

  if (!isHost) {
    const hostPlayer = room.players.find((p) => p.isHost);
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 flex flex-col items-center text-center">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="text-6xl mb-6 p-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl"
        >
          🎲
        </motion.div>
        <h2 className="text-2xl sm:text-3xl font-display font-black text-white mb-2">
          Round {room.currentRoundNumber} Category
        </h2>
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span>
            {hostPlayer?.name || 'The Host'} is choosing this round&apos;s category...
          </span>
        </div>
        <p className="text-xs text-slate-400 max-w-sm">
          Get ready to submit your pick as soon as it is revealed!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 text-center sm:text-left">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Round {room.currentRoundNumber} of {room.totalRounds}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white">
            Choose a Category
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Pick a category you think will spark the fiercest debate and funniest picks!
          </p>
        </div>

        <button
          id="category-random-btn"
          type="button"
          onClick={handleRandom}
          className="py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-display font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-transform active:scale-95 shrink-0 cursor-pointer"
        >
          <Dices className="w-4 h-4" />
          <span>Surprise Me (Random)</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CATEGORIES.map((cat: CategoryInfo) => (
          <motion.button
            key={cat.id}
            id={`category-card-${cat.id}`}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(cat.name)}
            className="group text-left p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 transition-all shadow-md relative overflow-hidden flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-start gap-3 mb-2">
              <span className="text-3xl p-2 rounded-xl bg-slate-800 group-hover:scale-110 transition-transform aspect-square flex items-center justify-center">
                {cat.emoji}
              </span>
              <div className="min-w-0">
                <div className="font-display font-bold text-white text-base group-hover:text-amber-300 transition-colors">
                  {cat.name}
                </div>
                <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {cat.description}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 group-hover:text-amber-400 font-semibold pt-2 border-t border-slate-800/80">
              <span>Select category</span>
              <Wand2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
