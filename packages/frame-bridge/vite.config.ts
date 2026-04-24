import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import fg from "fast-glob";
import tsconfigPaths from "vite-tsconfig-paths";
import { version } from "./package.json";

function getInputs() {
    return fg.sync(["src/**/*.ts", "!src/**/*.d.ts", "!src/**/*.test.ts"], { absolute: true });
}

export default defineConfig({
    define: {
        __BRIDGE_VERSION__: JSON.stringify(version),
    },
    build: {
        emptyOutDir: true,
        target: "es2020",
        sourcemap: true,
        minify: false,
        rollupOptions: {
            preserveEntrySignatures: "strict",
            input: getInputs(),
            output: {
                dir: "dist",
                format: "es",
                preserveModules: true,
                preserveModulesRoot: "src",
                entryFileNames: "[name].js"
            }
        }
    },
    plugins: [
        tsconfigPaths(),
        dts({
            entryRoot: "src",
            outDir: "dist",
            rollupTypes: false,
            insertTypesEntry: false,
            include: ["src"],
            exclude: ["src/**/*.test.ts"]
        })
    ]
});
