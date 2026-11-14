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
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  // A cobertura precisa ficar acima de 75% em todas as metricas (inclusive
  // branches). Services, hooks, contexts e utils concentram a regra de negocio
  // e tem limites proprios mais altos; o limite `global` vale para o restante
  // (telas, componentes e features).
  coverageThreshold: {
    global: { statements: 76, branches: 76, functions: 76, lines: 76 },
    './src/services/': { statements: 85, branches: 80, functions: 90, lines: 85 },
    './src/hooks/': { statements: 95, branches: 90, functions: 95, lines: 95 },
    './src/contexts/': { statements: 95, branches: 85, functions: 95, lines: 95 },
    './src/utils/': { statements: 95, branches: 90, functions: 95, lines: 95 },
  },
};
