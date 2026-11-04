/* ============================================================================
   NEW ERA + MAX (2.38, Arp 2026-11-04: "DO MORE I NEED THIS TO LOOK ABSOLUTELY
   AMAZING"). The New Era + board becomes a dark arena: a full-bleed night stage
   with a big title and court lines that draw in, numbered sections, tiles that
   rise in as you scroll, a light glare and slight tilt that follow the pointer,
   rotating neon borders on the featured tiles, and three photo-first widgets:
   Star duel, Matchup heartbeat and Roster wall. Reduce Motion turns it all off.
   ============================================================================ */
const nepOn=()=>nav==="dash"&&dashCur()===NEP_ID;
const dBestOf=id=>{let best=null;TEAMS[id].P.forEach(p=>{let v=0,g=0;const tot=new Array(11).fill(0);DAYS.filter(sp=>sp<=TODAY).forEach(sp=>{const d=p.d&&p.d[sp];if(d&&startedOn(p,sp)){g++;v+=gscore(d);d.forEach((x,i)=>tot[i]+=+x||0);}});
  if(g&&(!best||v>best.v))best={p,v,g,pg:tot.map(x=>x/g)};});
  if(!best){dNowP(id).forEach(p=>{const r=recentPG(p.n,7);if(r){const v=gscore(r.pg);if(!best||v>best.v)best={p,v,g:r.g,pg:r.pg,l7:1};}});}return best;};

/* ---- star duel ---- */
DW.sd={name:"Star duel",desc:"Your best player this matchup against your opponent's best, face to face, stat by stat.",s:"w",
  view(w,T){const opp=dOpp(T);if(!opp)return dashEmpty("No matchup this week.");const A=dBestOf(T),B=dBestOf(opp);if(!A||!B)return dashEmpty("The duel starts once both teams have played.");
    const st=[["PTS",K.PTS],["REB",K.REB],["AST",K.AST],["STL",K.STL],["BLK",K.BLK],["3PM",K.TPM]];
    const side=(x,cls,id)=>`<div class="sd-p ${cls}">${dFace(x.p.n,x.p.t,"xl")}<b>${dashNm(x.p.n)}</b><small>${esc(x.p.t)} · ${esc(dShort(id))} · ${x.g} game${x.g>1?"s":""}${x.l7?" (last 7 days)":""}</small><span class="sd-gs num">${dCount(Math.round(x.v/x.g),0)}<i>game score / game</i></span></div>`;
    return `<div class="sd">${side(A,"me",T)}<div class="sd-vs"><span>VS</span></div>${side(B,"op",opp)}</div>
      <div class="sd-st">${st.map(([l,i],j)=>{const a=A.pg[i]||0,b=B.pg[i]||0,m=Math.max(a,b,1e-9);return `<div class="sd-r" style="--d:${j*70}ms"><b class="num${a>b?" lead":""}">${a.toFixed(1)}</b><span class="sd-b me"><i class="dg2" style="--w:${(a/m*100).toFixed(0)}%"></i></span><span class="sd-l">${l}</span><span class="sd-b op"><i class="dg2" style="--w:${(b/m*100).toFixed(0)}%"></i></span><b class="num${b>a?" lead":""}">${b.toFixed(1)}</b></div>`;}).join("")}</div>`;}};

