import React from 'react';
import chatticoIcon from '../assets/chattico-icon.png';

/**
 * WhatsApp-Style Cute & Whimsical Doodle Background with Center Icon-Only Logo
 * Displays a subtle, high-charm repeating wallpaper of playful doodles across all chat rooms
 * with the iconic Chaattiko parrot icon gently watermarked in the dead center.
 */
export default function WhatsAppDoodleBackground({ theme = 'dark' }) {
  const isDark = theme === 'dark';
  const strokeColor = isDark ? 'rgba(255, 255, 255, 0.065)' : 'rgba(15, 23, 42, 0.075)';

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
      {/* SVG Pattern of WhatsApp-Style Whimsical Doodles */}
      <svg
        className="w-full h-full absolute inset-0"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <pattern
            id="wa-doodle-pattern"
            width="280"
            height="280"
            patternUnits="userSpaceOnUse"
          >
            {/* 1. Cute Steaming Coffee Mug */}
            <g transform="translate(18, 18)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="6" width="18" height="15" rx="3" />
              <path d="M18 10 C21 10, 22 13, 21 16 C20 18, 18 18, 18 18" />
              <path d="M5 2 Q6 0, 7 2" />
              <path d="M10 2 Q11 0, 12 2" />
            </g>

            {/* 2. Paper Airplane */}
            <g transform="translate(85, 22) rotate(15)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0 8 L22 0 L14 20 L10 12 Z" />
              <path d="M22 0 L10 12" />
            </g>

            {/* 3. Whimsical Cat Face */}
            <g transform="translate(160, 16)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M4 6 L7 2 L10 5" />
              <path d="M14 5 L17 2 L20 6" />
              <circle cx="9" cy="11" r="0.8" fill={strokeColor} />
              <circle cx="15" cy="11" r="0.8" fill={strokeColor} />
              <path d="M10 14 Q12 16, 14 14" />
            </g>

            {/* 4. Twinkling Star & Sparkle */}
            <g transform="translate(235, 24)" stroke={strokeColor} strokeWidth="1.2" fill="none" strokeLinecap="round">
              <path d="M8 0 L8 16 M0 8 L16 8" />
              <circle cx="8" cy="8" r="1.5" fill={strokeColor} />
            </g>

            {/* 5. Retro Video Game Controller */}
            <g transform="translate(24, 75) rotate(-10)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="2" width="26" height="14" rx="4" />
              <path d="M4 9 H10 M7 6 V12" />
              <circle cx="17" cy="7.5" r="1.2" fill={strokeColor} />
              <circle cx="21" cy="10.5" r="1.2" fill={strokeColor} />
            </g>

            {/* 6. Pepperoni Pizza Slice */}
            <g transform="translate(95, 78) rotate(20)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0 0 L18 6 L8 22 Z" />
              <circle cx="7" cy="8" r="1.2" fill={strokeColor} />
              <circle cx="11" cy="13" r="1.2" fill={strokeColor} />
            </g>

            {/* 7. Glazed Sprinkled Donut */}
            <g transform="translate(165, 80)" stroke={strokeColor} strokeWidth="1.3" fill="none">
              <circle cx="11" cy="11" r="10" />
              <circle cx="11" cy="11" r="3.5" />
              <path d="M5 8 L6 9 M15 7 L16 8 M8 15 L9 16 M14 14 L15 13" strokeLinecap="round" />
            </g>

            {/* 8. Mini Space Rocket */}
            <g transform="translate(230, 85) rotate(-35)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 0 C12 4, 14 12, 14 16 L0 16 C0 12, 2 4, 7 0 Z" />
              <circle cx="7" cy="8" r="2" />
              <path d="M0 16 L-3 20 L2 18" />
              <path d="M14 16 L17 20 L12 18" />
              <path d="M4 16 Q7 22, 10 16" />
            </g>

            {/* 9. Whimsical Smiling Ghost */}
            <g transform="translate(20, 140)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18 C3 7, 19 7, 19 18 C19 18, 17 16, 15 18 C13 16, 11 18, 9 16 C7 18, 5 16, 3 18 Z" />
              <circle cx="8" cy="9" r="1" fill={strokeColor} />
              <circle cx="14" cy="9" r="1" fill={strokeColor} />
              <ellipse cx="11" cy="12" rx="1.5" ry="1.2" />
            </g>

            {/* 10. Cute Ice Cream Cone */}
            <g transform="translate(90, 145) rotate(12)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9 Q8 2, 14 9 Z" />
              <path d="M2 9 L8 22 L14 9" />
              <path d="M4 13 L12 13" />
            </g>

            {/* 11. Over-Ear Headphones */}
            <g transform="translate(155, 142)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 13 C2 5, 20 5, 20 13" />
              <rect x="0" y="11" width="4.5" height="8" rx="2" fill={strokeColor} fillOpacity="0.15" />
              <rect x="17.5" y="11" width="4.5" height="8" rx="2" fill={strokeColor} fillOpacity="0.15" />
            </g>

            {/* 12. Puffy Cloud with Stars */}
            <g transform="translate(225, 145)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14 C1 14, 0 11, 2 9 C2 5, 7 4, 9 6 C11 3, 16 3, 18 6 C21 6, 22 9, 20 11 C22 13, 20 14, 18 14 Z" />
              <circle cx="8" cy="18" r="0.8" fill={strokeColor} />
              <circle cx="14" cy="18" r="0.8" fill={strokeColor} />
            </g>

            {/* 13. Playful Alien Flying Saucer (UFO) */}
            <g transform="translate(18, 205) rotate(-15)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="10" rx="11" ry="4" />
              <path d="M6 9 C6 5, 18 5, 18 9" />
              <circle cx="8" cy="10" r="0.7" fill={strokeColor} />
              <circle cx="12" cy="10.5" r="0.7" fill={strokeColor} />
              <circle cx="16" cy="10" r="0.7" fill={strokeColor} />
            </g>

            {/* 14. Glowing Idea Lightbulb */}
            <g transform="translate(85, 208)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 11 C1 8, 3 1, 9 1 C15 1, 17 8, 13 11 L12 15 L6 15 Z" />
              <path d="M6 18 H12" />
              <path d="M9 -2 V0 M1 -1 L3 1 M17 -1 L15 1" />
            </g>

            {/* 15. Love Letter Sealed with Heart */}
            <g transform="translate(155, 210) rotate(8)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="2" width="22" height="15" rx="2" />
              <path d="M0 2 L11 10 L22 2" />
              <path d="M9 13 Q11 11, 13 13 Q11 16, 9 13" fill={strokeColor} fillOpacity="0.4" />
            </g>

            {/* 16. Potted Cactus */}
            <g transform="translate(230, 205)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 14 L5 22 H13 L15 14 Z" />
              <path d="M9 14 V4 C9 2, 9 2, 9 2" />
              <path d="M5 7 V9 H9 M13 6 V8 H9" />
            </g>

            {/* 17. Cool Sunglasses */}
            <g transform="translate(45, 115) rotate(5)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="0" width="8" height="6" rx="2" fill={strokeColor} fillOpacity="0.25" />
              <rect x="12" y="0" width="8" height="6" rx="2" fill={strokeColor} fillOpacity="0.25" />
              <path d="M8 2 H12" />
            </g>

            {/* 18. Whimsical Chat Bubble with Smile */}
            <g transform="translate(195, 110) rotate(-8)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0 4 C0 1.8, 1.8 0, 4 0 H18 C20.2 0, 22 1.8, 22 4 V12 C22 14.2, 20.2 16, 18 16 H7 L2 19 V16 H4 Z" />
              <path d="M7 8 Q11 12, 15 8" />
            </g>

            {/* 19. Lucky Rolling Dice */}
            <g transform="translate(125, 175) rotate(25)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="0" width="13" height="13" rx="2.5" />
              <circle cx="3.5" cy="3.5" r="0.9" fill={strokeColor} />
              <circle cx="6.5" cy="6.5" r="0.9" fill={strokeColor} />
              <circle cx="9.5" cy="9.5" r="0.9" fill={strokeColor} />
            </g>

            {/* 20. Musical Eighth Notes */}
            <g transform="translate(55, 252) rotate(10)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round">
              <circle cx="4" cy="12" r="2.5" fill={strokeColor} />
              <circle cx="14" cy="9" r="2.5" fill={strokeColor} />
              <path d="M6.5 12 V2 L16.5 0 V9" />
              <path d="M6.5 4 L16.5 2" />
            </g>

            {/* 21. Cute Animal Paw Print */}
            <g transform="translate(195, 250)" stroke={strokeColor} strokeWidth="1.2" fill={strokeColor} fillOpacity="0.3">
              <ellipse cx="8" cy="10" rx="3.5" ry="3" />
              <circle cx="4" cy="4" r="1.2" />
              <circle cx="8" cy="2.5" r="1.2" />
              <circle cx="12" cy="4" r="1.2" />
            </g>

            {/* 22. Vintage Polaroid Camera */}
            <g transform="translate(120, 245)" stroke={strokeColor} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="3" width="18" height="14" rx="2.5" />
              <circle cx="9" cy="10" r="3.5" />
              <rect x="12" y="0.5" width="4" height="2.5" rx="0.5" />
            </g>
          </pattern>
        </defs>

        {/* Seamless Full-Viewport Tiled Rectangle */}
        <rect width="100%" height="100%" fill="url(#wa-doodle-pattern)" />
      </svg>

      {/* Center Icon-Only Logo (Subtle Chaattiko Parrot Watermark, No Wordmark Text) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <div className="relative flex items-center justify-center">
          <img
            src={chatticoIcon}
            alt="Chaattiko Icon"
            className="w-36 h-36 sm:w-52 sm:h-52 object-contain opacity-[0.065] dark:opacity-[0.075] transition-opacity duration-300 drop-shadow-[0_4px_24px_rgba(16,185,129,0.15)] filter grayscale contrast-125"
          />
        </div>
      </div>
    </div>
  );
}
