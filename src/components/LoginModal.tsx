import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Shield,
  Key,
  LogOut,
  Trophy,
  Flame,
  X,
  Sparkles,
  Check,
  Zap,
  Users,
  Award,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  loginOrRegisterProfile,
  getAllLocalAccounts,
  logoutProfile,
  getRankTitle,
} from '../utils/userProfile';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile | null;
  onProfileUpdated: (profile: UserProfile | null) => void;
  onOpenLeaderboard: () => void;
}

const AVATAR_OPTIONS = [
  '😎', '🔥', '👑', '⚡', '⚔️', '🤖', '🦊', '🦁', '🐉', '🏴‍☠️',
  '🥊', '🌸', '🚀', '👾', '🥷', '🔮', '💀', '🧙‍♂️', '🐱', '🍕'
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onProfileUpdated,
  onOpenLeaderboard,
}) => {
  const [username, setUsername] = useState(currentProfile?.username || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentProfile?.avatarEmoji || '😎');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const localAccounts = getAllLocalAccounts();

  if (!isOpen) return null;

  const handleLoginOrRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const res = loginOrRegisterProfile(username, selectedAvatar, pin);
    if (!res.success || !res.profile) {
      setError(res.error || 'Failed to login');
      return;
    }

    setSuccessMsg(`Welcome, ${res.profile.username}! Profile saved in browser.`);
    onProfileUpdated(res.profile);
    setTimeout(() => {
      onClose();
      setSuccessMsg(null);
    }, 1000);
  };

  const handleSelectExistingAccount = (account: UserProfile) => {
    if (account.pin) {
      // Pre-fill username and prompt for pin
      setUsername(account.username);
      setSelectedAvatar(account.avatarEmoji);
      setIsSwitching(false);
      setError('Enter your PIN to switch to this account');
      return;
    }
    const res = loginOrRegisterProfile(account.username, account.avatarEmoji);
    if (res.success && res.profile) {
      onProfileUpdated(res.profile);
      setIsSwitching(false);
      onClose();
    }
  };

  const handleLogout = () => {
    logoutProfile();
    onProfileUpdated(null);
    setUsername('');
    setPin('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md text-left">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-wide font-display">
                  {currentProfile && !isSwitching ? 'Player Profile' : 'Browser Login / Sign Up'}
                </h2>
                <p className="text-xs text-slate-400">
                  Local browser storage • Points sync to Top 100
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto max-h-[75vh] space-y-4">
            {/* If logged in and viewing profile */}
            {currentProfile && !isSwitching ? (
              <div className="space-y-4">
                {/* Profile Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800 via-indigo-950/40 to-slate-800 border border-indigo-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl p-2 bg-slate-900 rounded-2xl border border-slate-700">
                      {currentProfile.avatarEmoji}
                    </span>
                    <div>
                      <div className="text-base font-black text-white flex items-center gap-2">
                        {currentProfile.username}
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                          Local Account
                        </span>
                      </div>
                      <div className="text-xs text-indigo-300 font-bold mt-0.5">
                        {getRankTitle(currentProfile.totalScore)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-center">
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Total Points
                    </div>
                    <div className="text-xl font-black text-indigo-400 font-mono">
                      {currentProfile.totalScore.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Trophies
                    </div>
                    <div className="text-xl font-black text-amber-400 font-mono flex items-center justify-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {currentProfile.trophies}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Win Rate
                    </div>
                    <div className="text-base font-black text-emerald-400 font-mono">
                      {currentProfile.gamesPlayed > 0
                        ? `${Math.round((currentProfile.matchesWon / currentProfile.gamesPlayed) * 100)}%`
                        : '0%'}
                      <span className="text-xs text-slate-400 ml-1 font-sans">
                        ({currentProfile.matchesWon}W / {currentProfile.gamesPlayed}G)
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Streak (Current / Best)
                    </div>
                    <div className="text-base font-black text-amber-400 font-mono flex items-center justify-center gap-1">
                      <Flame className="w-4 h-4" />
                      {currentProfile.winStreak} / {currentProfile.bestStreak}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenLeaderboard();
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>View Global Top 100 Standings</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsSwitching(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all border border-slate-700 cursor-pointer text-center"
                    >
                      Switch Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs transition-all border border-rose-500/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Create or Switch Form */
              <form onSubmit={handleLoginOrRegister} className="space-y-4">
                {/* Switch Accounts Picker if existing */}
                {localAccounts.length > 0 && isSwitching && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Accounts on this browser
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {localAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          onClick={() => handleSelectExistingAccount(acc)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{acc.avatarEmoji}</span>
                            <div>
                              <div className="text-xs font-bold text-white">{acc.username}</div>
                              <div className="text-[10px] text-slate-400">
                                {acc.totalScore.toLocaleString()} PTS • {acc.matchesWon} Wins
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-indigo-400 font-bold">Select →</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setIsSwitching(false)}
                        className="text-xs text-indigo-400 hover:underline cursor-pointer"
                      >
                        + Create a new profile instead
                      </button>
                    </div>
                  </div>
                )}

                {/* Avatar Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Choose Avatar Emoji
                  </label>
                  <div className="grid grid-cols-10 gap-1.5 p-2 bg-slate-950/60 border border-slate-800 rounded-2xl">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setSelectedAvatar(emoji)}
                        className={`p-1.5 text-lg rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                          selectedAvatar === emoji
                            ? 'bg-indigo-600 scale-110 shadow-md ring-2 ring-indigo-400'
                            : 'hover:bg-slate-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Username input */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Username / Contender Tag
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. ShadowDuelist"
                    maxLength={20}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  />
                </div>

                {/* Optional PIN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span>Security PIN (Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-500">To lock your browser profile</span>
                  </div>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Optional 4-digit PIN"
                    maxLength={10}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  />
                </div>

                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Save Profile & Login</span>
                </button>

                {currentProfile && (
                  <button
                    type="button"
                    onClick={() => setIsSwitching(false)}
                    className="w-full text-center text-xs text-slate-400 hover:text-white py-1 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
