import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, Player, RoomStatus } from '../types';
import {
  playPop,
  playLockIn,
  playSubmission,
  playVoteCast,
  playRoundTransition,
  playBattleStart,
  playReveal,
  playFanfare,
  playScoreTally,
  playTick,
  playError,
  playClash,
  playKO,
  playScouterTick,
  toggleMute,
  getIsMuted,
  subscribeMuteState,
} from '../utils/sound';

export interface UseGameAudioOptions {
  room?: Room | null;
  me?: Player | null;
  autoPlayTransitions?: boolean;
}

export interface UseGameAudioReturn {
  isMuted: boolean;
  toggleMute: () => boolean;
  // Triggerable sound functions
  playSubmitPick: () => void;
  playCastVote: () => void;
  playRoundTransition: () => void;
  playGameStart: () => void;
  playReveal: () => void;
  playFanfare: () => void;
  playScoreTally: () => void;
  playTick: (urgent?: boolean) => void;
  playPop: () => void;
  playLockIn: () => void;
  playError: () => void;
  playClash: () => void;
  playKO: () => void;
  playScouterTick: (pitchOffset?: number) => void;
}

/**
 * Custom hook to manage and trigger audio feedback on key game events:
 * - Submitting a pick
 * - Casting a vote
 * - Round & phase transitions (Lobby -> Category -> Submission -> Battle -> Reveal -> Leaderboard -> Podium)
 * - Countdown ticking (urgent under 5 seconds)
 * - Power Clash energy soundscapes
 */
export function useGameAudio({
  room,
  me,
  autoPlayTransitions = true,
}: UseGameAudioOptions = {}): UseGameAudioReturn {
  const [isMutedState, setIsMutedState] = useState<boolean>(getIsMuted());

  // Refs to track previous states and avoid duplicate triggers
  const prevStatusRef = useRef<RoomStatus | null>(null);
  const prevRoundRef = useRef<number | null>(null);
  const prevMySubmissionRef = useRef<boolean>(false);
  const prevActiveDuelKeyRef = useRef<string | null>(null);
  const prevSubmissionCountRef = useRef<number>(0);
  const isFirstMountRef = useRef<boolean>(true);

  // Subscribe to mute changes across components
  useEffect(() => {
    const unsubscribe = subscribeMuteState((newMuted) => {
      setIsMutedState(newMuted);
    });
    return unsubscribe;
  }, []);

  // Listen to room and player state changes to trigger reactive audio cues
  useEffect(() => {
    if (!autoPlayTransitions || !room) {
      if (room) {
        prevStatusRef.current = room.status;
        prevRoundRef.current = room.currentRoundNumber;
      }
      return;
    }

    // Skip audio trigger on the very initial mount to avoid startling user
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      prevStatusRef.current = room.status;
      prevRoundRef.current = room.currentRoundNumber;
      if (me) {
        prevMySubmissionRef.current = Boolean(room.submissions[me.id]);
      }
      prevSubmissionCountRef.current = Object.keys(room.submissions).length;
      return;
    }

    const prevStatus = prevStatusRef.current;
    const currentStatus = room.status;
    const prevRound = prevRoundRef.current;
    const currentRound = room.currentRoundNumber;

    // 1. Phase & Status Transitions
    if (prevStatus !== currentStatus) {
      switch (currentStatus) {
        case 'category-select':
          playBattleStart();
          break;
        case 'submitting':
          playRoundTransition();
          break;
        case 'battle':
          playBattleStart();
          break;
        case 'reveal':
          playReveal();
          break;
        case 'leaderboard':
          playScoreTally();
          break;
        case 'final':
          playFanfare();
          break;
        default:
          break;
      }
    } else if (prevRound !== null && currentRound > prevRound && currentStatus !== 'lobby') {
      // Round advanced within same status or loop
      playRoundTransition();
    }

    // 2. Personal Submission cue
    if (me) {
      const hasSubmitted = Boolean(room.submissions[me.id]);
      if (!prevMySubmissionRef.current && hasSubmitted) {
        playSubmission();
      }
      prevMySubmissionRef.current = hasSubmitted;
    }

    // 3. Active Duel transition in battle phase
    if (room.status === 'battle' && room.bracket) {
      const currentDuelKey = `${room.bracket.activeRoundIndex}_${room.bracket.activeDuelIndex}`;
      if (prevActiveDuelKeyRef.current !== null && prevActiveDuelKeyRef.current !== currentDuelKey) {
        playRoundTransition();
      }
      prevActiveDuelKeyRef.current = currentDuelKey;
    }

    // 4. Other players' submission activity subtle chime
    const currentSubmissionCount = Object.keys(room.submissions).length;
    if (
      currentStatus === 'submitting' &&
      currentSubmissionCount > prevSubmissionCountRef.current &&
      prevSubmissionCountRef.current > 0
    ) {
      playPop();
    }
    prevSubmissionCountRef.current = currentSubmissionCount;

    // Update state tracking
    prevStatusRef.current = currentStatus;
    prevRoundRef.current = currentRound;
  }, [room, me, autoPlayTransitions]);

  // Direct trigger callbacks
  const handlePlaySubmitPick = useCallback(() => {
    playSubmission();
  }, []);

  const handlePlayCastVote = useCallback(() => {
    playVoteCast();
  }, []);

  const handlePlayRoundTransition = useCallback(() => {
    playRoundTransition();
  }, []);

  const handlePlayGameStart = useCallback(() => {
    playBattleStart();
  }, []);

  const handlePlayReveal = useCallback(() => {
    playReveal();
  }, []);

  const handlePlayFanfare = useCallback(() => {
    playFanfare();
  }, []);

  const handlePlayScoreTally = useCallback(() => {
    playScoreTally();
  }, []);

  const handlePlayTick = useCallback((urgent?: boolean) => {
    playTick(urgent);
  }, []);

  const handlePlayPop = useCallback(() => {
    playPop();
  }, []);

  const handlePlayLockIn = useCallback(() => {
    playLockIn();
  }, []);

  const handlePlayError = useCallback(() => {
    playError();
  }, []);

  const handlePlayClash = useCallback(() => {
    playClash();
  }, []);

  const handlePlayKO = useCallback(() => {
    playKO();
  }, []);

  const handlePlayScouterTick = useCallback((pitchOffset?: number) => {
    playScouterTick(pitchOffset);
  }, []);

  const handleToggleMute = useCallback(() => {
    return toggleMute();
  }, []);

  return {
    isMuted: isMutedState,
    toggleMute: handleToggleMute,
    playSubmitPick: handlePlaySubmitPick,
    playCastVote: handlePlayCastVote,
    playRoundTransition: handlePlayRoundTransition,
    playGameStart: handlePlayGameStart,
    playReveal: handlePlayReveal,
    playFanfare: handlePlayFanfare,
    playScoreTally: handlePlayScoreTally,
    playTick: handlePlayTick,
    playPop: handlePlayPop,
    playLockIn: handlePlayLockIn,
    playError: handlePlayError,
    playClash: handlePlayClash,
    playKO: handlePlayKO,
    playScouterTick: handlePlayScouterTick,
  };
}

