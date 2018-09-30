// http://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2017
  },
  env: {
    node: true,
    jest: true
  },
  extends: 'standard',
  
  // Custom Rules
  rules: {
    'no-trailing-spaces': [ 'error', { 'skipBlankLines': true } ]
  },
  
  // Custom globals ... don't use globals
  globals: {
  }
}
