/* ============================================================================
   NEW ERA + PRO (2.39, Arp 2026-11-04: "research into better designs for
   dashboards and come up with meaningful tools. Create the best looking and
   useful dashboard for this fantasy app").
   What the research said, and what it changed here:
   - Lead with the few numbers that drive decisions, each with a direction and
     a trend  -> Pulse: 4 KPI cards the arena above does not already show
     (playoff chances, standing, games-left edge, pickups left).
   - Answer "what do I do now?" before showing detail -> Game plan: one ranked
     to-do list built from every signal the app has, with one-tap actions.
   - Progressive disclosure -> every section title folds its section away
     (on every dashboard), remembered per login.
   - New tools that matter in head-to-head categories: Playoff chances (a 2,000-
     season simulation) and Scout your opponent.
   ============================================================================ */
NEP_VER=3;
const dCurWk=()=>{const i=CAL.findIndex(c=>c[1]<=TODAY&&TODAY<=c[2]);return i<0?0:i+1;};
const dLeft=(T,days)=>TEAMS[T].P.reduce((s,p)=>s+days.filter(sp=>upcoming(p.t,sp)&&gameOn(p.t,sp)&&startedOn(p,sp)).length,0);
const dSpk=(v,cls)=>{if(!v||v.length<2)return "";const W=96,H=28,mn=Math.min(...v),mx=Math.max(...v),r=mx-mn||1,x=i=>(i*W/(v.length-1)).toFixed(1),y=a=>(H-3-(a-mn)/r*(H-6)).toFixed(1);
  const d=v.map((a,i)=>`${i?"L":"M"}${x(i)},${y(a)}`).join("");return `<svg class="kp-sp ${cls||""}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}L${W},${H}L0,${H}Z" class="kp-sa"/><path d="${d}" class="kp-sl"/><circle cx="${x(v.length-1)}" cy="${y(v[v.length-1])}" r="2.6"/></svg>`;};
const dDelta=(d,unit,inv)=>{if(d==null||!isFinite(d)||Math.abs(d)<.5)return `<span class="kp-d flat">no change</span>`;const up=d>0;return `<span class="kp-d ${up!==!!inv?"up":"down"}">${up?"▲":"▼"} ${Math.abs(Math.round(d))}${unit||""}</span>`;};

/* ---- playoff chances: simulate the rest of the regular season 2,000 times ---- */
let DPO_K="",DPO=null;
function dTeamStr(id){const xs=dNowP(id).filter(p=>p.st!=="OUT").map(p=>{const pj=pgLine(p.pj),r=recentPG(p.n,21);const z=pj?zOf(pj):r?zOf(r.pg):null;return z==null?-3:z;}).sort((a,b)=>b-a).slice(0,10);return xs.reduce((a,b)=>a+b,0);}
function dPlayoffOdds(){const k=TODAY+":"+TXLOG.length+":"+Object.keys(STATS||{}).length;if(k===DPO_K&&DPO)return DPO;DPO_K=k;
  const ids=Object.keys(TEAMS).map(Number).filter(x=>TEAMS[x].P.length);if(ids.length<2){DPO=null;return null;}
  const reg=regWeeks(),P=Math.min(+L.playoffTeams||4,ids.length),cw=dCurWk(),NC=CATS.length,most=L.format==="most",N=2000;
  const str=Object.fromEntries(ids.map(x=>[x,dTeamStr(x)]));
  // each remaining matchup: chance to win each category
  const games=[];for(let n=1;n<=reg;n++){if(weekDone(n))continue;(W[n]||[]).forEach(([a,b])=>{if(!TEAMS[a]||!TEAMS[b])return;let ps=null;
      if(n===cw&&wk&&wk[0]===cw){try{const A=fcProj(a),B=fcProj(b);ps=CATS.map(c=>dLogit(val(A.fin,c),val(B.fin,c),c));}catch(e){ps=null;}}
      if(!ps){const q=1/(1+Math.exp(-(str[a]-str[b])/22));ps=CATS.map(()=>q);}games.push([a,b,ps]);});}
  const made={},top={},seed={};ids.forEach(x=>{made[x]=0;top[x]=0;seed[x]=new Array(ids.length).fill(0);});
  for(let s=0;s<N;s++){const rec={};ids.forEach(x=>{const r=STAND[x]?.rec||[0,0,0];rec[x]=[r[0],r[1],r[2]];});
    for(const [a,b,ps] of games){let w=0,l=0;for(let i=0;i<NC;i++){if(Math.random()<ps[i])w++;else l++;}
      const r=most?(w>l?[1,0,0]:w<l?[0,1,0]:[0,0,1]):[w,l,0];rec[a][0]+=r[0];rec[a][1]+=r[1];rec[a][2]+=r[2];rec[b][0]+=r[1];rec[b][1]+=r[0];rec[b][2]+=r[2];}
    const tb=Object.fromEntries(ids.map(x=>[x,Math.random()]));
    const o=ids.slice().sort((x,y)=>pctW(rec[y])-pctW(rec[x])||rec[y][0]-rec[x][0]||tb[y]-tb[x]);
    o.forEach((x,i)=>{seed[x][i]++;if(i<P)made[x]++;if(!i)top[x]++;});}
  const rows=ids.map(x=>({id:x,p:made[x]/N,t:top[x]/N,seed:seed[x].map(v=>v/N),avg:seed[x].reduce((s,v,i)=>s+v*(i+1),0)/N})).sort((a,b)=>b.p-a.p||a.avg-b.avg);
  let left=0;for(let n=1;n<=reg;n++)if(!weekDone(n))left++;DPO={rows,P,left,reg,cw};return DPO;}

