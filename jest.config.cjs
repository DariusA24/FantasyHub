/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',

  // Use jsdom for React component tests
  testEnvironment: 'jsdom',

  // Include .tsx files in test patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],

  // Transform both .ts and .tsx files with JSX support
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },

  // Include tsx in file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Fix path alias to match your project root
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },

  // Setup file for jest-dom matchers
  setupFilesAfterSetup: ['<rootDir>/jest.setup.ts'],

  // Include tsx in coverage
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**'
  ],
  coverageDirectory: 'coverage',

  clearMocks: true,
  verbose: true,
};