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
        "!**/package/**",
        "!**/coverage/**",
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    coverageReporters: ["json", "lcov", "text", "clover"],
};
export default config;
