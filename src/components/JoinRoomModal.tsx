import React, { useState } from 'react';
import { X, LogIn, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AvatarPicker } from './AvatarPicker';
import { playPop, playLockIn } from '../utils/sound';

interface JoinRoomModalProps {
  isOpen: boolean;
  initialCode?: string;
  onClose: () => void;
  onSubmit: (code: string, name: string, avatar: string) => void;
  isLoading: boolean;
  error?: string | null;
  defaultName?: string;
  defaultAvatar?: string;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  initialCode = '',
  onClose,
  onSubmit,
  isLoading,
  error,
  defaultName = '',
  defaultAvatar = '😎',
}) => {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(defaultName);
  const [avatar, setAvatar] = useState(defaultAvatar);

  React.useEffect(() => {
    if (initialCode) setCode(initialCode);
    if (defaultName) setName(defaultName);
    if (defaultAvatar) setAvatar(defaultAvatar);
  }, [initialCode, defaultName, defaultAvatar, isOpen]);


  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    playLockIn();
    onSubmit(code.trim().toUpperCase(), name.trim(), avatar);
  };

  return (
    <AnimatePresence>
      <div
        id="join-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          id="join-modal-content"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-left"
        >
          <button
            id="join-modal-close-btn"
            onClick={() => {
              playPop();
              onClose();
            }}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <LogIn className="w-5 h-5 text-amber-400" />
            <h3 className="text-2xl font-display font-black text-white">
              Join a Game
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-6">
            Enter the 6-character room code from your host.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2">
                Room Code
              </label>
              <input
                id="join-room-code-input"
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7X9K2W"
                autoFocus={!initialCode}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-4 py-3 text-amber-400 font-mono font-bold tracking-widest text-center text-xl uppercase outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2">
                Your Nickname
              </label>
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 bg-slate-800 rounded-2xl border border-slate-700/80 aspect-square flex items-center justify-center">
                  {avatar}
                </span>
                <input
                  id="join-name-input"
                  type="text"
                  maxLength={18}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sam"
                  autoFocus={Boolean(initialCode)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-4 py-3.5 text-white font-medium placeholder-slate-500 text-sm outline-none transition-colors"
                />
              </div>
            </div>

            <AvatarPicker selectedEmoji={avatar} onSelect={setAvatar} />

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            <button
              id="submit-join-room-btn"
              type="submit"
              disabled={isLoading || !code.trim() || !name.trim()}
              className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-display font-bold text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <span>{isLoading ? 'Joining...' : 'Enter Game Room'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