DW.po={name:"Playoff chances",desc:"Plays out the rest of the regular season 2,000 times from today's rosters and standings, then shows each team's chance to make the playoffs and where you're likely to finish.",s:"w",
  view(w,T){let o=null;try{o=dPlayoffOdds();}catch(e){o=null;}if(!o)return dashEmpty("Playoff chances start once the league has a schedule.");
    const me=o.rows.find(r=>r.id===T)||o.rows[0],pc=dPct(me.p),mxS=Math.max(...me.seed),best=me.seed.indexOf(mxS)+1,phone=PHONE();
    const lab=r=>o.left>4?"":r.p>.995?`<i class="po-tag in">in</i>`:r.p<.005?`<i class="po-tag out">out</i>`:"";
    return `<div class="po-top"><div class="po-big"><b class="num">${pc}<small>%</small></b><span>to make the playoffs<br><small class="muted">top ${o.P} of ${o.rows.length} · most likely ${ord(best)} seed</small></span></div>
      <div class="po-seeds" role="img" aria-label="Chance of each finishing spot">${me.seed.map((v,i)=>`<span class="${i<o.P?"in":""}${i+1===best?" best":""}" style="--h:${Math.max(3,v/mxS*100).toFixed(0)}%" title="${ord(i+1)}: ${dPct(v)}%"><i></i><small>${i+1}</small></span>`).join("")}</div></div>
      <ol class="po-l">${o.rows.map((r,i)=>`${i===o.P?`<li class="po-cut" aria-hidden="true"><span>playoff line</span></li>`:""}<li class="${r.id===T?"me":""}"><span class="po-n">${esc(phone?dShort(r.id):TEAMS[r.id].name)}${lab(r)}</span><span class="po-b"><i style="--w:${(r.p*100).toFixed(1)}%"></i></span><b class="num">${dPct(r.p)}%</b>${phone?"":`<small class="muted num" title="Chance to finish 1st">${dPct(r.t)}% 1st</small>`}</li>`).join("")}</ol>
      <p class="dsm muted">${o.left>0?`${o.left} regular-season matchup${o.left>1?"s":""} left. `:""}Each simulation plays every remaining matchup category by category: this week from current projections, later weeks from each roster's strength. Ties are split at random.</p>`;}};

