module.exports = {
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts', '<rootDir>/server/tests/setup.ts'],
  testMatch: [
    '**/server/tests/**/*.test.ts',
    '**/server/tests/**/*.spec.ts',
    '**/src/**/*.spec.ts'
  ],
  transform: {
    '^.+\\.(ts|js|html)$': ['jest-preset-angular', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      stringifyContentPathRegex: '\\.(html|svg)$',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'server/**/*.ts',
    'src/**/*.ts',
    '!server/**/*.test.ts',
    '!server/**/*.spec.ts',
    '!server/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
};
