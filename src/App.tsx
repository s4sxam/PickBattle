import { useState, useEffect, useCallback } from 'react';
import { getSocket } from './utils/socket';
import { Room, Player, GameMode, VotingCardOption, VotingStartedPayload, UserProfile } from './types';
import { useGameAudio } from './hooks/useGameAudio';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { QRCodeModal } from './components/QRCodeModal';
import { LobbyPhase } from './components/LobbyPhase';
import { CategorySelectPhase } from './components/CategorySelectPhase';
import { SubmissionPhase } from './components/SubmissionPhase';
import { BattleArena } from './components/BattleArena';
import { VotingPhase } from './components/VotingPhase';
import { RevealPhase } from './components/RevealPhase';
import { LeaderboardPhase } from './components/LeaderboardPhase';
import { FinalPodiumPhase } from './components/FinalPodiumPhase';
import { VoiceChatBar } from './components/VoiceChatBar';
import { GlobalLeaderboardModal } from './components/GlobalLeaderboardModal';
import { LoginModal } from './components/LoginModal';
import { getSavedUserProfile, recordGameResult } from './utils/userProfile';

const STORAGE_PLAYER_ID_KEY = 'pickbattle_player_id';
const STORAGE_ROOM_CODE_KEY = 'pickbattle_room_code';

