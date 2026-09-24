import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  // build output and generated fonts are never linted
  globalIgnores(['dist/**', 'public/fonts/**', '.font-build/**']),
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // config/icons.mjs and the font script run in Node, the demo runs in the browser
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { caughtErrors: 'all' }],
    },
  },
]);