/* ---- matchup heartbeat ---- */
DW.hb={name:"Matchup heartbeat",desc:"Your win chance through the matchup as a glowing line with a pulse running along it.",s:"w",
  view(w,T){const opp=dOpp(T);if(!opp)return dashEmpty("No matchup this week.");const u=++NEP_U,D=dMatchDays(T,opp),Wd=window.DCH_W||560,H=150,P=24;
    const v=D.map(x=>x.p*100),n=v.length,x=i=>P+(n<2?(Wd-2*P)/2:i*(Wd-2*P)/(n-1)),y=p=>H-22-(p/100)*(H-40);
    const pts=v.map((p,i)=>[x(i),y(p)]),d=pts.map(([a,b],i)=>{if(!i)return `M${a.toFixed(1)},${b.toFixed(1)}`;const [pa,pb]=pts[i-1],cx=(pa+a)/2;return `C${cx.toFixed(1)},${pb.toFixed(1)} ${cx.toFixed(1)},${b.toFixed(1)} ${a.toFixed(1)},${b.toFixed(1)}`;}).join("");
    const now=v[n-1],up=n>1?now>=v[n-2]:true;
    return `<div class="hb-k"><b class="num ${now>=50?"okc":"badc"}">${dCount(Math.round(now),0,"hb"+T)}%</b><span class="muted">win chance${n>1?` · ${up?"up":"down"} ${Math.abs(Math.round(now-v[n-2]))} since yesterday`:""}</span><i class="hb-beat ${now>=50?"up":"down"}" aria-hidden="true"></i></div>
      <svg class="hb" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="Win chance by day"><defs><linearGradient id="hbg${u}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="hb-s1"/><stop offset="1" class="hb-s2"/></linearGradient><filter id="hbf${u}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>
        <line class="hb-50" x1="${P}" x2="${Wd-P}" y1="${y(50)}" y2="${y(50)}"/><text class="dax" x="${Wd-P}" y="${y(50)-5}" text-anchor="end">50%</text>
        ${n>1?`<path class="hb-area" d="${d}L${x(n-1)},${H-22}L${x(0)},${H-22}Z" fill="url(#hbg${u})"/><path class="hb-glow" d="${d}" filter="url(#hbf${u})"/><path class="hb-line dd" pathLength="1" d="${d}"/><path class="hb-pulse" pathLength="100" d="${d}"/>`:""}
        ${pts.map(([a,b],i)=>`<circle class="hb-dot${i===n-1?" last":""}" cx="${a}" cy="${b}" r="${i===n-1?5:3}"/>`).join("")}
        ${D.map((z,i)=>`<text class="dax" x="${x(i)}" y="${H-5}" text-anchor="middle">${z.sp==null?"Start":dow(z.sp).slice(0,3)}</text>`).join("")}</svg>`;}};

/* ---- roster wall ---- */
DW.rw={name:"Roster wall",desc:"Your whole team as photo cards: slot, last 7 days, and a warm glow for players running hot, cool for cold.",s:"f",
  view(w,T){const sp=TODAY,P=dNowP(T).slice().sort((a,b)=>(slotOn(a,sp)??12)-(slotOn(b,sp)??12));
    return `<div class="rw">${P.map((p,i)=>{const s=slotOn(p,sp),r=recentPG(p.n,7),ss=recentPG(p.n,400);let hc=null;try{hc=typeof arpHC==="function"?arpHC(p.n):null;}catch(e){}
      if(!hc&&r){const pj=pgLine(p.pj);if(pj){const d=zOf(r.pg)-zOf(pj);hc=d>=3?"hot":d<=-3?"cold":null;}}const g=gameOn(p.t,sp);
      return `<div class="rw-c${hc?" "+hc:""}${s===13?" ir":s===12?" be":""}" style="--d:${i*40}ms">${dFace(p.n,p.t,"xl")}<span class="rw-s">${s!=null?SLOT[s]:""}</span>${p.st&&p.st!=="ACTIVE"?`<span class="rw-st">${stTag(p.n,p.st)}</span>`:""}
        <b>${dashNm(p.n)}</b><small>${esc(p.t||"")}${g?` · ${g[1]?"vs":"@"} ${esc(g[0])}`:""}</small><span class="rw-l num">${r?pra(r.pg):"–"}</span>${hc?`<span class="rw-hc">${hc==="hot"?"🔥 hot":"❄ cold"}</span>`:""}</div>`;}).join("")}</div>
      <p class="dsm muted">Last 7 days: points / rebounds / assists. Glow = playing well above (hot) or below (cold) his ESPN projection lately.</p>`;}};

