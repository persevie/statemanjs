import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
    verbose: true,
    transform: {
        "^.+\\.ts?$": "ts-jest",
    },
    rootDir: "./src",
    testEnvironmentOptions: {
        customExportConditions: ["jsdom", "node", "node-addons"],
    },
    testEnvironment: "jsdom",
    preset: "ts-jest",
    collectCoverage: true,
    collectCoverageFrom: [
        "**/*.{js,jsx,ts,tsx}",
        "!**/node_modules/**",
        "!**/vendor/**",
        "!**/packages/**",
        "!**/coverage/**",
        "!**/*.config.{js,ts}",
        // TODO: add tests for solidjs and remove this line
        "!src/statemanjs-solid/**",
        "!src/statemanjs/index.ts",
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    coverageReporters: ["lcov", "text"],
};
export default config;
