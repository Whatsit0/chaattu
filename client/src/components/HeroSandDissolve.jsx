import React, { useEffect, useRef, useState } from 'react';
import chatticoLogo from '../assets/chattico-logo-dark.png';

/**
 * HeroSandDissolve Component
 * Displays the Chaattiko parrot logo (geometric green & dark-navy parrot icon + "Chaattiko" wordmark).
 * Clicking or tapping ANYWHERE on the screen triggers the sand-to-space dissolve animation:
 * rasterizes the entire logo image onto an HTML5 Canvas, generates thousands of fine glowing cosmic
 * sand/stardust particles inheriting the logo's green, navy, and white pixel hues, and animates
 * them blowing rightward and dispersing into space.
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
  const [logoLoaded, setLogoLoaded] = useState(false);
  const logoImgRef = useRef(null);

  // Preload logo image
  useEffect(() => {
    const img = new Image();
    img.src = chatticoLogo;
    img.onload = () => {
      logoImgRef.current = img;
      setLogoLoaded(true);
    };
  }, []);

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

    const startDissolve = (img) => {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const rect = canvas.getBoundingClientRect();
      const width = (canvas.width = rect.width * (window.devicePixelRatio || 1));
      const height = (canvas.height = rect.height * (window.devicePixelRatio || 1));

      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      const cssWidth = rect.width;
      const cssHeight = rect.height;

      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Draw the new Chaattiko Logo Image onto canvas for particle sampling
      const logoW = Math.min(cssWidth * 0.72, 380);
      const logoH = img ? logoW * (img.height / img.width) : 180;
      const logoX = (cssWidth - logoW) / 2;
      const logoY = (cssHeight - logoH) / 2 - 16;

      if (img) {
        ctx.drawImage(img, logoX, logoY, logoW, logoH);
      }

      // Subtitle with Electrolize font underneath the logo
      ctx.font = `500 ${Math.max(logoW * 0.042, 11)}px Electrolize, sans-serif`;
      ctx.fillStyle = 'rgba(52, 211, 153, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '3px';
      ctx.fillText('ANONYMOUS CAMPUS NETWORK', cssWidth / 2, logoY + logoH + 22);

      // Read pixel data to spawn particles directly from the logo image
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
              // Keep source colors from the logo (parrot green, navy beak, white wordmark)
              color: `rgba(${r}, ${g}, ${b},`
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
    };

    if (logoImgRef.current && logoImgRef.current.complete) {
      startDissolve(logoImgRef.current);
    } else {
      const img = new Image();
      img.src = chatticoLogo;
      img.onload = () => startDissolve(img);
      img.onerror = () => startDissolve(null);
    }

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
        className={`w-full h-80 sm:h-96 max-w-3xl mx-auto block pointer-events-none ${dissolving ? 'opacity-100' : 'hidden'}`}
      />

      {/* Static Glassmorphic Hero Display (Shown before dissolve trigger) */}
      {!dissolving && (
        <div className="flex flex-col items-center text-center space-y-5 max-w-xl animate-fade-in pointer-events-auto">
          {/* Subtle badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200 text-[11px] font-electrolize dark:text-neutral-300 text-neutral-600 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Campus Anonymous Network</span>
          </div>

          {/* Centered Chaattiko Logo Image (Replaces old plain text heading) */}
          <div className="relative group">
            <img
              src={chatticoLogo}
              alt="Chaattiko"
              className="w-auto h-32 sm:h-44 max-w-[85vw] object-contain drop-shadow-[0_0_40px_rgba(52,211,153,0.4)] mx-auto transform transition-transform duration-300 group-hover:scale-105"
            />
          </div>

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
