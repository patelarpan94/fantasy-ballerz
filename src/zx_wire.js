/* ============================================================================
   2.50 (2026-11-05). Arp: "tools that will navigate wins" → picked:
   - First to the wire (fw): the league server now checks injury news every
     5 minutes from 9 AM to 1 AM ET and stamps when each player was first ruled
     OUT (nba.outAt). New multi-game absences show here within minutes, with the
     teammates who really gain (Opportunity radar's with/without data) and a
     one-tap Add. New ones also pop a toast and a dashboard alert.
   - Season win plan (sv): every regular-season matchup left, projected from
     both rosters and that week's NBA schedule, your playoff odds, and how much
     each week moves them (win vs lose). Tells you which weeks are must-wins
     (use every pickup) and which to coast (don't drop good players for
     streamers), plus a trade-deadline checklist.
   ============================================================================ */

// ---------- First to the wire ----------
const WIRE_H=48*3600e3;
const wireAt=n=>{const o=NBA&&NBA.outAt;if(o)return o[n]||0;const d=((NBA&&NBA.injd)||{})[n];return d&&d.at||0;};
function dWire(){let xs=[];try{xs=dOppRadar();}catch(e){return [];}const now=Date.now();
  return xs.map(s=>({...s,at:wireAt(s.n)})).filter(s=>s.at&&now-s.at<WIRE_H&&(s.back==null||s.miss7>=2||s.missWk>=2)).sort((a,b)=>b.at-a.at);}
const wireKey=s=>s.n+":"+s.at;
const wireSeen=()=>{try{return JSON.parse(localStorage.getItem("dfWireSeen")||"[]");}catch(e){return [];}};
const wireMark=ks=>{try{localStorage.setItem("dfWireSeen",JSON.stringify([...new Set([...wireSeen(),...ks])].slice(-80)));}catch(e){}};
const agoTxt=ms=>{const m=Math.max(0,Math.round((Date.now()-ms)/60e3));return m<1?"just now":m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} h ago`:`${Math.round(m/1440)} d ago`;};
const wireBack=s=>s.back?`back ~${dow(s.back)} ${dateOf(s.back).toLocaleDateString("en-US",{month:"short",day:"numeric"})}`:"no return date";

DW.fw={name:"First to the wire",desc:"New multi-game absences within minutes of the news (checked every 5 minutes from 9 AM to 1 AM ET), the teammates who really gain from them, and a one-tap add before anyone else gets there.",s:"f",
  view(w,T){const xs=dWire(),ed=dCanEdit(T),seen=new Set(wireSeen()),ck=NBA&&NBA.injAt;
    const head=`<p class="fw-h"><span class="fw-dot${ck&&Date.now()-ck<15*60e3?" on":""}" aria-hidden="true"></span>Injury news checked ${ck?agoTxt(ck):"each hour"}</p>`;
    if(!xs.length)return head+`<p class="dempty">No new multi-game absences in the last 48 hours. When a starter is ruled out, his replacement shows up here with an Add button.</p>`;
    const fresh=xs.filter(s=>!seen.has(wireKey(s)));
    return head+`<ol class="fw-l">${xs.slice(0,w.s==="s"?2:4).map(s=>{const fa=s.bens.filter(b=>!b.own),tk=s.bens.filter(b=>b.own);const ij=((NBA&&NBA.injd)||{})[s.n]||{};
      return `<li class="${seen.has(wireKey(s))?"":"new"}"><div class="fw-st">${dFace(s.n,s.t,"sm")}<span><span class="fw-nm"><b>${dashNm(s.n)}</b>${seen.has(wireKey(s))?"":`<em class="fw-new">NEW</em>`}</span><small class="muted">${esc(s.t)}${ij.y?` · ${esc(ij.y)}`:""} · ${wireBack(s)}</small>
        <small class="fw-when">Ruled out ${agoTxt(s.at)} · ${s.missWk?`misses ${s.missWk} game${s.missWk>1?"s":""} left this matchup`:`misses ${s.miss7} in the next 7 days`} · ${Math.round(s.min)} min a game</small></span></div>
        ${fa.length?`<ul class="fw-b">${fa.map(b=>{const bm=dStatBumps(b.base,b.line);return `<li>${dFace(b.n,b.t,"sm")}<span><b>${dashNm(b.n)}</b><small class="muted">${Math.round(dMinOf(b.base))}→${Math.round(dMinOf(b.line))} min${bm.map(x=>` · ${x.l} +${x.d.toFixed(1)}`).join("")}</small></span><b class="or-dz num">+${b.dz.toFixed(1)}</b>${ed?`<button class="btn sm" data-add="${esc(b.n)}">${b.w?"Claim":"Add"}</button>`:`<em class="or-fa">${b.w?"Waivers":"Free agent"}</em>`}</li>`;}).join("")}</ul>`
          :`<p class="dsm muted">No free agent gains enough from this one.</p>`}
        ${tk.length?`<p class="dsm muted fw-tk">${tk.map(b=>`${esc(dashLast(b.n))} (+${b.dz.toFixed(1)}) ${b.own.id===T?"is yours":`went to ${esc(b.own.nm)}`}`).join(" · ")}</p>`:""}</li>`;}).join("")}</ol>
      ${fresh.length?`<button class="btn sm ghost fw-ok" data-fwseen="1">Got it</button>`:""}
      <p class="dsm muted">+ is the change in value per game (z-score across your categories), from this season's games without him. Waiver players go to the best claim, so put yours in early.</p>`;}};

