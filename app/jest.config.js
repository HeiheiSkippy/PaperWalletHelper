module.exports = {
  preset: '@react-native/jest-preset',
  // @noble, @scure, micro-eth-signer and micro-packed ship ESM, which the
  // default patterns would leave untransformed. Metro handles ESM on its own.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|@noble|@scure)/|micro-eth-signer/|micro-packed/)',
  ],
};
