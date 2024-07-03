/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  clearMocks: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  passWithNoTests: true,
  transform: {
    '.ts': ['ts-jest', { tsconfig: './tsconfig.jest.json' }],
  },
};
