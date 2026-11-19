/* ============================================================================
   PICKUP IMPACT (2.86, 2026-11-19). Arp: "a feature that shows what impact our
   free agent/waiver adds had ... real numbers and not projections". Design agreed
   with Arp in the doc https://claude.ai/artifact/73bAPiK6KdtxDfzDMbJjvP:
   - Every team's adds (free agents and waivers; no trades or IR moves), found in the
     day-by-day rosters (OWN), so it works while the league mirrors ESPN too.
   - Net swap: on each day the pickup started and played, his real box score minus the
     real box score of the player he replaced that day (wherever that player played).
     An add into an open spot has nothing to subtract. FG% and FT% are the change to
     the team's matchup percentage.
   - Category flips: the real matchup score vs the score with the pickup's started stats
     taken out and the dropped player's put back. Won a cat / Cost a cat / No change.
   - So far during the matchup, Final once it ends; best and worst add of the week.
   - Moves the Win-the-week planner suggested to you carry a Planner pick tag and what
     the planner expected next to the real result.
   Analytics › Pickup impact (every team) and the dashboard tile "Pickup impact" (one team).
   ============================================================================ */
const PI={w:0,f:"all",pp:false};
try{Object.assign(PI,JSON.parse(localStorage.getItem("dfPimp")||"{}"));}catch(e){}
const savePI=()=>{try{localStorage.setItem("dfPimp",JSON.stringify({f:PI.f,pp:PI.pp}));}catch(e){}};
const piEnd=i=>i.to==null||i.to===Infinity?Infinity:i.to;
// first roster day of the season (draft rosters start here, so they aren't adds)
const piStart=()=>{let m=Infinity;Object.values(OWN).forEach(a=>a.forEach(i=>{if(i.from<m)m=i.from;}));return m===Infinity?1:m;};
const piWeek=n=>WEEKS[n-1]?WEEKS[n-1].slice():null;
const piWk=()=>{const c=dwkNow();if(!PI.w||!piWeek(PI.w)||PI.w>c[0])PI.w=c[0];return piWeek(PI.w)||c;};
const piDone=w=>TODAY>w[2];
const piZero=()=>new Array(11).fill(0);
const piAdd=(t,l)=>{if(l)for(let i=0;i<11;i++)t[i]+=+l[i]||0;return t;};
const piScore=t=>t[K.PTS]+1.2*t[K.REB]+1.5*t[K.AST]+3*t[K.STL]+3*t[K.BLK]+t[K.TPM];

// every add a team made in matchup w ([n, first day, last day]), with the player it replaced
function piAdds(T,w){const d0=w[1],d1=w[2],s0=piStart(),ivs=[],out=[];
  Object.entries(OWN).forEach(([n,a])=>a.forEach((i,k)=>ivs.push({n,i,prev:a[k-1],next:a[k+1]})));
  const tradeIn=new Set(TXLOG.filter(t=>t.ok&&t.type==="trade").flatMap(t=>tnum(t.from)===T?t.get:tnum(t.to)===T?t.give:[]));
  const adds=ivs.filter(x=>x.i.team===T&&x.i.from>s0&&x.i.from>=d0&&x.i.from<=d1&&!tradeIn.has(x.n)&&!(x.prev&&x.prev.team!==T&&piEnd(x.prev)===x.i.from));
  const drops=ivs.filter(x=>x.i.team===T&&piEnd(x.i)!==Infinity&&piEnd(x.i)>=d0-1&&piEnd(x.i)<=d1+1&&!(x.next&&x.next.team!==T&&x.next.from===piEnd(x.i)));
  const used=new Set();
  adds.sort((a,b)=>a.i.from-b.i.from).forEach(x=>{const f=x.i.from;
    // the move log pairs the drop in app mode; mirror mode pairs the closest drop a day either side
    const tx=[...TXLOG].reverse().find(t=>t.ok&&t.type!=="trade"&&t.add===x.n&&tnum(t.team)===T&&t.drop);
    let dr=tx?drops.find(y=>!used.has(y)&&y.n===tx.drop):null;
    if(!dr)dr=drops.filter(y=>!used.has(y)&&y.n!==x.n&&Math.abs(piEnd(y.i)-f)<=1).sort((a,b)=>Math.abs(piEnd(a.i)-f)-Math.abs(piEnd(b.i)-f))[0];
    if(dr)used.add(dr);
    out.push({T,w,add:x.n,from:f,to:piEnd(x.i),drop:dr?dr.n:null,dropDay:dr?piEnd(dr.i):null});});
  return out;}