export default function App() {
  const [room, setRoom] = useState<Room | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(STORAGE_PLAYER_ID_KEY) : null;
  });

  // User Profile (stored locally in user browser)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(() => {
    return getSavedUserProfile();
  });

  // Crowd Vote mode options sent specifically to this socket
  const [votingOptions, setVotingOptions] = useState<VotingCardOption[]>([]);
  const [mySubmittedPick, setMySubmittedPick] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [joinCodeParam, setJoinCodeParam] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recordedGameKey, setRecordedGameKey] = useState<string | null>(null);

  // Derived current player
  const me: Player | null =
    room && myPlayerId
      ? room.players.find((p) => p.id === myPlayerId) || null
      : null;

  // Global Audio Feedback Hook for party atmosphere
  const {
    playSubmitPick,
    playCastVote,
    playGameStart,
    playRoundTransition,
    playError,
    playPop,
    playLockIn,
  } = useGameAudio({ room, me, autoPlayTransitions: true });

  // Sync profile with server Top 100 leaderboard
  useEffect(() => {
    if (currentUserProfile) {
      const socket = getSocket();
      socket.emit('leaderboard:sync_profile', currentUserProfile);
    }
  }, [currentUserProfile?.id]);

  // Record stats to browser profile on final match screen
  useEffect(() => {
    if (room && room.status === 'final' && me && currentUserProfile) {
      const key = `${room.code}-${room.createdAt}`;
      if (recordedGameKey !== key) {
        setRecordedGameKey(key);
        const sorted = [...room.players].sort((a, b) => b.score - a.score);
        const isWinner = sorted[0]?.id === me.id;
        const scoreEarned = me.score || 0;

        const updated = recordGameResult(
          currentUserProfile.id,
          scoreEarned,
          isWinner,
          0
        );

        if (updated) {
          setCurrentUserProfile(updated);
          const socket = getSocket();
          socket.emit('leaderboard:sync_profile', updated);
        }
      }
    }
  }, [room?.status, room?.code, room?.createdAt, me?.score, currentUserProfile, recordedGameKey]);

  // Check URL query parameters for ?room=CODE
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      setJoinCodeParam(roomFromUrl.toUpperCase().trim());
      setIsJoinOpen(true);
    }
  }, []);

  // Socket event setup
  useEffect(() => {
    const socket = getSocket();

    const handleRoomUpdated = (data: { room: Room }) => {
      setRoom(data.room);
      setIsLoading(false);
      setErrorMsg(null);

      // If room transitioned out of submitting/voting, clean my pick if needed
      if (data.room.status === 'lobby' || data.room.status === 'category-select') {
        setVotingOptions([]);
        setMySubmittedPick(null);
      }
    };

    const handleVotingStarted = (data: VotingStartedPayload) => {
      setVotingOptions(data.options || []);
      if (data.myPick) {
        setMySubmittedPick(data.myPick);
      }
    };

    const handleError = (data: { message: string }) => {
      setErrorMsg(data.message);
      setIsLoading(false);
      playError();
    };

    socket.on('room:updated', handleRoomUpdated);
    socket.on('voting:started', handleVotingStarted);
    socket.on('error:message', handleError);

    // Auto-reconnect if stored room code and player ID exist (only for non-host guests)
    const savedCode = localStorage.getItem(STORAGE_ROOM_CODE_KEY);
    const savedPlayerId = localStorage.getItem(STORAGE_PLAYER_ID_KEY);
    const savedIsHost = localStorage.getItem('pickbattle_is_host') === 'true';

    if (savedCode && savedPlayerId && !room && !savedIsHost) {
      socket.emit(
        'room:join',
        { code: savedCode, name: '', avatarEmoji: '', playerId: savedPlayerId },
        (res: { success: boolean; roomCode?: string; playerId?: string; error?: string }) => {
          if (!res.success) {
            localStorage.removeItem(STORAGE_ROOM_CODE_KEY);
            localStorage.removeItem(STORAGE_PLAYER_ID_KEY);
            localStorage.removeItem('pickbattle_is_host');
          }
        }
      );
    } else if (savedIsHost) {
      localStorage.removeItem(STORAGE_ROOM_CODE_KEY);
      localStorage.removeItem(STORAGE_PLAYER_ID_KEY);
      localStorage.removeItem('pickbattle_is_host');
    }

    return () => {
      socket.off('room:updated', handleRoomUpdated);
      socket.off('voting:started', handleVotingStarted);
      socket.off('error:message', handleError);
    };
  }, [room, playError]);


  // Actions
  const handleCreateRoom = (hostName: string, avatarEmoji: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    playPop();
    const socket = getSocket();

    socket.emit(
      'room:create',
      { hostName, avatarEmoji },
      (res: { success: boolean; roomCode?: string; playerId?: string; error?: string }) => {
        setIsLoading(false);
        if (res.success && res.roomCode && res.playerId) {
          setMyPlayerId(res.playerId);
          localStorage.setItem(STORAGE_PLAYER_ID_KEY, res.playerId);
          localStorage.setItem(STORAGE_ROOM_CODE_KEY, res.roomCode);
          localStorage.setItem('pickbattle_is_host', 'true');
          setIsCreateOpen(false);
          playLockIn();
        } else {
          setErrorMsg(res.error || 'Failed to create room.');
          playError();
        }
      }
    );
  };

  const handleJoinRoom = (code: string, name: string, avatarEmoji: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    playPop();
    const socket = getSocket();

    socket.emit(
      'room:join',
      { code, name, avatarEmoji, playerId: myPlayerId || undefined },
      (res: { success: boolean; roomCode?: string; playerId?: string; error?: string }) => {
        setIsLoading(false);
        if (res.success && res.roomCode && res.playerId) {
          setMyPlayerId(res.playerId);
          localStorage.setItem(STORAGE_PLAYER_ID_KEY, res.playerId);
          localStorage.setItem(STORAGE_ROOM_CODE_KEY, res.roomCode);
          localStorage.removeItem('pickbattle_is_host');
          setIsJoinOpen(false);
          playLockIn();
        } else {
          setErrorMsg(res.error || 'Failed to join room.');
          playError();
        }
      }
    );
  };

  const handleSetGameMode = (mode: GameMode) => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('gamemode:set', { code: room.code, mode });
  };

  const handleStartGame = (totalRounds: number, gameMode: GameMode) => {
    if (!room) return;
    playGameStart();
    const socket = getSocket();
    socket.emit('game:start', { code: room.code, totalRounds, gameMode });
  };

  const handleSelectCategory = (category: string) => {
    if (!room) return;
    playLockIn();
    const socket = getSocket();
    socket.emit('category:select', { code: room.code, category });
  };

  const handleSubmitPick = (pick: string) => {
    if (!room) return;
    playSubmitPick();
    setMySubmittedPick(pick);
    const socket = getSocket();
    socket.emit('pick:submit', { code: room.code, pick });
  };

  // Vote in Crowd Vote Mode
  const handleVoteSubmit = (targetPlayerId: string) => {
    if (!room) return;
    playCastVote();
    const socket = getSocket();
    socket.emit('vote:submit', { code: room.code, targetPlayerId });
  };

  // Vote in Live Power Clash Duel
  const handleDuelVote = (duelId: string, votedForPlayerId: string) => {
    if (!room) return;
    playCastVote();
    const socket = getSocket();
    socket.emit('duel:vote', { code: room.code, duelId, votedForPlayerId });
  };

  const handleNextRound = () => {
    if (!room) return;
    playRoundTransition();
    const socket = getSocket();
    socket.emit('round:next', { code: room.code });
  };

  const handlePlayAgain = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('game:playAgain', { code: room.code });
  };

  const handleAddBot = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('bot:add', { code: room.code });
  };

  const handleRemoveBot = (botId: string) => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('bot:remove', { code: room.code, botId });
  };

  const handleLeaveRoom = useCallback(() => {
    localStorage.removeItem(STORAGE_ROOM_CODE_KEY);
    localStorage.removeItem(STORAGE_PLAYER_ID_KEY);
    localStorage.removeItem('pickbattle_is_host');
    const socket = getSocket();
    socket.disconnect();
    setRoom(null);
    setMyPlayerId(null);
    setVotingOptions([]);
    setMySubmittedPick(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Header
        room={room}
        me={me}
        userProfile={currentUserProfile}
        onOpenQR={() => setIsQROpen(true)}
        onLeaveRoom={handleLeaveRoom}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenProfile={() => setIsLoginOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
        {!room || !me ? (
          <LandingView
            onHostClick={() => {
              setErrorMsg(null);
              setIsCreateOpen(true);
            }}
            onJoinClick={() => {
              setErrorMsg(null);
              setIsJoinOpen(true);
            }}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onOpenProfile={() => setIsLoginOpen(true)}
            currentUserProfile={currentUserProfile}
          />
        ) : room.status === 'lobby' ? (
          <LobbyPhase
            room={room}
            me={me}
            onStartGame={handleStartGame}
            onSetGameMode={handleSetGameMode}
            onAddBot={handleAddBot}
            onRemoveBot={handleRemoveBot}
            onOpenQR={() => setIsQROpen(true)}
          />
        ) : room.status === 'category-select' ? (
          <CategorySelectPhase
            room={room}
            me={me}
            onSelectCategory={handleSelectCategory}
          />
        ) : room.status === 'submitting' ? (
          <SubmissionPhase
            room={room}
            me={me}
            onSubmitPick={handleSubmitPick}
          />
        ) : room.status === 'voting' ? (
          <VotingPhase
            room={room}
            me={me}
            options={votingOptions}
            myPick={mySubmittedPick || room.submissions[me.id] || null}
            hasVoted={Boolean(room.votes && room.votes[me.id])}
            votedTargetId={(room.votes && room.votes[me.id]) || null}
            onVote={handleVoteSubmit}
          />
        ) : room.status === 'battle' ? (
          <BattleArena
            room={room}
            me={me}
            onVote={handleDuelVote}
          />
        ) : room.status === 'reveal' ? (
          <RevealPhase
            room={room}
            me={me}
            onNext={handleNextRound}
          />
        ) : room.status === 'leaderboard' ? (
          <LeaderboardPhase
            room={room}
            me={me}
            onNextRound={handleNextRound}
          />
        ) : room.status === 'final' ? (
          <FinalPodiumPhase
            room={room}
            me={me}
            onPlayAgain={handlePlayAgain}
            onNewGame={handleLeaveRoom}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-500 border-t border-slate-900">
        PickBattle • Multiplayer Party Tournament Game • Power Clash &amp; Crowd Vote Modes
      </footer>

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateRoom}
        isLoading={isLoading}
        error={errorMsg}
        defaultName={currentUserProfile?.username}
        defaultAvatar={currentUserProfile?.avatarEmoji}
      />

      <JoinRoomModal
        isOpen={isJoinOpen}
        initialCode={joinCodeParam}
        onClose={() => setIsJoinOpen(false)}
        onSubmit={handleJoinRoom}
        isLoading={isLoading}
        error={errorMsg}
        defaultName={currentUserProfile?.username}
        defaultAvatar={currentUserProfile?.avatarEmoji}
      />

      {room && (
        <QRCodeModal
          isOpen={isQROpen}
          onClose={() => setIsQROpen(false)}
          roomCode={room.code}
        />
      )}

      {/* Global Top 100 Leaderboard Modal */}
      <GlobalLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        socket={getSocket()}
        currentUserProfile={currentUserProfile}
      />

      {/* In-Game Browser Profile & Local Account Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        currentProfile={currentUserProfile}
        onProfileUpdated={(profile) => {
          setCurrentUserProfile(profile);
          if (profile) {
            getSocket().emit('leaderboard:sync_profile', profile);
          }
        }}
        onOpenLeaderboard={() => {
          setIsLoginOpen(false);
          setIsLeaderboardOpen(true);
        }}
      />

      {/* In-Game WebRTC P2P Voice Call & Text Chat Bar */}
      {room && me && (
        <VoiceChatBar socket={getSocket()} room={room} me={me} />
      )}
    </div>
  );


}
