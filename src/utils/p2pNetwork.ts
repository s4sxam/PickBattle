import { Peer, DataConnection } from 'peerjs';
import { BrowserGameEngine, NetworkConnection } from '../engine/BrowserGameEngine';
import { Room } from '../types';

type EventListener = (...args: any[]) => void;

export class UnifiedGameClient {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private hostEngine: BrowserGameEngine | null = null;
  private peer: Peer | null = null;
  private hostConnection: DataConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private myConnectionId: string;
  private isHosting: boolean = false;
  private currentRoomCode: string | null = null;

  constructor() {
    this.myConnectionId = 'conn_' + Math.random().toString(36).substring(2, 9);
  }

  public on(event: string, listener: EventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  public off(event: string, listener: EventListener) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  private emitLocal(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  }

  // Check if we are the host of the active room
  public isHost(): boolean {
    return this.isHosting;
  }

  public getHostEngine(): BrowserGameEngine | null {
    return this.hostEngine;
  }

  // Handle creating a room inside the user's browser
  public createRoom(
    payload: { hostName: string; avatarEmoji: string },
    callback?: (res: { success: boolean; roomCode?: string; playerId?: string; error?: string }) => void
  ) {
    this.disconnect();
    this.isHosting = true;

    // Generate unambiguous 6-character room code
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.currentRoomCode = code;

    // Create Browser Game Engine in Host's browser
    this.hostEngine = new BrowserGameEngine((room: Room) => {
      this.emitLocal('room:updated', { room });
      this.syncViaBroadcastChannel('room:updated', { room });
    });

    // Register host's local loopback connection
    const localHostConn: NetworkConnection = {
      id: this.myConnectionId,
      isHost: true,
      send: (event: string, data: any) => {
        this.emitLocal(event, data);
      },
    };
    this.hostEngine.registerConnection(localHostConn);

    // Setup Local BroadcastChannel for same-device multi-tabs
    this.setupHostBroadcastChannel(code);

    // Setup PeerJS for cross-device P2P WebRTC
    this.setupHostPeer(code);

    // Run create event in the host engine
    this.hostEngine.handleEvent(
      this.myConnectionId,
      'room:create',
      { ...payload, roomCode: code },
      (res) => {
        if (callback) callback(res);
      }
    );
  }

  // Handle joining a room hosted in another browser (or local host)
  public joinRoom(
    payload: { code: string; name: string; avatarEmoji: string; playerId?: string },
    callback?: (res: { success: boolean; roomCode?: string; playerId?: string; error?: string }) => void
  ) {
    const code = (payload?.code || '').toUpperCase().trim();
    if (!code) {
      if (callback) callback({ success: false, error: 'Please enter a valid room code.' });
      return;
    }

    this.currentRoomCode = code;

    // 1. If we are already the host in this tab
    if (this.isHosting && this.hostEngine) {
      this.hostEngine.handleEvent(this.myConnectionId, 'room:join', payload, callback);
      return;
    }

    // 2. Setup BroadcastChannel to test if host is in another tab on the same device
    this.setupGuestBroadcastChannel(code, payload, callback);

    // 3. Setup PeerJS to connect to remote host browser via WebRTC
    this.setupGuestPeer(code, payload, callback);
  }

  // Generic emit handler from React UI
  public emit(event: string, payload?: any, callback?: (res: any) => void) {
    if (event === 'room:create') {
      this.createRoom(payload, callback);
      return;
    }

    if (event === 'room:join') {
      this.joinRoom(payload, callback);
      return;
    }

    // If we are hosting the game in this browser tab
    if (this.isHosting && this.hostEngine) {
      this.hostEngine.handleEvent(this.myConnectionId, event, payload, callback);
      return;
    }

    // If we are connected to a remote host browser via PeerJS data channel
    if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send({
          type: 'client_event',
          senderId: this.myConnectionId,
          event,
          payload,
        });
      } catch (e) {
        console.warn('Failed to send message over WebRTC:', e);
      }
      return;
    }

