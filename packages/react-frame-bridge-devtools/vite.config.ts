import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";
import fg from "fast-glob";
import tailwindcss from "@tailwindcss/vite";
import preserveDirectives from "rollup-preserve-directives";

function normalizeId(raw: string) {
    return raw
        .replace(/^\0+(commonjs-proxy:)?/, "")
        .split("?")[0]
        .split("#")[0]
        .replace(/\\/g, "/");
}

const isExternal = (rawId: string) => {
    const id = normalizeId(rawId);
    if (/^@\//.test(id)) return false;
    if (id.startsWith("src/") || id.startsWith("./src/")) return false;
    if (/\.(css|scss|sass|less|styl|pcss)$/.test(id)) return false;
    if (id.startsWith("node:")) return true;
    if (id.includes("/node_modules/")) return true;
    if (!id.startsWith(".") && !id.startsWith("/")) return true;
    return false;
};

function getInputs() {
    return fg.sync(
        [
            "src/**/*.{ts,tsx}",
            "!src/**/*.test.{ts,tsx}",
            "!src/**/__tests__/**",
        ],
        { dot: false, absolute: true }
    );
}

export default defineConfig({
    plugins: [
        preserveDirectives(),
        tsconfigPaths(),
        react(),
        tailwindcss(),
        dts({
            outDir: "dist",
            entryRoot: "src",
            insertTypesEntry: false,
            tsconfigPath: "./tsconfig.json",
        }),
    ],
    optimizeDeps: { noDiscovery: true },
    build: {
        outDir: "dist",
        emptyOutDir: true,
        target: "es2020",
        sourcemap: true,
        cssCodeSplit: true,
        rollupOptions: {
            preserveEntrySignatures: "exports-only",
            input: getInputs(),
            external: isExternal,
            output: [
                {
                    dir: "dist",
                    format: "es",
                    preserveModules: true,
                    preserveModulesRoot: "src",
                    entryFileNames: "[name].js",
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name === "globals.css") return "styles.css";
                        return "[name][extname]";
                    },
                },
            ],
        },
    },
});
