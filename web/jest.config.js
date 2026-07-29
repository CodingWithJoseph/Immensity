const nextJest = require('next/jest')

// Point next/jest at the app root so it can load next.config + SWC transforms.
const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const customJestConfig = {
    testEnvironment: 'jest-environment-jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        // Mirror the tsconfig "@/*" path alias.
        '^@/(.*)$': '<rootDir>/$1',
    },
    testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/tests/unit/**/*.test.{ts,tsx}'],
    collectCoverageFrom: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
    ],
}

module.exports = createJestConfig(customJestConfig)