/* ---- game plan: the one to-do list ---- */
function dGamePlan(T){const out=[],opp=dOpp(T),ed=dCanEdit(T);
  try{dashAlerts(T).forEach(a=>out.push({lv:a.lv==="bad"?3:2,ic:a.lv==="bad"?"!":"↻",t:a.t,act:a.act?`<button class="btn sm" data-dauto="${a.act}">Fix now</button>`:a.go?`<button class="btn ghost sm" data-dgo="${esc(a.go[0])}">Open</button>`:""}));}catch(e){}
  if(!opp)return out;let A,B;try{A=fcProj(T);B=fcProj(opp);}catch(e){return out;}
  const ps=CATS.map(c=>({c,p:dLogit(val(A.fin,c),val(B.fin,c),c)}));
  try{const k=T+":"+TODAY+":"+TXLOG.length+":"+(LIVE&&LIVE.at||0);if(k!==DMW_K){DMW_K=k;DMW=dMovesThatWin(T);}const m=DMW&&DMW.out&&DMW.out[0];
    if(m)out.push({lv:2,ic:"+",t:`Add ${m.D.n}: he fills ${m.n} open spot${m.n>1?"s":""} and adds about ${m.gain.toFixed(1)} categor${m.gain>=1.05?"ies":"y"}${m.flips.length?`, flipping ${m.flips.join(" and ")}`:""}.`,imp:`+${m.gain.toFixed(1)}`,act:ed?`<button class="btn sm" data-add="${esc(m.D.n)}">Add</button>`:""});}catch(e){}
  const days=DAYS.filter(sp=>sp>=TODAY),gm=dLeft(T,days),go=dLeft(opp,days),on=dShort(opp);
  if(days.length&&gm-go<=-3)out.push({lv:2,ic:"⏱",t:`You have ${go-gm} fewer games left than ${on}. Stream players with games on the days you have open spots.`,imp:`−${go-gm} g`});
  else if(days.length&&gm-go>=3)out.push({lv:1,ic:"⏱",t:`You have ${gm-go} more games left than ${on}. Keep every slot filled and the edge holds.`,imp:`+${gm-go} g`});
  const toss=ps.filter(x=>x.p>.3&&x.p<.7).sort((a,b)=>Math.abs(a.p-.5)-Math.abs(b.p-.5));
  if(toss.length)out.push({lv:1,ic:"⚖",t:`${toss.slice(0,3).map(x=>x.c[0]).join(", ")} ${toss.length>1?"are":"is a"} toss-up${toss.length>1?"s":""} and will decide the week. Pick adds and starters that help ${toss.length>1?"those":"it"}.`});
  const lost=ps.filter(x=>x.p<.12),lock=ps.filter(x=>x.p>.9);
  if(lost.length&&lost.length<=2)out.push({lv:0,ic:"✂",t:`${lost.map(x=>x.c[0]).join(" and ")} look${lost.length>1?"":"s"} out of reach. Don't chase ${lost.length>1?"them":"it"}; spend moves on the toss-ups.`});
  if(lock.length)out.push({lv:0,ic:"✓",t:`${lock.map(x=>x.c[0]).join(", ")} look${lock.length>1?"":"s"} safe.`});
  return out.sort((a,b)=>b.lv-a.lv).slice(0,6);}
DW.gp={name:"Game plan",desc:"Your to-do list for this matchup, most important first: lineup fixes, the best pickup, the games-left gap, and which categories to fight for or let go. One tap to act.",s:"w",
  view(w,T){const xs=dGamePlan(T),todo=xs.filter(x=>x.lv>=2).length;
    const ring=`<div class="gp-ring ${todo?"":"ok"}" style="--p:${todo?Math.max(8,100-todo*25):100}"><b class="num">${todo||"✓"}</b><small>${todo?`to do`:"all set"}</small></div>`;
    if(!xs.length)return `<div class="gp-h">${ring}<p>Nothing to do right now. Your lineup is set and no pickup changes the week.</p></div>`;
    return `<div class="gp-h">${ring}<p><b>${todo?`${todo} thing${todo>1?"s":""} to do`:"You're set"}</b><br><small class="muted">${todo?"Do these first, top to bottom.":"Nothing urgent. Here's how the week looks."}</small></p></div>
      <ol class="gp-l">${xs.map((x,i)=>`<li class="lv${x.lv}" style="--d:${i*70}ms"><span class="gp-ic" aria-hidden="true">${x.ic}</span><span class="gp-t">${esc(x.t)}</span>${x.imp?`<b class="gp-imp num">${esc(x.imp)}</b>`:""}${x.act||""}</li>`).join("")}</ol>`;}};

