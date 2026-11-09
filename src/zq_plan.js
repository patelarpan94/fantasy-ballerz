/* ============================================================================
   WIN-THE-WEEK PLANNER (2.40, Arp 2026-11-04: "think of the one BEST feature
   ... research into the one most important tool and build it").
   Research: in head-to-head categories the easiest edge is games played,
   won by streaming free agents into open lineup spots inside the pickup
   limit (RotoWire, Hashtag Basketball, Razzball). The public tools only show
   schedules; none plans the actual moves against your opponent. This does:
   - Baseline: the rest of your matchup with your best lineup each day
     (players matched to real slots by value, OUT players skipped).
   - Search: greedy, one pickup at a time, up to the pickups you have left.
     Each candidate = (spot, free agent, start day). A spot is an open roster
     spot, a low-value player you'd drop, or a streamer already in the plan
     (swapping him out on a later day chains streams). A free agent only
     counts on days he has a game AND fits an open slot after your regulars.
   - Score: expected categories won against this opponent's projected
     finish (same per-category chances as the rest of the dashboard).
   ============================================================================ */
let DPL_K="",DPL=null;
// Arp 2026-11-04: "i can only pickup 6 players a week ... players i pickup only show up next day"
const PL_MAX=7,PL_LAG=1;
// pickups that take effect on day sp (ESPN counts the limit per day when matchupLimitPerScoringPeriod is on; BUG-328)
function plUsedDay(T,sp){if(mirror()){let c=0;for(const n in OWN)OWN[n].forEach((iv,k)=>{if(iv.team===T&&iv.from===sp&&sp>0){const pv=OWN[n][k-1];if(!(pv&&pv.team&&pv.to===sp))c++;}});return c;}
  return TXLOG.filter(t=>t.ok&&t.type!=="trade"&&t.add&&tnum(t.team)===T&&(t.addDay??t.day)===sp).length;}
