import React from 'react';
import { Swords, PlusCircle, LogIn, Users, Vote, Trophy, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { playPop } from '../utils/sound';

interface LandingViewProps {
  onHostClick: () => void;
  onJoinClick: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onHostClick, onJoinClick }) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center text-center">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-6"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Multiplayer Friend Comparison Party Game</span>
      </motion.div>

      {/* Main Title */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="text-5xl sm:text-7xl font-display font-black tracking-tight text-white mb-4"
      >
        Pick<span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">Battle</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-base sm:text-xl text-slate-300 max-w-2xl font-medium leading-relaxed mb-8 sm:mb-10"
      >
        Play together on your phones or laptop. Pick your favorite character, vehicle, song, or wildcard — then let the group vote on who took the crown!
      </motion.p>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md mb-14"
      >
        <button
          id="landing-host-btn"
          onClick={() => {
            playPop();
            onHostClick();
          }}
          className="w-full sm:w-1/2 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-black text-lg shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2.5 transition-all active:scale-95"
        >
          <PlusCircle className="w-5 h-5 text-slate-950" />
          <span>Host a Game</span>
        </button>

        <button
          id="landing-join-btn"
          onClick={() => {
            playPop();
            onJoinClick();
          }}
          className="w-full sm:w-1/2 py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700/90 text-white font-display font-bold text-lg border border-slate-700 shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-95"
        >
          <LogIn className="w-5 h-5 text-amber-400" />
          <span>Join a Game</span>
        </button>
      </motion.div>

      {/* How it works cards */}
      <div className="w-full text-left">
        <h2 className="text-center text-xs uppercase font-bold text-slate-400 tracking-widest mb-6">
          How to Play in 4 Simple Steps
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl flex flex-col gap-2 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-1">
              <Users className="w-5 h-5" />
            </div>
            <div className="font-display font-bold text-white text-base">1. Lobby Up</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Share the 6-letter room code or QR code with friends on Discord, Zoom, or around the living room.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl flex flex-col gap-2 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-1">
              <Swords className="w-5 h-5" />
            </div>
            <div className="font-display font-bold text-white text-base">2. Secret Picks</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Category is revealed (Anime, Villains, Cars, Foods...). Everyone secretly locks in their best candidate!
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl flex flex-col gap-2 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-1">
              <Vote className="w-5 h-5" />
            </div>
            <div className="font-display font-bold text-white text-base">3. Anonymous Vote</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              All submissions are shuffled into anonymous cards. Vote for whichever pick is truly the best (no self-voting!).
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl flex flex-col gap-2 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mb-1">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="font-display font-bold text-white text-base">4. Reveal & Points</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unmask submitters, tally votes, celebrate the winner, and climb the final podium after all rounds!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
