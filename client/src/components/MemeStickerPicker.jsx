import React, { useState } from 'react';
import { Sparkles, X, Lock, Check, Copy, Gift, Smile } from 'lucide-react';

/**
 * 12 Expressive Glassmorphic Stickers
 * Includes 9 core expressive expressions + tears of joy, loudly crying, and sweat grin.
 */
export const EXPRESSIVE_STICKERS = [
  { id: 'tearful_smile', label: 'Happy Tears', emoji: '🥲', sub: 'BITTERSWEET', color: 'from-sky-400/20 to-blue-500/20 border-sky-400/35' },
  { id: 'smiling_face', label: 'Good Vibes', emoji: '😊', sub: 'CHEERFUL', color: 'from-amber-400/20 to-yellow-500/20 border-amber-400/35' },
  { id: 'crying_face', label: 'Sadness', emoji: '😢', sub: 'TEARS', color: 'from-blue-400/20 to-sky-500/20 border-blue-400/35' },
  { id: 'loudly_crying', label: 'Sobbing', emoji: '😭', sub: 'DOWN BAD', color: 'from-blue-600/20 to-indigo-600/20 border-blue-500/35' },
  { id: 'tears_of_joy', label: 'Dead', emoji: '😂', sub: 'LMAO', color: 'from-yellow-400/20 to-amber-500/20 border-amber-400/35' },
  { id: 'sweat_smile', label: 'Nervous', emoji: '😅', sub: 'WHEW', color: 'from-emerald-400/20 to-teal-500/20 border-teal-400/35' },
  { id: 'upside_down', label: 'Downside Up', emoji: '🙃', sub: 'CHAOS', color: 'from-purple-500/20 to-pink-500/20 border-purple-500/35' },
  { id: 'heart_eyes', label: 'Love Struck', emoji: '😍', sub: 'OBSESSED', color: 'from-rose-500/20 to-red-600/20 border-rose-500/35' },
  { id: 'sunglasses', label: 'Cool Kid', emoji: '😎', sub: 'NO CAP', color: 'from-cyan-500/20 to-teal-500/20 border-cyan-500/35' },
  { id: 'cute_face', label: 'Pretty Please', emoji: '🥺', sub: 'AWW', color: 'from-pink-400/20 to-purple-400/20 border-pink-400/35' },
  { id: 'angry_face', label: 'Mad', emoji: '😡', sub: 'FUMING', color: 'from-red-600/25 to-orange-600/25 border-red-500/40 text-red-500' },
  { id: 'middle_finger', label: 'Mood', emoji: '🖕', sub: 'SAVAGE', color: 'from-neutral-700/30 to-red-900/30 border-red-700/40' },
];

/**
 * Custom Gen-Z & Slang Badges
 * 9 Specific stickers are locked until reaching referral milestones:
 * - 3 Invites: 6 7, LOL, Broke (Bronze Tier)
 * - 6 Invites: Spill Tea, IYKYK, Sus (Silver Tier)
 * - 9 Invites: GOAT, Red Flag, Green Flag (Gold Tier)
 */