// BUG-327 (Arp 2026-11-09, ESPN rosterLocktimeType FIRSTGAME_SCORINGPERIOD): roster moves lock when the day's first game tips off.
// Before that a pickup plays the same day; after it, from tomorrow. A move for a later day can be made the night before.
const plTip=()=>{let m=null;for(const t in SCHED){const g=SCHED[t][TODAY];if(g&&g[2]!=null&&(m==null||g[2]<m))m=g[2];}return m;};
const plSame=()=>TODAY<=SEASON_END&&!Object.keys(SCHED).some(t=>SCHED[t][TODAY]&&locked({t},TODAY));
const plLag=()=>plSame()?0:1;
const plAddDay=f=>Math.max(TODAY,f-1);
const plTipTxt=()=>{const m=plTip();if(m==null)return "";const h=Math.floor(m/60),mm=m%60;return `${(h+11)%12+1}:${String(mm).padStart(2,"0")} ${h<12?"AM":"PM"} ET`;};
function dPlanBuild(T){const opp=dOpp(T);if(!opp)return null;
  const days=DAYS.filter(sp=>sp>=TODAY);if(!days.length)return {opp,done:true};
  const B=fcProj(opp).fin,now=score(T),K=now.length,lim=+L.addLimit||0,mode=L.addMode||"matchup";
  let budget=lim?(mode==="day"?lim*days.length:pickupsLeft(T)):PL_MAX;budget=Math.min(budget,PL_MAX);
  const perDay=mode==="day"&&lim?lim:99;
  const zOfP=p=>{const r=recentPG(p.n,14),pj=pgLine(p.pj);return pj?zOf(pj):r?zOf(r.pg):-5;};
  // regulars: everyone not on IR. Each brings his projected line on days he plays and fits.
  const regs=dNowP(T).map(p=>({n:p.n,t:p.t,el:(p.el&&p.el.length?p.el:(DIR[p.n]&&DIR[p.n].el)||[11]),pj:pgLine(p.pj),z:zOfP(p),ir:slotOn(p,TODAY)===13,out:p.st==="OUT"})).filter(x=>!x.ir);
  const fits=(el,slot)=>slot===11||el.includes(slot);
  // who plays on a day: match players (best first) to lineup slots; returns totals
  const MEMO=new Map();const dayLine=(sp,xs)=>{const mk=sp+"|"+xs.map(x=>x.n).sort().join(",");const hit=MEMO.get(mk);if(hit)return hit;const owner=new Array(LINEUP.length).fill(null),tot=new Array(K).fill(0);
    const tryA=(x,seen)=>{for(let j=0;j<LINEUP.length;j++){if(seen[j]||!fits(x.el,LINEUP[j]))continue;seen[j]=1;if(owner[j]==null||tryA(owner[j],seen)){owner[j]=x;return true;}}return false;};
    xs.slice().sort((a,b)=>b.z-a.z).forEach(x=>{if(tryA(x,[])&&x.pj)x.pj.forEach((v,i)=>tot[i]+=+v||0);});
    const used=new Set(owner.filter(Boolean));const out={tot,used,free:owner.filter(v=>v==null).length};MEMO.set(mk,out);return out;};
  const plays=(x,sp)=>!x.out&&gameOn(x.t,sp)&&(sp>TODAY||!locked({t:x.t},sp));
  // plan = {drops:{name:day}, adds:[{x,from,to,spot}]}
  const evalPlan=pl=>{const tot=now.slice(),perDayUse={};const slotsUsed={};
    days.forEach(sp=>{const xs=regs.filter(r=>!(pl.drops[r.n]!=null&&sp>=pl.drops[r.n])&&plays(r,sp));
      pl.adds.forEach(a=>{if(sp>=a.from&&sp<=a.to&&plays(a.x,sp))xs.push(a.x);});
      const r=dayLine(sp,xs);r.tot.forEach((v,i)=>tot[i]+=v);
      slotsUsed[sp]={g:pl.adds.filter(a=>sp>=a.from&&sp<=a.to&&r.used.has(a.x)).map(a=>a.x.n),reg:[...r.used].filter(x=>!pl.adds.some(a=>a.x===x)).length,free:r.free};});
    return {tot,exp:dExpCats(tot,B),slotsUsed};};
  const base={drops:{},adds:[]},b0=evalPlan(base);
  // free agents worth a look: best value lately, healthy, with a game left
  const fa=Object.values(DIR).filter(D=>!ownerNow(D.n)&&INJ[D.n]!=="OUT"&&D.t&&days.some(sp=>gameOn(D.t,sp))).map(D=>{const r=recentPG(D.n,14),pj=pgLine(D.pj)||(r&&r.pg);if(!pj)return null;
      return {n:D.n,t:D.t,el:(D.el&&D.el.length?D.el:[11]),pj,z:zOf(pj),w:typeof onWaivers==="function"&&onWaivers(D.n)};}).filter(Boolean).sort((a,b)=>b.z-a.z).slice(0,22);
  // spots: open roster spots + the 3 lowest-value regulars you could drop
  const openN=typeof plOpen==="function"?plOpen(T):Math.max(0,ROSTER_MAX-dNowP(T).length);
  // never a player ranked inside the league's starting pool (teams x 13); only ones a pickup already beats on the season
  const keepRk=Object.keys(TEAMS).length*13,zs=n=>{const r=recentPG(n,400);return r?zOf(r.pg):-9;};
  const dropC=regs.filter(r=>!r.out&&!(DIR[r.n]&&DIR[r.n].rk&&DIR[r.n].rk<=keepRk)).map(r=>({...r,zs:zs(r.n)})).sort((a,b)=>a.zs-b.zs).slice(0,3);
  let plan={drops:{},adds:[]},cur=b0,openLeft=openN;const steps=[];
  for(let k=0;k<budget;k++){let best=null;
    const tryPlan=(pl,meta)=>{const r=evalPlan(pl);const g=r.exp-cur.exp;if(g>.04&&(!best||g>best.g+1e-9))best={pl,r,g,meta};};
    for(const x of fa){if(plan.adds.some(a=>a.x.n===x.n))continue;
      const ok=d=>d>=TODAY+plLag()+(x.w?1:0)&&plays(x,d)&&plan.adds.filter(a=>a.from===d).length<perDay;
      const d0=days.find(ok);if(d0==null)continue;const end=days[days.length-1];
      // a new spot: start on his first playable day (a later start only loses games)
      if(openLeft>0)tryPlan({drops:plan.drops,adds:[...plan.adds,{x,from:d0,to:end,spot:"open"+openLeft}]},{kind:"open",d:d0});
      for(const p of dropC){if(plan.drops[p.n]!=null||p.zs>=zs(x.n))continue;tryPlan({drops:{...plan.drops,[p.n]:d0},adds:[...plan.adds,{x,from:d0,to:end,spot:p.n}]},{kind:"drop",p,d:d0});}
      // chain: take over a planned streamer's spot on a later day
      plan.adds.forEach((a,i)=>days.forEach(d=>{if(a.to!==end||d<=a.from||!ok(d))return;const na=plan.adds.map((b,j)=>j===i?{...b,to:d-1}:b);tryPlan({drops:plan.drops,adds:[...na,{x,from:d,to:end,spot:a.spot}]},{kind:"swap",a,d});}));}
    if(!best)break;plan=best.pl;cur=best.r;if(best.meta.kind==="open")openLeft--;steps.push(best.meta);}
  // the moves, in day order, with what each player gives
  const moves=plan.adds.map(a=>{const g=days.filter(sp=>sp>=a.from&&sp<=a.to&&cur.slotsUsed[sp].g.includes(a.x.n));
    const prev=plan.adds.find(b=>b!==a&&b.spot===a.spot&&b.to===a.from-1),drop=prev?prev.x.n:String(a.spot).startsWith("open")?null:a.spot;
    return {x:a.x,from:a.from,to:a.to,games:g,drop};}).filter(m=>m.games.length).sort((a,b)=>a.from-b.from||b.games.length-a.games.length);
  const pB=CATS.map(c=>dLogit(val(b0.tot,c),val(B,c),c)),pA=CATS.map(c=>dLogit(val(cur.tot,c),val(B,c),c));
  const wp=(tot)=>{try{return winProb({now,fin:tot,done:false},{now:score(opp),fin:B,done:false});}catch(e){return null;}};
  return {opp,days,budget,lim,mode,moves,b0,cur,pB,pA,w0:wp(b0.tot),w1:wp(cur.tot),gain:cur.exp-b0.exp,games:moves.reduce((s,m)=>s+m.games.length,0)};}
