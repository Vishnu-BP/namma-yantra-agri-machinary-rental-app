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
        primary: { DEFAULT: '#B8862C', dark: '#8C6620' },
        accent: '#2D5F3F',
        bg: '#FAF6ED',
        surface: '#FFFFFF',
        ink: { DEFAULT: '#1A1A1A', soft: '#4A4A4A', mute: '#7A7A7A' },
        border: '#E8DFC9',
        avail: '#3CB371',
        busy: '#9E9E9E',
        pending: '#C8A33C',
        error: '#A83232',
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
