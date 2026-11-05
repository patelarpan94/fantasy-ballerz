/* ============================================================================
   2.58 (2026-11-05). Arp: "Organize the new era dashboard. Make it clean and
   organized with the new tools" + "do research and find the most useful tool for
   a manager to be successful".
   Research (Yahoo/Athlon H2H guides, RotoWire, Hashtag/Basketball Monster tool
   sets, a 9-cat GM decision breakdown): winning managers get the daily calls
   right (lineup, streaming, late scratches) and the rare, high-impact ones right
   (trades, build, playoff planning). The app already covers the daily side
   (planner, closer, First to the wire, auto lineup) and the season side (Season
   win plan, playoff odds). The gap: trades only appear after you pick ONE team
   in Analytics, so most managers never see the deal that fixes their team.
   Trade radar scans every team in the league for trades that help BOTH sides
   (so they get accepted), ranked by how many more categories a week you'd win,
   with what it adds up to over the rest of the season.
   The New Era + board is regrouped by when you make each call:
   Right now / Win this week / Build your team / The season.
   ============================================================================ */
// ---------- Trade radar ----------
let TGR=null,TGR_K="",TGR_BUSY=false;
const tgrDeadline=()=>{const d=L&&L.trades&&+L.trades.deadline;return d&&Date.now()>d?d:0;};
function tgrKey(T){return [T,TODAY,ROSTER_MAX,TXLOG.length,Object.keys(INJ).length,L.teams.map(t=>rosterNow(tnum(t.id)).length).join(".")].join("|");}
// every other team, one at a time with a pause in between so the page never freezes; returns undefined while it works
function dTradeRadar(T){const k=tgrKey(T);if(TGR_K===k&&TGR)return TGR;if(TGR_BUSY)return TGR&&TGR.T===T?TGR:undefined;
  TGR_BUSY=true;const keep={mode:TT.mode,sort:TT.sort,size:TT.size},ids=L.teams.map(t=>tnum(t.id)).filter(x=>x!==T&&TEAMS[x]&&TEAMS[x].P.length),all=[];let i=0,base=null,G=null;
  const step=()=>{try{Object.assign(TT,{mode:"proj",sort:"fair",size:"all"});
      if(i<ids.length){const O=ids[i++],r=ttTrades(T,O);G=r.G;if(base==null)base=r.baseT;r.list.slice(0,4).forEach(x=>all.push({...x,O}));Object.assign(TT,keep);setTimeout(step,0);return;}
      Object.assign(TT,keep);
      // best first by a fair-deal score; each of your players in at most two ideas, each team at most twice
      const key=x=>Math.min(x.a,x.b*1.5)+.6*x.a,seen={},per={};all.sort((x,y)=>key(y)-key(x));
      const list=all.filter(x=>{if((per[x.O]||0)>=2||x.give.some(n=>(seen[n]||0)>=2))return false;per[x.O]=(per[x.O]||0)+1;x.give.forEach(n=>seen[n]=(seen[n]||0)+1);return true;}).slice(0,6);
      // which categories each deal moves for you (expected weekly wins vs an average team)
      list.forEach(x=>{if(!G)return;const others=G.ids.filter(y=>y!==T);x.cats=CATS.map(c=>{const p=(S)=>others.reduce((s,y)=>s+ttPhi((val(S,c)-val(y===x.O?x.nO:G.S[y],c))/G.sd[c[0]]),0)/(others.length||1);
        return {c:c[0],d:p(x.nT)-p(G.S[T])};}).filter(z=>Math.abs(z.d)>=.04).sort((a,b)=>b.d-a.d);});
      TGR={T,list,base,n:all.length,at:Date.now()};TGR_K=k;}
    catch(e){Object.assign(TT,keep);TGR={T,list:[],base:0,n:0,err:true};TGR_K=k;}
    TGR_BUSY=false;if(nav==="dash")try{dashDraw();}catch(e){}};
  setTimeout(step,30);return TGR&&TGR.T===T?TGR:undefined;}