// what one add really did: started days, net swap per stat, change to FG%/FT%, categories flipped
function piScoreMove(m){const T=m.T,w=m.w,p=TEAMS[T]&&TEAMS[T].P.find(q=>q.n===m.add);
  const last=Math.min(m.to-1,w[2],TODAY),days=[];let bench=0;
  const pk=piZero(),dr=piZero();
  for(let sp=m.from;sp<=last;sp++){const l=p&&p.d&&p.d[sp];if(!l||!(l[K.MIN]>0))continue;
    if(!startedOn(p,sp)){bench++;continue;}
    const d=m.drop&&DAYLINES[m.drop]?DAYLINES[m.drop][sp]:null,dl=d&&d[K.MIN]>0?d:null;
    piAdd(pk,l);piAdd(dr,dl);days.push({sp,l,d:dl});}
  const net=pk.map((v,i)=>v-dr[i]);
  const all=dwkDays(w),a=dayTotals(T,all),O=opponentIn(T,w[0]),b=O&&TEAMS[O]?dayTotals(O,all):null;
  const cf=a?a.map((v,i)=>v-(pk[i]||0)+(dr[i]||0)):null;
  const pctD={};CATS.forEach(c=>{if(c[1]==="pct")pctD[c[0]]=a&&cf?val(a,c)-val(cf,c):0;});
  let won=[],cost=[],res=null;
  if(a&&b&&days.length){const s=(x,c)=>{const A=val(x,c),B=val(b,c);return Math.abs(A-B)<1e-9?0:A>B?1:-1;};
    CATS.forEach(c=>{const r1=s(a,c),r0=s(cf,c);if(r1>r0)won.push(c[0]);else if(r1<r0)cost.push(c[0]);});
    const R=x=>{const h=h2h(x,b);return h[0]>h[1]?"win":h[0]<h[1]?"loss":"tie";},r1=R(a),r0=R(cf);if(r1!==r0)res={from:r0,to:r1};}
  return {...m,O,days,bench,pk,dr,net,pctD,won,cost,res,sc:(won.length-cost.length)*100+piScore(net),done:piDone(w),plan:piPlan(m)};}

// planner pick: the planner suggested this add to this team (logged per login by the move tracker)
function piPlan(m){if(typeof plhList!=="function")return null;
  return plhList().find(e=>e.a===m.add&&(e.T||myTeamNum())===m.T&&m.from>=e.sp&&m.from<=e.sp+7)||null;}
// the tracker now also remembers what the planner expected from each move (win-chance gain, categories it helps, starts)
if(typeof plhLog==="function"){const _pl=plhLog;plhLog=function(T,r){_pl.apply(this,arguments);
  try{if(!r||!r.moves||!r.moves.length||!plhOn(T)||!DAYS.length)return;const wk0=DAYS[0];let ch=false;
    const list=plhList().map(e=>{if(e.pw!=null||e.wk!==wk0||(e.T||T)!==T)return e;const mv=r.moves.find(x=>x.x&&x.x.n===e.a);if(!mv)return e;ch=true;
      return {...e,pw:mv.worth!=null?Math.round(mv.worth*100)/100:0,pc:(mv.dc||[]).slice(0,4).map(x=>x.c[0]),pg:(mv.games||[]).length};});
    if(ch)dashBoardSet({plh:list});}catch(e){}};}

function piAll(w){const ids=L.teams.map(t=>tnum(t.id)).filter(x=>TEAMS[x]),out=[];
  ids.forEach(T=>piAdds(T,w).forEach(m=>{try{out.push(piScoreMove(m));}catch(e){console.warn(e);}}));return out;}

// ---- formatting ----
const piSign=v=>(v>0?"+":v<0?"−":"")+Math.abs(Math.round(v*10)/10);
const piLine=l=>{if(!l)return `<span class="muted">didn't play</span>`;return CATS.map(c=>c[1]==="pct"?`${l[c[2]]}/${l[c[3]]} ${esc(c[0].replace("%",""))}`:`${l[c[2]]} ${esc(c[0])}`).join(" · ");};
function piChips(r,max){const ch=[];
  CATS.forEach(c=>{if(c[1]==="pct"){const d=r.pctD[c[0]]||0;if(Math.abs(d)>=.0005)ch.push({k:c[0],t:`${c[0]} ${d>0?"+":"−"}${Math.abs(d*100).toFixed(1)}%`,v:d,z:Math.abs(d)*400});}
    else{const d=r.net[c[2]];if(d)ch.push({k:c[0],t:`${c[0]} ${piSign(d)}`,v:d,z:Math.abs(d)*(c[0]==="PTS"?.25:c[0]==="REB"||c[0]==="AST"?.6:1.5)});}});
  const l=max?ch.sort((a,b)=>b.z-a.z).slice(0,max):ch;
  return l.length?`<span class="pi-net">${l.map(x=>`<i class="${x.v>0?"up":"dn"}">${esc(x.t)}</i>`).join("")}</span>`:"";}