// alert on the dashboard + a toast anywhere in the app the first time a new one shows up
{const _a=dashAlerts;dashAlerts=function(T){const out=_a.apply(this,arguments);try{if(T&&T===myTeamNum()){const seen=new Set(wireSeen()),f=dWire().filter(s=>!seen.has(wireKey(s))&&s.bens.some(b=>!b.own));
  if(f.length){const s=f[0],b=s.bens.find(x=>!x.own);out.unshift({lv:"warn",t:`${s.n} was just ruled out (${wireBack(s)}). ${b.n} gains the most and is ${b.w?"on waivers":"a free agent"}. See First to the wire.`,go:["dash",""]});}}}catch(e){}return out;};}
const WIRE_TOASTED=new Set();
{const _rr=renderRosters;renderRosters=function(){const r=_rr.apply(this,arguments);
  try{if(myTeamNum()&&NBA){const seen=new Set(wireSeen());const f=dWire().filter(s=>!seen.has(wireKey(s))&&!WIRE_TOASTED.has(wireKey(s))&&s.bens.some(b=>!b.own));
    f.forEach(s=>WIRE_TOASTED.add(wireKey(s)));if(f.length&&Date.now()-f[0].at<6*3600e3){const s=f[0],b=s.bens.find(x=>!x.own);toast(`🚨 ${s.n} is out. ${b.n} is ${b.w?"on waivers":"a free agent"}: see First to the wire on your Dashboard.`);}}}catch(e){}
  return r;};}
document.addEventListener("click",e=>{const b=e.target.closest("[data-fwseen]");if(!b)return;e.stopPropagation();wireMark(dWire().map(wireKey));dashDraw();try{dashBadge();}catch(x){}},true);

// ---------- Season win plan ----------
let SVP_K="",SVP=null;
const dSlots=()=>{let m=0;Object.keys(TEAMS).forEach(t=>{const n=TEAMS[t].P.filter(p=>{const s=slotOn(p,TODAY);return s!=null&&s<12;}).length;if(n>m)m=n;});return m||10;};
// a roster's category totals for one week: each day, the best players with a game fill the starting spots
function dWeekTot(X,n,NS){const days=weekDaysAll(n),ps=dNowP(X).map(p=>{const pg=pgLine(p.pj)||(recentPG(p.n,21)||{}).pg;if(!pg)return null;
    const ij=INJ[p.n]==="OUT"?(injOf(p.n)||{}):null,back=ij?(ij.r&&typeof spOf==="function"?spOf(ij.r):Infinity):null;return {p,pg,z:zOf(pg),back};}).filter(Boolean).sort((a,b)=>b.z-a.z);
  const tot=new Array(11).fill(0);let g=0;
  days.forEach(sp=>{let k=0;for(const x of ps){if(k>=NS)break;if(!gameOn(x.p.t,sp)||(x.back!=null&&sp<x.back))continue;k++;g++;for(let i=0;i<11;i++)tot[i]+=+x.pg[i]||0;}});
  return {tot,g};}
