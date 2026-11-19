// Fantasy Ballerz Claude connector relay (Cloudflare Worker, free plan).
// Claude's connectors don't follow the 302 redirect Google Apps Script sends for
// every POST, so this relay passes Claude's MCP requests to the app's server
// (which follows the redirect itself) and returns the answer directly.
// Paths: /uat -> UAT server, / or /live -> Live server. Read-only data only.
const SERVERS = {
  uat: "https://script.google.com/macros/s/AKfycby3ghL7eesprTdB1BCH0Jblp8_8zt3u9VhVwRazRg-6fvgDD3h78ANdud_8JGQ7R3j9/exec",
  live: "https://script.google.com/macros/s/AKfycbyjnhCF002TeeWcwGzjwcXlT0F8mL_mr8eY2_uXvElZmW967dorBqzBNUffHoXiGmx6/exec",
};
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Authorization",
};
export default {
  async fetch(req) {
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, "") || "/";
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (path.startsWith("/.well-known")) return new Response("Not found", { status: 404, headers: CORS });   // no sign-in
    const site = path === "/uat" ? "uat" : path === "/" || path === "/live" ? "live" : null;
    if (!site) return new Response("Not found", { status: 404, headers: CORS });
    // live data page for the Ask Claude link: /uat?ai=6 (add &all=1 for every team)
    if (req.method === "GET" && url.searchParams.get("ai")) {
      const q = new URLSearchParams({ ai: url.searchParams.get("ai") }); if (url.searchParams.get("all")) q.set("all", "1");
      const r = await fetch(SERVERS[site] + "?" + q, { redirect: "follow" });
      return new Response(await r.text(), { status: 200, headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    }
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { ...CORS, Allow: "POST" } });
    const body = await req.text();
    let msg; try { msg = JSON.parse(body); } catch (e) { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400); }
    if (!msg || !msg.jsonrpc) return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } }, 400);
    const r = await fetch(SERVERS[site], { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body, redirect: "follow" });
    const text = await r.text();
    if (msg.id === undefined || msg.id === null) return new Response(null, { status: 202, headers: CORS });   // a notification
    try { JSON.parse(text); } catch (e) { return json({ jsonrpc: "2.0", id: msg.id, error: { code: -32603, message: "The league server didn't answer. Try again in a minute." } }, 200); }
    return new Response(text, { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  },
};
const json = (o, s) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
