import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alvokor MCP",
  description: "Private MCP gateway for Alvokor integrations"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Arial, sans-serif", margin: 40, lineHeight: 1.6 }}>
        {children}
      </body>
    </html>
  );
}
