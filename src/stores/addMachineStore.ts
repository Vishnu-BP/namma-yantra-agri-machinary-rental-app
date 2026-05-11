/**
 * @file addMachineStore.ts — transient state shared across the 3-step Add Machine flow.
 * @module src/stores
 *
 * Intentionally NOT persisted — if the owner abandons the flow mid-way the
 * draft is discarded. Each publish attempt starts fresh via `reset()`.
 *
 * Step ownership:
 *   Step 1 (photos)   — imageLocalUris, primaryIndex
 *   Step 2 (details)  — category, brand, model, yearOfPurchase, horsepower,
 *                        features, title, descriptionEn, descriptionKn
 *   Step 3 (pricing)  — hourlyRupees, dailyRupees, minimumHours, condition,
 *                        lastServiceDate, locationLat, locationLng, village, district
 */
import { create } from 'zustand';

import type { MachineCategory, MachineCondition } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddMachineState {
  // Step 1
  imageLocalUris: string[];
  primaryIndex: number;
  // Step 2
  category: MachineCategory;
  brand: string;
  model: string;
  yearOfPurchase: number;
  horsepower: number | undefined;
  features: string[];
  title: string;
  descriptionEn: string;
  descriptionKn: string;
  // Step 3
  hourlyRupees: number;
  dailyRupees: number;
  minimumHours: number;
  condition: MachineCondition;
  lastServiceDate: string;
  locationLat: number;
  locationLng: number;
  village: string;
  district: string;
  // Actions
  set: <K extends keyof Omit<AddMachineState, 'set' | 'reset'>>(
    key: K,
    value: AddMachineState[K],
  ) => void;
  reset: () => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const MANDYA_LAT = 12.5218;
const MANDYA_LNG = 76.8951;

const initial: Omit<AddMachineState, 'set' | 'reset'> = {
  imageLocalUris: [],
  primaryIndex: 0,
  category: 'tractor',
  brand: '',
  model: '',
  yearOfPurchase: new Date().getFullYear(),
  horsepower: undefined,
  features: [],
  title: '',
  descriptionEn: '',
  descriptionKn: '',
  hourlyRupees: 0,
  dailyRupees: 0,
  minimumHours: 2,
  condition: 'good',
  lastServiceDate: '',
  locationLat: MANDYA_LAT,
  locationLng: MANDYA_LNG,
  village: '',
  district: '',
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAddMachineStore = create<AddMachineState>((setState) => ({
  ...initial,
  set: (key, value) => setState({ [key]: value } as Pick<AddMachineState, typeof key>),
  reset: () => setState(initial),
}));
