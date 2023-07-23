const dts = require("rollup-plugin-dts").default;
const esbuild = require("rollup-plugin-esbuild").default;
const terser = require("@rollup/plugin-terser");
const bundleSize = require("rollup-plugin-bundle-size");
const copy = require("rollup-plugin-copy");

const packageName = process.env.PACKAGE_NAME;

if (!packageName) {
    console.error("No package name provided");
    process.exit(1);
}

const outDir = `packages/${packageName}`;

module.exports = [
    {
        input: `src/${packageName}/index.ts`,
        external: (id) => !/^[./]/.test(id),
        output: [
            {
                file: `${outDir}/${packageName}.js`,
                format: "cjs",
                exports: "auto",
                plugins: [terser()],
                sourcemap: true,
            },
            {
                file: `${outDir}/${packageName}.mjs`,
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
                        dest: outDir,
                    },
                    {
                        src: "./README.md",
                        dest: outDir,
                    },
                ],
            }),
        ],
    },
    {
        plugins: [dts()],
        output: {
            file: `${outDir}/${packageName}.d.ts`,
            format: "es",
            exports: "default",
        },
        input: `src/${packageName}/index.ts`,
        external: (id) => !/^[./]/.test(id),
    },
];
