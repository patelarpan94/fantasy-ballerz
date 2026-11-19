/* ============================================================================
   CONNECTOR ONLY (2.90, 2026-11-19). Arp: "remove the claude button as we will use
   the connector. Make instructions available somewhere." The Ask Claude buttons
   (✳ on every screen, player cards, planner box) are hidden; the ai feed that the
   connector reads keeps running. Setup steps live in Help › Ask Claude about the league.
   ============================================================================ */
{const s=document.createElement("style");s.textContent=`.askfab,.askx-pc,.ask-c{display:none!important}.hcl-url{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center}.hcl-url code{word-break:break-all}`;document.head.appendChild(s);
  const rm=()=>document.getElementById("askFab")?.remove();if(document.body)rm();else document.addEventListener("DOMContentLoaded",rm);}
(function(){const u=(window.DF_CONFIG&&window.DF_CONFIG.mcp)||"";
  const fill=()=>{const c=document.getElementById("hClaudeUrl"),b=document.getElementById("hClaudeCp");if(!c)return;
    if(!u){c.textContent="ask the commissioner for the link";if(b)b.hidden=true;return;}c.textContent=u;
    if(b&&!b.dataset.on){b.dataset.on=1;b.onclick=()=>{try{navigator.clipboard.writeText(u).then(()=>toast("Connector link copied."),()=>toast(u));}catch(e){toast(u);}};}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fill);else fill();})();
