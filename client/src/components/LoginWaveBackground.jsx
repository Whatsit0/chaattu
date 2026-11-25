import React, { useEffect, useRef } from 'react';

/**
 * Realistic Liquid Plasma Wave (One Wave at a Time)
 * Renders a fluid, organic, glowing liquid plasma wave on HTML5 Canvas.
 * One wave packet flows smoothly from the upper-middle horizon down to the bottom
 * of the screen at a time, undulating with iridescent liquid light and caustic refraction,
 * then smoothly cycles to the next descending wave.
 * Cleanly cancels all animation loops and frees resources on unmount.
 */
export default function LoginWaveBackground({ onColorUpdate }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

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

    if (onColorUpdate) {
      onColorUpdate({
        hue: '#10B981', // Chaattiko Emerald Green
        glow: 'rgba(16, 185, 129, 0.45)',
        accent: '#06B6D4', // Iridescent Teal
      });
    }

    // Single descending wave cycle parameters
    const CYCLE_DURATION = 7.0; // Seconds for one wave to travel from start to bottom

    const render = (currentTime) => {
      animRef.current = requestAnimationFrame(render);
      const elapsed = (currentTime - startTime) / 1000;

      ctx.clearRect(0, 0, width, height);

      // Deep cosmic black-navy background
      ctx.fillStyle = '#05070A';
      ctx.fillRect(0, 0, width, height);

      // Current normalized cycle progress [0, 1] for the SINGLE active wave
      const cycleProgress = (elapsed % CYCLE_DURATION) / CYCLE_DURATION;

      // Vertical travel: Start around 28% of height, descend to 105% of height
      const startY = height * 0.28;
      const endY = height * 1.08;
      const currentBaseY = startY + (endY - startY) * cycleProgress;

      // Fade-in at top (0 -> 0.15), full opacity mid-journey (0.15 -> 0.82), fade-out at bottom (0.82 -> 1.0)
      let waveAlpha = 1.0;
      if (cycleProgress < 0.15) {
        waveAlpha = cycleProgress / 0.15;
      } else if (cycleProgress > 0.82) {
        waveAlpha = (1.0 - cycleProgress) / 0.18;
      }
      waveAlpha = Math.max(0, Math.min(1, waveAlpha));

      // Ambient liquid glow orb that follows the wave's descent
      const orbY = currentBaseY;
      const glowGrad = ctx.createRadialGradient(
        width * 0.5, orbY, 20,
        width * 0.5, orbY, Math.max(width * 0.65, 360)
      );
      glowGrad.addColorStop(0, `rgba(16, 185, 129, ${0.18 * waveAlpha})`); // Chaattiko Emerald
      glowGrad.addColorStop(0.35, `rgba(6, 182, 212, ${0.12 * waveAlpha})`); // Iridescent Cyan
      glowGrad.addColorStop(0.7, `rgba(139, 92, 246, ${0.06 * waveAlpha})`); // Violet edge
      glowGrad.addColorStop(1, 'rgba(5, 7, 10, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // 3 Multi-Layered Liquid Plasma Sheets forming the ONE coherent fluid wave
      const plasmaLayers = [
        // Base liquid body (volumetric emerald-cyan gradient)
        {
          yOffset: 0,
          amp1: 34,
          freq1: 0.0032,
          amp2: 18,
          freq2: 0.0075,
          speed: 1.2,
          thickness: 90,
          colorTop: `rgba(6, 182, 212, ${0.75 * waveAlpha})`,   // Iridescent Cyan
          colorMid: `rgba(16, 185, 129, ${0.55 * waveAlpha})`,  // Chaattiko Emerald
          colorBottom: `rgba(5, 7, 10, 0)`,
        },
        // Crest plasma sheen (high iridescent highlight)
        {
          yOffset: -12,
          amp1: 28,
          freq1: 0.0041,
          amp2: 14,
          freq2: 0.0090,
          speed: -1.4,
          thickness: 65,
          colorTop: `rgba(52, 211, 153, ${0.85 * waveAlpha})`,  // Mint glow
          colorMid: `rgba(59, 130, 246, ${0.40 * waveAlpha})`,  // Sapphire
          colorBottom: `rgba(5, 7, 10, 0)`,
        },
        // Specular liquid foam / ribbon crest
        {
          yOffset: -22,
          amp1: 22,
          freq1: 0.0055,
          amp2: 10,
          freq2: 0.0120,
          speed: 1.8,
          thickness: 45,
          colorTop: `rgba(255, 255, 255, ${0.70 * waveAlpha})`,  // Pure liquid specular light
          colorMid: `rgba(16, 185, 129, ${0.35 * waveAlpha})`,  // Emerald
          colorBottom: `rgba(5, 7, 10, 0)`,
        }
      ];

      plasmaLayers.forEach((layer) => {
        ctx.save();
        ctx.beginPath();

        const baseY = currentBaseY + layer.yOffset;
        ctx.moveTo(0, height);
        ctx.lineTo(0, baseY);

        const step = 8;
        for (let x = 0; x <= width + step; x += step) {
          // Compound organic harmonics for fluid liquid surface
          const wave1 = Math.sin(x * layer.freq1 + elapsed * layer.speed) * layer.amp1;
          const wave2 = Math.cos(x * layer.freq2 - elapsed * (layer.speed * 0.7)) * layer.amp2;
          const fluidCurvature = Math.sin((x / width) * Math.PI) * 16; // Slight central dome
          const y = baseY + wave1 + wave2 - fluidCurvature;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        // Volumetric liquid gradient from crest downward
        const grad = ctx.createLinearGradient(0, baseY - 30, 0, baseY + layer.thickness);
        grad.addColorStop(0, layer.colorTop);
        grad.addColorStop(0.4, layer.colorMid);
        grad.addColorStop(1, layer.colorBottom);

        ctx.fillStyle = grad;
        ctx.fill();

        // Crisp glowing specular crest line
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = layer.colorTop;
        ctx.stroke();

        ctx.restore();
      });
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
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
      {/* Subtle vignette darkening towards edges */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none opacity-60" />
    </div>
  );
}
