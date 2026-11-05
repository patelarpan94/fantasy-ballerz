/* ============================================================================
   2.47 (2026-11-05). Arp: "optimize the new era dashboard page to make it clean
   and organized". The New Era + board had grown to 28 widgets (about 9,700px on
   a desktop, 13,000px on a phone), with several showing the same thing twice and
   gaps beside short side widgets.
   - One clear default layout (21 widgets): hero, then Today, Win the week, Your
     squad, The race. Duplicates leave the default (Live ticker, Matchup
     heartbeat, Category targets, Projected final, Lineup efficiency, Bench
     wasted, Power climb); all stay in + Add widget.
   - Desktop packs side widgets under each other next to the wide ones, so no
     empty holes (sections keep their order).
   - The planner's Who plays when grid starts folded.
   ============================================================================ */
NEP_DEF.splice(0,NEP_DEF.length,
  ["xa","f"],["kp","f"],
  ["hd","f",{t:"Today"}],["gp","w"],["cd","s"],["ow","s"],["tl","w"],
  ["hd","f",{t:"Win the week"}],["pl","f"],["cl","w"],["op","s"],["or","w"],
  ["hd","f",{t:"Your squad"}],["id","f"],["sd","w"],["hc","s"],["rw","f"],
  ["hd","f",{t:"The race"}],["po","w"],["tc","s"],["ls","f"],["ps","f"]);
NEP_VER=7;

// desktop: each tile spans as many 4px rows as it is tall, so short side widgets stack beside a tall one.
// Placement stays in order (no "dense"), so nothing jumps above its section title.
let NEP_RO=null;
function nepPack(){const g=$("#dgrid");if(!g)return;const on=nepOn()&&!DASH_EDIT&&!DASH_DRAG&&!PHONE()&&getComputedStyle(g).gridTemplateColumns.split(" ").length>=3;
  g.classList.toggle("npack",on);const ts=[...g.querySelectorAll(".dtile[data-dw]")];
  if(!on){ts.forEach(t=>t.style.gridRowEnd="");if(NEP_RO){NEP_RO.disconnect();NEP_RO=null;}return;}
  const fit=t=>{const h=t.getBoundingClientRect().height;t.style.gridRowEnd=h?`span ${Math.ceil((h+16)/4)}`:"";};
  ts.forEach(fit);
  if("ResizeObserver" in window){if(NEP_RO)NEP_RO.disconnect();NEP_RO=new ResizeObserver(es=>es.forEach(e=>fit(e.target)));ts.forEach(t=>NEP_RO.observe(t));}}
{const _rr=renderRosters;renderRosters=function(){const r=_rr.apply(this,arguments);if(nav==="dash")try{nepPack();}catch(e){}return r;};}
addEventListener("resize",()=>{if(nav==="dash")try{nepPack();}catch(e){}});

{const s=document.createElement("style");s.textContent=`
.dgrid.npack{grid-auto-rows:4px;row-gap:0;grid-auto-flow:row}
.dgrid.npack>.dtile{margin-bottom:16px}
`;document.head.appendChild(s);}
