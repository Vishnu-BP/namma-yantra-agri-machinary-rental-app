/**
 * @file (owner)/machine/_layout.tsx — Stack wrapper for the machine sub-routes.
 * @module app
 *
 * Without this, expo-router auto-exposes nested routes (like
 * machine/[id]/edit) as their own bottom-tab entries on the parent Tabs
 * navigator, which leaks "machine/[id]/edit" into the tab bar. Wrapping
 * the folder in a Stack tells expo-router these are sub-routes pushed on
 * top of the current tab, not tabs themselves.
 */
import { Stack } from 'expo-router';

export default function OwnerMachineLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
