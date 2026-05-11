/**
 * @file (renter)/index.tsx — bare redirect to the Discover tab.
 * @module app
 *
 * After L1, the renter group's index was a placeholder home. L2 replaces
 * the layout with Tabs and Discover is the default tab — but expo-router
 * still routes `/(renter)` to this `index.tsx`. Redirect to keep any
 * existing links / nav-helpers working without each one knowing about the
 * tab restructure.
 */
import { Redirect } from 'expo-router';

export default function RenterIndex() {
  return <Redirect href="/(renter)/discover" />;
}
