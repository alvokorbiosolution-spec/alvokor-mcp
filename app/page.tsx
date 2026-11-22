export default function Home() {
  return (
    <main style={{ maxWidth: 760, margin: "64px auto", padding: 32, background: "#fff", borderRadius: 16 }}>
      <h1>Alvokor MCP</h1>
      <p>Hybrid MCP gateway for Zoho Social operations and separately authorized Zoho CRM read access.</p>
      <p>Health: <a href="/api/health">/api/health</a></p>
      <p>MCP endpoint: <code>/api/mcp</code></p>
      <p>Protected by a bearer token. Connect only from an authorized MCP client.</p>
    </main>
  );
}
