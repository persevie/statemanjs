const dts = require("rollup-plugin-dts").default;
const esbuild = require("rollup-plugin-esbuild").default;
const terser = require("@rollup/plugin-terser");
const bundleSize = require("rollup-plugin-bundle-size");
const copy = require("rollup-plugin-copy");

const outDir = "package";
const name = "statemanjs";

module.exports = [
    {
        input: "src/index.ts",
        external: (id) => !/^[./]/.test(id),
        output: [
            {
                file: `${outDir}/${name}.js`,
                format: "cjs",
                exports: "auto",
                plugins: [terser()],
                sourcemap: true,
            },
            {
                file: `${outDir}/${name}.mjs`,
                format: "es",
                exports: "auto",
                plugins: [terser()],
                sourcemap: true,
            },
        ],
        plugins: [
            esbuild(),
            bundleSize(),
            copy({
                targets: [
                    {
                        src: "./LICENSE",
                        dest: "package",
                    },
                    {
                        src: "./README.md",
                        dest: "package",
                    },
                    {
                        src: "./assets",
                        dest: "package",
                    },
                ],
            }),
        ],
    },
    {
        plugins: [dts()],
        output: {
            file: `${outDir}/${name}.d.ts`,
            format: "es",
            exports: "default",
        },
        input: "src/index.ts",
        external: (id) => !/^[./]/.test(id),
    },
];