/* ---- pulse: the four numbers that matter, with direction and trend ---- */
DW.kp={name:"Pulse",desc:"Four numbers the matchup hero doesn't show, each with direction and trend: playoff chances, your standing, the games-left edge and pickups left.",s:"f",
  view(w,T){const opp=dOpp(T);let po=null;try{po=dPlayoffOdds();}catch(e){}const mr=po&&po.rows.find(r=>r.id===T);
    const card=(cls,lab,big,sub,extra)=>`<div class="kp-c ${cls}"><span class="kp-l">${lab}</span><b class="kp-v num">${big}</b><span class="kp-s">${sub}</span>${extra||""}</div>`;
    const order=standOrder(),rk=order.indexOf(T)+1,r=STAND[T]?.rec||[0,0,0],stk=typeof streakOf==="function"?streakOf(T):"",n=order.length;
    const wr=[];for(let k=1;k<=regWeeks();k++){if(!weekDone(k))break;const pr=(W[k]||[]).find(([a,b])=>a===T||b===T);if(!pr)continue;const o=pr[0]===T?pr[1]:pr[0];const x=h2h(wt(T,k),wt(o,k));wr.push(x[0]-x[1]);}
    const days=DAYS.filter(sp=>sp>=TODAY),gm=opp?dLeft(T,days):0,go=opp?dLeft(opp,days):0,gs=days.map((sp,i)=>dLeft(T,days.slice(i))-(opp?dLeft(opp,days.slice(i)):0)).reverse();
    const lim=+L.addLimit||0,pl=lim?pickupsLeft(T):null,open=Math.max(0,ROSTER_MAX-dNowP(T).length);
    return `<div class="kp">${card(mr?(mr.p>=.5?"good":"bad"):"","Playoff chances",mr?`${dPct(mr.p)}<small>%</small>`:"–",mr?`<small class="muted">likely ${ord(Math.max(1,Math.round(mr.avg)))} of ${po.rows.length} · top ${po.P} get in</small>`:`<small class="muted">no schedule yet</small>`,mr?`<div class="kp-mini">${mr.seed.map((v,i)=>`<i class="${i<po.P?"in":""}" style="--h:${Math.max(6,v/Math.max(...mr.seed)*100).toFixed(0)}%"></i>`).join("")}</div>`:"")}
      ${card(rk&&rk<=(po?po.P:4)?"good":"bad","Standing",rk?`${ord(rk)}<small> of ${n}</small>`:"–",`<small class="muted">${r.join("-")}${stk?` · ${esc(stk)}`:""}</small>`,dSpk(wr.length>1?wr:null,"acc"))}
      ${opp?card(gm>=go?"good":"bad","Games left",`${gm}<small> vs ${go}</small>`,gm===go?`<span class="kp-d flat">even</span>`:`<span class="kp-d ${gm>go?"up":"down"}">${gm>go?"▲ +":"▼ −"}${Math.abs(gm-go)}</span><small class="muted"> starter games</small>`,dSpk(gs.length>1?gs:null,gm>=go?"good":"bad")):card("","Games left","–",`<small class="muted">no matchup</small>`)}
      ${lim?card(pl>0?"good":"bad","Pickups left",`${pl}<small> of ${lim}</small>`,`<small class="muted">${esc(addWhen())}</small>`,`<div class="kp-pips">${Array.from({length:lim},(_,i)=>`<i class="${i<lim-pl?"used":""}"></i>`).join("")}</div>`)
        :card(open?"good":"","Open roster spots",`${open}<small> of ${ROSTER_MAX}</small>`,`<small class="muted">${dNowP(T).length} players on the roster</small>`)}</div>`;}};

