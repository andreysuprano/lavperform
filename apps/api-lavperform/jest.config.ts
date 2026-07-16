import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/instrument.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/', '<rootDir>/test/'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/test/integration/',
    '/test/e2e/',
    '/test/contract/',
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/src/main.ts',
    '<rootDir>/src/app.module.ts',
    '<rootDir>/src/instrument.ts',
    '<rootDir>/src/.*/module\\.ts$',
    '<rootDir>/src/.*/controller\\.ts$',
    '<rootDir>/src/.*/guards/.*',
    '<rootDir>/src/.*/interceptors/.*',
    '<rootDir>/src/.*/filters/.*',
    '<rootDir>/src/.*/pipes/.*',
    '<rootDir>/src/.*/dto/.*',
    '<rootDir>/src/.*/events/.*',
  ],
  setupFilesAfterEnv: [],
};

export default config;
