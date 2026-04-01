/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  maxWorkers: 1,
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/ui/components/AppFrame.tsx',
    '!src/ui/components/CliHeader.tsx',
    '!src/ui/components/JobsTable.tsx',
    '!src/ui/components/RunsTable.tsx',
    '!src/utils/notify.ts',
    '!src/services/export/fileNaming.ts',
    '!src/services/export/jsonResults.ts'
  ]
};