/* ---- the board, take two ---- */
NEP_DEF.splice(0,NEP_DEF.length,["xa","f"],["lt","f"],["hd","f",{t:"Win the week"}],["hb","w"],["ct","s"],["mw","w"],["ef","s"],["pf","f"],["hd","f",{t:"Your squad"}],["sd","w"],["cd","s"],["tl","w"],["hc","s"],["rw","f"],["hd","f",{t:"Around the league"}],["ls","w"],["tc","s"],["bw","s"],["sw","s"],["bp","w"]);
let NEP_VER=2;
function nepUpgrade(){if(!prefKey()||!UI.dash||(UI.dash.nep||0)>=NEP_VER)return;const bs=dashBoards();
  if(bs.some(b=>b.id===NEP_ID)){dashBoardSet({boards:bs.map(b=>b.id===NEP_ID?{...b,w:nepW()}:b),nep:NEP_VER});}else if(UI.dash.nep)dashBoardSet({nep:NEP_VER});}
{const _rr=renderRosters;renderRosters=function(){if(nav==="dash"&&!DASH_DRAG&&!DASH_EDIT)try{nepUpgrade();}catch(e){}const r=_rr.apply(this,arguments);document.body.classList.toggle("nepon",nepOn());try{nepAfter();}catch(e){}return r;};}
// title, subtitle and numbered sections
{const _dv=dashView;dashView=function(){let h=_dv.apply(this,arguments);if(dashCur()!==NEP_ID)return h;const T=dashT();let live=0;try{live=Object.values(LIVE&&LIVE.g||{}).filter(g=>g.s==="in").length/2;}catch(e){}
  const d=dateOf(TODAY),sub=`${esc(weekName(wk[0]))} · ${d.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}${live?` · <b class="nep-lv"><i class="dlive"></i>${Math.round(live)} live</b>`:""}`;
  h=h.replace(/<div class="dhead"><div><h2>Dashboard<\/h2><span class="muted">[\s\S]*?<\/span><\/div>/,`<div class="dhead"><div class="nep-hd"><svg class="nep-court" viewBox="0 0 600 200" aria-hidden="true"><path pathLength="1" d="M0,199H600M300,0V200M300,100m-46,0a46,46 0 1,0 92,0a46,46 0 1,0 -92,0M0,40H120V160H0M600,40H480V160H600M120,100m-40,0a40,40 0 0,1 80,0M480,100m40,0a40,40 0 0,0 -80,0"/></svg><h2 class="nep-title">NEW ERA<b>+</b></h2><span class="nep-sub">${TEAMS[T]?esc(TEAMS[T].name)+" · ":""}${sub}</span></div>`);
  let k=0;h=h.replace(/(<section class="dtile sz-f dk-hd"[\s\S]*?<h3>)/g,(m)=>m.replace('<h3>',`<h3><span class="nep-no">${String(++k).padStart(2,"0")}</span>`));
  return h;};}
// tiles rise in as they scroll into view (once per visit), glare follows the pointer
const NEP_SEEN=new Set();let NEP_IO=null;
function nepAfter(){if(!nepOn())return;const g=$("#dgrid");if(!g)return;const red=dReduce();
  if(!NEP_IO&&"IntersectionObserver" in window)NEP_IO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");NEP_SEEN.add(e.target.dataset.dw);NEP_IO.unobserve(e.target);}}),{rootMargin:"0px 0px -8% 0px"});
  g.querySelectorAll(".dtile[data-dw]").forEach(t=>{if(red||NEP_SEEN.has(t.dataset.dw)||!NEP_IO){t.classList.add("in");return;}t.classList.add("rv");NEP_IO.observe(t);});}
{const _sn=setNav;setNav=function(n){if(n==="dash"&&nav!=="dash")NEP_SEEN.clear();return _sn.apply(this,arguments);};}
{const _gb=dashGoBoard;dashGoBoard=function(){NEP_SEEN.clear();return _gb.apply(this,arguments);};}
document.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse"||!document.body.classList.contains("nepon")||dReduce()||DASH_EDIT)return;const t=e.target.closest&&e.target.closest(".dnep .dtile:not(.dk-hd)");
  if(!t)return;const r=t.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
  t.style.setProperty("--gx",(px*100).toFixed(1)+"%");t.style.setProperty("--gy",(py*100).toFixed(1)+"%");t.style.setProperty("--rx",((.5-py)*3).toFixed(2)+"deg");t.style.setProperty("--ry",((px-.5)*3).toFixed(2)+"deg");},{passive:true});
document.addEventListener("pointerout",e=>{const t=e.target.closest&&e.target.closest(".dnep .dtile");if(t&&!t.contains(e.relatedTarget)){t.style.removeProperty("--rx");t.style.removeProperty("--ry");}},{passive:true});