/* ---- scout your opponent ---- */
DW.op={name:"Scout your opponent",desc:"This week's opponent at a glance: who's hot for them, their games left by day next to yours, and where they're soft.",s:"s",
  view(w,T){const opp=dOpp(T);if(!opp)return dashEmpty("No matchup this week.");const a=fcProj(T),b=fcProj(opp),r=STAND[opp]?.rec||[0,0,0],rk=standOrder().indexOf(opp)+1;
    const hot=dNowP(opp).map(p=>{const x=recentPG(p.n,7),pj=pgLine(p.pj);return x&&pj?{p,d:zOf(x.pg)-zOf(pj),x}:null;}).filter(Boolean).sort((x,y)=>y.d-x.d).slice(0,3);
    const days=DAYS.filter(sp=>sp>=TODAY),mx=Math.max(1,...days.map(sp=>Math.max(dLeft(T,[sp]),dLeft(opp,[sp]))));
    const soft=CATS.map(c=>({c,p:dLogit(val(a.fin,c),val(b.fin,c),c)})).sort((x,y)=>y.p-x.p).slice(0,2);
    return `<div class="op-h"><span class="op-cr">${esc(tmInit(opp))}</span><span><b>${esc(TEAMS[opp].name)}</b><small class="muted">${r.join("-")}${rk?` · ${ord(rk)}`:""}</small></span></div>
      ${hot.length?`<p class="op-k">Running hot</p><ul class="op-hot">${hot.map(x=>`<li>${dFace(x.p.n,x.p.t,"sm")}<span>${dashNm(dashLast(x.p.n))}<small class="muted num">${pra(x.x.pg)}</small></span><b class="num ${x.d>0?"badc":"okc"}">${x.d>0?"+":""}${x.d.toFixed(1)}</b></li>`).join("")}</ul>`:""}
      ${days.length?`<p class="op-k">Games left by day</p><div class="op-days">${days.map(sp=>{const m=dLeft(T,[sp]),o=dLeft(opp,[sp]);return `<span title="${dow(sp)}: you ${m}, them ${o}"><i class="me" style="--h:${(m/mx*100).toFixed(0)}%"></i><i class="op" style="--h:${(o/mx*100).toFixed(0)}%"></i><small>${esc(dow(sp).slice(0,2))}</small></span>`;}).join("")}</div>`:""}
      <p class="op-k">Where they're soft</p><p class="op-soft">${soft.map(x=>`<b>${esc(x.c[0])}</b> <small class="muted">${dPct(x.p)}% yours</small>`).join(" · ")}</p>`;}};

/* ---- the board, take three: hierarchy first ---- */
NEP_DEF.splice(0,NEP_DEF.length,["xa","f"],["kp","f"],["hd","f",{t:"Today"}],["gp","w"],["cd","s"],["tl","w"],["hc","s"],["lt","f"],
  ["hd","f",{t:"Win the week"}],["hb","w"],["ct","s"],["mw","w"],["op","s"],["pf","f"],
  ["hd","f",{t:"Your squad"}],["sd","w"],["ef","s"],["rw","f"],
  ["hd","f",{t:"The race"}],["po","w"],["tc","s"],["ls","w"],["bw","s"],["bp","f"]);

