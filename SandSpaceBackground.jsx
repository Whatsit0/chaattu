import React, { useEffect, useRef } from 'react';

/**
 * SandSpaceBackground Component
 * Renders the original sand-into-space particle dispersion animation as a fixed background layer.
 * Particles disperse and get pulled with cosmic anti-gravity lift into space.
 * Positioned with `fixed inset-0 z-0 pointer-events-none` so it never blocks taps, clicks, or typing.
 */
export default function SandSpaceBackground({ theme = 'dark' }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isDark = theme === 'dark';

    // Spawn a rich collection of fine sand particles that drift and disperse into space
    const particleCount = Math.min(Math.floor((width * height) / 9000), 160);
    const particles = [];

    const createParticle = (initial = false) => {
      const x = Math.random() * width;
      // Initial spread across whole screen, new ones spawn primarily from lower/middle screen
      const y = initial ? Math.random() * height : height + Math.random() * 40;

      return {
        x,
        y,
        originX: x,
        originY: y,
        // Drift rightwards & upwards with space pull physics
        vx: Math.random() * 1.4 + 0.4,
        vy: -(Math.random() * 1.8 + 0.5),
        size: Math.random() * 2.2 + 0.7,
        alpha: Math.random() * 0.55 + 0.25,
        maxAlpha: Math.random() * 0.6 + 0.3,
        life: 0,
        maxLife: Math.random() * 180 + 120,
        // Mix subtle emerald glow with warm stardust
        color: isDark
          ? (Math.random() > 0.4 ? 'rgba(255, 255, 255,' : 'rgba(52, 211, 153,')
          : (Math.random() > 0.4 ? 'rgba(70, 70, 70,' : 'rgba(16, 185, 129,')
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(true));
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;

        // Cosmic physics: drift rightwards and accelerate upwards as if pulled into space
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.008; // subtle space anti-gravity pull
        p.vx += 0.004; // subtle solar wind drift

        const progress = p.life / p.maxLife;
        // Fade in smoothly then fade out into deep space
        let currentAlpha = p.alpha;
        if (progress < 0.2) {
          currentAlpha = (progress / 0.2) * p.maxAlpha;
        } else if (progress > 0.7) {
          currentAlpha = (1 - (progress - 0.7) / 0.3) * p.maxAlpha;
        }

        ctx.fillStyle = `${p.color} ${Math.max(0, currentAlpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.35), 0, Math.PI * 2);
        ctx.fill();

        // Respawn particle once life completes or moves out of viewport
        if (p.life >= p.maxLife || p.y < -20 || p.x > width + 20) {
          particles[i] = createParticle(false);
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none w-full h-full block"
      style={{ pointerEvents: 'none' }}
    />
  );
}
