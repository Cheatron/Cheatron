import js from '@eslint/js'
import globals from 'globals'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactRefreshPlugin from 'eslint-plugin-react-refresh'
import eslintConfigPrettier from 'eslint-config-prettier'

const tsFiles = ['**/*.{ts,tsx,d.ts}']
const tsSources = ['**/*.{ts,tsx}']
const tsDeclarations = ['**/*.d.ts']

export default [
  {
    ignores: ['dist', 'dist-electron', 'release', 'native', 'src/components/ui/**'],
  },
  {
    files: tsFiles,
    ...js.configs.recommended,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: tsSources,
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'no-undef': 'off',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    files: tsDeclarations,
    rules: {
      'no-undef': 'off',
    },
  },
  eslintConfigPrettier,
]
