/**
 * Metro config — Expo default + NativeWind v4 wrapper.
 *
 * NativeWind v4 needs Metro to know where the global Tailwind CSS lives so
 * it can compile the @tailwind directives at bundle time. The wrapper also
 * enables CSS support for web.
 */
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname, { isCSSEnabled: true });

module.exports = withNativeWind(config, { input: './global.css' });
