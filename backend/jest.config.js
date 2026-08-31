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
  // `text` imprime a tabela por arquivo no terminal, `html` gera o relatorio
  // navegavel em coverage/lcov-report/index.html e `lcov` alimenta o CI.
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  // O projeto exige cobertura acima de 75% no backend. Os pisos abaixo ficam
  // acima desse minimo e travam o `npm test` caso a cobertura regrida.
  coverageThreshold: {
    global: {
      statements: 88,
      branches: 78,
      functions: 90,
      lines: 92,
    },
  },
};
