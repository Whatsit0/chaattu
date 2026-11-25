import React from 'react';
import { Sparkles, X } from 'lucide-react';

/**
 * Custom Gen-Z & Expressive Glassmorphic Sticker Catalog
 * Styled as collectible badges with bold typography (Offside font)
 */
export const GENZ_STICKERS = [
  // Gesture / Expression Badges
  { id: 'salute', label: 'Salute', emoji: '🫡', sub: 'RESPECT', color: 'from-amber-500/20 to-emerald-500/20 border-emerald-500/30' },
  { id: 'praying', label: 'Praying', emoji: '🙏', sub: 'PLEASE', color: 'from-sky-500/20 to-indigo-500/20 border-sky-500/30' },
  
  // Gen-Z Slang & Vibe Badges
  { id: 'glowup', label: 'Glow Up', emoji: '✨', sub: 'SHINING', color: 'from-yellow-400/20 to-pink-500/20 border-pink-500/30' },
  { id: 'sixtyseven', label: '67', emoji: '⚡', sub: 'ENERGY', color: 'from-amber-400/20 to-orange-500/20 border-orange-500/30' },
  { id: 'lol', label: 'LOL', emoji: '💀', sub: 'DEAD', color: 'from-neutral-500/20 to-neutral-400/20 border-neutral-400/30' },
  { id: 'broke', label: 'Broke', emoji: '💸', sub: 'ZERO BALANCE', color: 'from-red-500/20 to-rose-600/20 border-rose-500/30' },
  { id: 'spilltea', label: 'Spill Tea', emoji: '☕', sub: 'HOT GOSSIP', color: 'from-amber-600/20 to-yellow-600/20 border-amber-500/30' },
  { id: 'iykyk', label: 'IYKYK', emoji: '🤫', sub: 'EXCLUSIVE', color: 'from-purple-500/20 to-indigo-600/20 border-indigo-500/30' },
  { id: 'sus', label: 'Sus', emoji: '🕵️', sub: 'IMPOSTOR', color: 'from-red-500/20 to-orange-500/20 border-red-500/30' },
  { id: 'goat', label: 'GOAT', emoji: '🐐', sub: 'GREATEST', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30' },
  { id: 'redflag', label: 'Red Flag', emoji: '🚩', sub: 'AVOID', color: 'from-rose-600/25 to-red-600/25 border-rose-500/40 text-rose-500' },
  { id: 'greenflag', label: 'Green Flag', emoji: '🟢', sub: 'KEEPER', color: 'from-emerald-500/25 to-teal-600/25 border-emerald-500/40 text-emerald-500' },
  { id: 'delulu', label: 'Delulu', emoji: '🦄', sub: 'SOLULU', color: 'from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/30' },
  { id: 'situationship', label: 'Situationship', emoji: '💔', sub: 'COMPLICATED', color: 'from-rose-500/20 to-purple-600/20 border-purple-500/30' },
  { id: 'ick', label: 'Ick', emoji: '🤢', sub: 'CRINGE', color: 'from-lime-500/20 to-emerald-600/20 border-lime-500/30' },
];

export default function MemeStickerPicker({ isOpen, onClose, onSelectSticker }) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-16 right-4 sm:right-6 z-40 w-80 rounded-3xl glass-panel p-3.5 border dark:border-white/10 border-neutral-200 shadow-2xl dark:bg-black/95 bg-white/95 backdrop-blur-2xl animate-fade-in select-none">
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b dark:border-white/10 border-neutral-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-offside font-bold dark:text-neutral-100 text-neutral-900 tracking-wide">
              Gen-Z Sticker Pack
            </h3>
            <p className="text-[9px] font-electrolize text-emerald-500 tracking-wider">
              COLLECTIBLE BADGES
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg dark:text-neutral-400 text-neutral-500 hover:dark:text-white hover:text-black hover:bg-neutral-100 dark:hover:bg-white/5 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1 pr-1.5 custom-scrollbar">
        {GENZ_STICKERS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              onSelectSticker(`[genz:${s.id}:${s.emoji}:${s.label}:${s.sub}]`);
              onClose();
            }}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl bg-gradient-to-b ${s.color} border hover:scale-105 active:scale-95 transition-all duration-150 group shadow-sm`}
          >
            <span className="text-2xl mb-1 group-hover:scale-115 transition-transform drop-shadow-sm">
              {s.emoji}
            </span>
            <span className="text-[11px] font-offside font-bold dark:text-neutral-100 text-neutral-900 tracking-wide text-center leading-tight">
              {s.label}
            </span>
            <span className="text-[8px] font-electrolize opacity-70 dark:text-neutral-300 text-neutral-600 tracking-wider uppercase mt-0.5">
              {s.sub}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
