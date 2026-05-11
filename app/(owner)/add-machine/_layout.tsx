/**
 * @file add-machine/_layout.tsx — Stack navigator for the 3-step Add Machine flow.
 * @module app
 *
 * headerShown: false — each step renders its own header via StepHeader so we
 * control the back-button label and step indicator ourselves.
 */
import { Stack } from 'expo-router';

export default function AddMachineLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
