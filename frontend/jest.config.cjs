/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{js,jsx}'],
  setupFiles: ['<rootDir>/jest/setupEnv.js'],
  setupFilesAfterEnv: ['<rootDir>/jest/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(png|jpe?g|svg|gif|webp)$': '<rootDir>/jest/fileMock.js',
  },
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov'],
  // Os limites sao por camada: services, hooks, contexts e utils concentram a
  // regra de negocio e sao cobertos por testes de unidade. As telas em
  // `pages/` e `components/` ainda nao tem testes, entao um limite global
  // esconderia regressoes justamente nas camadas testadas.
  coverageThreshold: {
    './src/services/': { statements: 85, branches: 80, functions: 90, lines: 85 },
    './src/hooks/': { statements: 95, branches: 90, functions: 95, lines: 95 },
    './src/contexts/': { statements: 95, branches: 85, functions: 95, lines: 95 },
    './src/utils/': { statements: 95, branches: 90, functions: 95, lines: 95 },
  },
};
