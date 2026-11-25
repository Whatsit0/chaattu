import React from 'react';
import { X, ShieldCheck, Clock, Shuffle, Heart, Sparkles, MessageSquare, Info } from 'lucide-react';

export default function AboutInfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-[92vw] max-w-lg glass-panel rounded-3xl p-5 sm:p-7 border dark:border-white/10 border-neutral-200 shadow-2xl dark:bg-black/90 bg-white/95 relative max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl dark:text-neutral-400 text-neutral-500 hover:dark:text-white hover:text-black hover:bg-neutral-100 dark:hover:bg-white/5 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl dark:bg-emerald-500/10 bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-mono dark:text-white text-neutral-900">
              About Chaattiko
            </h2>
            <p className="text-[11px] font-mono text-emerald-500">
              Campus Anonymous Community
            </p>
          </div>
        </div>

        {/* Warm Welcome Note for College Students */}
        <div className="p-3.5 rounded-2xl dark:bg-white/[0.03] bg-neutral-100/70 border dark:border-white/10 border-neutral-200 mb-5">
          <p className="text-xs sm:text-sm dark:text-neutral-200 text-neutral-800 leading-relaxed font-sans font-medium">
            "Built specially for our college community! Connect and chat anonymously with anyone on campus without sharing your personal details."
          </p>
        </div>

        {/* How It Works Header */}
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider dark:text-neutral-400 text-neutral-500 mb-3 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          <span>How It Works</span>
        </h3>

        {/* Feature List */}
        <div className="space-y-3.5 text-xs">
          {/* Item 1 */}
          <div className="flex items-start gap-3 p-2.5 rounded-xl dark:hover:bg-white/[0.02] hover:bg-neutral-50 transition">
            <div className="w-7 h-7 rounded-lg dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200 flex items-center justify-center shrink-0 mt-0.5 text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div>
              <h4 className="font-semibold font-mono dark:text-neutral-100 text-neutral-900">
                One-Time Unique ID
              </h4>
              <p className="text-[11px] dark:text-neutral-400 text-neutral-600 mt-0.5 leading-relaxed">
                Your chosen handle stays locked to your device automatically. No passwords, no logins required next time.
              </p>
            </div>
          </div>

          {/* Item 2 */}
          <div className="flex items-start gap-3 p-2.5 rounded-xl dark:hover:bg-white/[0.02] hover:bg-neutral-50 transition">
            <div className="w-7 h-7 rounded-lg dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200 flex items-center justify-center shrink-0 mt-0.5 text-neutral-400">
              <Shuffle className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div>
              <h4 className="font-semibold font-mono dark:text-neutral-100 text-neutral-900">
                Chat Freely & Privately
              </h4>
              <p className="text-[11px] dark:text-neutral-400 text-neutral-600 mt-0.5 leading-relaxed">
                Pick anyone from the member list or hit <strong>Random Stranger</strong> to start a 1-on-1 conversation. Share private details only if you choose to.
              </p>
            </div>
          </div>

          {/* Item 3 */}
          <div className="flex items-start gap-3 p-2.5 rounded-xl dark:hover:bg-white/[0.02] hover:bg-neutral-50 transition">
            <div className="w-7 h-7 rounded-lg dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200 flex items-center justify-center shrink-0 mt-0.5 text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div>
              <h4 className="font-semibold font-mono dark:text-neutral-100 text-neutral-900">
                24-Hour Auto-Vanish
              </h4>
              <p className="text-[11px] dark:text-neutral-400 text-neutral-600 mt-0.5 leading-relaxed">
                All chat history automatically disappears after <strong>24 hours</strong>, keeping conversations fresh, private, and stress-free. No one is watching you, you can msg anything to anyone. It's completely safe.
              </p>
            </div>
          </div>

          {/* Item 4 */}
          <div className="flex items-start gap-3 p-2.5 rounded-xl dark:hover:bg-white/[0.02] hover:bg-neutral-50 transition">
            <div className="w-7 h-7 rounded-lg dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200 flex items-center justify-center shrink-0 mt-0.5 text-neutral-400">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div>
              <h4 className="font-semibold font-mono dark:text-neutral-100 text-neutral-900">
                You're in Control
              </h4>
              <p className="text-[11px] dark:text-neutral-400 text-neutral-600 mt-0.5 leading-relaxed">
                Double-tap messages for pop reactions, send meme stickers, favorite friends, or block anyone bothering you instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Understand / Got it button */}
        <div className="mt-6 pt-4 border-t dark:border-white/10 border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl dark:bg-white dark:text-black bg-neutral-900 text-white text-xs font-mono font-bold hover:opacity-90 active:scale-95 transition"
          >
            Got it, Let's Chat!
          </button>
        </div>
      </div>
    </div>
  );
}