const tgrWksLeft=()=>{const cw=dCurWk(),reg=regWeeks();return Math.max(0,reg-cw+(TODAY<=(CAL[cw-1]||[])[2]?1:0));};
let TGR_LIST=[];
DW.tg={name:"Trade radar",desc:"Scans every team in the league for trades that help you AND them (so they're likely to say yes), ranked by how many more categories a week you'd win. One tap to tweak it in Trade packages or send the offer.",s:"f",
  view(w,T){if(tgrDeadline())return `<p class="dempty">The trade deadline has passed. Pickups are your only moves now: see the Win-the-week planner.</p>`;
    const r=dTradeRadar(T);if(!r)return `<p class="dempty tg-busy">Checking every team's roster for deals that work for both sides…</p>`;
    if(!r.list.length)return `<p class="dempty">No trade found that clearly helps both you and the other team right now. Rosters change every day, so check back after the next injury or pickup.</p>`;
    TGR_LIST=r.list;const ed=dCanEdit(T),wl=tgrWksLeft(),phone=PHONE()||w.s==="s";
    const nm=ns=>ns.map(n=>`<span class="tg-p">${dFace(n,(DIR[n]||{}).t,"sm")}<b>${dashNm(n)}</b></span>`).join("");
    return `<p class="tg-sum">Your roster wins about <b class="num">${r.base.toFixed(1)}</b> of ${CATS.length} categories a week against an average team. These ${r.list.length} deals raise that, and the other side gains too.</p>
      <ol class="tg-l">${r.list.slice(0,phone?3:6).map((x,i)=>{const up=(x.cats||[]).filter(z=>z.d>0).slice(0,3),dn=(x.cats||[]).filter(z=>z.d<0).slice(-2);
        return `<li><div class="tg-top"><span class="hav op xs">${esc(tmInit(x.O))}</span><b>${esc(TEAMS[x.O].name)}</b><span class="tg-g num">+${x.a.toFixed(2)}<small> cats/wk</small></span></div>
        <div class="tg-sw"><div><small>You give</small>${nm(x.give)}</div><span class="tg-ar" aria-hidden="true">⇄</span><div><small>You get</small>${nm(x.get)}${x.fa&&x.give.length>x.get.length?`<span class="tg-fa">+ add ${esc(dashLast(x.fa))} (FA)</span>`:""}</div></div>
        <p class="tg-why">${up.length?`Helps ${up.map(z=>`<b>${esc(z.c)}</b>`).join(", ")}`:""}${dn.length?` · costs ${dn.map(z=>esc(z.c)).join(", ")}`:""}${wl?` · about <b>+${(x.a*wl).toFixed(1)}</b> category wins over the ${wl} regular-season week${wl>1?"s":""} left`:""} · they gain +${x.b.toFixed(2)}${x.fa&&x.get.length>x.give.length?` and add ${esc(dashLast(x.fa))}`:""}</p>
        <div class="tg-act"><button class="btn sm ghost" data-tgpkg="${i}">Tweak in Trade packages</button>${ed?`<button class="btn sm" data-tgoffer="${i}">Offer trade</button>`:""}</div></li>`;}).join("")}</ol>
      <p class="dsm muted">Uses ESPN projections for players not on IR or OUT. +cats/wk = extra categories you'd expect to win each week against an average team in this league. Only deals where the other manager also comes out ahead are shown, best fit first.</p>`;}};
document.addEventListener("click",e=>{const b=e.target.closest("[data-tgpkg],[data-tgoffer]");if(!b)return;e.preventDefault();e.stopPropagation();
  const x=TGR_LIST[+(b.dataset.tgpkg??b.dataset.tgoffer)];if(!x)return;const T=dashT();
  if(b.dataset.tgpkg!=null)return pkOpen(T,x.give,x.O,x.get);offerTrade(x.O,x.give.slice(),x.get.slice());},true);

// ---------- New Era +: grouped by when you make each call ----------
NEP_DEF.splice(0,NEP_DEF.length,
  ["xa","f"],["kp","f"],
  ["hd","f",{t:"Right now",sub:"Injury news, today's lineups and anything to fix before tip-off"}],["fw","f"],["gp","w"],["cd","s"],["tl","w"],["otl","w"],
  ["hd","f",{t:"Win this week",sub:"Who to stream, which categories to chase and what your opponent is doing"}],["pl","f"],["cl","w"],["ow","s"],["op","s"],
  ["hd","f",{t:"Build your team",sub:"Trades and pickups that make you better for the rest of the season"}],["tg","f"],["id","f"],["or","w"],["hc","s"],
  ["hd","f",{t:"The season",sub:"Your path to the playoffs, week by week"}],["sv","f"],["po","w"],["ps","s"],["ls","f"]);
NEP_VER=8;

{const s=document.createElement("style");s.textContent=`
.tg-sum{margin:0 0 10px;font-size:.88rem}
.tg-l{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
.tg-l>li{border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;background:color-mix(in srgb,var(--surface) 92%,var(--accent) 8%)}
.tg-top{display:flex;align-items:center;gap:8px}.tg-top>b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tg-g{font-weight:800;color:var(--win,#2e7d32);font-size:1.05rem}.tg-g small{font-size:.66rem;font-weight:600;color:var(--muted)}
.tg-sw{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:start}
.tg-sw>div{display:flex;flex-direction:column;gap:4px;min-width:0}.tg-sw small{font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.tg-p{display:flex;align-items:center;gap:6px;min-width:0}.tg-p b{font-size:.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tg-ar{align-self:center;color:var(--muted);font-size:1.1rem}
.tg-fa{font-size:.72rem;color:var(--muted)}
.tg-why{margin:0;font-size:.78rem;color:var(--muted);line-height:1.4}.tg-why b{color:var(--ink)}
.tg-act{display:flex;gap:6px;flex-wrap:wrap}
.tg-busy{animation:tgp 1.4s ease-in-out infinite}@keyframes tgp{50%{opacity:.5}}
@media (prefers-reduced-motion:reduce){.tg-busy{animation:none}}
.dash.dnep .tg-l>li{background:rgba(255,255,255,.04)}
`;document.head.appendChild(s);}
