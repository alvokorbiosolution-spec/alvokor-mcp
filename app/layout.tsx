import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Alvokor MCP",
  description: "Secure Alvokor business and social operations MCP server"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        {children}
      </body>
    </html>
  );
}
