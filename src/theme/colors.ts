/**
 * @file colors.ts — single source of truth for brand colors.
 * @module src/theme
 *
 * Every hex value used in the app comes from here. NativeWind utilities
 * (`bg-primary`, `text-ink`, etc.) are derived from these in
 * tailwind.config.js — when one changes, change both.
 *
 * Why no inline hex anywhere else:
 * - Theming gates are the single place to swap palette (e.g., dark mode).
 * - A grep for `#` outside src/theme catches drift.
 */
export const colors = {
  primary: '#B8862C',
  primaryDark: '#8C6620',
  primaryLight: '#F5EDD9',
  accent: '#2D5F3F',
  bg: '#FAF6ED',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFDF7',
  ink: '#1A1A1A',
  inkSoft: '#4A4A4A',
  inkMute: '#7A7A7A',
  border: '#E8DFC9',
  avail: '#3CB371',
  busy: '#9E9E9E',
  pending: '#C8A33C',
  accepted: '#2D5F3F',
  error: '#A83232',
} as const;

export type ColorKey = keyof typeof colors;