function dSeasonPlan(T){const k=T+":"+TODAY+":"+TXLOG.length+":"+Object.keys(STATS||{}).length+":"+((NBA&&NBA.at)||0);if(k===SVP_K&&SVP)return SVP;
  const ids=Object.keys(TEAMS).map(Number).filter(x=>TEAMS[x].P.length);if(ids.length<2)return null;
  const reg=regWeeks(),P=Math.min(+L.playoffTeams||4,ids.length),cw=dCurWk(),NC=CATS.length,most=L.format==="most",N=4000,NS=dSlots();
  // same answer every time you open it for the same data: seeded random numbers
  let sd=[...k].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);const rnd=()=>{sd=(sd+0x6D2B79F5)>>>0;let t=sd;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
  const games=[],mine=[];
  for(let n=1;n<=reg;n++){if(weekDone(n)||!CAL[n-1])continue;const WT={};const wt=X=>WT[X]||(WT[X]=dWeekTot(X,n,NS));
    (W[n]||[]).forEach(([a,b])=>{if(!TEAMS[a]||!TEAMS[b])return;let ps=null;
      if(n===cw){try{const A=fcProj(a),B=fcProj(b);ps=CATS.map(c=>dLogit(val(A.fin,c),val(B.fin,c),c));}catch(e){ps=null;}}
      if(!ps){const A=wt(a).tot,B=wt(b).tot;ps=CATS.map(c=>dLogit(val(A,c),val(B,c),c));}
      const gi=games.length;games.push([a,b,ps]);
      if(a===T||b===T){const me=a===T,o=me?b:a,pm=me?ps:ps.map(x=>1-x);mine.push({n,o,gi,me,pm,exp:pm.reduce((s,x)=>s+x,0),gm:n===cw?null:wt(T).g,go:n===cw?null:wt(o).g});}});}
  if(!mine.length){SVP={mine:[],P,odds:null,reg};SVP_K=k;return SVP;}
  const res={};mine.forEach(m=>res[m.gi]={win:0,mw:0,ml:0});let made=0;const seed=new Array(ids.length).fill(0);
  for(let s=0;s<N;s++){const rec={};ids.forEach(x=>{const r=STAND[x]?.rec||[0,0,0];rec[x]=[r[0],r[1],r[2]];});const wonG={};
    games.forEach(([a,b,ps],gi)=>{let w=0,l=0;for(let i=0;i<NC;i++){if(rnd()<ps[i])w++;else l++;}
      const r=most?(w>l?[1,0,0]:w<l?[0,1,0]:[0,0,1]):[w,l,0];rec[a][0]+=r[0];rec[a][1]+=r[1];rec[a][2]+=r[2];rec[b][0]+=r[1];rec[b][1]+=r[0];rec[b][2]+=r[2];
      if(res[gi])wonG[gi]=a===T?w>l:l>w;});
    const tb=Object.fromEntries(ids.map(x=>[x,rnd()]));const o=ids.slice().sort((x,y)=>pctW(rec[y])-pctW(rec[x])||rec[y][0]-rec[x][0]||tb[y]-tb[x]);
    const pos=o.indexOf(T),inn=pos<P;seed[pos]++;if(inn)made++;
    mine.forEach(m=>{const R=res[m.gi];if(wonG[m.gi]){R.win++;if(inn)R.mw++;}else if(inn)R.ml++;});}
  mine.forEach(m=>{const R=res[m.gi],nw=R.win,nl=N-R.win;m.p=nw/N;m.ifW=nw>=60?R.mw/nw:null;m.ifL=nl>=60?R.ml/nl:null;m.lev=m.ifW!=null&&m.ifL!=null?Math.max(0,m.ifW-m.ifL):0;
    m.tag=m.p>=.75?"safe":m.p<=.25?"long":"swing";});
  // the three weeks that move your odds most (and are winnable) are the must-wins
  mine.filter(m=>m.tag==="swing"&&m.lev>=.08).sort((a,b)=>b.lev-a.lev).slice(0,3).forEach(m=>m.tag="must");
  const odds=made/N,best=seed.indexOf(Math.max(...seed))+1;
  SVP={mine,P,odds,best,reg,cw,N:ids.length};SVP_K=k;return SVP;}

