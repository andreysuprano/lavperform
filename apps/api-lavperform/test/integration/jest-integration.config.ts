import type { Config } from 'jest';
import * as fs from 'fs';
import * as path from 'path';

// Pre-load env for configuration scope
const testEnvPath = path.join(__dirname, 'setup/test-env.json');
if (fs.existsSync(testEnvPath)) {
  const env = JSON.parse(fs.readFileSync(testEnvPath, 'utf-8'));
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.REDIS_HOST = env.REDIS_HOST;
  process.env.REDIS_PORT = env.REDIS_PORT;
  process.env.JWT_SECRET = env.JWT_SECRET;
}

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../../', // Go up to project root
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/integration/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/setup/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup/setup-after-env.ts'],
  maxWorkers: 1, // Sequential
  testTimeout: 60000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@faker-js/faker(.*)$': '<rootDir>/test/integration/setup/faker-mock.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!@faker-js)',
  ],
};

export default config;
