/**
 * @file logger.ts — tagged, level-aware logger for the whole app.
 * @module src/lib
 *
 * Single canonical logger. Every module imports `createLogger` with a
 * domain tag so log lines can be grepped by tag. `debug()` is a no-op in
 * production builds so debug tracing doesn't bloat release logs.
 *
 * Why a tagged logger and not raw console.log:
 * - Forces consistent prefixes (`[AUTH]`, `[BOOKING]`, etc.) for grep.
 * - Centralizes a future hook to ship logs to a remote sink without
 *   touching every call site.
 * - CLAUDE.md bans raw `console.log` in committed code; this file is the
 *   only exception, since it is the wrapper.
 *
 * Never log PII (phone, address, payment data) or JWTs at any level.
 */

// ─── Tags ─────────────────────────────────────────────────────────────
/**
 * Domain tags accepted by the logger. Add to this union before using a
 * new tag — keeps the surface area discoverable via grep.
 */
export type LogTag =
  | 'AUTH'
  | 'API'
  | 'DB'
  | 'BOOKING'
  | 'MACHINE'
  | 'RT'
  | 'AI'
  | 'STORAGE'
  | 'I18N'
  | 'LOC'
  | 'STORE'
  | 'UI'
  | 'NAV'
  | 'MW'
  | 'PUSH';

// ─── Public types ─────────────────────────────────────────────────────
export interface Logger {
  info: (msg: string, ctx?: unknown) => void;
  warn: (msg: string, err?: unknown) => void;
  error: (msg: string, err: unknown) => void;
  debug: (msg: string, ctx?: unknown) => void;
}

// ─── Factory ──────────────────────────────────────────────────────────
/**
 * Build a logger scoped to a domain tag.
 *
 * @param tag short uppercase identifier prepended to every log line.
 * @returns Logger exposing `info`, `warn`, `error`, `debug`.
 */
export function createLogger(tag: LogTag): Logger {
  const prefix = `[${tag}]`;

  return {
    info: (msg, ctx) => {
      // Why: this file is the canonical wrapper around console.* — see file header.
      if (ctx === undefined) console.log(prefix, msg);
      else console.log(prefix, msg, ctx);
    },
    warn: (msg, err) => {
      if (err === undefined) console.warn(prefix, msg);
      else console.warn(prefix, msg, err);
    },
    error: (msg, err) => {
      console.error(prefix, msg, err);
    },
    debug: (msg, ctx) => {
      // Why: dev-only tracing. __DEV__ is a global flag set by Metro/Expo.
      if (!__DEV__) return;
      if (ctx === undefined) console.log(prefix, '[debug]', msg);
      else console.log(prefix, '[debug]', msg, ctx);
    },
  };
}
