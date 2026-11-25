import React, { useEffect, useRef, useState } from 'react';

/**
 * HeroSandDissolve Component
 * Displays sleek centered "Chaattiko" typography using Google Font 'Syncopate'.
 * Clicking or tapping ANYWHERE on the screen triggers the sand-to-space dissolve animation:
 * rasterizes the text onto an HTML5 Canvas, generates thousands of fine glowing cosmic
 * sand/stardust particles, and animates them blowing rightward and dispersing into space.
 * Once complete, calls onComplete() to cleanly reveal the active workspace.
 */
export default function HeroSandDissolve({
  theme = 'dark',
  dissolving = false,
  onComplete,
  onQuickStart
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const [animating, setAnimating] = useState(false);

  // Trigger dissolve when user clicks/taps anywhere on the screen
  const handleScreenTap = () => {
    if (!dissolving && !animating) {
      if (onQuickStart) {
        onQuickStart();
      }
    }
  };

  useEffect(() => {
    if (!dissolving || animating) return;
    setAnimating(true);

    const canvas = canvasRef.current;
    if (!canvas) {
      if (onComplete) onComplete();
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rect = canvas.getBoundingClientRect();
    const width = (canvas.width = rect.width * (window.devicePixelRatio || 1));
    const height = (canvas.height = rect.height * (window.devicePixelRatio || 1));

    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const cssWidth = rect.width;
    const cssHeight = rect.height;

    // Draw Chaattiko text onto canvas for particle sampling with elegant modern display styling
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    const fontSize = Math.min(Math.max(cssWidth * 0.11, 36), 84);
    ctx.font = `700 ${fontSize}px "Syncopate", "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text color matching theme with subtle Urban Satin warmth and glowing letter spacing
    const isDark = theme === 'dark';
    ctx.fillStyle = isDark ? '#ffffff' : '#0a0a0a';
    ctx.letterSpacing = '6px';
    ctx.fillText('CHAATTIKO', cssWidth / 2, cssHeight / 2 - 16);

    // Subtitle with Electrolize font
    ctx.font = `500 ${Math.max(fontSize * 0.20, 11)}px Electrolize, sans-serif`;
    ctx.fillStyle = isDark ? 'rgba(52, 211, 153, 0.85)' : 'rgba(16, 185, 129, 0.9)';
    ctx.letterSpacing = '3px';
    ctx.fillText('ANONYMOUS CAMPUS NETWORK', cssWidth / 2, cssHeight / 2 + fontSize * 0.55);

    // Read pixel data to spawn particles
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const particles = [];
    const step = 3; // sampling step (stride) for high particle density & smooth 60fps

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        if (alpha > 40) {
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];

          const dpr = window.devicePixelRatio || 1;
          const px = x / dpr;
          const py = y / dpr;

          // Dissolution delay based on x coordinate (dissolves left-to-right like Thanos snap)
          const delay = (px / cssWidth) * 350 + Math.random() * 180;

          particles.push({
            x: px,
            y: py,
            originX: px,
            originY: py,
            vx: (Math.random() * 2.8 + 1.2), // drift rightwards
            vy: (Math.random() - 0.6) * 3.2 - 0.4, // float upwards/outward
            size: Math.random() * 2.2 + 0.8,
            alpha: alpha / 255,
            delay: delay,
            life: 0,
            maxLife: Math.random() * 55 + 45,
            color: isDark 
              ? (Math.random() > 0.4 ? `rgba(${r}, ${g}, ${b},` : 'rgba(52, 211, 153,') // mix white with subtle cosmic emerald
              : `rgba(${r}, ${g}, ${b},`
          });
        }
      }
    }

    let startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      let aliveCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (elapsed < p.delay) {
          ctx.fillStyle = `${p.color} ${p.alpha})`;
          ctx.fillRect(p.x, p.y, p.size, p.size);
          aliveCount++;
          continue;
        }

        p.life++;
        if (p.life < p.maxLife) {
          aliveCount++;
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.05; // cosmic anti-gravity lift
          p.vx += 0.04;

          const progress = p.life / p.maxLife;
          const currentAlpha = (1 - progress) * p.alpha;

          ctx.fillStyle = `${p.color} ${Math.max(0, currentAlpha)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (aliveCount > 0 && elapsed < 2200) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        setAnimating(false);
        if (onComplete) onComplete();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [dissolving]);

  return (
    <div
      ref={containerRef}
      onClick={handleScreenTap}
      onTouchStart={handleScreenTap}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 select-none overflow-hidden cursor-pointer"
    >
      {/* Background glow orb */}
      <div className="absolute w-96 h-96 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl pointer-events-none -z-10 animate-pulse" />

      {/* Canvas for particle dissolution */}
      <canvas
        ref={canvasRef}
        className={`w-full h-72 sm:h-80 max-w-3xl mx-auto block pointer-events-none ${dissolving ? 'opacity-100' : 'hidden'}`}
      />

      {/* Static Glassmorphic Hero Display (Shown before dissolve trigger) */}
      {!dissolving && (
        <div className="flex flex-col items-center text-center space-y-5 max-w-xl animate-fade-in pointer-events-auto">
          {/* Subtle badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200 text-[11px] font-electrolize dark:text-neutral-300 text-neutral-600 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Campus Anonymous Network</span>
          </div>

          {/* Centered Sleek Chaattiko Title with Ultra-Clean Modern Display Font & Glow */}
          <h1
            style={{ fontSize: 'clamp(2.5rem, 12vw, 5.5rem)' }}
            className="font-bold tracking-[0.2em] font-syncopate uppercase dark:text-white text-neutral-900 drop-shadow-[0_0_35px_rgba(52,211,153,0.35)] leading-none text-center"
          >
            Chaattiko
          </h1>

          <p className="text-xs sm:text-sm dark:text-neutral-300 text-neutral-600 font-sans max-w-md leading-relaxed">
            Real-time, device-locked anonymous chat. Tap anywhere on the screen or type a message to dissolve into the live public room.
          </p>

          {/* Action indicator */}
          <div className="pt-2">
            <div className="px-6 py-2.5 rounded-xl dark:bg-white dark:text-black bg-neutral-900 text-white text-xs font-offside tracking-wide shadow-sm flex items-center gap-2 hover:opacity-90 active:scale-95 transition">
              <span>Tap Anywhere to Enter</span>
              <span className="text-[11px] opacity-70">✨</span>
            </div>
          </div>

          <div className="text-[10px] font-electrolize dark:text-neutral-500 text-neutral-400 pt-2 tracking-wider uppercase">
            ⚡ Touch or click anywhere to dissolve into the workspace
          </div>
        </div>
      )}
    </div>
  );
}