/* ---- fold any section (every dashboard): tap a section title ---- */
const dFoldOf=()=>((UI.dash&&UI.dash.fold)||{})[dashCur()]||{};
function dFoldApply(){const g=document.getElementById("dgrid");if(!g||DASH_EDIT)return;const F=dFoldOf();let on=false;
  [...g.children].forEach(t=>{if(!t.classList.contains("dtile"))return;if(t.classList.contains("dk-hd")){const id=t.dataset.dw;on=!!F[id];t.classList.toggle("folded",on);
      let b=t.querySelector(".dfoldb");if(!b){b=document.createElement("button");b.className="dfoldb";b.dataset.dfold=id;const h=t.querySelector(".dth");if(h)h.appendChild(b);}
      b.setAttribute("aria-expanded",String(!on));b.setAttribute("aria-label",(on?"Show ":"Hide ")+(t.getAttribute("aria-label")||"section"));b.innerHTML=`<span aria-hidden="true">${on?"Show":"Hide"}</span>`;return;}
    t.classList.toggle("dfolded",on);});}
document.addEventListener("click",e=>{const b=e.target.closest("[data-dfold]");if(!b||nav!=="dash")return;e.stopPropagation();const c=dashCur(),all={...((UI.dash&&UI.dash.fold)||{})},F={...(all[c]||{})};
  if(F[b.dataset.dfold])delete F[b.dataset.dfold];else F[b.dataset.dfold]=1;all[c]=F;if(prefKey())dashBoardSet({fold:all});else UI={...UI,dash:{...(UI.dash||{}),fold:all}};dFoldApply();},true);
{const _rr=renderRosters;renderRosters=function(){const r=_rr.apply(this,arguments);if(nav==="dash")try{dFoldApply();}catch(e){}return r;};}
// the Game plan already lists the alerts, so the board doesn't repeat them above it
{const _dv=dashView;dashView=function(){const h=_dv.apply(this,arguments);return dashCur()===NEP_ID&&!DASH_EDIT&&dashW().some(w=>w.k==="gp")?h.replace('<div class="dash dnep','<div class="dash dnep hasgp'):h;};}