export const GENZ_STICKERS = [
  // Free Starter Badges
  { id: 'salute', label: 'Salute', emoji: '🫡', sub: 'RESPECT', color: 'from-amber-500/20 to-emerald-500/20 border-emerald-500/30', requiredInvites: 0 },
  { id: 'praying', label: 'Praying', emoji: '🙏', sub: 'PLEASE', color: 'from-sky-500/20 to-indigo-500/20 border-sky-500/30', requiredInvites: 0 },
  { id: 'glowup', label: 'Glow Up', emoji: '✨', sub: 'SHINING', color: 'from-yellow-400/20 to-pink-500/20 border-pink-500/30', requiredInvites: 0 },
  { id: 'delulu', label: 'Delulu', emoji: '🦄', sub: 'SOLULU', color: 'from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/30', requiredInvites: 0 },
  { id: 'situationship', label: 'Situationship', emoji: '💔', sub: 'COMPLICATED', color: 'from-rose-500/20 to-purple-600/20 border-purple-500/30', requiredInvites: 0 },
  { id: 'ick', label: 'Ick', emoji: '🤢', sub: 'CRINGE', color: 'from-lime-500/20 to-emerald-600/20 border-lime-500/30', requiredInvites: 0 },

  // Tier 1 (3 Invites Required) - Bronze Milestone
  { id: 'sixtyseven', label: '6 7', emoji: '⚡', sub: 'ENERGY', color: 'from-amber-400/20 to-orange-500/20 border-orange-500/30', requiredInvites: 3, tier: 'Bronze' },
  { id: 'lol', label: 'LOL', emoji: '💀', sub: 'DEAD', color: 'from-neutral-500/20 to-neutral-400/20 border-neutral-400/30', requiredInvites: 3, tier: 'Bronze' },
  { id: 'broke', label: 'Broke', emoji: '💸', sub: 'ZERO BALANCE', color: 'from-red-500/20 to-rose-600/20 border-rose-500/30', requiredInvites: 3, tier: 'Bronze' },

  // Tier 2 (6 Invites Required) - Silver Milestone
  { id: 'spilltea', label: 'Spill Tea', emoji: '☕', sub: 'HOT GOSSIP', color: 'from-amber-600/20 to-yellow-600/20 border-amber-500/30', requiredInvites: 6, tier: 'Silver' },
  { id: 'iykyk', label: 'IYKYK', emoji: '🤫', sub: 'EXCLUSIVE', color: 'from-purple-500/20 to-indigo-600/20 border-indigo-500/30', requiredInvites: 6, tier: 'Silver' },
  { id: 'sus', label: 'Sus', emoji: '🕵️', sub: 'IMPOSTOR', color: 'from-red-500/20 to-orange-500/20 border-red-500/30', requiredInvites: 6, tier: 'Silver' },

  // Tier 3 (9 Invites Required) - Gold Milestone
  { id: 'goat', label: 'GOAT', emoji: '🐐', sub: 'GREATEST', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30', requiredInvites: 9, tier: 'Gold' },
  { id: 'redflag', label: 'Red Flag', emoji: '🚩', sub: 'AVOID', color: 'from-rose-600/25 to-red-600/25 border-rose-500/40 text-rose-500', requiredInvites: 9, tier: 'Gold' },
  { id: 'greenflag', label: 'Green Flag', emoji: '🟢', sub: 'KEEPER', color: 'from-emerald-500/25 to-teal-600/25 border-emerald-500/40 text-emerald-500', requiredInvites: 9, tier: 'Gold' },
];

export default function MemeStickerPicker({ isOpen, onClose, onSelectSticker, currentUser }) {
  const [activeTab, setActiveTab] = useState('expressive'); // 'expressive' | 'genz'
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [lockedNotice, setLockedNotice] = useState(null);

  if (!isOpen) return null;

  const referralCount = Number(currentUser?.referralCount) || 0;
  const inviteLink = typeof window !== 'undefined' && currentUser?.handle
    ? `${window.location.origin}/?ref=${encodeURIComponent(currentUser.handle)}`
    : '';

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    });
  };

  return (
    <div
      style={{
        background: 'rgba(15, 17, 26, 0.96)',
        backdropFilter: 'blur(30px) saturate(160%)',
        WebkitBackdropFilter: 'blur(30px) saturate(160%)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 25px 70px rgba(0, 0, 0, 0.9)'
      }}
      className="absolute bottom-16 right-2 sm:right-6 z-40 w-[350px] max-w-[94vw] rounded-3xl p-4 shadow-2xl animate-fade-in select-none text-white overflow-hidden"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-offside font-bold text-white tracking-wide">
              Sticker Catalog
            </h3>
            <p className="text-[9px] font-mono text-purple-300 tracking-wider">
              {activeTab === 'expressive' ? 'EXPRESSIVE PACK' : `GEN-Z (${referralCount}/9 INVITES)`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition"
          title="Close sticker pack"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Switcher: Expressive vs Gen-Z Slang */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/[0.05] border border-white/10 mb-3 text-xs font-offside font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('expressive')}
          className={`py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'expressive'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Smile className="w-3.5 h-3.5" />
          <span>Expressive ({EXPRESSIVE_STICKERS.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('genz')}
          className={`py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'genz'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gen-Z Badges</span>
        </button>
      </div>

      {/* Locked Notice Alert Popup */}
      {lockedNotice && (
        <div className="mb-3 p-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-[11px] text-amber-200 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-1.5 min-w-0">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{lockedNotice}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-2 py-1 rounded-lg bg-amber-400 text-black font-bold text-[10px] shrink-0 active:scale-95 transition"
          >
            {copiedInvite ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      )}

      {/* Sticker Grid */}
      <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 pr-1.5 custom-scrollbar">
        {activeTab === 'expressive' ? (
          EXPRESSIVE_STICKERS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelectSticker(`[genz:${s.id}:${s.emoji}:${s.label}:${s.sub}]`);
                onClose();
              }}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl bg-gradient-to-b ${s.color} border hover:scale-105 active:scale-95 transition-all duration-150 group shadow-sm cursor-pointer`}
            >
              <span className="text-2xl mb-1 group-hover:scale-120 transition-transform drop-shadow-sm">
                {s.emoji}
              </span>
              <span className="text-[11px] font-offside font-bold text-white tracking-wide text-center leading-tight">
                {s.label}
              </span>
              <span className="text-[8px] font-mono opacity-75 text-neutral-300 tracking-wider uppercase mt-0.5">
                {s.sub}
              </span>
            </button>
          ))
        ) : (
          GENZ_STICKERS.map((s) => {
            const isLocked = s.requiredInvites > referralCount;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (isLocked) {
                    setLockedNotice(`Locked: Invite ${s.requiredInvites} friends for ${s.tier} tier (${referralCount}/${s.requiredInvites})`);
                    setTimeout(() => setLockedNotice(null), 4000);
                    return;
                  }
                  onSelectSticker(`[genz:${s.id}:${s.emoji}:${s.label}:${s.sub}]`);
                  onClose();
                }}
                className={`relative flex flex-col items-center justify-center p-2 rounded-2xl bg-gradient-to-b ${s.color} border transition-all duration-150 group shadow-sm ${
                  isLocked
                    ? 'opacity-65 hover:opacity-90 cursor-not-allowed'
                    : 'hover:scale-105 active:scale-95 cursor-pointer'
                }`}
              >
                {/* Lock Overlay for locked badges */}
                {isLocked && (
                  <div className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 p-1 text-center">
                    <Lock className="w-4 h-4 text-amber-400 mb-0.5 drop-shadow" />
                    <span className="text-[8px] font-mono text-amber-300 font-bold uppercase tracking-wider">
                      {s.tier} ({s.requiredInvites})
                    </span>
                  </div>
                )}

                <span className="text-2xl mb-1 group-hover:scale-120 transition-transform drop-shadow-sm">
                  {s.emoji}
                </span>
                <span className="text-[11px] font-offside font-bold text-white tracking-wide text-center leading-tight">
                  {s.label}
                </span>
                <span className="text-[8px] font-mono opacity-75 text-neutral-300 tracking-wider uppercase mt-0.5">
                  {s.sub}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Referral Link Quick Bar inside Drawer */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-neutral-300 min-w-0">
          <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">
            Invites: <strong className="text-amber-300">{referralCount}/9</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyLink}
          className="px-2.5 py-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white flex items-center gap-1 transition active:scale-95 shrink-0"
        >
          {copiedInvite ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-purple-300" />
              <span>Invite Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