const SV_TAG={must:["Must win","Use every pickup"],swing:["Swing week","Stream if it's close"],safe:["Favored","Don't drop good players for streamers"],long:["Long shot","Save your roster for later"]};
DW.sv={name:"Season win plan",desc:"Every regular-season matchup you have left, projected from both rosters and that week's NBA schedule, with your playoff odds and how much each week moves them. Shows which weeks are must-wins, which to coast, and a trade-deadline checklist.",s:"f",
  view(w,T){let r=null;try{r=dSeasonPlan(T);}catch(e){console.warn(e);}if(!r)return dashEmpty("The season plan starts once the league has a schedule.");
    if(!r.mine.length)return dashEmpty("No regular-season matchups left. The playoffs are next: see Playoff schedule edge.");
    const phone=PHONE(),lim=w.s==="f"?r.mine.length:6,pc=dPct(r.odds);
    const must=r.mine.filter(m=>m.tag==="must").sort((a,b)=>b.lev-a.lev),key=r.mine.slice().sort((a,b)=>b.lev*(1-Math.abs(.5-b.p))-a.lev*(1-Math.abs(.5-a.p)));
    const dl=typeof tcfg==="function"?tcfg().deadline:null,dleft=dl?Math.ceil((dl-Date.now())/864e5):null;
    const sum=r.odds>.985?`You're all but in. Use the weeks left to set up your playoff roster.`:r.odds<.015?`The playoffs are a long shot. Win now and you climb back in.`:
      must.length?`<b>${must.length} must-win week${must.length>1?"s":""}</b> left. The biggest is <b>${esc(weekName(must[0].n))}</b> vs ${esc(dShort(must[0].o))}: winning it is worth <b>${dPct(must[0].lev)} points</b> of playoff odds.`
      :`No single week decides it. Your biggest is <b>${esc(weekName(key[0].n))}</b> vs ${esc(dShort(key[0].o))} (${dPct(key[0].lev)} points).`;
    const row=m=>{const t=SV_TAG[m.tag],ge=m.gm!=null&&m.go!=null?m.gm-m.go:null;
      return `<li class="sv-${m.tag}${m.n===r.cw?" now":""}"><span class="sv-wk"><b>${esc(weekName(m.n))}</b>${m.n===r.cw?`<small class="okc">now</small>`:""}</span>
        <span class="sv-o"><span>vs <b>${esc(phone?dShort(m.o):TEAMS[m.o].name)}</b></span><small class="muted">${m.exp.toFixed(1)}–${(CATS.length-m.exp).toFixed(1)} cats${ge!=null?` · ${ge?`${ge>0?"+":""}${ge} games`:"even games"}`:""}</small></span>
        <span class="sv-p"><i style="--w:${(m.p*100).toFixed(0)}%"></i><b class="num">${dPct(m.p)}%</b></span>
        <span class="sv-t"><em>${t[0]}</em><small class="muted">${t[1]}</small></span>
        ${phone?"":`<span class="sv-lv num" title="Playoff odds if you win this week vs if you lose it">${m.ifW!=null?dPct(m.ifW):"–"}% / ${m.ifL!=null?dPct(m.ifL):"–"}%</span>`}</li>`;};
    // trade-deadline checklist from the playoff schedule
    let chk="";try{const ps=dPlayoffSched();if(ps&&ps.g.some(x=>x.tot)&&dl&&dleft>0){const mineP=dNowP(T).map(p=>({n:p.n,t:p.t,v:ps.val(p.n),s:ps.G[p.t]})).filter(x=>x.s&&x.v!=null);
      const sell=mineP.filter(x=>x.s.tot<=ps.avg-1).sort((a,b)=>b.v-a.v).slice(0,2);
      const buy=Object.values(DIR).filter(D=>D.t&&ps.G[D.t]&&ps.G[D.t].tot>=ps.avg+1&&ownerNow(D.n)&&ownerNow(D.n)!==T&&INJ[D.n]!=="OUT").map(D=>({n:D.n,t:D.t,v:ps.val(D.n),s:ps.G[D.t],own:dWhoOwns(D.n)})).filter(x=>x.v!=null).sort((a,b)=>(b.v+(b.s.tot-ps.avg)*.6)-(a.v+(a.s.tot-ps.avg)*.6)).slice(0,2);
      chk=`<div class="sv-dl"><p><b>Trade deadline in ${dleft} day${dleft>1?"s":""}</b> <small class="muted">(${esc(fmtDeadline(dl))})</small></p><ul>
        ${sell.map(x=>`<li>Sell <b>${dashNm(x.n)}</b> <small class="muted">only ${x.s.tot} playoff games</small></li>`).join("")}
        ${buy.map(x=>`<li>Target <b>${dashNm(x.n)}</b> <small class="muted">${esc(x.own.nm)} · ${x.s.tot} playoff games</small><button class="btn ghost sm" data-trade="${esc(x.n)}">Trade</button></li>`).join("")}
        ${!sell.length&&!buy.length?`<li class="muted">Your playoff schedule looks fine. Nothing urgent.</li>`:""}</ul></div>`;}}catch(e){}
    return `<div class="sv-top"><div class="po-big"><b class="num">${pc}<small>%</small></b><span>playoff odds <small class="muted">with the schedule</small><br><small class="muted">top ${r.P} of ${r.N} · most likely ${ord(r.best)} seed</small></span></div><p class="sv-sum">${sum}</p></div>
      <ol class="sv-l">${phone?"":`<li class="sv-hd" aria-hidden="true"><span>Week</span><span>Opponent</span><span>Win chance</span><span>Plan</span><span>Odds if W / L</span></li>`}${r.mine.slice(0,lim).map(row).join("")}</ol>
      ${chk}<p class="dsm muted">Each week is projected from both current rosters, injuries and how many games each team's players have that week (this week uses live projections). The season is then played out 4,000 times to see how much each result moves your playoff odds.</p>`;}};

