/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#000000',
          surface: '#0a0a0a',
          card: '#111111',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.04)',
          accent: '#ffffff'
        },
        // Urban Satin 5-Color Custom Palette
        satin: {
          slate: '#7B7F8A',   // Color 1: Cool slate-silver satin (secondary borders, muted text, icons)
          taupe: '#AB978C',   // Color 2: Warm taupe-gray satin (subtle highlights, warm accents, badges)
          denim: '#6B7C98',   // Color 3: Muted denim-blue satin (active selection states, link accents)
          charcoal: '#5E5653',// Color 4: Deep charcoal-brown satin (secondary card backgrounds, hover borders)
          obsidian: '#393637' // Color 5: Dark urban obsidian (core base tone for dark mode glass panels)
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        syncopate: ['Syncopate', 'sans-serif'],
        electrolize: ['Electrolize', 'sans-serif'],
        offside: ['Offside', 'sans-serif'],
        serif: ['"IBM Plex Serif"', 'Georgia', 'serif']
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.6)',
        'glow': '0 0 20px -5px rgba(255, 255, 255, 0.15)',
        'glow-emerald': '0 0 15px -3px rgba(16, 185, 129, 0.4)'
      }
    },
  },
  plugins: [],
}
