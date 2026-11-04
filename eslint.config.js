// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  { ignores: ['dist/**', 'android/**', '.expo/**'] },
  expoConfig,
  {
    rules: {
      // React Native's Animated API stores values in refs and reads them during
      // render (`useRef(new Animated.Value(0)).current`). The React Compiler
      // "refs" rule does not model this platform idiom.
      'react-hooks/refs': 'off',
      // Completing a timer legitimately synchronises React state from a timer
      // reaching zero; this is the intended effect, not a cascading render.
      'react-hooks/set-state-in-effect': 'off',
      // TypeScript already catches missing exports. The ESLint import resolver
      // does not follow Expo's generated type re-exports.
      'import/namespace': 'off',
    },
  },
]);
