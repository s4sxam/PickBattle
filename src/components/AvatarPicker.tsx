import React from 'react';
import { EMOJI_AVATARS } from '../utils/gameData';
import { playPop } from '../utils/sound';

interface AvatarPickerProps {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ selectedEmoji, onSelect }) => {
  return (
    <div>
      <label className="block text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2">
        Choose Your Avatar
      </label>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-2 bg-slate-900/90 border border-slate-800 rounded-2xl">
        {EMOJI_AVATARS.map((emoji) => {
          const isSelected = selectedEmoji === emoji;
          return (
            <button
              key={emoji}
              type="button"
              id={`avatar-btn-${emoji}`}
              onClick={() => {
                playPop();
                onSelect(emoji);
              }}
              className={`text-2xl p-2 rounded-xl transition-all flex items-center justify-center aspect-square ${
                isSelected
                  ? 'bg-amber-500 scale-110 shadow-lg shadow-amber-500/20 ring-2 ring-amber-300'
                  : 'hover:bg-slate-800/80 active:scale-95'
              }`}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
};
