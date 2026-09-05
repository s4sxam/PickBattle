import React, { useState } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AvatarPicker } from './AvatarPicker';
import { playPop, playLockIn } from '../utils/sound';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, avatar: string) => void;
  isLoading: boolean;
  error?: string | null;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  error,
}) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👑');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    playLockIn();
    onSubmit(name.trim(), avatar);
  };

  return (
    <AnimatePresence>
      <div
        id="create-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          id="create-modal-content"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-left"
        >
          <button
            id="create-modal-close-btn"
            onClick={() => {
              playPop();
              onClose();
            }}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-2xl font-display font-black text-white">
              Host a Game
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-6">
            You will get a unique 6-character room code to invite your friends.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2">
                Your Host Nickname
              </label>
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 bg-slate-800 rounded-2xl border border-slate-700/80 aspect-square flex items-center justify-center">
                  {avatar}
                </span>
                <input
                  id="host-name-input"
                  type="text"
                  maxLength={18}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex the Great"
                  autoFocus
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
              id="submit-create-room-btn"
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-display font-bold text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <span>{isLoading ? 'Creating Room...' : 'Create Room & Enter Lobby'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
