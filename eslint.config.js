const eslint = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const importPlugin = require("eslint-plugin-import");
const prettier = require("eslint-plugin-prettier");

module.exports = [
    {
        ignores: [
            "node_modules/**",
            "dist/**",
            "coverage/**",
            "rollup.config.js",
            "scripts/**",
            "packages/**",
            "benchmark/**",
            "**/jest.config.js",
            "**/*.js",
            "!eslint.config.js",
        ],
    },
    eslint.configs.recommended,
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: {
                    arrowFunctions: true,
                    jsx: true,
                },
            },
            globals: {
                React: "readonly",
                JSX: "readonly",
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                module: "readonly",
                require: "readonly",
                exports: "readonly",
                jest: "readonly",
                describe: "readonly",
                it: "readonly",
                test: "readonly",
                expect: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
                setTimeout: "readonly",
                queueMicrotask: "readonly",
                structuredClone: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
            react: react,
            "react-hooks": reactHooks,
            import: importPlugin,
            prettier: prettier,
        },
        settings: {
            react: {
                version: "detect",
            },
            "import/resolver": {
                node: {
                    extensions: [".ts", ".tsx"],
                    paths: ["./src"],
                },
            },
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...react.configs.recommended.rules,
            ...react.configs["jsx-runtime"].rules,
            "no-undef": "warn",
            "comma-dangle": "off",
            "function-paren-newline": "off",
            "global-require": "off",
            "import/no-dynamic-require": "off",
            "no-inner-declarations": "warn",
            "import/extensions": "off",
            "import/prefer-default-export": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-var-requires": "warn",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-expressions": "warn",
            "@typescript-eslint/no-unsafe-function-type": "warn",
            "@typescript-eslint/no-require-imports": "warn",
            "react/display-name": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-non-null-assertion": "off",
            "react-hooks/rules-of-hooks": "warn",
            "react-hooks/exhaustive-deps": "warn",
            "prettier/prettier": "warn",
        },
    },
];
