/**
 * @file money.ts — paise/rupee conversions and INR formatting.
 * @module src/lib
 *
 * The DB stores all currency as PAISE (1 INR = 100 paise) per CLAUDE.md
 * "no floats for money" rule. UI converts on the boundary via these
 * helpers. `formatPaise` returns Indian-locale formatted strings (lakhs +
 * crores grouping) — uses `Intl.NumberFormat('en-IN')`.
 */

// Why named: every currency math line restates the conversion factor — naming
// it kills the magic number per CLAUDE.md.
export const PAISE_PER_RUPEE = 100;

const RUPEE_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Convert paise (integer) to rupees (number, may be fractional).
 * Use only at the UI boundary — keep math in paise everywhere else.
 */
export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

/**
 * Convert a rupees value (from a user form) to integer paise for storage.
 * Rounds to the nearest paisa to avoid float drift.
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * PAISE_PER_RUPEE);
}

/**
 * Format a paise value as an INR string with the Indian-locale lakh/crore
 * grouping, e.g. `350000 → "₹3,500"`, `1500000 → "₹15,000"`.
 * No fractional rupees in the demo (all listings are whole-rupee prices).
 */
export function formatPaise(paise: number): string {
  return RUPEE_FORMATTER.format(paiseToRupees(paise));
}
