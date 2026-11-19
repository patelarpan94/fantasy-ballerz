# Claude connector relay

Claude's custom connectors don't follow the 302 redirect that Google Apps Script
sends for every POST, so the connector URL points at this tiny Cloudflare Worker
(free plan), which forwards to the app's server and answers Claude directly.

Setup (once):
1. dash.cloudflare.com → sign up (free) → Workers & Pages → Create → Worker → "Hello World" → name it `ballerz-claude` → Deploy.
2. Edit code → replace everything with `worker.js` from this folder → Deploy.
3. The worker URL is `https://ballerz-claude.<your-subdomain>.workers.dev`.
   Connector URLs: UAT = `<worker URL>/uat`, Live = `<worker URL>/live`.
4. Put them in `config.json` as `"mcp"` for each site so the app's Ask Claude sheet shows them.
