import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    // src/** — browser environment (React app code). Kept the only home for
    // reactHooks/reactRefresh: they are React-specific rules and scoping them
    // here narrows blast radius for the next contributor (spec 055 FR-001).
    files: ['src/**/*.{js,jsx,mjs,cjs}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Demoted error → warn (FR-019(c), tasks.md T014/T015, OI-119): fixing these 36
      // findings is behavior-affecting UI refactoring (effect timing, ref usage, memo
      // boundaries), out of this epic's scope — tracked in docs/open_issues.md OI-119
      // for a future pass. No other rule is silently disabled or demoted.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // server/** and scripts/** — node environment.
    files: ['server/**/*.{js,jsx,mjs,cjs}', 'scripts/**/*.{js,jsx,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // tests/** in general — node environment. A narrower, merged node+browser
    // block for tests/dom/** is layered below (deliberate DEVIATION from the
    // epic's Settled decision #1 — see plan.md "Deviations from epic
    // decisions" and research.md R3: only 5 files under tests/dom/** use a
    // bare document/window global; the rest of tests/ reaches browser-ish
    // globals only via globalThis.X, which does not trip no-undef here).
    files: ['tests/**/*.{js,jsx,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // tests/dom/** — merged node+browser ruleset. This is the jsdom DOM
    // suite (run via test:dom); it genuinely needs both node globals (the
    // test runner) and browser globals (document/window used directly).
    files: ['tests/dom/**/*.{js,jsx,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.node, ...globals.browser },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Explicit catch-all #1: repo-root node config files. NOT a glob-based
    // catch-all (ESLint 9 flat-config blocks MERGE by files-glob match, so a
    // broad `**/*.{js,jsx,mjs,cjs}` block would leak node globals into
    // src/**) — an explicit two-block enumeration instead (FR-018, OI-70).
    files: ['vite.config.js', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    // Explicit catch-all #2: the service worker — browser + serviceworker
    // globals (FR-018, OI-70).
    files: ['public/sw.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.serviceworker },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
])
