/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/backend/src/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/backend/src/__tests__/setup.ts'],
  testTimeout: 10000,
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'backend/src/**/*.ts',
    '!backend/src/**/*.test.ts',
    '!backend/src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};