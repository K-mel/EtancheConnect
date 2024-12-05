module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 12,
    sourceType: 'module'
  },
  plugins: [
    'react',
    'react-hooks'
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    'react/no-unescaped-entities': 'off',
    'no-irregular-whitespace': 'warn',
    'no-useless-catch': 'warn',
    'no-useless-escape': 'warn'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
}
