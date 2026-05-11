/**
 * @file i18n/index.ts — i18next initializer for the app.
 * @module src/lib/i18n
 *
 * Bootstraps i18next with English and Kannada bundles. Import this module
 * once at app entry (`app/_layout.tsx`) so the instance is ready before any
 * screen renders. Call `i18n.changeLanguage()` to switch at runtime.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import kn from './kn.json';

// ─── Init ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    kn: { translation: kn },
  },
  lng: 'en',
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: {
    // Why false: React already handles XSS escaping — double-escaping breaks
    // Kannada Unicode sequences.
    escapeValue: false,
  },
});

export default i18n;
