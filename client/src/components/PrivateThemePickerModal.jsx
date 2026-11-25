import React, { useEffect, useRef } from 'react';
import { X, Sparkles, Palette, RotateCcw, Check, Sun, Moon } from 'lucide-react';

export const OUTFIT_DEFAULTS = {
  linen: { pattern: 'woven', label: 'Linen & Streetwear', font: 'Instrument Serif', subtitle: 'Oatmeal, cream & crisp seams' },
  knit: { pattern: 'plaid', label: 'Knitwear & Flannel', font: 'Fraunces', subtitle: 'Autumn plaid, terracotta & soft knit' },
  denim: { pattern: 'twill', label: 'Denim & Varsity', font: 'Alfa Slab One', subtitle: 'Indigo wash, gold seam stitching' },
  silk: { pattern: 'polka', label: 'Silk & Resort', font: 'Cormorant Garamond', subtitle: 'Fluid pastels, delicate botanical' },
  avant: { pattern: 'geo', label: 'Avant-Garde Monogram', font: 'Bodoni Moda', subtitle: 'High-contrast ink & bold red' }
};

export const CARD_STYLES = [
  { id: 'glass', label: 'Glass', desc: 'Frosted liquid glass' },
  { id: 'paper', label: 'Paper', desc: 'Tactile paper grain' },
  { id: 'stitched', label: 'Stitched', desc: 'Dashed seam border' },
  { id: 'woven', label: 'Woven', desc: 'Fabric hemmed weave' }
];

export const PATTERNS = [
  { id: 'auto', label: 'Match Outfit' },
  { id: 'woven', label: 'Woven Grid' },
  { id: 'stitch', label: 'Stitch Lines' },
  { id: 'polka', label: 'Polka Dots' },
  { id: 'check', label: 'Gingham' },
  { id: 'plaid', label: 'Flannel Plaid' },
  { id: 'twill', label: 'Denim Twill' },
  { id: 'geo', label: 'Geometric' },
  { id: 'none', label: 'Plain' }
];

export default function PrivateThemePickerModal({
  isOpen,
  onClose,
  activeTarget,
  themeConfig, // { outfit, cardStyle, pattern, mode } or null
  onApplyTheme,
  onResetTheme
}) {
  const panelRef = useRef(null);

  // Close on escape key and outside click
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentOutfit = themeConfig?.outfit || 'linen';
  const currentCard = themeConfig?.cardStyle || 'glass';
  const currentPattern = themeConfig?.pattern || 'auto';
  const currentMode = themeConfig?.mode || 'dark';
  const isCustomActive = Boolean(themeConfig?.outfit);

  const handleSelectOutfit = (outfitId) => {
    onApplyTheme({
      outfit: outfitId,
      cardStyle: currentCard,
      pattern: currentPattern,
      mode: currentMode
    });
  };

  const handleSelectCard = (cardId) => {
    onApplyTheme({
      outfit: currentOutfit,
      cardStyle: cardId,
      pattern: currentPattern,
      mode: currentMode
    });
  };

  const handleSelectPattern = (patId) => {
    onApplyTheme({
      outfit: currentOutfit,
      cardStyle: currentCard,
      pattern: patId,
      mode: currentMode
    });
  };

  const handleToggleMode = () => {
    const nextMode = currentMode === 'dark' ? 'light' : 'dark';
    onApplyTheme({
      outfit: currentOutfit,
      cardStyle: currentCard,
      pattern: currentPattern,
      mode: nextMode
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div
        ref={panelRef}
        style={{
          background: 'rgba(18, 20, 28, 0.95)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 25px 60px rgba(0, 0, 0, 0.85)'
        }}
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 text-white space-y-5 animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-offside tracking-wide flex items-center gap-1.5">
                <span>Private Theme Pack</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                  LIVE SYNC
                </span>
              </h3>
              <p className="text-[10px] text-neutral-400 font-mono">
                {activeTarget ? `Synced live with @${activeTarget}` : 'Private Chat Styling'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Outfits */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300 font-offside">1. Choose Outfit (Theme)</span>
            <span className="text-[10px] text-purple-400 font-mono">5 Outfits</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(OUTFIT_DEFAULTS).map(([key, item]) => {
              const isSelected = isCustomActive && currentOutfit === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectOutfit(key)}
                  className={`p-2.5 rounded-2xl border text-left transition-all duration-200 relative group flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-purple-500/20 border-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/25'
                  }`}
                >
                  {/* Swatch circle */}
                  <div
                    className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center border shadow-sm ${
                      key === 'linen'
                        ? 'bg-[#E7DCC7] border-[#6F5B3E]'
                        : key === 'knit'
                        ? 'bg-[#B14E33] border-[#8E3B26]'
                        : key === 'denim'
                        ? 'bg-[#1F3A6B] border-[#8FB0EC]'
                        : key === 'silk'
                        ? 'bg-[#C7A8EC] border-[#7B5CA3]'
                        : 'bg-[#0E0E0E] border-[#D62027]'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold font-offside text-white truncate">
                      {item.label}
                    </div>
                    <div className="text-[9px] text-neutral-400 truncate font-sans">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Card Style */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300 font-offside">2. Card & Surface Style</span>
            <span className="text-[10px] text-neutral-400 font-mono">Surfaces</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {CARD_STYLES.map((c) => {
              const isSelected = isCustomActive && currentCard === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCard(c.id)}
                  className={`py-2 px-1 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-white/20 border-white text-white font-bold shadow-sm'
                      : 'bg-white/[0.04] border-white/10 text-neutral-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <span className="text-[11px] font-offside">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Background Pattern */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300 font-offside">3. Background Pattern</span>
            <span className="text-[10px] text-neutral-400 font-mono">Chat Backdrop</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {PATTERNS.map((p) => {
              const isSelected = isCustomActive && currentPattern === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPattern(p.id)}
                  className={`py-1.5 px-2 rounded-xl border text-center transition text-[10px] font-mono ${
                    isSelected
                      ? 'bg-purple-500/25 border-purple-400 text-purple-200 font-bold'
                      : 'bg-white/[0.04] border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Mode Switcher & Reset Button */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleToggleMode}
            className="flex items-center gap-2 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs text-neutral-300 font-offside transition"
          >
            {currentMode === 'dark' ? <Moon className="w-3.5 h-3.5 text-purple-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span>Mode: {currentMode === 'dark' ? 'Dark' : 'Light'}</span>
          </button>

          <button
            type="button"
            onClick={onResetTheme}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-offside transition"
            title="Reset to default clean Chaattiko look"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>
        </div>
      </div>
    </div>
  );
}
