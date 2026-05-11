/**
 * @file karnataka-districts.ts — alphabetized list of Karnataka districts.
 * @module src/constants
 *
 * Used by the role-select form's district picker. Matches docs/02-layer-1-auth.md.
 * Karnataka periodically reorganizes districts; this list reflects the
 * 30 districts referenced in the PRD. Update only after confirming with
 * an authoritative source and bumping the migration accordingly.
 */
export const KARNATAKA_DISTRICTS = [
  'Bagalkote',
  'Ballari',
  'Bangalore Rural',
  'Bangalore Urban',
  'Belagavi',
  'Bidar',
  'Chamarajanagar',
  'Chikkaballapur',
  'Chikmagalur',
  'Dakshina Kannada',
  'Davangere',
  'Dharwad',
  'Gadag',
  'Hassan',
  'Haveri',
  'Kalaburagi',
  'Kodagu',
  'Kolar',
  'Koppal',
  'Mandya',
  'Mysuru',
  'Raichur',
  'Ramanagara',
  'Shivamogga',
  'Tumkur',
  'Udupi',
  'Uttara Kannada',
  'Vijayanagara',
  'Vijayapura',
  'Yadgir',
] as const;

export type KarnatakaDistrict = (typeof KARNATAKA_DISTRICTS)[number];