// New Era +: First to the wire at the top of Today, Season win plan at the top of The race (added once to boards already set up)
{const ins=(after,k,s)=>{if(NEP_DEF.some(x=>x[0]===k))return;const i=NEP_DEF.findIndex(x=>x[0]===after.k&&(!after.t||(x[2]&&x[2].t===after.t)));NEP_DEF.splice(i>=0?i+1:NEP_DEF.length,0,[k,s]);};
  ins({k:"hd",t:"Today"},"fw","f");ins({k:"hd",t:"The race"},"sv","f");}
function nepOnce(flag,k,s,afterK,afterT){if(!prefKey()||!UI.dash||UI.dash[flag])return;const bs=dashBoards(),b=bs.find(x=>x.id===NEP_ID);
  if(!b){if(UI.dash.nep)dashBoardSet({[flag]:1});return;}
  if(b.w.some(x=>x.k===k)){dashBoardSet({[flag]:1});return;}
  const w=b.w.slice();let i=w.findIndex(x=>x.k===afterK&&(!afterT||(x.o&&x.o.t===afterT)));const nw={id:k+Date.now().toString(36),k,s,o:{}};
  w.splice(i>=0?i+1:w.length,0,nw);dashBoardSet({boards:bs.map(x=>x.id===NEP_ID?{...x,w}:x),[flag]:1});}
{const _rr=renderRosters;renderRosters=function(){if(nav==="dash"&&!DASH_DRAG&&!DASH_EDIT)try{nepOnce("fw1","fw","f","hd","Today");nepOnce("sv1","sv","f","hd","The race");}catch(e){}return _rr.apply(this,arguments);};}

