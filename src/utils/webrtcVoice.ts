import { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class WebRTCVoiceEngine {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private speakingInterval: any = null;
  
  public isMuted: boolean = false;
  public isDeafened: boolean = false;
  public isSpeaking: boolean = false;
  public inCall: boolean = false;

  private onSpeakingChange?: (isSpeaking: boolean) => void;
  private onPeersChange?: (peersCount: number) => void;
  private onError?: (err: string) => void;

  constructor(
    private socket: Socket,
    private roomCode: string,
    private myPlayerId: string,
    callbacks?: {
      onSpeakingChange?: (isSpeaking: boolean) => void;
      onPeersChange?: (peersCount: number) => void;
      onError?: (err: string) => void;
    }
  ) {
    if (callbacks) {
      this.onSpeakingChange = callbacks.onSpeakingChange;
      this.onPeersChange = callbacks.onPeersChange;
      this.onError = callbacks.onError;
    }
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    // A remote peer joined the voice call
    this.socket.on('voice:peer_joined', async ({ playerId }: { playerId: string }) => {
      if (!this.inCall || playerId === this.myPlayerId) return;
      // We are the initiator for newer peers
      await this.initiatePeerConnection(playerId, true);
    });

    // We received active peers when we joined
    this.socket.on('voice:active_peers', async ({ peers }: { peers: Array<{ playerId: string }> }) => {
      if (!this.inCall) return;
      for (const peer of peers) {
        if (peer.playerId !== this.myPlayerId) {
          await this.initiatePeerConnection(peer.playerId, false);
        }
      }
    });

    // A remote peer left
    this.socket.on('voice:peer_left', ({ playerId }: { playerId: string }) => {
      this.closePeerConnection(playerId);
    });

    // WebRTC signaling packet (Offer, Answer, ICE Candidate)
    this.socket.on('voice:signal', async ({ fromPlayerId, signal, type }: { fromPlayerId: string; signal: any; type: string }) => {
      if (!this.inCall || fromPlayerId === this.myPlayerId) return;
      try {
        let pc = this.peerConnections.get(fromPlayerId);
        if (!pc) {
          pc = await this.initiatePeerConnection(fromPlayerId, false);
        }

        if (type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.socket.emit('voice:signal', {
            code: this.roomCode,
            targetPlayerId: fromPlayerId,
            signal: answer,
            type: 'answer',
          });
        } else if (type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (type === 'ice-candidate') {
          if (signal) {
            await pc.addIceCandidate(new RTCIceCandidate(signal));
          }
        }
      } catch (err: any) {
        console.warn('WebRTC signal processing error:', err);
      }
    });
  }

  /**
   * Start local mic and join voice call
   */
  public async joinCall(): Promise<boolean> {
    try {
      if (this.inCall) return true;

      // Request browser microphone
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.inCall = true;
      this.isMuted = false;
      this.isDeafened = false;

      // Start voice activity detection
      this.startVoiceActivityDetection();

      // Emit join event to room
      this.socket.emit('voice:join', { code: this.roomCode });

      return true;
    } catch (err: any) {
      console.error('Failed to get microphone permission:', err);
      this.inCall = false;
      if (this.onError) {
        this.onError(
          err.name === 'NotAllowedError'
            ? 'Microphone permission was denied. Please allow microphone access in your browser settings.'
            : 'Unable to access microphone: ' + (err.message || 'Unknown error')
        );
      }
      return false;
    }
  }

  /**
   * Leave voice call and release all audio tracks
   */
  public leaveCall() {
    if (!this.inCall) return;
    this.inCall = false;

    // Stop speaking detection
    if (this.speakingInterval) {
      clearInterval(this.speakingInterval);
      this.speakingInterval = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }

    // Stop all local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peerConnections.forEach((pc, id) => {
      try {
        pc.close();
      } catch (e) {}
    });
    this.peerConnections.clear();

    // Remove remote audio elements
    this.remoteAudioElements.forEach((el) => {
      try {
        el.srcObject = null;
        el.remove();
      } catch (e) {}
    });
    this.remoteAudioElements.clear();

    // Inform room
    this.socket.emit('voice:leave', { code: this.roomCode });
    if (this.onPeersChange) this.onPeersChange(0);
    if (this.onSpeakingChange) this.onSpeakingChange(false);
  }

  /**
   * Toggle mute status
   */
  public toggleMute(): boolean {
    if (!this.localStream) return this.isMuted;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });

    this.socket.emit('voice:update_state', {
      code: this.roomCode,
      isMuted: this.isMuted,
      isSpeaking: false,
    });

    if (this.isMuted && this.onSpeakingChange) {
      this.onSpeakingChange(false);
    }

    return this.isMuted;
  }

  /**
   * Toggle deafen (mute all incoming audio)
   */
  public toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    this.remoteAudioElements.forEach((el) => {
      el.muted = this.isDeafened;
    });

    // If deafened, also auto-mute microphone for natural headset behavior
    if (this.isDeafened && !this.isMuted) {
      this.toggleMute();
    }

    this.socket.emit('voice:update_state', {
      code: this.roomCode,
      isDeafened: this.isDeafened,
      isMuted: this.isMuted,
    });

    return this.isDeafened;
  }

  /**
   * Initialize a direct RTCPeerConnection to another player
   */
  private async initiatePeerConnection(targetPlayerId: string, isInitiator: boolean): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(targetPlayerId)) {
      return this.peerConnections.get(targetPlayerId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(targetPlayerId, pc);

    // Add local mic audio tracks to the peer connection
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('voice:signal', {
          code: this.roomCode,
          targetPlayerId,
          signal: event.candidate,
          type: 'ice-candidate',
        });
      }
    };

    // Remote audio stream arrival handler
    pc.ontrack = (event) => {
      let audioEl = this.remoteAudioElements.get(targetPlayerId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.muted = this.isDeafened;
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
        this.remoteAudioElements.set(targetPlayerId, audioEl);
      }
      audioEl.srcObject = event.streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.closePeerConnection(targetPlayerId);
      }
    };

    if (this.onPeersChange) {
      this.onPeersChange(this.peerConnections.size);
    }

    // If we are initiator, create SDP Offer
    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.emit('voice:signal', {
          code: this.roomCode,
          targetPlayerId,
          signal: offer,
          type: 'offer',
        });
      } catch (err) {
        console.error('Error creating WebRTC offer:', err);
      }
    }

    return pc;
  }

  private closePeerConnection(playerId: string) {
    const pc = this.peerConnections.get(playerId);
    if (pc) {
      try {
        pc.close();
      } catch (e) {}
      this.peerConnections.delete(playerId);
    }

    const audioEl = this.remoteAudioElements.get(playerId);
    if (audioEl) {
      try {
        audioEl.srcObject = null;
        audioEl.remove();
      } catch (e) {}
      this.remoteAudioElements.delete(playerId);
    }

    if (this.onPeersChange) {
      this.onPeersChange(this.peerConnections.size);
    }
  }

  /**
   * Voice Activity Detection (VAD) using Web Audio Analyser
   */
  private startVoiceActivityDetection() {
    try {
      if (!this.localStream) return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;

      this.microphoneSource = this.audioContext.createMediaStreamSource(this.localStream);
      this.microphoneSource.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingThreshold = 18; // Sensible threshold for voice level
      let lastSpeakingState = false;

      this.speakingInterval = setInterval(() => {
        if (!this.inCall || this.isMuted || !this.analyser) {
          if (lastSpeakingState) {
            lastSpeakingState = false;
            this.isSpeaking = false;
            if (this.onSpeakingChange) this.onSpeakingChange(false);
            this.socket.emit('voice:update_state', { code: this.roomCode, isSpeaking: false });
          }
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const currentlySpeaking = average > speakingThreshold;

        if (currentlySpeaking !== lastSpeakingState) {
          lastSpeakingState = currentlySpeaking;
          this.isSpeaking = currentlySpeaking;
          if (this.onSpeakingChange) this.onSpeakingChange(currentlySpeaking);
          this.socket.emit('voice:update_state', { code: this.roomCode, isSpeaking: currentlySpeaking });
        }
      }, 150);
    } catch (err) {
      console.warn('Voice activity detection setup failed:', err);
    }
  }

  public destroy() {
    this.leaveCall();
  }
}
