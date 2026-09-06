import React, { useState, useMemo } from 'react';
import { Dices, Sparkles, Wand2, Search, PlusCircle, Users, Flame, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Room, Player } from '../types';
import { CATEGORIES, CategoryInfo } from '../utils/gameData';
import { playPop, playLockIn } from '../utils/sound';

interface CategorySelectPhaseProps {
  room: Room;
  me: Player;
  onSelectCategory: (categoryName: string) => void;
}

const CATEGORY_TAGS = [
  { id: 'all', label: 'All Categories' },
  { id: 'anime', label: 'Anime & Manga' },
  { id: 'games', label: 'Games & Pop' },
  { id: 'cars', label: 'Vehicles' },
  { id: 'foods', label: 'Food & Life' },
];

export const CategorySelectPhase: React.FC<CategorySelectPhaseProps> = ({
  room,
  me,
  onSelectCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTag, setActiveTag] = useState('all');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomOpen, setIsCustomOpen] = useState(false);

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

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCategory.trim()) return;
    handleSelect(customCategory.trim());
  };

  const filteredCategories = useMemo(() => {
    return CATEGORIES.filter((cat) => {
      const matchesSearch =
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (activeTag === 'all') return true;
      if (activeTag === 'anime' && (cat.id === 'anime' || cat.name.toLowerCase().includes('anime'))) return true;
      if (activeTag === 'games' && (cat.id === 'games' || cat.id === 'superheroes' || cat.id === 'villains' || cat.id === 'cartoons')) return true;
      if (activeTag === 'cars' && (cat.id === 'cars' || cat.id === 'scifi')) return true;
      if (activeTag === 'foods' && (cat.id === 'foods' || cat.id === 'musicians' || cat.id === 'athletes' || cat.id === 'wildcard')) return true;
      return true;
    });
  }, [searchTerm, activeTag]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Top Banner with Open-to-All Notice */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 text-center md:text-left">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1.5 border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Round {room.currentRoundNumber} of {room.totalRounds}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-cyan-300 font-semibold lowercase">Open Pick for All Players</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-white">
            Choose This Round&apos;s Category
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Anyone in the room can lock in the category! Pick a theme you know will lead to the wildest debates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="category-custom-toggle-btn"
            type="button"
            onClick={() => {
              playPop();
              setIsCustomOpen((prev) => !prev);
            }}
            className={`py-3 px-4 rounded-2xl font-display font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer border ${
              isCustomOpen
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isCustomOpen ? 'Cancel Custom' : 'Custom Category'}</span>
          </button>

          <button
            id="category-random-btn"
            type="button"
            onClick={handleRandom}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-display font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <Dices className="w-4 h-4" />
            <span>Surprise (Random)</span>
          </button>
        </div>
      </div>

      {/* Players in Room live indicator */}
      <div className="mb-5 p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Users className="w-4 h-4 text-cyan-400" />
          <span>Players in room ({room.players.filter((p) => p.connected).length}):</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {room.players
              .filter((p) => p.connected)
              .map((p) => (
                <span
                  key={p.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] ${
                    p.id === me.id
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <span>{p.avatarEmoji}</span>
                  <span>{p.name}</span>
                  {p.isHost && <span className="text-[9px] text-amber-400 font-black uppercase">Host</span>}
                  {p.id === me.id && <span className="text-[9px] text-slate-400">(You)</span>}
                </span>
              ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
          <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Click any card to lock it in for everyone</span>
        </div>
      </div>

      {/* Custom Category Input Form */}
      <AnimatePresence>
        {isCustomOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCustomSubmit}
            className="mb-5 p-4 rounded-2xl bg-slate-900 border-2 border-amber-500/40 shadow-xl overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Enter Any Custom Topic or Theme</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="custom-category-input"
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. 90s Anime Villains, Fast Food Burgers, Legendary Rock Bands..."
                maxLength={40}
                autoFocus
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-4 py-2.5 text-white font-medium text-sm outline-none"
              />
              <button
                type="submit"
                disabled={!customCategory.trim()}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-display font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
              >
                Set Custom Category
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Search & Tag Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        {/* Quick category filter tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORY_TAGS.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                playPop();
                setActiveTag(tag.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTag === tag.id
                  ? 'bg-slate-100 text-slate-950 shadow-sm'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="category-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredCategories.map((cat: CategoryInfo) => {
          const isAnime = cat.id === 'anime' || cat.name.toLowerCase().includes('anime');
          return (
            <motion.button
              key={cat.id}
              id={`category-card-${cat.id}`}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(cat.name)}
              className="group text-left p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/60 transition-all shadow-md relative overflow-hidden flex flex-col justify-between cursor-pointer"
            >
              {isAnime && (
                <div className="absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-xl bg-rose-500/20 border-b border-l border-rose-500/30 text-rose-300 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" />
                  <span>Equalizer Arena</span>
                </div>
              )}

              <div>
                <div className="flex items-start gap-3 mb-2.5">
                  <span className="text-3xl p-2.5 rounded-xl bg-slate-800 group-hover:scale-110 transition-transform aspect-square flex items-center justify-center shrink-0">
                    {cat.emoji}
                  </span>
                  <div className="min-w-0 pr-4">
                    <div className="font-display font-bold text-white text-base group-hover:text-amber-300 transition-colors">
                      {cat.name}
                    </div>
                    <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed mt-0.5">
                      {cat.description}
                    </div>
                  </div>
                </div>

                {/* Popular sample picks preview */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {cat.botPicks.slice(0, 3).map((p, pIdx) => (
                    <span
                      key={pIdx}
                      className="px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-800/80 text-slate-400 text-[10px]"
                    >
                      {p.split('(')[0].trim()}
                    </span>
                  ))}
                  {cat.botPicks.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-950/40 text-slate-500 text-[10px]">
                      +{cat.botPicks.length - 3}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 group-hover:text-amber-400 font-semibold pt-2 border-t border-slate-800/80">
                <span>Click to start round with this</span>
                <Wand2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-400 mb-3">No categories match &quot;{searchTerm}&quot;.</p>
          <button
            type="button"
            onClick={() => handleSelect(searchTerm.trim())}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Play Custom: &quot;{searchTerm}&quot;
          </button>
        </div>
      )}
    </div>
  );
};
