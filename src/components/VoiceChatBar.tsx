import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneOff,
  MessageSquare,
  Send,
  X,
  Radio,
  Users,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Room, Player, ChatMessage, VoicePeerState } from '../types';
import { WebRTCVoiceEngine } from '../utils/webrtcVoice';
import { Socket } from 'socket.io-client';

interface VoiceChatBarProps {
  socket: Socket;
  room: Room;
  me: Player;
}

const QUICK_REACTIONS = ['🔥', '😂', '👑', '💀', '😱', '👏', '⚡', '🍿'];

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({ socket, room, me }) => {
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(room.messages || []);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestToast, setLatestToast] = useState<ChatMessage | null>(null);

  const voiceEngineRef = useRef<WebRTCVoiceEngine | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Initialize WebRTC Voice Engine
  useEffect(() => {
    const engine = new WebRTCVoiceEngine(socket, room.code, me.id, {
      onSpeakingChange: (speaking) => {
        setIsSpeaking(speaking);
      },
      onPeersChange: (count) => {
        setPeerCount(count);
      },
      onError: (err) => {
        setErrorMessage(err);
        setInCall(false);
        setTimeout(() => setErrorMessage(null), 6000);
      },
    });

    voiceEngineRef.current = engine;

    return () => {
      engine.destroy();
      voiceEngineRef.current = null;
    };
  }, [socket, room.code, me.id]);

  // Listen for real-time text chat messages
  useEffect(() => {
    const handleIncomingMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (!isChatOpen && msg.senderId !== me.id) {
        setUnreadCount((prev) => prev + 1);
        setLatestToast(msg);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setLatestToast(null);
        }, 3500);
      }
    };

    socket.on('chat:message', handleIncomingMessage);
    return () => {
      socket.off('chat:message', handleIncomingMessage);
    };
  }, [socket, isChatOpen, me.id]);

  // Sync initial messages from room object if updated
  useEffect(() => {
    if (room.messages && room.messages.length > 0) {
      setMessages(room.messages);
    }
  }, [room.messages]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  const handleJoinCall = async () => {
    setErrorMessage(null);
    if (!voiceEngineRef.current) return;
    const ok = await voiceEngineRef.current.joinCall();
    if (ok) {
      setInCall(true);
      setIsMuted(false);
      setIsDeafened(false);
    }
  };

  const handleLeaveCall = () => {
    if (!voiceEngineRef.current) return;
    voiceEngineRef.current.leaveCall();
    setInCall(false);
    setIsSpeaking(false);
    setPeerCount(0);
  };

  const handleToggleMute = () => {
    if (!voiceEngineRef.current) return;
    const muted = voiceEngineRef.current.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleDeafen = () => {
    if (!voiceEngineRef.current) return;
    const deafened = voiceEngineRef.current.toggleDeafen();
    setIsDeafened(deafened);
    setIsMuted(voiceEngineRef.current.isMuted);
  };

  const handleSendMessage = (textToSend?: string) => {
    const txt = (textToSend || chatInput).trim();
    if (!txt) return;

    socket.emit('chat:send', {
      code: room.code,
      text: txt,
    });

    if (!textToSend) {
      setChatInput('');
    }
  };

  const openChat = () => {
    setIsChatOpen(true);
    setUnreadCount(0);
    setLatestToast(null);
  };

  // Get active participants in voice call
  const activeVoicePlayers = room.players.filter((p) => {
    const vState = room.voiceStates?.[p.id];
    return p.connected && (vState?.inVoiceCall || (p.id === me.id && inCall));
  });

  return (
    <>
      {/* Floating notification toast if a message arrives while chat is closed */}
      <AnimatePresence>
        {!isChatOpen && latestToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            onClick={openChat}
            className="fixed bottom-20 right-4 z-40 max-w-xs bg-slate-900/95 border border-indigo-500/40 backdrop-blur-md rounded-2xl p-3 shadow-2xl cursor-pointer hover:border-indigo-400 transition-all flex items-start gap-2.5"
          >
            <span className="text-xl shrink-0">{latestToast.senderAvatar}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-indigo-300 truncate">
                {latestToast.senderName}
              </div>
              <div className="text-xs text-white truncate font-medium">
                {latestToast.text}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error alert toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] bg-rose-950/90 border border-rose-500 text-rose-200 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Voice & Chat Dock */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-auto max-w-[95vw] px-2">
        <div className="flex items-center gap-2 p-1.5 sm:p-2 bg-slate-900/90 hover:bg-slate-900/95 transition-all border border-slate-700/80 shadow-2xl rounded-full backdrop-blur-xl">
          
          {/* Voice Call Controls */}
          {!inCall ? (
            <button
              onClick={handleJoinCall}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              title="Join browser-to-browser P2P voice call"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Join Voice</span>
              {activeVoicePlayers.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-[10px] font-bold text-emerald-300">
                  {activeVoicePlayers.length} in call
                </span>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1">
              {/* Voice status pill */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  isSpeaking
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${isSpeaking ? 'text-emerald-400 animate-bounce' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">Voice:</span>
                <span className="text-[11px] text-emerald-400 font-mono">
                  {peerCount + 1} connected
                </span>
              </div>

              {/* Mute Mic Button */}
              <button
                onClick={handleToggleMute}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              {/* Deafen Button */}
              <button
                onClick={handleToggleDeafen}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  isDeafened
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                }`}
                title={isDeafened ? 'Undeafen (Hear Audio)' : 'Deafen (Mute Incoming Audio)'}
              >
                {isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              {/* Leave Call Button */}
              <button
                onClick={handleLeaveCall}
                className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-all shadow cursor-pointer active:scale-95"
                title="Disconnect from Voice Call"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Vertical Divider */}
          <div className="w-[1px] h-5 bg-slate-700" />

          {/* Text Chat Drawer Toggle Button */}
          <button
            onClick={() => {
              if (isChatOpen) {
                setIsChatOpen(false);
              } else {
                openChat();
              }
            }}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            title="Open in-game text chat"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] font-black text-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Slide-over In-Game Chat Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-16 right-3 sm:right-6 z-50 w-[92vw] sm:w-88 h-[420px] max-h-[75vh] bg-slate-900/95 border border-indigo-500/40 shadow-2xl rounded-3xl backdrop-blur-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span className="font-display font-bold text-sm text-white">In-Game Chat</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">
                  Room {room.code}
                </span>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Voice Peers strip inside chat */}
            {inCall && (
              <div className="px-3 py-1.5 bg-emerald-950/40 border-b border-emerald-500/20 flex items-center justify-between text-[11px] text-emerald-300">
                <div className="flex items-center gap-1.5 truncate">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span className="font-semibold">Voice active:</span>
                  <span className="truncate">
                    {activeVoicePlayers.map((p) => p.name).join(', ')}
                  </span>
                </div>
                {isSpeaking && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[9px] font-black uppercase text-emerald-300">
                    Talking
                  </span>
                )}
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-left">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-8">
                  <Sparkles className="w-6 h-6 text-slate-600 mb-1" />
                  <span>No messages yet. Send hype or trash talk!</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === me.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <span className="text-base shrink-0 select-none">{msg.senderAvatar}</span>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-800 border border-slate-700/80 text-slate-100 rounded-tl-none'
                        }`}
                      >
                        {!isMe && (
                          <div className="text-[10px] font-bold text-indigo-300 mb-0.5">
                            {msg.senderName}
                          </div>
                        )}
                        <div className="break-words font-medium">{msg.text}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Reactions Bar */}
            <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendMessage(emoji)}
                  className="p-1 text-sm hover:scale-125 transition-transform active:scale-95 cursor-pointer rounded hover:bg-slate-800"
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-2 border-t border-slate-800 bg-slate-950/90 flex items-center gap-1.5"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                maxLength={200}
                className="flex-1 bg-slate-900 border border-slate-700/80 rounded-full px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