function piVerdict(r){if(!r.days.length)return `<i class="pi-v">${r.bench?"bench only":"no starts yet"}</i>`;
  const lab=r.done?"Final":"So far";
  if(r.won.length&&!r.cost.length)return `<i class="pi-v ok">${lab} · Won ${r.won.map(esc).join(", ")}</i>`;
  if(r.cost.length&&!r.won.length)return `<i class="pi-v bad">${lab} · Cost ${r.cost.map(esc).join(", ")}</i>`;
  if(r.won.length)return `<i class="pi-v">${lab} · Won ${r.won.map(esc).join(", ")}, cost ${r.cost.map(esc).join(", ")}</i>`;
  return `<i class="pi-v">${lab} · No change</i>`;}
const piResTxt=r=>r.res?` It turned a ${r.res.from} into a ${r.res.to}.`:"";
function piPlanTxt(r){const e=r.plan;if(!e)return "";
  const said=e.pw!=null?`expected +${(+e.pw).toFixed(2)} categories${e.pc&&e.pc.length?` (${e.pc.map(esc).join(", ")})`:""}${e.pg?` over ${e.pg} start${e.pg===1?"":"s"}`:""}`:"suggested this move";
  const real=!r.days.length?"no starts yet":`${r.won.length?`won ${r.won.map(esc).join(", ")}`:r.cost.length?"won no category":"no category changed"}${r.cost.length?`, cost ${r.cost.map(esc).join(", ")}`:""} over ${r.days.length} start${r.days.length===1?"":"s"}`;
  return `<small class="pi-pc"><b>Planner check:</b> the planner ${said}. Real${r.done?"":" so far"}: ${real}.</small>`;}
function piDays(r){if(!r.days.length)return "";
  return `<details class="pi-dd"><summary>Day by day (${r.days.length} start${r.days.length===1?"":"s"})</summary><table class="pi-tb"><thead><tr><th>Day</th><th>${esc(dashLast(r.add))}</th>${r.drop?`<th>${esc(dashLast(r.drop))}</th>`:""}</tr></thead><tbody>
    ${r.days.map(d=>`<tr><td>${esc(dow(d.sp))} ${esc(md(d.sp))}</td><td class="num">${piLine(d.l)}</td>${r.drop?`<td class="num">${piLine(d.d)}</td>`:""}</tr>`).join("")}</tbody></table></details>`;}
function piRow(r,o){o=o||{};const mine=r.plan;
  return `<li class="pi-r">${dFace(r.add,(DIR[r.add]||{}).t,"sm")}<span class="pi-who"><span><b>+${o.tile?esc(dashLast(r.add)):dashNm(r.add)}</b>${r.drop?` <span class="muted">for ${o.tile?esc(dashLast(r.drop)):dashNm(r.drop)}</span>`:` <span class="muted">· open spot</span>`}${mine?`<i class="pi-v pp">Planner pick</i>`:""}${piVerdict(r)}</span>
    <small class="muted">${esc(dow(r.from))} ${esc(md(r.from))} · ${r.days.length} start${r.days.length===1?"":"s"}${r.bench?` · ${r.bench} on bench`:""}${r.to-1<r.w[2]&&r.to!==Infinity?` · dropped ${esc(dow(r.to))}`:""}</small>
    ${piChips(r,o.tile?3:0)}${o.tile?"":piResTxt(r)?`<small>${esc(piResTxt(r).trim())}</small>`:""}${o.tile?"":piPlanTxt(r)}${o.tile?"":piDays(r)}</span></li>`;}

