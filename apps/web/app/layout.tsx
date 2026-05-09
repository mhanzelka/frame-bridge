import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "frame-bridge · Type-safe cross-frame messaging",
    description:
        "Type-safe messaging between browser windows, iframes, and tabs. BroadcastChannel, postMessage, and MessageChannel with a unified request/response API.",
};

type RootLayoutProps = { children: React.ReactNode };

const RootLayout = ({ children }: RootLayoutProps) => (
    <html lang="en">
        <head>
            <script
                defer
                src="https://analytics.ares.miroslavhanzelka.cz/script.js"
                data-website-id="b9e743e9-1ecb-47cb-815c-f1496a39166a"
            />
        </head>
        <body className="bg-zinc-950 text-zinc-100 antialiased">
            {children}
        </body>
    </html>
);

export default RootLayout;
