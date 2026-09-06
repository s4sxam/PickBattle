import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Crown,
  Medal,
  Flame,
  Search,
  X,
  RefreshCw,
  Sparkles,
  Zap,
  TrendingUp,
  Shield,
  User,
} from 'lucide-react';
import { LeaderboardEntry, UserProfile } from '../types';
import { Socket } from 'socket.io-client';

interface GlobalLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket?: Socket;
  currentUserProfile: UserProfile | null;
}

export const GlobalLeaderboardModal: React.FC<GlobalLeaderboardModalProps> = ({
  isOpen,
  onClose,
  socket,
  currentUserProfile,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'legends' | 'top10'>('all');
  const [myRank, setMyRank] = useState<number | null>(null);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      if (socket && socket.connected) {
        socket.emit('leaderboard:get');
      } else {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        if (data && Array.isArray(data.top100)) {
          setEntries(data.top100);
        }
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!socket) return;
    const handleData = (payload: { top100: LeaderboardEntry[]; myRank?: number }) => {
      if (payload && Array.isArray(payload.top100)) {
        setEntries(payload.top100);
        if (typeof payload.myRank === 'number') {
          setMyRank(payload.myRank);
        }
      }
      setIsLoading(false);
    };

    socket.on('leaderboard:data', handleData);
    return () => {
      socket.off('leaderboard:data', handleData);
    };
  }, [socket]);

  if (!isOpen) return null;

  // Filter entries
  let filtered = entries.filter((e) =>
    e.username.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  if (selectedFilter === 'top10') {
    filtered = filtered.filter((e) => e.rank <= 10);
  } else if (selectedFilter === 'legends') {
    filtered = filtered.filter((e) => e.totalScore >= 3500);
  }

  // Find user entry if present
  const userRankEntry = currentUserProfile
    ? entries.find((e) => e.id === currentUserProfile.id || e.username.toLowerCase() === currentUserProfile.username.toLowerCase())
    : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white tracking-wide font-display">
                    Global Top 100 Leaderboard
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                    Official Ranks
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Earn points & trophies across battles to climb into the Top 100!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={fetchLeaderboard}
                disabled={isLoading}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all cursor-pointer"
                title="Refresh rankings"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* User's Current Standing Banner */}
          {currentUserProfile && (
            <div className="px-5 py-3 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border-b border-indigo-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl p-1 bg-slate-800 rounded-xl border border-slate-700">
                  {currentUserProfile.avatarEmoji}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      {currentUserProfile.username}
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-300">
                      ({userRankEntry ? `#${userRankEntry.rank} Global` : 'Unranked'})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {currentUserProfile.totalScore.toLocaleString()} Points • {currentUserProfile.trophies} 🏆 Trophies • {currentUserProfile.matchesWon} Wins
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                  {currentUserProfile.winStreak > 0 ? `🔥 ${currentUserProfile.winStreak} Streak` : 'Active Duelist'}
                </span>
              </div>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search players by name..."
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-end">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Top 100
              </button>
              <button
                onClick={() => setSelectedFilter('top10')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilter === 'top10'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Top 10
              </button>
              <button
                onClick={() => setSelectedFilter('legends')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFilter === 'legends'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Grandmasters
              </button>
            </div>
          </div>

          {/* Leaderboard Table List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
            {isLoading && entries.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-400" />
                <span className="text-sm font-medium">Loading Top 100 rankings...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <span className="text-sm font-medium">No players found matching "{searchTerm}"</span>
              </div>
            ) : (
              filtered.map((player) => {
                const isMe =
                  currentUserProfile &&
                  (player.id === currentUserProfile.id ||
                    player.username.toLowerCase() === currentUserProfile.username.toLowerCase());

                let rankBadge = (
                  <span className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 font-mono font-bold text-xs text-slate-400 flex items-center justify-center">
                    #{player.rank}
                  </span>
                );

                let cardBg = 'bg-slate-800/60 border-slate-700/60';
                if (player.rank === 1) {
                  rankBadge = (
                    <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-400 font-bold flex items-center justify-center">
                      <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </div>
                  );
                  cardBg = 'bg-gradient-to-r from-amber-950/40 via-slate-800/80 to-slate-800/80 border-amber-500/40 shadow-lg shadow-amber-950/20';
                } else if (player.rank === 2) {
                  rankBadge = (
                    <div className="w-7 h-7 rounded-xl bg-slate-400/20 border border-slate-400/50 text-slate-200 font-bold flex items-center justify-center">
                      <Medal className="w-4 h-4 text-slate-300" />
                    </div>
                  );
                  cardBg = 'bg-gradient-to-r from-slate-800/90 to-slate-800/60 border-slate-500/40';
                } else if (player.rank === 3) {
                  rankBadge = (
                    <div className="w-7 h-7 rounded-xl bg-amber-700/20 border border-amber-700/50 text-amber-600 font-bold flex items-center justify-center">
                      <Medal className="w-4 h-4 text-amber-600" />
                    </div>
                  );
                  cardBg = 'bg-gradient-to-r from-amber-950/30 to-slate-800/60 border-amber-800/40';
                }

                if (isMe) {
                  cardBg = 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-400';
                }

                return (
                  <div
                    key={player.id || player.rank}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${cardBg}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {rankBadge}
                      <span className="text-2xl p-1 bg-slate-900 rounded-xl border border-slate-800 shrink-0">
                        {player.avatarEmoji}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white truncate">
                            {player.username}
                          </span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500 text-[10px] font-black uppercase text-white">
                              YOU
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 hidden sm:inline">
                            {player.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{player.matchesWon}W / {player.gamesPlayed}G</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">{player.winRate}% WinRate</span>
                          {player.trophies > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-300 font-semibold">🏆 {player.trophies}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <div className="text-base font-black font-mono text-indigo-300">
                        {player.totalScore.toLocaleString()}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        PTS
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Note */}
          <div className="px-5 py-3 bg-slate-950/90 border-t border-slate-800 text-center text-xs text-slate-400 shrink-0">
            <span>Points and stats are automatically saved in your browser & synced to the Global Top 100</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
