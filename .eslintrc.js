export const env = {
  browser: true,
  commonjs: false,
  es6: true,
  es2021: true,
};
// export const extends = 'airbnb-base';
export const overrides = [
  {
    env: {
      node: true,
    },
    files: [
      '.eslintrc.{js,cjs}',
    ],
    rules: {
      'linebreak-style': ['error', 'unix'], // Override rule for this file
    },
    parserOptions: {
      sourceType: 'script',
    },
  },
];
export const parserOptions = {
  ecmaVersion: 'latest',
};
export const rules = {
  'linebreak-style': ['error', 'windows'],
  'no-console': ['error', { allow: ['warn', 'error'] }],
  'no-underscore-dangle': 'off',
};
