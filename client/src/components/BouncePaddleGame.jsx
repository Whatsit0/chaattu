import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCw, Trophy, Zap, ShieldAlert } from 'lucide-react';
import { socket } from '../socket';

function getLevel(score) {
  if (score >= 170) return 7;
  if (score >= 120) return 6;
  if (score >= 80) return 5;
  if (score >= 50) return 4;
  if (score >= 25) return 3;
  if (score >= 10) return 2;
  return 1;
}

function getBaseSpeedForLevel(lvl) {
  switch (lvl) {
    case 1: return 6.0; // Fast, challenging starting pace
    case 2: return 7.8;
    case 3: return 9.8;
    case 4: return 12.0;
    case 5: return 14.5;
    case 6: return 17.0;
    default: return 19.5;
  }
}

/**
 * Pure 2D Flat Bounce Paddle Ball Game (No 3D Perspective)
 * Progressive difficulty & beginner-friendly starting speed.
 * Ball bounces off top, left, and right walls. Bottom paddle moves strictly horizontally on the X-axis.
 */
export default function BouncePaddleGame({
  isOpen,
  onClose,
  activeTarget,
  currentUser
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const gameStateRef = useRef({
    isPlaying: false,
    score: 0,
    bestScore: 0,
    level: 1,
    ballX: 160,
    ballY: 100,
    ballVx: 2.0,
    ballVy: 2.4,
    ballRadius: 9,
    paddleX: 120,
    paddleWidth: 84,
    paddleHeight: 12,
    canvasWidth: 320,
    canvasHeight: 460,
    lastMilestone: 0,
    trail: []
  });

  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [levelUpBanner, setLevelUpBanner] = useState(null);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = Number(localStorage.getItem('chaattiko_bounce_2d_best') || 0);
      setBestScore(saved);
      gameStateRef.current.bestScore = saved;
    }
  }, []);

  const startGame = () => {
    const s = gameStateRef.current;
    s.isPlaying = true;
    s.score = 0;
    s.level = 1;
    s.lastMilestone = 0;
    s.trail = [];
    s.ballX = s.canvasWidth / 2;
    s.ballY = 70;
    const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
    const initialSpeed = 6.0; // Fast, skill-based initial speed
    s.ballVx = Math.sin(angle) * initialSpeed;
    s.ballVy = Math.cos(angle) * initialSpeed;
    s.paddleX = (s.canvasWidth - s.paddleWidth) / 2;

    setScore(0);
    setLevel(1);
    setLevelUpBanner(null);
    setGameOver(false);
  };

  useEffect(() => {
    if (!isOpen) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const s = gameStateRef.current;
    s.canvasWidth = rect.width;
    s.canvasHeight = rect.height;
    s.paddleX = (s.canvasWidth - s.paddleWidth) / 2;

    startGame();

    // Mouse / Touch Event Handlers (Strictly Horizontal on X axis)
    const handlePointerMove = (clientX) => {
      if (!canvas) return;
      const bounds = canvas.getBoundingClientRect();
      const relativeX = clientX - bounds.left;
      s.paddleX = Math.max(0, Math.min(s.canvasWidth - s.paddleWidth, relativeX - s.paddleWidth / 2));
    };

    const onMouseMove = (e) => {
      handlePointerMove(e.clientX);
    };

    const onTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        handlePointerMove(e.touches[0].clientX);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        s.paddleX = Math.max(0, s.paddleX - 28);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        s.paddleX = Math.min(s.canvasWidth - s.paddleWidth, s.paddleX + 28);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });

    // Main 60fps 2D Game Loop
    const loop = () => {
      animRef.current = requestAnimationFrame(loop);

      const cWidth = s.canvasWidth;
      const cHeight = s.canvasHeight;

      // 1. Clear background: Rich Twilight Indigo Arena (#16132B)
      ctx.fillStyle = '#16132B';
      ctx.fillRect(0, 0, cWidth, cHeight);

      // Creative 2D Background: Subtle Geometric Grid & Cyan-Violet Star Dust
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < cWidth; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cHeight);
        ctx.stroke();
      }
      for (let y = 0; y < cHeight; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cWidth, y);
        ctx.stroke();
      }

      // Arena Wall Borders (Top, Left, Right - Non-Green)
      ctx.strokeStyle = 'rgba(255, 107, 107, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, cHeight);
      ctx.lineTo(0, 0);
      ctx.lineTo(cWidth, 0);
      ctx.lineTo(cWidth, cHeight);
      ctx.stroke();

      if (s.isPlaying) {
        // Record trail for crisp 2D motion
        s.trail.push({ x: s.ballX, y: s.ballY });
        if (s.trail.length > 6) s.trail.shift();

        // Move Ball
        s.ballX += s.ballVx;
        s.ballY += s.ballVy;

        // Wall Collisions: Left and Right
        if (s.ballX - s.ballRadius <= 0) {
          s.ballX = s.ballRadius;
          s.ballVx = Math.abs(s.ballVx);
        } else if (s.ballX + s.ballRadius >= cWidth) {
          s.ballX = cWidth - s.ballRadius;
          s.ballVx = -Math.abs(s.ballVx);
        }

        // Wall Collision: Top
        if (s.ballY - s.ballRadius <= 0) {
          s.ballY = s.ballRadius;
          s.ballVy = Math.abs(s.ballVy);
        }

        // Paddle Collision: Bottom
        const paddleY = cHeight - 26;
        if (
          s.ballY + s.ballRadius >= paddleY &&
          s.ballY - s.ballRadius <= paddleY + s.paddleHeight &&
          s.ballX >= s.paddleX - 4 &&
          s.ballX <= s.paddleX + s.paddleWidth + 4
        ) {
          s.ballY = paddleY - s.ballRadius;

          // Compute bounce angle based on strike position (-1 to 1)
          const hitOffset = (s.ballX - (s.paddleX + s.paddleWidth / 2)) / (s.paddleWidth / 2);
          const maxAngle = 1.05;
          const bounceAngle = hitOffset * maxAngle;

          const prevLvl = getLevel(s.score);
          // Increment score
          s.score += 1;
          const newLvl = getLevel(s.score);
          s.level = newLvl;
          setScore(s.score);
          setLevel(newLvl);

          if (newLvl > prevLvl) {
            setLevelUpBanner(`LEVEL ${newLvl}! ⚡`);
            setTimeout(() => setLevelUpBanner(null), 1500);
          }

          // Progressive speed calculation based on level + step micro-boost
          const targetSpeed = Math.min(getBaseSpeedForLevel(newLvl) + (s.score % 10) * 0.12, 22.0);

          s.ballVx = Math.sin(bounceAngle) * targetSpeed;
          s.ballVy = -Math.cos(bounceAngle) * targetSpeed;

          if (s.score > s.bestScore) {
            s.bestScore = s.score;
            setBestScore(s.score);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('chaattiko_bounce_2d_best', String(s.score));
            }
          }

          // Live WebSocket Sync: 100-Point Milestones (100, 200...)
          if (s.score % 100 === 0 && s.score > s.lastMilestone) {
            s.lastMilestone = s.score;
            if (activeTarget) {
              socket.emit('game:ball_score', {
                targetUser: activeTarget,
                score: s.score,
                milestone: true,
                isGameOver: false
              });
            }
          }
        }

        // Missed Bottom Edge -> Out / Game Over
        if (s.ballY - s.ballRadius > cHeight) {
          s.isPlaying = false;
          setGameOver(true);

          if (activeTarget && s.score > 0) {
            socket.emit('game:ball_score', {
              targetUser: activeTarget,
              score: s.score,
              milestone: false,
              isGameOver: true
            });
          }
        }
      }

      // Draw 2D Ball Trail (Pure 2D)
      s.trail.forEach((t, i) => {
        const alpha = (i + 1) / s.trail.length * 0.3;
        ctx.fillStyle = `rgba(255, 107, 107, ${alpha})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, s.ballRadius * (0.6 + i * 0.06), 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Pure 2D Flat Ball (Electric Coral #FF6B6B with Amber core)
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, s.ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // Ball inner ring
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, s.ballRadius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Draw Pure 2D Horizontal Paddle (Strictly locked to bottom Y - Cyan to Violet #38BDF8 / #8B5CF6)
      const paddleY = cHeight - 26;
      const paddleGrad = ctx.createLinearGradient(
        s.paddleX,
        paddleY,
        s.paddleX + s.paddleWidth,
        paddleY
      );
      paddleGrad.addColorStop(0, '#38BDF8');
      paddleGrad.addColorStop(1, '#8B5CF6');

      ctx.fillStyle = paddleGrad;
      ctx.beginPath();
      ctx.roundRect(s.paddleX, paddleY, s.paddleWidth, s.paddleHeight, 5);
      ctx.fill();

      // Specular 2D top highlight on paddle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.paddleX + 2, paddleY + 1);
      ctx.lineTo(s.paddleX + s.paddleWidth - 2, paddleY + 1);
      ctx.stroke();
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isOpen, activeTarget]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div
        style={{
          background: 'rgba(16, 18, 28, 0.94)',
          backdropFilter: 'blur(30px) saturate(160%)',
          WebkitBackdropFilter: 'blur(30px) saturate(160%)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 25px 70px rgba(0, 0, 0, 0.9)'
        }}
        className="w-[92vw] max-w-sm rounded-3xl p-4 sm:p-5 relative flex flex-col items-center text-white overflow-hidden shadow-2xl"
      >
        {/* Header Bar */}
        <div className="w-full flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎾</span>
            <div>
              <h3 className="text-xs font-bold font-offside tracking-wide text-white">2D Bounce Paddle</h3>
              <p className="text-[10px] text-neutral-400 font-mono">
                {activeTarget ? `Live sync with @${activeTarget}` : 'Practice Arena'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition"
            title="Close game"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scoreboard */}
        <div className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/10 mb-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-neutral-400">Score:</span>
            <span className="font-bold text-white text-sm">{score}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/25 to-pink-500/25 border border-purple-500/35 shadow-sm">
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider font-mono">
              Lvl {level}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-neutral-400">Best:</span>
            <span className="font-bold text-amber-300 text-sm">{bestScore}</span>
          </div>
        </div>

        {/* Pure 2D Flat Game Canvas Container */}
        <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-white/15 bg-[#16132B] shadow-inner touch-none">
          <canvas ref={canvasRef} className="w-full h-full block cursor-ew-resize" />

          {/* Level Up Celebratory HUD Banner */}
          {levelUpBanner && (
            <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-20 animate-bounce">
              <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 text-black font-extrabold text-xs shadow-xl tracking-wider uppercase font-mono">
                {levelUpBanner}
              </span>
            </div>
          )}

          {/* Game Over Screen Overlay */}
          {gameOver && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-3">
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              </div>
              <h4 className="text-lg font-bold font-offside text-white mb-1">Game Over!</h4>
              <p className="text-xs text-neutral-300 mb-1">
                Score: <strong className="text-purple-400 font-mono text-base">{score}</strong>
              </p>
              {activeTarget && (
                <p className="text-[10px] text-neutral-400 mb-4 font-mono">
                  Result shared with @{activeTarget}
                </p>
              )}

              <button
                type="button"
                onClick={startGame}
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)'
                }}
                className="py-2.5 px-6 rounded-2xl font-semibold text-xs text-white flex items-center justify-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Play Again</span>
              </button>
            </div>
          )}
        </div>

        <p className="text-[10px] text-neutral-400 mt-3 font-mono text-center">
          📱 Drag horizontally on phone · 💻 Mouse or ← → keys on laptop
        </p>
      </div>
    </div>
  );
}