{const s=document.createElement("style");s.textContent=`
@property --nang{syntax:"<angle>";inherits:false;initial-value:0deg}
/* the night stage */
body.nepon{background:#050a18!important}
body.nepon #rosters{background:transparent}
.dash.dnep{--surface:#0f1730;--ink:#eef2ff;--muted:#97a3c6;--line:rgba(160,180,255,.14);--chip:rgba(255,255,255,.06);--accent-wash:color-mix(in srgb,var(--accent) 24%,transparent);color:var(--ink);color-scheme:dark}
.dash.dnep::before{inset:-60px -40px auto;height:1100px;opacity:1;background:radial-gradient(38% 40% at 12% 12%,color-mix(in srgb,var(--accent) 38%,transparent),transparent 70%),radial-gradient(30% 36% at 88% 6%,color-mix(in srgb,var(--s-op,#e2701f) 30%,transparent),transparent 70%),radial-gradient(40% 40% at 50% 55%,rgba(139,92,246,.22),transparent 70%)}
.dash.dnep::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:radial-gradient(rgba(255,255,255,.06) 1px,transparent 1px);background-size:22px 22px;-webkit-mask-image:linear-gradient(#000,transparent 900px);mask-image:linear-gradient(#000,transparent 900px)}
.dash.dnep .muted{color:var(--muted)}
.dash.dnep .btn.ghost,.dash.dnep .dbc{color:var(--ink);border-color:var(--line);background:rgba(255,255,255,.05)}
.dash.dnep .dbc[aria-selected="true"]{background:linear-gradient(90deg,var(--accent),#8b5cf6);color:#fff;border-color:transparent;box-shadow:0 6px 20px -8px var(--accent)}
.dash.dnep .dalerts li{background:rgba(255,255,255,.05)}.dash.dnep .dlivep{color:var(--muted)}
/* title */
.nep-hd{position:relative;padding:6px 0 2px}.nep-court{position:absolute;left:-6px;top:-14px;width:min(340px,70vw);height:auto;opacity:.18;pointer-events:none}
body.nepon .note{background:rgba(255,255,255,.06);color:#c9d2ee;border-color:rgba(255,255,255,.12)}
.nep-court path{fill:none;stroke:var(--accent);stroke-width:1.5;stroke-dasharray:1;stroke-dashoffset:0}
.nep-title{position:relative;margin:0;font-size:clamp(2.2rem,6vw,3.6rem)!important;line-height:.95;font-weight:900;letter-spacing:-.02em;font-style:italic;background:linear-gradient(100deg,#fff 0%,#c7d2fe 30%,var(--accent) 55%,#a78bfa 70%,#fff 90%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent!important;animation:neptt 7s ease-in-out infinite}
.nep-title b{font-style:normal;margin-left:6px;background:linear-gradient(135deg,var(--s-op,#e2701f),#f43f5e);-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block;animation:nepplus 3.5s ease-in-out infinite}
@keyframes neptt{50%{background-position:100% 0}}@keyframes nepplus{50%{transform:scale(1.15) rotate(8deg)}}
.nep-sub{position:relative;display:block;margin-top:6px;color:var(--muted);font-size:.86rem}.nep-lv{color:#4ade80;display:inline-flex;align-items:center;gap:5px}
.dfirst .nep-court path,.nep-court path{animation:nepcourt 2.4s cubic-bezier(.3,.7,.2,1) both}@keyframes nepcourt{from{stroke-dashoffset:1}}
/* numbered sections */
.dash.dnep .dtile.dk-hd .dth h3{font-size:1.1rem;gap:12px}.nep-no{font-style:normal;font-weight:900;font-size:1.9rem;line-height:1;-webkit-text-stroke:1.5px color-mix(in srgb,var(--accent) 80%,#fff);color:transparent;letter-spacing:-.02em;margin-right:2px}
/* tiles: glass on the dark stage, glare, tilt, scroll reveal */
.dash.dnep .dtile:not(.dk-hd):not(.dk-xa){position:relative;overflow:hidden;background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.025));border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 24px 48px -28px rgba(0,0,0,.8);backdrop-filter:none;transform:perspective(900px) rotateX(var(--rx,0)) rotateY(var(--ry,0));transition:transform .35s cubic-bezier(.3,.7,.2,1),box-shadow .3s,opacity .6s,translate .6s}
.dash.dnep .dtile:not(.dk-hd)::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:radial-gradient(420px circle at var(--gx,50%) var(--gy,-30%),rgba(255,255,255,.09),transparent 45%);opacity:0;transition:opacity .3s}
@media (hover:hover){.dash.dnep:not(.editing) .dtile:not(.dk-hd):hover::after{opacity:1}.dash.dnep:not(.editing) .dtile:not(.dk-hd):not(.dk-xa):hover{box-shadow:0 1px 0 rgba(255,255,255,.1) inset,0 30px 60px -28px color-mix(in srgb,var(--accent) 55%,#000)}}
.dash.dnep .dtile.rv{opacity:0;translate:0 28px}.dash.dnep .dtile.rv.in{opacity:1;translate:0 0}
.dash.dnep .dth h3{color:var(--ink)}
/* rotating neon border on the featured tiles */
.dash.dnep .dtile.dk-mw,.dash.dnep .dtile.dk-sd,.dash.dnep .dtile.dk-hb{border:1.5px solid transparent!important;background:linear-gradient(160deg,#121b38,#0c142b) padding-box,conic-gradient(from var(--nang),var(--accent),#a78bfa,var(--s-op,#e2701f),#22d3ee,var(--accent)) border-box!important;animation:nepspin 9s linear infinite}
@keyframes nepspin{to{--nang:360deg}}
/* inner pieces that were light-only */
.dash.dnep .mw-l li,.dash.dnep .ls-l li,.dash.dnep .dss2 li,.dash.dnep .dwac,.dash.dnep .xa-cat{background:rgba(255,255,255,.05)}
.dash.dnep .lt-lab{background:linear-gradient(90deg,var(--accent),#8b5cf6);color:#fff}
.dash.dnep .drrr:nth-child(odd){background:rgba(255,255,255,.035)}
.dash.dnep .dtl li.bad{background:rgba(248,113,113,.12)}.dash.dnep .dtl li.fill{background:rgba(250,204,21,.1)}
.dash.dnep .warnc,.dash.dnep .ct-l li.swing .ct-n{color:#facc15}
.dash.dnep .dgs b{color:var(--ink)}
/* star duel */
.sd{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}
.sd-p{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;min-width:0}.sd-p b{font-size:1.05rem}.sd-p small{color:var(--muted);font-size:.72rem}
.sd-p .dface.xl,.sd-p .arpface.xl{width:96px;height:96px;font-size:1.4rem}.sd-p.me .dface,.sd-p.me .arpface{box-shadow:0 0 0 3px var(--accent),0 0 30px -4px var(--accent)}.sd-p.op .dface,.sd-p.op .arpface{box-shadow:0 0 0 3px var(--s-op,#e2701f),0 0 30px -4px var(--s-op,#e2701f)}
.sd-gs{display:flex;flex-direction:column;align-items:center;font-size:1.6rem;font-weight:900;line-height:1;margin-top:4px}.sd-gs i{font-style:normal;font-size:.62rem;font-weight:600;color:var(--muted);margin-top:3px}
.sd-vs{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-style:italic;color:#fff;background:conic-gradient(var(--accent),#a78bfa,var(--s-op,#e2701f),var(--accent));box-shadow:0 0 30px -6px #a78bfa;animation:sdvs 2.6s ease-in-out infinite}
.sd-vs span{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:#0c142b}@keyframes sdvs{50%{transform:scale(1.08) rotate(6deg)}}
.sd-st{display:flex;flex-direction:column;gap:5px;margin-top:12px}
.sd-r{display:grid;grid-template-columns:40px 1fr 42px 1fr 40px;gap:8px;align-items:center;font-size:.8rem}.sd-r>b{color:var(--muted);font-weight:700}.sd-r>b:first-child{text-align:right}.sd-r>b.lead{color:var(--ink);font-weight:900}
.sd-l{text-align:center;font-weight:900;font-size:.68rem;letter-spacing:.06em;color:var(--muted)}
.sd-b{display:flex;height:8px;border-radius:4px;background:rgba(127,127,127,.15);overflow:hidden}.sd-b.me{justify-content:flex-end}.sd-b i{display:block;height:100%;width:var(--w);border-radius:4px}
.sd-b.me i{background:linear-gradient(270deg,var(--accent),color-mix(in srgb,var(--accent) 50%,#a78bfa))}.sd-b.op i{background:linear-gradient(90deg,var(--s-op,#e2701f),#f43f5e)}
@media (max-width:640px){.sd-p .dface.xl,.sd-p .arpface.xl{width:72px;height:72px}.sd-vs{width:40px;height:40px}.sd-vs span{width:34px;height:34px;font-size:.8rem}.sd-gs{font-size:1.2rem}}
/* heartbeat */
.hb-k{display:flex;align-items:center;gap:10px}.hb-k>b{font-size:2.2rem;font-weight:900;letter-spacing:-.02em}
.hb-beat{width:12px;height:12px;border-radius:50%;margin-left:auto;background:var(--win,#2e7d32);box-shadow:0 0 0 0 color-mix(in srgb,var(--win,#2e7d32) 60%,transparent);animation:hbbeat 1.1s ease-out infinite}.hb-beat.down{background:var(--loss,#c62828)}
@keyframes hbbeat{0%{transform:scale(1)}15%{transform:scale(1.35)}30%{transform:scale(1)}45%{transform:scale(1.2)}60%,100%{transform:scale(1);box-shadow:0 0 0 10px transparent}}
.hb{width:100%;height:auto;display:block;margin-top:6px;overflow:visible;font-family:inherit}.hb .dax{font-size:11px;font-weight:600;fill:var(--muted);font-family:inherit}.hb-50{stroke:var(--line);stroke-dasharray:4 4}
.hb-s1{stop-color:var(--accent);stop-opacity:.35}.hb-s2{stop-color:var(--accent);stop-opacity:0}
.hb-line{fill:none;stroke:var(--accent);stroke-width:3;stroke-linecap:round}.hb-glow{fill:none;stroke:var(--accent);stroke-width:8;opacity:.55}
.hb-pulse{fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round;stroke-dasharray:4 96;animation:hbrun 3.2s linear infinite;filter:drop-shadow(0 0 6px #fff)}@keyframes hbrun{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
.hb-dot{fill:var(--surface);stroke:var(--accent);stroke-width:2}.hb-dot.last{fill:var(--accent);stroke:#fff}
/* roster wall */
.rw{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
.rw-c{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:12px 8px 10px;border-radius:16px;background:rgba(127,127,127,.08);border:1px solid var(--line);overflow:hidden;min-width:0}
.rw-c .dface.xl,.rw-c .arpface.xl{width:64px;height:64px;font-size:1rem;margin-bottom:4px}
.rw-c b{font-size:.84rem;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rw-c small{font-size:.66rem;color:var(--muted)}.rw-l{font-size:.78rem;font-weight:800;margin-top:2px}
.rw-s{position:absolute;top:8px;left:8px;font-size:.6rem;font-weight:900;padding:2px 6px;border-radius:6px;background:var(--accent);color:#fff}.rw-c.be .rw-s{background:rgba(127,127,127,.4)}.rw-c.ir .rw-s{background:var(--loss,#c62828)}
.rw-st{position:absolute;top:6px;right:6px;transform:scale(.85);transform-origin:top right}
.rw-hc{font-size:.62rem;font-weight:800;margin-top:3px}
.rw-c.hot{border-color:rgba(251,146,60,.6);background:radial-gradient(120% 80% at 50% 0%,rgba(251,146,60,.28),rgba(127,127,127,.06));box-shadow:0 0 26px -10px rgba(251,146,60,.9)}.rw-c.hot .rw-hc{color:#fb923c}
.rw-c.cold{border-color:rgba(56,189,248,.5);background:radial-gradient(120% 80% at 50% 0%,rgba(56,189,248,.22),rgba(127,127,127,.06))}.rw-c.cold .rw-hc{color:#38bdf8}
.rw-c.ir{opacity:.6}
.dfirst .rw-c{animation:dpop .5s cubic-bezier(.3,1.4,.4,1) both;animation-delay:var(--d)}
@media (max-width:640px){.rw{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.rw-c{padding:10px 4px 8px}.rw-c .dface.xl,.rw-c .arpface.xl{width:48px;height:48px}.rw-c b{font-size:.74rem}.rw-l{font-size:.68rem}}
@media (prefers-reduced-motion:reduce){.nep-title,.nep-title b,.nep-court path,.dash.dnep .dtile.dk-mw,.dash.dnep .dtile.dk-sd,.dash.dnep .dtile.dk-hb,.sd-vs,.hb-beat,.hb-pulse,.dfirst .rw-c{animation:none!important}.dash.dnep .dtile{transform:none!important;transition:none!important}.dash.dnep .dtile.rv{opacity:1;translate:none}}
`;document.head.appendChild(s);}