// ---- Analytics › Pickup impact ----
function pimpView(){
  if(!L||!Object.keys(TEAMS).length)return `<section class="panel emptyst"><h2>No data yet</h2><p>Pickup impact fills in once rosters exist.</p></section>`;
  const w=piWk(),n=w[0],c=dwkNow()[0],me=myTeamNum()||(TEAMS[cur]?cur:0),done=piDone(w);
  let rs=piAll(w);
  if(PI.f==="mine"&&me)rs=rs.filter(r=>r.T===me);
  if(PI.pp)rs=rs.filter(r=>r.plan);
  const nav=`<div class="pi-nav"><button class="btn sm" data-pi="w:${n-1}" ${n<=1?"disabled":""} aria-label="Earlier matchup">‹</button><b>${esc(weekName(n))}</b><span class="muted">${esc(dwkRange(w))}${done?" · Final":" · so far"}</span><button class="btn sm" data-pi="w:${n+1}" ${n>=c?"disabled":""} aria-label="Later matchup">›</button></div>
    <div class="pi-f">${me?`<div class="tabs sm" role="group"><button data-pi="f:all" aria-selected="${PI.f!=="mine"}">All teams</button><button data-pi="f:mine" aria-selected="${PI.f==="mine"}">My team</button></div>`:""}${typeof plhList==="function"&&plhList().length?`<div class="tabs sm" role="group"><button data-pi="pp" aria-selected="${!!PI.pp}">Planner picks only</button></div>`:""}</div>`;
  let best="";
  if(done){const st=rs.filter(r=>r.days.length).sort((a,b)=>b.sc-a.sc),hi=st[0],lo=st[st.length-1];
    const card=(r,t,cl)=>`<div class="pi-aw ${cl}"><small>${t}</small><b>+${dashNm(r.add)}</b><span class="muted">${esc(dShort(r.T))}${r.drop?` · for ${esc(dashLast(r.drop))}`:""}</span>${piChips(r,3)}${r.won.length?`<small class="ok">Won ${r.won.map(esc).join(", ")}</small>`:r.cost.length?`<small class="bad">Cost ${r.cost.map(esc).join(", ")}</small>`:""}</div>`;
    if(hi&&hi.sc>0)best+=card(hi,"Best add of the week","ok");if(lo&&lo!==hi&&lo.sc<0)best+=card(lo,"Worst add of the week","bad");
    if(best)best=`<div class="pi-aws">${best}</div>`;}
  const by={};rs.forEach(r=>(by[r.T]=by[r.T]||[]).push(r));
  const teams=Object.keys(by).map(Number).sort((a,b)=>(b===me)-(a===me)||by[b].reduce((s,r)=>s+r.sc,0)-by[a].reduce((s,r)=>s+r.sc,0));
  const body=teams.length?teams.map(T=>{const l=by[T].sort((a,b)=>b.sc-a.sc),wn=l.reduce((s,r)=>s+r.won.length,0),cs=l.reduce((s,r)=>s+r.cost.length,0);
    return `<section class="panel pi-t"><h3>${esc(TEAMS[T].name)}<small class="muted"> · ${l.length} add${l.length===1?"":"s"}${wn||cs?` · ${wn?`won ${wn} cat${wn===1?"":"s"}`:""}${wn&&cs?", ":""}${cs?`cost ${cs}`:""}`:""}</small></h3><ol class="pi-l">${l.map(r=>piRow(r)).join("")}</ol></section>`;}).join("")
    :`<section class="panel"><p class="muted">${PI.pp?"None of the planner's picks were added this matchup.":PI.f==="mine"?"You made no pickups this matchup.":"No pickups this matchup yet."}</p></section>`;
  return `<section class="panel pi-hd"><h2>Pickup impact</h2><p class="muted">What every pickup really did, from the box scores. It counts only days the pickup started and played, minus what the player he replaced did those same days. FG% and FT% show the change to the team's matchup percentage. ${done?"This matchup is final.":"Numbers update each day as box scores come in, and lock when the matchup ends."}</p>${nav}</section>${best}${body}
    <p class="anote">Category flips compare the real matchup score with the score you'd have without the pickup and with the dropped player back in his place. That assumes the dropped player would have started on those days. Trades and IR moves aren't counted.</p>`;}
{const _av=analyticsView;analyticsView=function(){return SUB.analytics==="pick"?pimpView():_av();};}
document.addEventListener("click",e=>{const b=e.target.closest("[data-pi]");if(!b)return;e.preventDefault();e.stopPropagation();const v=b.dataset.pi;
  if(v.startsWith("w:"))PI.w=+v.slice(2);else if(v.startsWith("f:"))PI.f=v.slice(2);else if(v==="pp")PI.pp=!PI.pp;else if(v.startsWith("go:")){PI.w=+v.slice(3);savePI();return setNav("analytics","pick");}
  savePI();renderRosters();},true);

