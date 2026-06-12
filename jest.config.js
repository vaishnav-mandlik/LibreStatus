module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '(jest-)?react-native' +
      '|@react-native(-community)?' +
      '|react-native-vector-icons' +
      '|react-native-linear-gradient' +
      '|react-native-video' +
      '|react-native-share' +
      '|react-native-localize' +
      '|react-native-permissions' +
      '|react-native-safe-area-context' +
      ')/)',
  ],
};
