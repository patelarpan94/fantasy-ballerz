/* ============================================================================
   2.49 (2026-11-05). Arp: "you know the today lineup for my team on the New Era
   dashboard. Can we add one for the opponent's team to see his team live as
   well?" Their lineup today: same look as Today's lineup, for this matchup's
   opponent, read-only, with live lines once games start.
   ============================================================================ */
DW.otl={name:"Their lineup today",desc:"Your opponent's lineup today: who starts, who sits, their games and live stat lines as games go on, and open spots their bench could fill. Read-only.",s:"w",
  view(w,T){const o=dOpp(T);if(!o)return dashEmpty("No opponent this week.");
    let h=DW.tl.view(w,o);
    // read-only even for the commissioner: slot buttons become plain labels, no Auto-set or tap hint
    h=h.replace(/<button class="mvb ([^"]*?)(?: on)?(?: lk)?"[^>]*>([^<]*)<span class="mvi"[^>]*>[^<]*<\/span><\/button>/g,'<span class="slot $1">$2</span>')
      .replace(/<button class="btn sm" data-dauto="today">[^<]*<\/button>/,"").replace(/<p class="dsm muted">Tap a slot[\s\S]*?<\/p>/,"");
    // their view, so drop the "you can set it" hints and name whose lineup it is
    h=h.replace(/<p class="dmir">[\s\S]*?<\/p>/,"").replace(/open spot(s?) the bench could fill/,"open spot$1 they left empty");
    return `<p class="otl-who"><b>${esc(TEAMS[o].name)}</b><span class="muted"> · your opponent</span></p>${h}`;}};

NEP_DEF.splice(NEP_DEF.findIndex(x=>x[0]==="tl")+1,0,["otl","w"]);
// boards already set up get the widget once, right after Today's lineup
function otlAdd(){if(!prefKey()||!UI.dash||UI.dash.otl)return;const bs=dashBoards(),b=bs.find(x=>x.id===NEP_ID);
  if(!b){if(UI.dash.nep)dashBoardSet({otl:1});return;}
  if(b.w.some(x=>x.k==="otl")){dashBoardSet({otl:1});return;}
  const w=b.w.slice(),i=w.findIndex(x=>x.k==="tl"),nw={id:"o"+Date.now().toString(36),k:"otl",s:"w",o:{}};
  w.splice(i>=0?i+1:w.length,0,nw);dashBoardSet({boards:bs.map(x=>x.id===NEP_ID?{...x,w}:x),otl:1});}
{const _rr=renderRosters;renderRosters=function(){if(nav==="dash"&&!DASH_DRAG&&!DASH_EDIT)try{otlAdd();}catch(e){}return _rr.apply(this,arguments);};}

{const s=document.createElement("style");s.textContent=`
.otl-who{margin:0 0 6px;font-size:.85rem}
.dk-otl .dtl li.off{opacity:.7}
`;document.head.appendChild(s);}

// computers: Today's lineup and Their lineup today side by side. The packed grid runs at double columns, so each gets half.
{const _np=nepPack;nepPack=function(){const g=$("#dgrid");
  if(g)g.style.setProperty("--nc",Math.max(1,Math.floor((g.clientWidth+14)/294))*2);
  const r=_np.apply(this,arguments);if(!g)return r;
  const ts=[...g.children].filter(t=>t.classList.contains("dtile"));
  ts.forEach(t=>{if(t.classList.contains("dpl")||t.classList.contains("dpr")){t.classList.remove("dpl","dpr");t.style.gridColumn="";}});
  if(g.classList.contains("npack"))for(let i=0;i+1<ts.length;i++){const a=ts[i],b=ts[i+1],k=t=>t.classList.contains("dk-tl")?1:t.classList.contains("dk-otl")?2:0;
    if(k(a)&&k(b)&&k(a)!==k(b)){a.classList.add("dpl");b.classList.add("dpr");const h=`span ${+g.style.getPropertyValue("--nc")/2}`;a.style.gridColumn=b.style.gridColumn=h;break;}}
  return r;};}
{const s=document.createElement("style");s.textContent=`
.dgrid.npack{grid-template-columns:repeat(var(--nc,6),minmax(0,1fr))}
.dgrid.npack>.dtile.sz-s{grid-column:span 2}.dgrid.npack>.dtile.sz-w{grid-column:span 4}.dgrid.npack>.dtile.sz-f{grid-column:1/-1}
`;document.head.appendChild(s);}
DKEEP.push("dpl","dpr");
