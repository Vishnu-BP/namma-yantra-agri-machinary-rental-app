/**
 * @file nativewind-interop.ts — register NativeWind className mapping for third-party components.
 * @module src/lib
 *
 * NativeWind v4 auto-interops every built-in React Native component (View,
 * Text, Pressable…) so they understand the `className` prop. Third-party
 * native components — like `expo-linear-gradient` — do NOT get this
 * treatment automatically. Without an explicit `cssInterop` call, passing
 * `className` to <LinearGradient> is a silent no-op and styles get dropped,
 * which surfaces as "where did my padding/centering go?" mysteries.
 *
 * Importing this file once at the app root (in `app/_layout.tsx`) registers
 * the mapping for the entire process. Side-effect-only — nothing to export.
 *
 * Why centralized: every new third-party native component that needs
 * className support gets one line here, never copy-pasted into screens.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';

cssInterop(LinearGradient, { className: 'style' });