function dPlan(T){const k=T+":"+TODAY+":"+plLag()+":"+TXLOG.length+":"+(LIVE&&LIVE.at||0)+":"+(typeof REV!=="undefined"?REV:"");if(k!==DPL_K){DPL_K=k;try{DPL=dPlanBuild(T);}catch(e){console.warn(e);DPL=null;}}return DPL;}

DW.pl={name:"Win-the-week planner",desc:"Plans every pickup for the rest of this matchup, day by day, inside your pickup limit: who to add, who to drop, when to swap streamers. Picks the moves that win the most categories against this opponent.",s:"f",
  view(w,T){const r=dPlan(T);if(!r)return dashEmpty("No matchup this week.");if(r.done)return dashEmpty("This matchup is over. The planner wakes up for the next one.");
    const ed=dCanEdit(T),on=dShort(r.opp),phone=PHONE(),dn=sp=>sp===TODAY?"Today":dow(sp);
    const head=`<div class="pl-h"><div class="pl-ba"><span><small>No moves</small><b class="num">${dRound(r.b0.exp).toFixed(1)}</b><i>${r.w0!=null?dPct(r.w0)+"% win":""}</i></span><span class="pl-arr" aria-hidden="true">→</span><span class="pl-after"><small>With the plan</small><b class="num">${dRound(r.cur.exp).toFixed(1)}</b><i>${r.w1!=null?dPct(r.w1)+"% win":""}</i></span></div>
      <p class="pl-sum">${r.moves.length?`<b>${r.moves.length} pickup${r.moves.length>1?"s":""}, ${r.games} extra game${r.games>1?"s":""}</b> · expected categories won vs ${esc(on)} out of ${CATS.length}`:`Expected categories won vs ${esc(on)} out of ${CATS.length}`}<br><small class="muted">${r.lim?`Uses up to ${r.budget} of your pickups ${esc(addWhen())}.`:"The plan uses at most ${PL_MAX} pickups."} A pickup plays from the next day, and only counts on days he has a game and fits an open spot.</small></p></div>`;
    if(!r.moves.length)return head+`<p class="dempty okc">✓ No pickup helps this week. Your lineup already covers your open spots${r.budget?"":", or you've used your pickups"}.</p>`;
    const flips=CATS.map((c,i)=>({c,a:r.pB[i],b:r.pA[i]})).filter(x=>Math.abs(x.b-x.a)>=.05);
    const cats=`<div class="pl-cats">${flips.map(x=>`<span class="${x.a<.5&&x.b>=.5?"flip":""}"><b>${esc(x.c[0])}</b><i class="num">${dPct(x.a)}→${dPct(x.b)}%</i></span>`).join("")}</div>`;
    const mv=`<ol class="pl-m">${r.moves.map((m,i)=>`<li style="--d:${i*80}ms"><span class="pl-day">${esc(dn(plAddDay(m.from)))}</span>${dFace(m.x.n,m.x.t,"sm")}<span class="pl-who"><b>Add ${dashNm(m.x.n)}</b><small class="muted">${esc(m.x.t)}${m.drop?` · drop ${esc(dashLast(m.drop))}`:" · open roster spot"} · plays from ${esc(dow(m.from))}${m.x.w?" · on waivers, claim now":""}</small></span>
      <span class="pl-g" aria-label="${m.games.length} games">${r.days.map(sp=>`<i class="${m.games.includes(sp)?"on":sp>=m.from&&sp<=m.to&&gameOn(m.x.t,sp)?"no":""}" title="${esc(dn(sp))}"></i>`).join("")}<small>${m.games.length} g</small></span>
      ${ed&&plAddDay(m.from)===TODAY?`<button class="btn sm" data-add="${esc(m.x.n)}">Add</button>`:plAddDay(m.from)===TODAY?"":`<small class="pl-when muted">${esc(dn(plAddDay(m.from)))}</small>`}</li>`).join("")}</ol>`;
    const grid=`<div class="pl-grid" role="img" aria-label="Lineup spots filled each day">${r.days.map(sp=>{const u=r.cur.slotsUsed[sp]||{g:[],reg:0,free:0},tot=LINEUP.length;
      return `<span><i class="pl-bar">${Array.from({length:tot},(_,j)=>`<b class="${j<u.reg?"r":j<u.reg+u.g.length?"s":"e"}"></b>`).join("")}</i><small class="${sp===TODAY?"tdy":""}">${esc(sp===TODAY?"Today":dow(sp).slice(0,3))}</small></span>`;}).join("")}</div>
      <p class="dsm muted pl-key"><i class="r"></i>your players <i class="s"></i>planned pickups <i class="e"></i>empty spot</p>`;
    return head+cats+mv+grid+`<p class="dsm muted">Plans from ESPN projections and today's roster. Make each move after that day's games so the player you drop still plays. Tap Add for today's moves and you pick who to drop. Later moves update as the week plays out.</p>`;}};

