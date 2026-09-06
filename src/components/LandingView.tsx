import React from 'react';
import { Swords, PlusCircle, LogIn, Users, Vote, Trophy, Sparkles, User, Award, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { playPop } from '../utils/sound';
import { UserProfile } from '../types';
import { getRankTitle } from '../utils/userProfile';

interface LandingViewProps {
  onHostClick: () => void;
  onJoinClick: () => void;
  onOpenLeaderboard: () => void;
  onOpenProfile: () => void;
  currentUserProfile: UserProfile | null;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onHostClick,
  onJoinClick,
  onOpenLeaderboard,
  onOpenProfile,
  currentUserProfile,
}) => {
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
        className="text-base sm:text-xl text-slate-300 max-w-2xl font-medium leading-relaxed mb-6"
      >
        Play together on your phones or laptop. Pick your favorite character, vehicle, song, or wildcard — then let the group vote on who took the crown!
      </motion.p>

      {/* Logged in profile chip / quick login banner */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-8 w-full max-w-md"
      >
        {currentUserProfile ? (
          <div
            onClick={() => {
              playPop();
              onOpenProfile();
            }}
            className="p-3 bg-slate-900/90 border border-indigo-500/40 hover:border-indigo-500/70 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-lg hover:bg-slate-850"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl p-1 bg-slate-800 rounded-xl border border-slate-700">
                {currentUserProfile.avatarEmoji}
              </span>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">
                    {currentUserProfile.username}
                  </span>
                  <span className="text-[10px] text-indigo-300 font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20">
                    {getRankTitle(currentUserProfile.totalScore)}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  <span className="text-amber-400 font-mono font-bold">
                    {currentUserProfile.totalScore.toLocaleString()} PTS
                  </span>{' '}
                  • {currentUserProfile.matchesWon} Wins
                  {currentUserProfile.winStreak > 0 && (
                    <span className="ml-1 text-amber-400 font-bold">
                      • 🔥 {currentUserProfile.winStreak} Streak
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-xs text-indigo-400 font-bold hover:underline pr-2">
              Profile →
            </span>
          </div>
        ) : (
          <button
            onClick={() => {
              playPop();
              onOpenProfile();
            }}
            className="w-full p-3 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 rounded-2xl flex items-center justify-between text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              <span>Create or Login to Browser Profile to track stats &amp; climb rankings</span>
            </div>
            <span className="font-bold text-indigo-400">Login →</span>
          </button>
        )}
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md mb-4"
      >
        <button
          id="landing-host-btn"
          onClick={() => {
            playPop();
            onHostClick();
          }}
          className="w-full sm:w-1/2 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-black text-lg shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer"
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
          className="w-full sm:w-1/2 py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700/90 text-white font-display font-bold text-lg border border-slate-700 shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer"
        >
          <LogIn className="w-5 h-5 text-amber-400" />
          <span>Join a Game</span>
        </button>
      </motion.div>

      {/* Global Leaderboard Button */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full max-w-md mb-12"
      >
        <button
          onClick={() => {
            playPop();
            onOpenLeaderboard();
          }}
          className="w-full py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-amber-500/30 hover:border-amber-500/60 text-amber-300 font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>View Global Top 100 Leaderboard</span>
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