    // If connected via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'client_event',
          senderId: this.myConnectionId,
          event,
          payload,
        });
      } catch (e) {
        console.warn('Failed to postMessage on BroadcastChannel:', e);
      }
      return;
    }

    console.warn(`No active connection to send event: ${event}`);
  }

  // --- HOST NETWORKING SETUP ---

  private setupHostBroadcastChannel(code: string) {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (this.broadcastChannel) {
          try {
            this.broadcastChannel.close();
          } catch (_) {}
        }
        this.broadcastChannel = new BroadcastChannel(`pb_room_${code}`);
        this.broadcastChannel.onmessage = (msg) => {
          const data = msg.data;
          if (data && data.type === 'client_event' && this.hostEngine) {
            this.hostEngine.handleEvent(data.senderId, data.event, data.payload, (res) => {
              if (this.broadcastChannel) {
                this.broadcastChannel.postMessage({
                  type: 'server_response',
                  targetId: data.senderId,
                  originalEvent: data.event,
                  response: res,
                });
              }
            });
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment', e);
    }
  }

  private setupHostPeer(code: string) {
    try {
      const peerId = `pb-v2-${code.toLowerCase()}`;
      if (this.peer) {
        try {
          this.peer.destroy();
        } catch (_) {}
      }

      this.peer = new Peer(peerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer.on('open', () => {
        // Host peer listening
      });

      this.peer.on('connection', (conn) => {
        const guestNetworkConn: NetworkConnection = {
          id: conn.peer,
          send: (event: string, data: any) => {
            if (conn.open) {
              try {
                conn.send({ type: 'server_event', event, data });
              } catch (_) {}
            }
          },
        };

        conn.on('open', () => {
          if (this.hostEngine) {
            this.hostEngine.registerConnection(guestNetworkConn);
          }
        });

        conn.on('data', (raw: any) => {
          if (raw && raw.type === 'client_event' && this.hostEngine) {
            this.hostEngine.handleEvent(conn.peer, raw.event, raw.payload, (res) => {
              if (conn.open) {
                try {
                  conn.send({
                    type: 'server_response',
                    originalEvent: raw.event,
                    response: res,
                  });
                } catch (_) {}
              }
            });
          }
        });

        conn.on('close', () => {
          if (this.hostEngine) {
            this.hostEngine.unregisterConnection(conn.peer);
          }
        });

        conn.on('error', () => {
          if (this.hostEngine) {
            this.hostEngine.unregisterConnection(conn.peer);
          }
        });
      });

      this.peer.on('error', () => {
        // Handled silently
      });
    } catch (_) {}
  }

  private syncViaBroadcastChannel(event: string, data: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'server_event',
          event,
          data,
        });
      } catch (_) {}
    }
  }

  // --- GUEST NETWORKING SETUP ---

  private setupGuestBroadcastChannel(
    code: string,
    joinPayload: any,
    callback?: (res: any) => void
  ) {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (this.broadcastChannel) {
          try {
            this.broadcastChannel.close();
          } catch (_) {}
        }
        this.broadcastChannel = new BroadcastChannel(`pb_room_${code}`);

        this.broadcastChannel.onmessage = (msg) => {
          const data = msg.data;
          if (data && data.type === 'server_event') {
            this.emitLocal(data.event, data.data);
          } else if (
            data &&
            data.type === 'server_response' &&
            data.targetId === this.myConnectionId &&
            data.originalEvent === 'room:join'
          ) {
            if (callback) callback(data.response);
          }
        };

        // Attempt instant multi-tab join on same device
        this.broadcastChannel.postMessage({
          type: 'client_event',
          senderId: this.myConnectionId,
          event: 'room:join',
          payload: joinPayload,
        });
      }
    } catch (e) {
      console.warn('BroadcastChannel guest error:', e);
    }
  }

  private setupGuestPeer(
    code: string,
    joinPayload: any,
    callback?: (res: any) => void
  ) {
    try {
      const guestPeerId = 'guest_' + Math.random().toString(36).substring(2, 9);
      if (this.peer) {
        try {
          this.peer.destroy();
        } catch (_) {}
      }

      this.peer = new Peer(guestPeerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      const targetHostPeerId = `pb-v2-${code.toLowerCase()}`;
      let hasResolved = false;

      const finishCallback = (result: { success: boolean; roomCode?: string; playerId?: string; error?: string }) => {
        if (!hasResolved) {
          hasResolved = true;
          if (callback) callback(result);
        }
      };

      const connectToHost = () => {
        if (!this.peer || this.peer.destroyed) return;

        try {
          const conn = this.peer.connect(targetHostPeerId, {
            reliable: true,
          });

          this.hostConnection = conn;

          conn.on('open', () => {
            try {
              conn.send({
                type: 'client_event',
                senderId: guestPeerId,
                event: 'room:join',
                payload: joinPayload,
              });
            } catch (_) {}
          });

          conn.on('data', (raw: any) => {
            if (raw && raw.type === 'server_event') {
              this.emitLocal(raw.event, raw.data);
            } else if (raw && raw.type === 'server_response' && raw.originalEvent === 'room:join') {
              finishCallback(raw.response);
            }
          });

          conn.on('close', () => {
            finishCallback({
              success: false,
              error: 'Connection to the host was lost.',
            });
          });

          conn.on('error', () => {
            finishCallback({
              success: false,
              error: `Could not connect to room "${code}". The host may be offline.`,
            });
          });
        } catch (_) {
          finishCallback({
            success: false,
            error: `Failed to initiate connection to room "${code}".`,
          });
        }
      };

      this.peer.on('open', () => {
        connectToHost();
      });

      this.peer.on('error', () => {
        finishCallback({
          success: false,
          error: `Room "${code}" is offline or does not exist. Please check the code and ensure the host's screen is active.`,
        });
      });

      // 5-second graceful connection timeout
      setTimeout(() => {
        if (!hasResolved) {
          if (!this.hostConnection || !this.hostConnection.open) {
            finishCallback({
              success: false,
              error: `Connection to room "${code}" timed out. Ensure the host's browser tab is open and active.`,
            });
          }
        }
      }, 5000);
    } catch (e) {
      if (callback) {
        callback({
          success: false,
          error: 'WebRTC P2P failed to initialize in this browser.',
        });
      }
    }
  }

  // Cleanup on leaving room
  public disconnect() {
    this.isHosting = false;
    this.currentRoomCode = null;
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch (_) {}
      this.broadcastChannel = null;
    }
    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch (_) {}
      this.hostConnection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {}
      this.peer = null;
    }
    this.hostEngine = null;
  }
}

// Global client singleton
let clientInstance: UnifiedGameClient | null = null;

export function getGameClient(): UnifiedGameClient {
  if (!clientInstance) {
    clientInstance = new UnifiedGameClient();
  }
  return clientInstance;
}