{const s=document.createElement("style");s.textContent=`
.dash.hasgp .dalerts{display:none}
/* pulse */
.kp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.kp-c{position:relative;overflow:hidden;border-radius:16px;padding:14px 14px 10px;background:color-mix(in srgb,var(--ink) 4%,transparent);border:1px solid var(--line);display:flex;flex-direction:column;gap:2px;min-height:118px}
.kp-c::before{content:"";position:absolute;inset:0 0 auto;height:3px;background:var(--muted);opacity:.5}.kp-c.good::before{background:linear-gradient(90deg,#22c55e,#4ade80);opacity:1}.kp-c.bad::before{background:linear-gradient(90deg,#ef4444,#f97316);opacity:1}
.kp-l{font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.kp-v{font-size:2rem;font-weight:800;line-height:1.05;letter-spacing:-.02em}.kp-v small{font-size:.9rem;font-weight:700;color:var(--muted);margin-left:2px}
.kp-s{font-size:.78rem}.kp-d{font-weight:800;font-size:.78rem}.kp-d.up{color:#22c55e}.kp-d.down{color:#ef4444}.kp-d.flat{color:var(--muted)}
.kp-sp{position:absolute;right:8px;bottom:8px;width:44%;max-width:120px;height:30px;opacity:.9}.kp-sl{fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}.kp-sa{fill:color-mix(in srgb,var(--accent) 16%,transparent)}.kp-sp circle{fill:var(--accent)}
.kp-sp.good .kp-sl{stroke:#22c55e}.kp-sp.good .kp-sa{fill:rgba(34,197,94,.14)}.kp-sp.good circle{fill:#22c55e}.kp-sp.bad .kp-sl{stroke:#ef4444}.kp-sp.bad .kp-sa{fill:rgba(239,68,68,.12)}.kp-sp.bad circle{fill:#ef4444}
.kp-mini{position:absolute;right:10px;bottom:10px;display:flex;align-items:flex-end;gap:2px;height:28px;width:44%;max-width:120px}.kp-mini i{flex:1;height:var(--h);background:color-mix(in srgb,var(--muted) 45%,transparent);border-radius:2px 2px 0 0}.kp-mini i.in{background:var(--accent)}
.kp-pips{position:absolute;right:12px;bottom:14px;display:flex;gap:4px;flex-wrap:wrap;max-width:45%;justify-content:flex-end}.kp-pips i{width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px -1px var(--accent)}.kp-pips i.used{background:color-mix(in srgb,var(--muted) 30%,transparent);box-shadow:none}
.dtile.dk-kp{background:none!important;border:0!important;box-shadow:none!important;padding:0}.dtile.dk-kp>.dth{display:none}.dash.editing .dtile.dk-kp>.dth{display:flex}
.dfirst .kp-c{animation:drise .55s cubic-bezier(.3,.7,.2,1) both}.dfirst .kp-c:nth-child(2){animation-delay:.06s}.dfirst .kp-c:nth-child(3){animation-delay:.12s}.dfirst .kp-c:nth-child(4){animation-delay:.18s}
.dfirst .kp-sl{stroke-dasharray:400;animation:kpdraw 1.2s ease-out both .2s}@keyframes kpdraw{from{stroke-dashoffset:400}to{stroke-dashoffset:0}}
.dash.dnep .kp-c{background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border-color:rgba(255,255,255,.1);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
/* game plan */
.gp-h{display:flex;align-items:center;gap:14px;margin-bottom:10px}.gp-h p{margin:0}
.gp-ring{--c:#f59e0b;flex:none;width:64px;height:64px;border-radius:50%;display:grid;place-content:center;text-align:center;background:radial-gradient(closest-side,var(--surface) 76%,transparent 78%),conic-gradient(var(--c) calc(var(--p)*1%),color-mix(in srgb,var(--muted) 22%,transparent) 0)}
.gp-ring.ok{--c:#22c55e}.gp-ring b{font-size:1.35rem;line-height:1}.gp-ring small{font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:700}
.gp-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.gp-l li{display:grid;grid-template-columns:30px 1fr auto auto;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--ink) 4%,transparent);border:1px solid var(--line);font-size:.88rem;line-height:1.35}
.gp-l li.lv3{border-color:color-mix(in srgb,#ef4444 55%,var(--line));background:color-mix(in srgb,#ef4444 8%,transparent)}.gp-l li.lv2{border-color:color-mix(in srgb,#f59e0b 45%,var(--line))}
.gp-ic{width:30px;height:30px;border-radius:9px;display:grid;place-content:center;font-weight:800;background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent)}
.lv3 .gp-ic{background:rgba(239,68,68,.16);color:#ef4444}.lv2 .gp-ic{background:rgba(245,158,11,.16);color:#f59e0b}.lv0 .gp-ic{background:rgba(34,197,94,.14);color:#22c55e}
.gp-imp{font-size:.85rem;color:#22c55e;white-space:nowrap}.gp-l li:not(:has(.btn)) .gp-imp{grid-column:3/5}.gp-l li:not(:has(.btn)):not(:has(.gp-imp)) .gp-t{grid-column:2/5}
.dfirst .gp-l li{animation:drise .45s cubic-bezier(.3,.7,.2,1) both;animation-delay:var(--d)}
/* playoff chances */
.po-top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:12px}
.po-big{display:flex;align-items:center;gap:12px}.po-big b{font-size:2.6rem;line-height:1;font-weight:800;letter-spacing:-.03em;background:linear-gradient(90deg,var(--accent),#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent}.po-big b small{font-size:1.1rem}.po-big span{font-size:.88rem;line-height:1.35}
.po-seeds{display:flex;align-items:flex-end;gap:4px;height:64px;flex:1;min-width:180px;max-width:340px}.po-seeds span{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px}
.po-seeds i{display:block;width:100%;height:var(--h);border-radius:4px 4px 1px 1px;background:color-mix(in srgb,var(--muted) 35%,transparent)}.po-seeds .in i{background:color-mix(in srgb,var(--accent) 55%,transparent)}.po-seeds .best i{background:linear-gradient(180deg,#8b5cf6,var(--accent));box-shadow:0 0 14px -2px var(--accent)}
.po-seeds small{font-size:.62rem;color:var(--muted)}
.po-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}.po-l li{display:grid;grid-template-columns:minmax(0,1.3fr) 2fr 44px 64px;align-items:center;gap:10px;font-size:.84rem;padding:3px 6px;border-radius:8px}
.po-l li.me{background:color-mix(in srgb,var(--accent) 12%,transparent);font-weight:700}.po-n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.po-b{height:8px;border-radius:5px;background:color-mix(in srgb,var(--muted) 18%,transparent);overflow:hidden}.po-b i{display:block;height:100%;width:var(--w);border-radius:5px;background:linear-gradient(90deg,var(--accent),#8b5cf6)}
.po-l li b{text-align:right}.po-l li.po-cut{display:flex;padding:0;gap:8px;align-items:center;color:#f59e0b;font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.po-cut::before,.po-cut::after{content:"";flex:1;border-top:1px dashed currentColor;opacity:.6}
.po-tag{font-style:normal;font-size:.62rem;font-weight:800;text-transform:uppercase;margin-left:6px;padding:1px 5px;border-radius:5px}.po-tag.in{background:rgba(34,197,94,.16);color:#22c55e}.po-tag.out{background:rgba(239,68,68,.14);color:#ef4444}
.dfirst .po-b i{animation:dbarin .9s cubic-bezier(.3,.7,.2,1) both}.dfirst .po-seeds i{animation:posg .8s cubic-bezier(.3,.7,.2,1) both;transform-origin:bottom}@keyframes posg{from{transform:scaleY(0)}}
/* scout */
.op-h{display:flex;align-items:center;gap:10px}.op-h>span:last-child{display:flex;flex-direction:column;min-width:0}.op-h b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.op-cr{flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-content:center;font-weight:800;color:#fff;background:linear-gradient(140deg,#f97316,#c2410c);box-shadow:0 6px 18px -8px #f97316}
.op-k{margin:12px 0 6px;font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.op-hot{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.op-hot li{display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:center;font-size:.84rem}.op-hot li>span:nth-child(2){display:flex;flex-direction:column;line-height:1.2}
.op-days{display:flex;gap:6px;height:58px;align-items:flex-end}.op-days span{flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr auto;gap:2px;height:100%;align-items:end}
.op-days i{display:block;height:var(--h);min-height:2px;border-radius:3px 3px 0 0}.op-days i.me{background:var(--accent)}.op-days i.op{background:#f97316}.op-days small{grid-column:1/3;text-align:center;font-size:.62rem;color:var(--muted)}
.op-soft{margin:0;font-size:.86rem}
/* section folding */
.dfoldb{margin-left:auto;font:inherit;font-size:.7rem;font-weight:700;letter-spacing:.04em;padding:3px 10px;border-radius:99px;border:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer}
.dfoldb:hover{color:var(--ink);border-color:var(--accent)}.dtile.dk-hd .dth{display:flex;align-items:center}.dtile.dk-hd.folded .dth h3{opacity:.6}
.dgrid .dtile.dfolded{display:none!important}
@media (max-width:760px){.kp{grid-template-columns:1fr 1fr;gap:10px}.kp-c{min-height:108px;padding:12px 12px 10px}.kp-v{font-size:1.6rem}.kp-sp,.kp-mini,.kp-pips{position:static;width:100%;max-width:none;margin-top:auto;padding-top:6px}.kp-sp{height:26px}.kp-mini{height:24px}.kp-pips{justify-content:flex-start}
  .gp-l li{grid-template-columns:28px 1fr auto;font-size:.85rem}.gp-l li .btn{grid-column:2/4;justify-self:start}.gp-l li:has(.btn) .gp-imp{grid-column:3}
  .po-l li{grid-template-columns:minmax(0,1.2fr) 1.4fr 40px}.po-big b{font-size:2.2rem}.po-seeds{max-width:none;min-width:100%}}
@media (prefers-reduced-motion:reduce){.dfirst .kp-c,.dfirst .kp-sl,.dfirst .gp-l li,.dfirst .po-b i,.dfirst .po-seeds i{animation:none!important}}
`;document.head.appendChild(s);}
