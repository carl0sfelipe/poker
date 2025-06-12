module.exports = {
  // '.js' is inferred via package.json "type": "module" so we only need to specify .jsx
  extensionsToTreatAsEsm: ['.jsx'],
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.[tj]sx?$': ['babel-jest', { extensionsToTreatAsEsm: ['.jsx'] }]
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
};
