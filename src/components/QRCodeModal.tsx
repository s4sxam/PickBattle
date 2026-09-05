import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, roomCode }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?room=${roomCode}`
    : `https://pickbattle.app?room=${roomCode}`;

  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(joinUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [isOpen, joinUrl]);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="qr-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            id="qr-modal-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center relative"
          >
            <button
              id="qr-modal-close-btn"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-display font-bold text-white mb-1">
              Scan to Join Room
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Friends can point their phone camera right at this screen!
            </p>

            <div className="bg-white p-3 rounded-2xl inline-block shadow-inner mb-4">
              {qrDataUrl ? (
                <img
                  id="qr-code-image"
                  src={qrDataUrl}
                  alt={`QR Code for Room ${roomCode}`}
                  className="w-56 h-56 rounded-xl mx-auto"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-sm">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="bg-slate-800/80 rounded-xl p-3 mb-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                Room Code
              </div>
              <div className="text-3xl font-display font-black tracking-widest text-amber-400">
                {roomCode}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                id="qr-modal-copy-link-btn"
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-transform active:scale-95"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Link!' : 'Copy Invite Link'}</span>
              </button>
              <a
                id="qr-modal-newtab-link"
                href={joinUrl}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Open in new tab to test as second player"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
