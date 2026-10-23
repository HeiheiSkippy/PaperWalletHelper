module.exports = {
  presets: ['module:@react-native/babel-preset'],

  env: {
    // Metro sets BABEL_ENV=production for release bundles. Keep console.error
    // in as well: a stack trace can carry a private key.
    production: {
      plugins: ['transform-remove-console'],
    },
  },
};