// New Era +: the planner leads "Win the week" (applied once)
NEP_VER=4;
{const i=NEP_DEF.findIndex(x=>x[0]==="hd"&&x[2]&&x[2].t==="Win the week");if(i>=0){NEP_DEF.splice(i+1,0,["pl","f"]);const m=NEP_DEF.findIndex(x=>x[0]==="mw");if(m>=0)NEP_DEF.splice(m,1);}}
// the Game plan's pickup line points at the planner when it's on the board
{const _gp=dGamePlan;dGamePlan=function(T){const xs=_gp.apply(this,arguments);if(!dashW().some(w=>w.k==="pl"))return xs;let r=null;try{r=dPlan(T);}catch(e){}
  const i=xs.findIndex(x=>x.ic==="+");if(i<0||!r||!r.moves||!r.moves.length)return xs;const m=r.moves[0],ed=dCanEdit(T);
  xs[i]={...xs[i],t:`Planner: ${r.moves.length} pickup${r.moves.length>1?"s":""} for ${r.games} extra game${r.games>1?"s":""} this week. First: add ${m.x.n} ${plAddDay(m.from)===TODAY?"today":"on "+dow(plAddDay(m.from))} (he plays from ${dow(m.from)}).`,imp:`+${r.gain.toFixed(1)}`,act:ed&&plAddDay(m.from)===TODAY?`<button class="btn sm" data-add="${esc(m.x.n)}">Add</button>`:""};return xs;};}

