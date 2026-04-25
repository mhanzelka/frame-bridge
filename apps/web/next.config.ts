import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    outputFileTracingRoot: path.join(__dirname, "../../"),
    transpilePackages: [
        "@mhanzelka/frame-bridge",
        "@mhanzelka/react-frame-bridge",
        "@mhanzelka/react-frame-bridge-devtools",
    ],
};

export default nextConfig;
