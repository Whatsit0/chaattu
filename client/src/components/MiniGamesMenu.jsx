import React, { useEffect, useRef } from 'react';
import { X, Trophy, Sparkles, Gamepad2 } from 'lucide-react';

/**
 * Sleek Gaming Controller-Shaped Game Pad Drawer
 * Ergonomic controller silhouette with left/right grip curves, D-pad & action button accents,
 * and dark frosted glass blur so text and game options remain super readable.
 */
export default function MiniGamesMenu({
  isOpen,
  onClose,
  onSelectGame,
  activeTarget
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const games = [
    {
      id: 'tic_tac_toe',
      icon: '❌⭕',
      title: 'XO (Tic-Tac-Toe)',
      desc: activeTarget ? `Turn-based 3x3 duel with @${activeTarget}` : 'In-chat 3x3 challenge',
      badge: 'Interactive In-Chat'
    },
    {
      id: 'coin_toss',
      icon: '🪙',
      title: 'Coin Toss',
      desc: activeTarget ? `Live synchronous flip with @${activeTarget}` : 'Live flip for the public lounge',
      badge: 'Synchronized 3D'
    },
    {
      id: 'questions_game',
      icon: '🧊',
      title: 'Ice Breaker',
      desc: activeTarget ? `Truth prompt duel with @${activeTarget}` : 'In-chat prompt game with hidden answers',
      badge: '130+ Prompts'
    },
    {
      id: 'bounce_paddle',
      icon: '🎾',
      title: '2D Bounce Paddle',
      desc: '2D arena & bottom paddle. Hits 100-pt milestones!',
      badge: '2D Score Sync'
    }
  ];

  return (
    <div
      ref={menuRef}
      style={{
        background: 'rgba(15, 17, 26, 0.95)',
        backdropFilter: 'blur(30px) saturate(160%)',
        WebkitBackdropFilter: 'blur(30px) saturate(160%)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 25px 70px rgba(0, 0, 0, 0.9)'
      }}
      className="absolute bottom-full right-2 sm:right-6 mb-3 w-[350px] max-w-[94vw] p-5 rounded-[36px] z-50 animate-fade-in text-white shadow-2xl select-none relative overflow-hidden"
    >
      {/* Controller Top Shoulder Bumper Accents (L1 / R1) */}
      <div className="absolute top-0 inset-x-8 flex justify-between pointer-events-none">
        <div className="w-16 h-1.5 rounded-b-md bg-white/20 border-b border-white/30" />
        <div className="w-16 h-1.5 rounded-b-md bg-white/20 border-b border-white/30" />
      </div>

      {/* Controller D-Pad & ABXY Subtle Decorative Watermarks */}
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-pink-500/10 blur-xl pointer-events-none" />

      {/* Header with Gaming Pad Styling */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 relative z-10 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-offside tracking-wide flex items-center gap-1.5">
              <span>Game Pad</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-neutral-300 font-mono">
                WIRELESS
              </span>
            </h3>
            <p className="text-[10px] text-neutral-400 font-mono">
              {activeTarget ? `Paired with @${activeTarget}` : 'Lounge Multiplayer'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition"
          title="Close game pad"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Decorative Controller Grip Curves & Game Selection Options */}
      <div className="space-y-2.5 relative z-10">
        {games.map((game) => (
          <button
            key={game.id}
            type="button"
            onClick={() => {
              onSelectGame(game.id);
              onClose();
            }}
            className="w-full text-left p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-purple-400/40 transition duration-150 flex items-center gap-3 group active:scale-[0.98] cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition shrink-0">
              {game.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-xs font-semibold text-white group-hover:text-purple-300 transition truncate">
                  {game.title}
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                  {game.badge}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 truncate leading-tight font-sans">
                {game.desc}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Controller Bottom Handle Grip Flairs */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400 font-mono relative z-10">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Server Sync
        </span>
        <span className="text-neutral-500 tracking-wider">CH-PAD v2</span>
      </div>
    </div>
  );
}
