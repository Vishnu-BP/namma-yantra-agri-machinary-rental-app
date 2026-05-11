/**
 * Babel config — Expo + NativeWind v4 + module-resolver alias.
 *
 * - `babel-preset-expo` with `jsxImportSource: 'nativewind'` so NativeWind's
 *   className -> style transform runs at compile time.
 * - `nativewind/babel` plugin (loaded as preset for v4 compatibility).
 * - `module-resolver` so every cross-folder import can use `@/...` per
 *   CLAUDE.md's path-alias rule (no `../..` allowed anywhere).
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      // Why: Reanimated v4 (and gesture-handler, which expo-router pulls in)
      // requires the worklets babel plugin to compile worklet functions.
      // MUST be the last plugin in the array.
      'react-native-worklets/plugin',
    ],
  };
};