// ---- dashboard tile: one team's adds in the matchup the dashboard shows ----
DW.pi={name:"Pickup impact",desc:"What your pickups really did this matchup, from the box scores: stats vs the player you dropped and categories won or lost because of them.",s:"w",
  view(w,T){if(!TEAMS[T])return dashEmpty("Pick a team.");const W0=typeof wk!=="undefined"&&wk&&wk[1]!=null?wk:dwkNow();
    if(W0[1]>TODAY)return dashEmpty("This matchup hasn't started yet.");
    const rs=piAdds(T,W0).map(m=>{try{return piScoreMove(m);}catch(e){return null;}}).filter(Boolean).sort((a,b)=>b.from-a.from);
    const more=`<button class="btn sm ghost pi-go" data-pi="go:${W0[0]}">Every team's pickups ›</button>`;
    if(!rs.length)return `<p class="dempty">No pickups ${piDone(W0)?"in this matchup":"this matchup yet"}. When ${T===myTeamNum()?"you add":"they add"} someone, his real stats vs the player dropped show here.</p>${more}`;
    const wn=rs.reduce((s,r)=>s+r.won.length,0),cs=rs.reduce((s,r)=>s+r.cost.length,0);
    return `<p class="pi-sum"><b>${rs.length}</b> pickup${rs.length===1?"":"s"} · ${piDone(W0)?"Final":"so far"}${wn?` · <span class="ok">won ${wn} cat${wn===1?"":"s"}</span>`:""}${cs?` · <span class="bad">cost ${cs}</span>`:""}</p><ol class="pi-l">${rs.map(r=>piRow(r,{tile:1})).join("")}</ol>${more}`;}};
// New Era +: in the Pickups section after the pickup advisor; added once to boards already set up
{const i=NEP_DEF.findIndex(x=>x[0]==="pa");if(!NEP_DEF.some(x=>x[0]==="pi"))NEP_DEF.splice(i>=0?i+1:NEP_DEF.length,0,["pi","w"]);}
{const _rr=renderRosters;renderRosters=function(){if(nav==="dash"&&!DASH_DRAG&&!DASH_EDIT)try{nepOnce("pi1","pi","w","pa");}catch(e){}return _rr.apply(this,arguments);};}

{const s=document.createElement("style");s.textContent=`
.pi-nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 6px}.pi-nav b{font-size:1rem}
.pi-f{display:flex;gap:6px;flex-wrap:wrap}
.pi-aws{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:0 0 12px}
.pi-aw{display:flex;flex-direction:column;gap:3px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--card,transparent)}
.pi-aw>small:first-child{font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:.68rem;color:var(--muted)}
.pi-aw.ok{border-color:color-mix(in srgb,var(--win) 45%,transparent)}.pi-aw.bad{border-color:color-mix(in srgb,var(--loss) 40%,transparent)}
.pi-t h3{margin:0 0 8px}
.pi-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.pi-r{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:12px;background:color-mix(in srgb,var(--ink) 4%,transparent);border:1px solid var(--line)}
.pi-who{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;line-height:1.3;font-size:.8rem}.pi-who>span>b{font-size:.88rem}
.pi-v{display:inline-block;margin-left:6px;font-style:normal;font-size:.7rem;font-weight:700;padding:1px 7px;border-radius:99px;background:var(--chip);color:var(--muted);vertical-align:middle}
.pi-v.ok{background:color-mix(in srgb,var(--win) 18%,transparent);color:var(--win)}.pi-v.bad{background:color-mix(in srgb,var(--loss) 16%,transparent);color:var(--loss)}
.pi-v.pp{background:var(--accent-wash);color:var(--accent)}
.pi-net{display:flex;flex-wrap:wrap;gap:4px}.pi-net i{font-style:normal;font-size:.72rem;font-weight:700;padding:1px 6px;border-radius:6px}
.pi-net i.up{color:var(--win);background:color-mix(in srgb,var(--win) 12%,transparent)}.pi-net i.dn{color:var(--loss);background:color-mix(in srgb,var(--loss) 10%,transparent)}
.pi-pc{padding:5px 8px;border-radius:8px;background:var(--accent-wash)}
.pi-dd summary{cursor:pointer;color:var(--muted);font-size:.76rem}
.pi-tb{width:100%;border-collapse:collapse;margin-top:4px;font-size:.74rem}.pi-tb th,.pi-tb td{text-align:left;padding:3px 6px;border-bottom:1px solid var(--line);vertical-align:top}
.pi-sum{margin:0 0 8px;font-size:.82rem}.pi-sum .ok,.pi-aw .ok{color:var(--win)}.pi-sum .bad,.pi-aw .bad{color:var(--loss)}
.pi-go{margin-top:8px}
`;document.head.appendChild(s);}
