module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
  overrides: [
    {
      files: ['src/shared/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@features/**', '../features/**', '../../features/**'],
                message: 'shared/ must not import from features/.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/app/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@features/*/components/**',
                  '@features/*/hooks/**',
                  '@features/*/utils/**',
                ],
                message:
                  'app/ should depend on feature barrels or @features/<name>/pages, not deep internals.',
              },
            ],
          },
        ],
      },
    },
  ],
}
