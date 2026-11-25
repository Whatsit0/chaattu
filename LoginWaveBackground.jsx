import React, { useEffect, useRef } from 'react';

/**
 * Palette of 8 adjacent hues on the color wheel:
 * Deep Blue -> Indigo -> Violet -> Magenta-Purple -> Rose-Pink -> Coral-Amber -> Emerald-Teal -> Cyan-Blue -> (loop)
 */
const PALETTE = [
  { hex: '#1D4ED8', rgb: [29, 78, 216] },   // Deep Blue
  { hex: '#4F46E5', rgb: [79, 70, 229] },   // Indigo
  { hex: '#7C3AED', rgb: [124, 58, 237] },  // Violet
  { hex: '#C026D3', rgb: [192, 38, 211] },  // Magenta-Purple
  { hex: '#E11D48', rgb: [225, 29, 72] },   // Rose-Pink
  { hex: '#EA580C', rgb: [234, 88, 12] },   // Coral-Amber
  { hex: '#0D9488', rgb: [13, 148, 136] },  // Emerald-Teal
  { hex: '#0284C7', rgb: [2, 132, 199] },   // Cyan-Blue
];

function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function interpolateRgb(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

export default function LoginWaveBackground({ onColorUpdate }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const startTime = performance.now();
    const cycleDuration = 1000; // 1 second per adjacent hue transition
    const totalDuration = cycleDuration * PALETTE.length; // 8 seconds for full circle

    const render = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = (elapsed % totalDuration) / cycleDuration;
      const index = Math.floor(progress) % PALETTE.length;
      const nextIndex = (index + 1) % PALETTE.length;
      const accentIndex = (index + 2) % PALETTE.length;

      const rawT = progress - Math.floor(progress);
      const easedT = smoothstep(0, 1, rawT);

      // Current interpolated color
      const currentRgb = interpolateRgb(PALETTE[index].rgb, PALETTE[nextIndex].rgb, easedT);
      const accentRgb = interpolateRgb(PALETTE[nextIndex].rgb, PALETTE[accentIndex].rgb, easedT);

      const colorStr = `rgb(${currentRgb[0]}, ${currentRgb[1]}, ${currentRgb[2]})`;
      const colorGlow = `rgba(${currentRgb[0]}, ${currentRgb[1]}, ${currentRgb[2]}, 0.45)`;
      const colorSoft = `rgba(${currentRgb[0]}, ${currentRgb[1]}, ${currentRgb[2]}, 0.18)`;
      const accentStr = `rgb(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]})`;

      // Update parent CSS variables in real time for button and input synchronization
      if (containerRef.current && containerRef.current.parentElement) {
        const parent = containerRef.current.parentElement;
        parent.style.setProperty('--wave-hue', colorStr);
        parent.style.setProperty('--wave-glow', colorGlow);
        parent.style.setProperty('--wave-accent', accentStr);
      }

      if (onColorUpdate) {
        onColorUpdate({
          hue: colorStr,
          glow: colorGlow,
          accent: accentStr,
        });
      }

      // --- Canvas Drawing: Pure Black Top to Undulating Luminous Horizon Wave ---
      ctx.clearRect(0, 0, width, height);

      // Base pure black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const tSec = elapsed / 1000;

      // 1. Broad Ambient Horizon Glow (Bottom-Up)
      const ambientGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.98,
        50,
        width * 0.5,
        height * 0.85,
        Math.max(width * 0.65, 450)
      );
      ambientGrad.addColorStop(0, colorGlow);
      ambientGrad.addColorStop(0.5, colorSoft);
      ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, height * 0.35, width, height * 0.65);

      // 2. Layered Organic Horizon Waves with Screen Blend Mode
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Wave parameters: [baseHeightFrac, amp1, freq1, speed1, amp2, freq2, speed2, alpha]
      const waves = [
        {
          base: 0.36,
          amp1: 34,
          freq1: 0.0028,
          spd1: 0.85,
          amp2: 18,
          freq2: 0.0065,
          spd2: -1.2,
          alpha: 0.35,
          color: colorStr
        },
        {
          base: 0.28,
          amp1: 42,
          freq1: 0.0022,
          spd1: -1.05,
          amp2: 24,
          freq2: 0.0055,
          spd2: 1.4,
          alpha: 0.55,
          color: accentStr
        },
        {
          base: 0.22,
          amp1: 38,
          freq1: 0.0035,
          spd1: 1.35,
          amp2: 16,
          freq2: 0.008,
          spd2: -0.9,
          alpha: 0.75,
          color: colorStr
        }
      ];

      waves.forEach((w) => {
        ctx.beginPath();
        ctx.moveTo(0, height);

        const baseY = height * (1 - w.base);

        for (let x = 0; x <= width; x += 6) {
          const yOffset =
            Math.sin(x * w.freq1 + tSec * w.spd1) * w.amp1 +
            Math.cos(x * w.freq2 + tSec * w.spd2) * w.amp2;
          const y = baseY + yOffset;
          if (x === 0) {
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        // Wave vertical gradient
        const waveGrad = ctx.createLinearGradient(0, baseY - w.amp1 * 1.5, 0, height);
        waveGrad.addColorStop(0, `rgba(${currentRgb[0]}, ${currentRgb[1]}, ${currentRgb[2]}, ${w.alpha})`);
        waveGrad.addColorStop(0.5, `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${w.alpha * 0.4})`);
        waveGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');

        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Glowing crest stroke
        ctx.strokeStyle = `rgba(${currentRgb[0]}, ${currentRgb[1]}, ${currentRgb[2]}, ${Math.min(w.alpha + 0.25, 0.95)})`;
        ctx.lineWidth = 2.2;
        ctx.stroke();
      });

      // 3. Horizon Ribbon Intense Light Filament
      ctx.beginPath();
      const filamentBase = height * 0.78;
      for (let x = 0; x <= width; x += 4) {
        const yOffset =
          Math.sin(x * 0.003 + tSec * 1.2) * 26 +
          Math.sin(x * 0.007 - tSec * 0.9) * 12;
        const y = filamentBase + yOffset;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(255, 255, 255, 0.55)`;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = colorStr;
      ctx.shadowBlur = 24;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [onColorUpdate]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
      {/* Subtle top vignette to guarantee deep pure black at the top */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black via-black/90 to-transparent pointer-events-none" />
    </div>
  );
}
