/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  clearMocks: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  maxWorkers: 1,
  transform: {
    '.ts': ['ts-jest', { tsconfig: './tsconfig.jest.json' }],
  },
  "moduleNameMapper": {
    "@src/(.*)": "<rootDir>/src/$1"
  }
};