{const s=document.createElement("style");s.textContent=`
.fw-h{display:flex;align-items:center;gap:7px;margin:0 0 8px;font-size:.8rem;color:var(--muted)}
.fw-dot{width:8px;height:8px;border-radius:50%;background:var(--muted)}.fw-dot.on{background:var(--win,#2e7d32);box-shadow:0 0 0 3px color-mix(in srgb,var(--win,#2e7d32) 25%,transparent)}
.fw-l{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.fw-l>li{padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--ink) 4%,transparent);border:1px solid color-mix(in srgb,var(--ink) 10%,transparent)}
.fw-l>li.new{border-color:color-mix(in srgb,#f59e0b 55%,transparent);background:color-mix(in srgb,#f59e0b 9%,transparent)}
.fw-st{display:flex;gap:10px;align-items:flex-start}.fw-st>span{display:flex;flex-direction:column;gap:2px;min-width:0}
.fw-nm{display:flex;align-items:center;gap:0}.fw-ok{justify-self:start;width:auto!important;display:inline-flex!important;margin-top:8px}
.fw-new{font-style:normal;font-size:.62rem;font-weight:800;letter-spacing:.06em;padding:1px 6px;border-radius:6px;background:#f59e0b;color:#111;margin-left:6px}
.fw-when{font-size:.75rem;color:var(--ink);opacity:.85}
.fw-b{list-style:none;margin:8px 0 0 38px;padding:0;display:grid;gap:6px}
.fw-b li{display:grid;grid-template-columns:28px minmax(0,1fr) auto auto;align-items:center;gap:8px}.fw-b li>span{display:flex;flex-direction:column;min-width:0}
.fw-tk{margin:6px 0 0 38px}
.sv-top{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.sv-sum{flex:1;min-width:220px;margin:0;font-size:.9rem}
.sv-l{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.sv-l li{display:grid;grid-template-columns:110px minmax(0,1.4fr) 130px minmax(0,1.3fr) 110px;align-items:center;gap:10px;padding:7px 10px;border-radius:10px;font-size:.86rem}
.sv-l li.sv-hd{font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding-top:0;padding-bottom:0}
.sv-l li.now{outline:1px solid color-mix(in srgb,var(--accent) 50%,transparent)}
.sv-l li>span{display:flex;flex-direction:column;min-width:0}.sv-wk{flex-direction:row!important;gap:6px;align-items:baseline}
.sv-p{flex-direction:row!important;align-items:center;gap:8px}.sv-p i{flex:1;height:6px;border-radius:4px;background:linear-gradient(90deg,var(--accent) var(--w),color-mix(in srgb,var(--ink) 12%,transparent) var(--w))}
.sv-t em{font-style:normal;font-weight:800}.sv-must .sv-t em{color:#f59e0b}.sv-safe .sv-t em{color:var(--win,#2e7d32)}.sv-long .sv-t em{color:var(--loss,#c62828)}
.sv-must{background:color-mix(in srgb,#f59e0b 8%,transparent)}
.sv-lv{font-size:.78rem}
.sv-dl{margin-top:12px;padding:10px 12px;border-radius:12px;border:1px dashed color-mix(in srgb,var(--ink) 20%,transparent)}.sv-dl p{margin:0 0 6px}.sv-dl ul{list-style:none;margin:0;padding:0;display:grid;gap:5px}.sv-dl li{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.sv-dl li .btn{margin-left:auto}
@media (max-width:700px){.sv-wk{flex-wrap:wrap;column-gap:4px!important}.sv-l li{grid-template-columns:76px minmax(0,1fr) 84px;row-gap:2px}.sv-l li .sv-t{grid-column:2/-1}.sv-l li .sv-t small{display:none}}
`;document.head.appendChild(s);}
