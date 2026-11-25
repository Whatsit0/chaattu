import React, { useState, useEffect } from 'react';
import { X, RotateCw, Sparkles } from 'lucide-react';

export default function CoinDiceOverlay({
  activeGameData, // { game: 'coin_toss' | 'dice_roll', result, initiatedBy, timestamp }
  onClose,
  onReplay
}) {
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    if (!activeGameData) return;
    setAnimating(true);
    const timer = setTimeout(() => {
      setAnimating(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, [activeGameData?.timestamp]);

  if (!activeGameData) return null;

  const isCoin = activeGameData.game === 'coin_toss';
  const result = activeGameData.result;
  const initiator = activeGameData.initiatedBy;

  // Dice dot matrix
  const getDiceDots = (num) => {
    switch (Number(num)) {
      case 1:
        return [[1, 1]];
      case 2:
        return [[0, 0], [2, 2]];
      case 3:
        return [[0, 0], [1, 1], [2, 2]];
      case 4:
        return [[0, 0], [0, 2], [2, 0], [2, 2]];
      case 5:
        return [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]];
      case 6:
        return [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]];
      default:
        return [[1, 1]];
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in select-none">
      <div
        style={{
          background: 'rgba(20, 20, 26, 0.94)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 25px 70px rgba(0, 0, 0, 0.85)'
        }}
        className="w-[90vw] max-w-sm rounded-3xl p-6 relative flex flex-col items-center text-center text-white"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-2xl text-neutral-400 hover:text-white hover:bg-white/10 transition"
          title="Close game overlay"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Initiator tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-mono text-neutral-300 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isCoin ? 'COIN TOSS' : 'DICE ROLL'} // @{initiator}</span>
        </div>

        {/* 3D Animated Area */}
        <div className="h-44 flex items-center justify-center mb-6 perspective-[1000px]">
          {isCoin ? (
            /* 3D Coin */
            <div
              className={`w-32 h-32 rounded-full relative transition-transform duration-700 ${
                animating ? 'animate-[spin_0.35s_linear_infinite]' : ''
              }`}
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706, #B45309)',
                boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), inset 0 -4px 6px rgba(0, 0, 0, 0.4), 0 10px 30px rgba(245, 158, 11, 0.4)',
                border: '4px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div className="w-24 h-24 rounded-full border-2 border-amber-200/50 border-dashed flex flex-col items-center justify-center">
                <span className="text-2xl font-black font-serif tracking-wider text-amber-100 drop-shadow-md">
                  {animating ? '?' : result}
                </span>
                <span className="text-[9px] font-mono text-amber-200/90 tracking-widest uppercase mt-0.5">
                  CHAATTIKO
                </span>
              </div>
            </div>
          ) : (
            /* 3D Dice */
            <div
              className={`w-28 h-28 rounded-3xl relative transition-transform duration-700 ${
                animating ? 'animate-[spin_0.4s_ease-in-out_infinite]' : ''
              }`}
              style={{
                background: 'linear-gradient(135deg, #FFFFFF, #E5E7EB, #D1D5DB)',
                boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.8), 0 12px 35px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: 'repeat(3, 1fr)',
                padding: '16px',
                gap: '8px'
              }}
            >
              {!animating ? (
                Array.from({ length: 9 }).map((_, idx) => {
                  const row = Math.floor(idx / 3);
                  const col = idx % 3;
                  const dots = getDiceDots(result);
                  const hasDot = dots.some(([r, c]) => r === row && c === col);
                  return (
                    <div key={idx} className="flex items-center justify-center">
                      {hasDot && (
                        <div className="w-4 h-4 rounded-full bg-neutral-900 shadow-inner" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 row-span-3 flex items-center justify-center">
                  <span className="text-3xl font-mono text-neutral-800 font-bold">🎲</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Result Announcement */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold font-offside tracking-wide text-white">
            {animating ? (
              <span className="animate-pulse text-emerald-400">
                {isCoin ? 'Flipping coin...' : 'Rolling dice...'}
              </span>
            ) : (
              <span>
                Result: <strong className="text-emerald-400 font-mono">{result}</strong>
              </span>
            )}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {animating
              ? 'Synchronizing live outcome with chat room...'
              : `Both players see the exact same authoritative ${isCoin ? 'flip' : 'roll'}!`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex gap-2">
          {onReplay && (
            <button
              type="button"
              onClick={onReplay}
              disabled={animating}
              style={{
                background: 'linear-gradient(135deg, #10B981, #06B6D4)'
              }}
              className="flex-1 py-3 rounded-2xl font-semibold text-xs text-white flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition disabled:opacity-50"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isCoin ? 'Flip Again' : 'Roll Again'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-semibold text-xs text-neutral-300 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 active:scale-95 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