{const s=document.createElement("style");s.textContent=`
.pl-h{display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:12px}
.pl-ba{display:flex;align-items:center;gap:12px}.pl-ba>span:not(.pl-arr){display:flex;flex-direction:column;align-items:center;padding:10px 16px;border-radius:14px;background:color-mix(in srgb,var(--ink) 5%,transparent);border:1px solid var(--line);min-width:92px}
.pl-ba small{font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.pl-ba b{font-size:1.9rem;line-height:1.1;font-weight:800}.pl-ba i{font-style:normal;font-size:.74rem;color:var(--muted);font-weight:700}
.pl-ba .pl-after{border-color:color-mix(in srgb,#22c55e 55%,var(--line));background:color-mix(in srgb,#22c55e 10%,transparent);box-shadow:0 10px 30px -18px #22c55e}.pl-after b{color:#22c55e}.pl-after i{color:#22c55e!important}
.pl-arr{font-size:1.4rem;color:var(--muted)}.pl-sum{margin:0;flex:1;min-width:220px;font-size:.9rem;line-height:1.4}
.pl-cats{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}.pl-cats span{display:inline-flex;gap:6px;align-items:center;padding:4px 10px;border-radius:99px;border:1px solid var(--line);font-size:.78rem}.pl-cats i{font-style:normal;color:var(--muted)}
.pl-cats span.flip{border-color:#22c55e;background:rgba(34,197,94,.12)}.pl-cats span.flip i{color:#22c55e;font-weight:800}
.pl-m{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:8px}
.pl-m li{display:grid;grid-template-columns:62px 30px minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--ink) 4%,transparent);border:1px solid var(--line)}
.pl-day{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--accent)}.pl-who{display:flex;flex-direction:column;min-width:0;line-height:1.25}.pl-who b{font-size:.9rem}.pl-who small{font-size:.75rem}
.pl-g{display:flex;align-items:center;gap:3px}.pl-g i{width:10px;height:10px;border-radius:3px;background:color-mix(in srgb,var(--muted) 18%,transparent)}.pl-g i.on{background:#22c55e;box-shadow:0 0 8px -1px #22c55e}.pl-g i.no{background:repeating-linear-gradient(45deg,color-mix(in srgb,var(--muted) 40%,transparent) 0 2px,transparent 2px 4px)}
.pl-g small{margin-left:6px;font-weight:800;font-size:.75rem}.pl-when{font-size:.74rem;white-space:nowrap}
.pl-grid{display:flex;gap:8px;align-items:flex-end}.pl-grid>span{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}.pl-bar{display:flex;flex-direction:column-reverse;gap:2px;width:100%;max-width:40px}
.pl-bar b{display:block;height:7px;border-radius:2px}.pl-bar b.r{background:color-mix(in srgb,var(--accent) 70%,transparent)}.pl-bar b.s{background:#22c55e;box-shadow:0 0 6px -1px #22c55e}.pl-bar b.e{background:color-mix(in srgb,var(--muted) 16%,transparent)}
.pl-grid small{font-size:.66rem;color:var(--muted);font-weight:700}.pl-grid small.tdy{color:var(--accent)}
.pl-key{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.pl-key i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:-6px}.pl-key i.r{background:color-mix(in srgb,var(--accent) 70%,transparent)}.pl-key i.s{background:#22c55e}.pl-key i.e{background:color-mix(in srgb,var(--muted) 25%,transparent)}
.dfirst .pl-m li{animation:drise .45s cubic-bezier(.3,.7,.2,1) both;animation-delay:var(--d)}.dfirst .pl-bar b.s{animation:dpop .5s cubic-bezier(.3,1.4,.4,1) both .3s}
.dash.dnep .pl-ba>span:not(.pl-arr),.dash.dnep .pl-m li{background:rgba(255,255,255,.05)}
@media (max-width:760px){.pl-h{gap:12px}.pl-ba{width:100%;justify-content:space-between}.pl-ba>span:not(.pl-arr){flex:1}
  .pl-m li{grid-template-columns:28px minmax(0,1fr) auto;row-gap:6px}.pl-day{grid-column:1/4}.pl-g{grid-column:2/3}.pl-m li .btn{grid-column:3;grid-row:2/4;align-self:center}.pl-when{display:none}}
@media (prefers-reduced-motion:reduce){.dfirst .pl-m li,.dfirst .pl-bar b.s{animation:none!important}}
`;document.head.appendChild(s);}
