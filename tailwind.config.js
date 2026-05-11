/**
 * Tailwind config — Namma-Yantra brand palette + NativeWind v4 preset.
 *
 * Colors mirror src/theme/colors.ts. When you change one, change the other.
 * NativeWind v4 requires the `nativewind/preset` so its in-tree style
 * transformer recognizes the same utilities at runtime.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#B8862C', dark: '#8C6620', light: '#F5EDD9' },
        accent: '#2D5F3F',
        bg: '#FAF6ED',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFDF7',
        ink: { DEFAULT: '#1A1A1A', soft: '#4A4A4A', mute: '#7A7A7A' },
        border: '#E8DFC9',
        avail: '#3CB371',
        busy: '#9E9E9E',
        pending: '#C8A33C',
        accepted: '#2D5F3F',
        error: '#A83232',
      },
      boxShadow: {
        card:      '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        cardHover: '0 4px 12px rgba(0,0,0,0.10)',
        cta:       '0 4px 14px rgba(184,134,44,0.30)',
        ctaAccent: '0 4px 14px rgba(45,95,63,0.25)',
        fab:       '0 6px 20px rgba(0,0,0,0.18)',
      },
      fontFamily: {
        sans: ['Inter'],
        serif: ['Cormorant Garamond'],
        mono: ['JetBrains Mono'],
      },
    },
  },
  plugins: [],
};
