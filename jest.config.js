const pathsToModuleNameMapper =
  require("ts-jest/utils").pathsToModuleNameMapper;
const compilerOptions = require("./tsconfig.json").compilerOptions;
const { defaults } = require("jest-config");
process.env.STAGE = "test";

module.exports = {
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts"],
  testEnvironment: "node",
  moduleNameMapper:
    pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>/" }) ||
    {},
  globals: { "ts-jest": { diagnostics: false } },
  setupFilesAfterEnv: ["<rootDir>/test-support/jest-setup.ts"],
  clearMocks: true,
  resetMocks: true,
  resetModules: true,
  collectCoverageFrom: ["src/**/*.ts", "cdk/**/*.ts", "!**/test/**/*"],
  coverageDirectory: "test/coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "jest.config.js",
    "/bootstrap/",
    "index.ts",
    "metric-names.ts",
    "/src/helpers/secret",
    "/src/helpers/s3",
    "/src/helpers/dynamo",
    "types/",
  ],
  coverageReporters: ["text", "cobertura", "html", "lcov"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  preset: "ts-jest",
  reporters: [
    "default",
    [
      "jest-stare",
      {
        resultDir: "./test/jest-stare",
        coverageLink: "../coverage/lcov-report/index.html",
      },
    ],
  ],
  testPathIgnorePatterns: ["/node_modules/", "lib", "dist", ".stryker-tmp"],
  // testResultsProcessor: "jest-sonar-reporter",
  watchPathIgnorePatterns: ["/test/", "dist", ".stryker-tmp"],
};
