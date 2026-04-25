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
        <body className="bg-zinc-950 text-zinc-100 antialiased">
            {children}
        </body>
    </html>
);

export default RootLayout;
