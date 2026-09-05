// Pure Web Audio API sound synthesis for Jackbox-style tactile feedback
const MUTE_STORAGE_KEY = 'pickbattle_audio_muted';

let audioCtx: AudioContext | null = null;
let isMuted: boolean = (() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  }
  return false;
})();

// Listeners for mute state updates
const muteListeners: Set<(muted: boolean) => void> = new Set();

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function subscribeMuteState(callback: (muted: boolean) => void): () => void {
  muteListeners.add(callback);
  return () => {
    muteListeners.delete(callback);
  };
}

export function toggleMute(): boolean {
  isMuted = !isMuted;
  if (typeof window !== 'undefined') {
    localStorage.setItem(MUTE_STORAGE_KEY, String(isMuted));
  }
  muteListeners.forEach((fn) => fn(isMuted));
  return isMuted;
}

export function setMutedState(muted: boolean) {
  isMuted = muted;
  if (typeof window !== 'undefined') {
    localStorage.setItem(MUTE_STORAGE_KEY, String(isMuted));
  }
  muteListeners.forEach((fn) => fn(isMuted));
}

export function getIsMuted(): boolean {
  return isMuted;
}

/**
 * Crisp UI tap / button pop
 */
export function playPop() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // Ignore audio errors
  }
}

/**
 * Satisfying confirm / lock-in chime
 */
export function playLockIn() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5

    osc2.frequency.setValueAtTime(554.37, now); // C#5
    osc2.frequency.setValueAtTime(880, now + 0.08); // A5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.22);
    osc2.stop(now + 0.22);
  } catch {
    // Ignore
  }
}

/**
 * Pick Submission: Uplifting 3-note ascending chord
 */
export function playSubmission() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.18, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.25);
    });
  } catch {
    // Ignore
  }
}

/**
 * Vote Cast: Punchy decision confirmation with resonant sweep
 */
export function playVoteCast() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(392, now); // G4
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.09); // G5

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch {
    // Ignore
  }
}

/**
 * Round / Phase Transition chime
 */
export function playRoundTransition() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const notes = [330, 440, 550, 660]; // Rich synth sweep
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.16, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.3);
    });
  } catch {
    // Ignore
  }
}

/**
 * Battle / Game Start horn / fanfare chime
 */
export function playBattleStart() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const chords = [
      { f1: 440, f2: 554.37, f3: 659.25, time: 0 },
      { f1: 523.25, f2: 659.25, f3: 783.99, time: 0.18 },
      { f1: 587.33, f2: 739.99, f3: 880.0, time: 0.36 },
    ];

    chords.forEach((chord) => {
      [chord.f1, chord.f2, chord.f3].forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now + chord.time);

        gain.gain.setValueAtTime(0.06, now + chord.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + chord.time + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + chord.time);
        osc.stop(now + chord.time + 0.28);
      });
    });
  } catch {
    // Ignore
  }
}

/**
 * Reveal stinger for unmasking votes and champions
 */
export function playReveal() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Suspense chord followed by bright chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    osc2.frequency.setValueAtTime(659.25, now);
    osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.15);

    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain1);
    osc2.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  } catch {
    // Ignore
  }
}

/**
 * Countdown tick (regular or urgent high beep for final 5 seconds)
 */
export function playTick(urgent: boolean = false) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = urgent ? 'square' : 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(urgent ? 980 : 800, now);

    gain.gain.setValueAtTime(urgent ? 0.12 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch {
    // Ignore
  }
}

/**
 * Score tally / coin blip
 */
export function playScoreTally() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    // Ignore
  }
}

/**
 * Victory fanfare chord progression for podium and standings
 */
export function playFanfare() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [440, 554.37, 659.25, 880];
    const now = ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.2, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.38);
    });
  } catch {
    // Ignore
  }
}

/**
 * Scouter rapid power level counting blip
 */
export function playScouterTick(pitchOffset: number = 0) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    const now = ctx.currentTime;
    const baseFreq = 600 + Math.min(1200, pitchOffset * 15);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq + 300, now + 0.03);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  } catch {
    // Ignore
  }
}

/**
 * Power Clash Impact: Heavy colliding energy punch & bass boom
 */
export function playClash() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    // Sub-bass impact
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

    subGain.gain.setValueAtTime(0.35, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.4);

    // Laser crack / distortion zap
    const zapOsc = ctx.createOscillator();
    const zapGain = ctx.createGain();
    zapOsc.type = 'sawtooth';
    zapOsc.frequency.setValueAtTime(800, now);
    zapOsc.frequency.exponentialRampToValueAtTime(100, now + 0.18);

    zapGain.gain.setValueAtTime(0.2, now);
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    zapOsc.connect(zapGain);
    zapGain.connect(ctx.destination);
    zapOsc.start(now);
    zapOsc.stop(now + 0.2);
  } catch {
    // Ignore
  }
}

/**
 * KO Victory Stinger for duel winner
 */
export function playKO() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const chords = [
      { freq: 587.33, time: 0 }, // D5
      { freq: 880, time: 0.08 }, // A5
      { freq: 1174.66, time: 0.16 }, // D6
    ];

    chords.forEach((c) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(c.freq, now + c.time);

      gain.gain.setValueAtTime(0.22, now + c.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + c.time + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + c.time);
      osc.stop(now + c.time + 0.35);
    });
  } catch {
    // Ignore
  }
}

/**
 * Soft error / alert tone
 */
export function playError() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.setValueAtTime(140, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch {
    // Ignore
  }
}
