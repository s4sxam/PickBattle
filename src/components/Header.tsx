import React, { useState } from 'react';
import { QrCode, Copy, Check, Volume2, VolumeX, LogOut, Swords, Trophy, User } from 'lucide-react';
import { Room, Player, UserProfile } from '../types';
import { toggleMute, getIsMuted, playPop, subscribeMuteState } from '../utils/sound';

interface HeaderProps {
  room: Room | null;
  me: Player | null;
  userProfile?: UserProfile | null;
  onOpenQR: () => void;
  onLeaveRoom: () => void;
  onOpenLeaderboard?: () => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  room,
  me,
  userProfile,
  onOpenQR,
  onLeaveRoom,
  onOpenLeaderboard,
  onOpenProfile,
}) => {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(getIsMuted());

  React.useEffect(() => {
    return subscribeMuteState((newMuted) => {
      setMuted(newMuted);
    });
  }, []);

  const handleCopyCode = () => {
    if (!room) return;
    playPop();
    const joinUrl = `${window.location.origin}?room=${room.code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSoundToggle = () => {
    const isNowMuted = toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) playPop();
  };

  return (
    <header className="w-full bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md px-3 sm:px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-bold">
            <Swords className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
              PickBattle
            </span>
          </div>
        </div>

        {/* Center / Global Leaderboard button */}
        <div className="flex items-center gap-2">
          {onOpenLeaderboard && (
            <button
              onClick={() => {
                playPop();
                onOpenLeaderboard();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all shadow-sm cursor-pointer"
              title="View Global Top 100 Leaderboard"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">Top 100</span>
              <span className="inline xs:hidden">Ranks</span>
            </button>
          )}

          {/* Profile / Login Chip */}
          {onOpenProfile && (
            <button
              onClick={() => {
                playPop();
                onOpenProfile();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
              title={userProfile ? `Profile: ${userProfile.username}` : 'Login / Profile'}
            >
              {userProfile ? (
                <>
                  <span className="text-base">{userProfile.avatarEmoji}</span>
                  <span className="hidden sm:inline font-bold max-w-[90px] truncate text-white">
                    {userProfile.username}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-slate-900/80 px-1.5 py-0.5 rounded-md">
                    {userProfile.totalScore.toLocaleString()} pts
                  </span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Profile / Login</span>
                  <span className="inline sm:hidden">Login</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Room & Game Info */}
        {room && (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Round info */}
            {room.status !== 'lobby' && (
              <div className="hidden sm:flex items-center px-3 py-1 rounded-full bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-300">
                Round <span className="text-amber-400 font-bold ml-1">{room.currentRoundNumber}</span>
                <span className="text-slate-500 mx-0.5">/</span>
                {room.totalRounds}
              </div>
            )}

            {/* Room Code Badge */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
              <button
                id="header-copy-code-btn"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-400 hover:text-amber-300 font-mono tracking-wider hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                title="Click to copy invite link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{room.code}</span>
              </button>

              <button
                id="header-qr-btn"
                onClick={onOpenQR}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                title="Show QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Player Badge & Audio/Leave Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {me && (
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 rounded-xl px-2.5 py-1">
              <span className="text-base sm:text-lg">{me.avatarEmoji}</span>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-slate-200 max-w-[70px] sm:max-w-[120px] truncate leading-tight">
                    {me.name}
                  </span>
                  {me.isSpectator && (
                    <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-bold tracking-tight border border-indigo-500/30">
                      Spectator
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-amber-400 leading-tight">
                  {me.isSpectator ? '👀 Watching Live' : `${me.score} pts`}
                </span>
              </div>
            </div>
          )}

          <button
            id="header-mute-toggle-btn"
            onClick={handleSoundToggle}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title={muted ? 'Unmute audio' : 'Mute audio'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {room && (
            <button
              id="header-leave-btn"
              onClick={onLeaveRoom}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Leave Room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

