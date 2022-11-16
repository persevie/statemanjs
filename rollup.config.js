import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import { terser } from "rollup-plugin-terser";
import bundleSize from "rollup-plugin-bundle-size";
import copy from "rollup-plugin-copy";

const outDir = "package";
const name = "statemanjs-react";

export default [
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
