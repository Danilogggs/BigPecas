/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  // A cobertura precisa ficar acima de 75% em todas as metricas (inclusive
  // branches); o build falha se qualquer uma cair para 75% ou menos.
  coverageThreshold: {
    global: {
      statements: 76,
      branches: 76,
      functions: 80,
      lines: 76,
    },
  },
};
