/* ============================================================================
   CLAUDE CONNECTOR FEED (2.88, 2026-11-19). Arp picked "Build the Claude
   connector": friends add the league's server as a connector in their own Claude
   app and Claude reads the league itself, with no button and no pasting.
   The server can't rebuild rosters and projections on its own, so a logged-in open
   app writes one "ai" doc for the season every 20 minutes or so: per team the same
   brief the Ask Claude prompt uses (matchup by category, roster, opponent, stats,
   planner moves when this phone has them), plus standings and every free agent.
   The server's MCP endpoint (Code.gs mcp_) only serves that doc. Read-only, no
   passcodes or login data.
   ============================================================================ */
const AIF_EVERY=20*60e3;
// BUG-381 (Arp: Claude said it couldn't see the moves made this week): every pickup this team made in the
// current matchup, from Pickup impact's real box scores (not projections), as plain text for Claude
function askMovesTxt(T){if(typeof piAdds!=="function"||typeof dwkNow!=="function")return [];
  const w=dwkNow();if(!w)return [];let rs=[];try{rs=piAdds(T,w).map(piScoreMove);}catch(e){console.warn(e);return [];}
  const out=["","MOVES THIS MATCHUP (pickups already made, real box scores on days the pickup STARTED vs the player dropped on those days; not projections):"];
  if(!rs.length){out.push("None yet.");return out;}
  const nm=n=>n+(DIR[n]&&DIR[n].t?` (${DIR[n].t})`:"");
  const net=r=>{const a=[];CATS.forEach(c=>{if(c[1]==="pct"){const d=r.pctD[c[0]]||0;if(Math.abs(d)>=.0005)a.push(`${c[0]} ${d>0?"+":"-"}${Math.abs(d*100).toFixed(1)}%`);}
      else{const d=r.net[c[2]];if(d)a.push(`${c[0]} ${d>0?"+":"-"}${Math.abs(Math.round(d*10)/10)}`);}});return a.length?a.join(", "):"no change";};
  rs.sort((a,b)=>a.from-b.from).forEach(r=>{
    const res=!r.days.length?(r.bench?"only on the bench so far":"no starts yet"):r.won.length||r.cost.length?`${r.done?"final,":"so far,"} ${r.won.length?"won "+r.won.join(", "):""}${r.won.length&&r.cost.length?"; ":""}${r.cost.length?"cost "+r.cost.join(", "):""}`:`${r.done?"final,":"so far,"} no category changed hands`;
    const pl=r.plan?` Planner pick${r.plan.pw!=null?` (planner expected +${(+r.plan.pw).toFixed(2)} categories${r.plan.pc&&r.plan.pc.length?" in "+r.plan.pc.join(", "):""})`:""}.`:"";
    out.push(`- ${dow(r.from)} ${md(r.from)}: added ${nm(r.add)}, ${r.drop?"dropped "+nm(r.drop):"used an open spot"}${r.to!==Infinity&&r.to-1<r.w[2]?`, then dropped him ${dow(r.to)}`:""}. ${r.days.length} start${r.days.length===1?"":"s"}${r.bench?`, ${r.bench} game${r.bench===1?"":"s"} on bench`:""}. Net vs the dropped player: ${r.days.length?net(r):"none yet"}. Category effect: ${res}${r.res?` (turned the matchup from a ${r.res.from} into a ${r.res.to})`:""}.${pl}`);});
  try{const S=piWeekSum(T,rs,w);if(S)out.push(`All pickups together this matchup: ${net(S.tot)}.`);}catch(e){}
  return out;}
// BUG-385 (Arp: "can we expand its abilities"): more for the connector to read
// - players: every rostered player and the best 200 free agents, each with up to 15 recent box scores, news and who has him
// - moves: every pickup of the season by team, with what it really did (Pickup impact), past weeks cached per page load
// - board: this week's scoreboard for every matchup (now, projected, chance)
function aiPlayers(){const out={},days=DAYS.filter(sp=>sp>=TODAY),nx=askNext();
  const ros=new Set();Object.keys(TEAMS).map(Number).forEach(T=>dNowP(T).forEach(p=>ros.add(p.n)));
  const fa=Object.values(DIR).filter(D=>D.t&&D.t!=="FA"&&!ownerNow(D.n)).map(D=>{const s=recentPG(D.n,400),pj=pgLine(D.pj)||(s&&s.pg);return pj?{n:D.n,z:zOf(pj)}:null;}).filter(Boolean).sort((a,b)=>b.z-a.z).slice(0,200).map(x=>x.n);
  [...ros,...fa].forEach(n=>{const D=DIR[n];if(!D)return;try{const o=ownerNow(n),T=o&&TEAMS[o]?o:0,sl=T?slotOn((dNowP(T).find(p=>p.n===n)||{}),TODAY):null;
    const who=T?`on ${TEAMS[T].name}${sl===13?" (IR)":sl!=null?` (today ${SLOT[sl]||"BE"})`:""}`:typeof onWaivers==="function"&&onWaivers(n)?"on waivers":"free agent";
    const L=[`${n}: ${who}`,askPl({n,t:D.t,el:D.el},days,nx,"")];
    const gl=DAYLINES[n]||{},last=Object.keys(gl).map(Number).filter(sp=>sp<=TODAY).sort((a,b)=>b-a).slice(0,30);
    if(last.length)L.push(`Last ${last.length} games (newest first): `+last.map(sp=>`${dow(sp).slice(0,3)} ${dateOf(sp).getMonth()+1}/${dateOf(sp).getDate()}: ${askLine(gl[sp])}`).join(" ; "));
    const nw=typeof newsFor==="function"?newsFor(n).filter(a=>!/\bbets?\b|betting|odds|sportsbook|parlay|wager|\bprops?\b/i.test(a.h+" "+(a.d||""))).slice(0,3):[];if(nw.length)L.push(`Recent news: `+nw.map(a=>`${a.h}${a.d?` (${String(a.d).slice(0,200)})`:""}`).join(" | "));
    if(AIF_H&&AIF_H[n])L.push(AIF_H[n]);
    out[n]=L.join("\n");}catch(e){}});
  return out;}
const AIF_MV={};
function aiMoves(){if(typeof piAdds!=="function"||typeof WEEKS==="undefined")return {};const cur=dwkNow()[0],out={};
  Object.keys(TEAMS).map(Number).forEach(T=>{const L=[];
    for(let k=1;k<=cur;k++){const w=piWeek(k);if(!w)continue;const key=T+":"+k;let rs=k<cur?AIF_MV[key]:null;
      if(!rs){try{rs=piAdds(T,w).map(piScoreMove);}catch(e){rs=[];}if(k<cur)AIF_MV[key]=rs;}
      rs.forEach(r=>{const eff=!r.days.length?"no starts":r.won.length||r.cost.length?`${r.won.length?"won "+r.won.join(", "):""}${r.won.length&&r.cost.length?"; ":""}${r.cost.length?"cost "+r.cost.join(", "):""}`:"no category changed";
        L.push(`Wk${k} ${dow(r.from).slice(0,3)} ${md(r.from)}: +${r.add} for ${r.drop?"-"+r.drop:"open spot"} · ${r.days.length} start${r.days.length===1?"":"s"} · ${r.done?"final":"so far"}: ${eff}`);});}
    out[T]=L.length?L.join("\n"):"No pickups this season.";});
  return out;}
function aiBoard(){const wk=weekOf(TODAY),seen=new Set(),L=[`WEEK ${wk[0]} SCOREBOARD (${askDayNm(wk[1])} to ${askDayNm(wk[2])}): categories won now | projected final | chance to win`];
  Object.keys(TEAMS).map(Number).forEach(T=>{const O=dOpp(T);if(!O||seen.has(T))return;seen.add(T);seen.add(O);
    try{const a=fcProj(T),b=fcProj(O),n=h2h(a.now,b.now),f=h2h(a.fin,b.fin);let wp=null;try{wp=winProb(a,b);}catch(e){}
      L.push(`- ${TEAMS[T].name} vs ${TEAMS[O].name}: ${n.join("-")} | ${f.join("-")} | ${wp!=null?`${TEAMS[T].name} ${dPct(wp)}%`:""}`);
      L.push(`  by category now: `+CATS.map(c=>{const g=c[1]==="pct"?(v=>v.toFixed(3).replace(/^0/,"")):askN;return `${c[0]} ${g(val(a.now,c))}-${g(val(b.now,c))}`;}).join(", "));}catch(e){}});
  return L.join("\n");}
// league analytics the app already computes, as text
function aiAnalytics(){const L2=[],nm=x=>TEAMS[x]?TEAMS[x].name:String(x);
  // season category standings (real box scores of started players): totals with league rank, and each category's W-L-T in matchups
  try{const ids=Object.keys(TEAMS).map(Number).filter(x=>TEAMS[x].P.length),last=Math.min(TODAY,typeof SEASON_END!=="undefined"?SEASON_END:TODAY),all=[];for(let sp=1;sp<=last;sp++)all.push(sp);
    const tot={},rec={};ids.forEach(x=>{tot[x]=dayTotals(x,all)||new Array(10).fill(0);rec[x]=CATS.map(()=>[0,0,0]);});
    const cw=dwkNow()[0];for(let n=1;n<=cw;n++){const w=piWeek(n);if(!w)continue;const ds=dwkDays(w);(W[n]||[]).forEach(([a,b])=>{if(!rec[a]||!rec[b])return;const A=dayTotals(a,ds),B=dayTotals(b,ds);if(!A||!B)return;
      CATS.forEach((c,i)=>{const x=val(A,c),y=val(B,c);if(Math.abs(x-y)<1e-9){rec[a][i][2]++;rec[b][i][2]++;}else if(x>y){rec[a][i][0]++;rec[b][i][1]++;}else{rec[a][i][1]++;rec[b][i][0]++;}});});}
    const rk=(x,c)=>1+ids.filter(y=>val(tot[y],c)>val(tot[x],c)+1e-9).length,f=c=>c[1]==="pct"?(v=>v.toFixed(3).replace(/^0/,"")):(v=>String(Math.round(v)));
    L2.push(`SEASON CATEGORY STANDINGS (real totals of started players through today, rank 1-${ids.length} in brackets; then that category's W-L-T in head-to-head matchups this season, current week included)`);
    CATS.forEach((c,i)=>{L2.push(`${c[0]}: `+ids.slice().sort((x,y)=>rk(x,c)-rk(y,c)).map(x=>`${rk(x,c)}. ${nm(x)} ${f(c)(val(tot[x],c))} (${rec[x][i].join("-")})`).join(" · "));});
    L2.push("");}catch(e){console.warn(e);}
  try{const r=powerRows();if(r.length){L2.push("POWER RANKINGS (half record, half projected category strength of current active rosters)");
    r.forEach((x,i)=>L2.push(`${i+1}. ${nm(x.x)} (${STAND[x.x].rec.join("-")}) · avg category rank ${x.cr.toFixed(1)} · best ${x.best.join(", ")} · weakest ${x.worst}`));}}catch(e){}
  try{const G=ttLeague();if(G.ids.length){L2.push("","CATEGORY RANKS (1 = best in the league; per-game strength of each team's current active roster, healthy players' season/projection lines). Use for trade fits: a team ranked low in a category needs it, high has surplus.");
    G.ids.forEach(x=>L2.push(`- ${nm(x)}: `+CATS.map(c=>`${c[0]} ${G.rank(x,c)}`).join(", ")));}}catch(e){}
  try{const o=dPlayoffOdds();if(o){L2.push("",`PLAYOFF CHANCES (simulation of the ${o.left} regular-season week(s) left; top ${o.P} make it)`);
    o.rows.forEach(r=>L2.push(`- ${nm(r.id)}: ${dPct(r.p)}% to make playoffs, ${dPct(r.t)}% to finish 1st, average seed ${r.avg.toFixed(1)}`));}}catch(e){}
  try{const S=dPlayoffSched();if(S){L2.push("",`FANTASY PLAYOFF SCHEDULE (NBA games per team in our playoff weeks ${S.wks.join(", ")}; league average ${S.avg.toFixed(1)} games). Players on heavy-schedule teams are worth more for the playoffs.`);
    L2.push(S.g.map(x=>`${x.t} ${x.tot} (${x.w.join("+")})`).join(", "));}}catch(e){}
  return L2.join("\n");}
// BUG-387..391 (Arp picked the next improvements): transaction log, week-by-week results, future schedule,
// every free agent, longer game logs, last NBA season's averages and the draft
// last NBA season per player (hist/2025-26.json from the History tab, loaded once per page)
let AIF_H=null;const AIF_HS="2025-26";
function aiHistLoad(){if(AIF_H||typeof histLoad!=="function")return;histLoad(AIF_HS).then(d=>{const sum={},G=d.G||[];
  (d.l||[]).forEach(r=>{const g=G[r[0]];if(g&&g.ty!=null&&String(g.ty)!=="2")return;const nm=(d.p[r[1]]||[])[1];if(!nm||!(r[4]>0))return;
    const t=sum[nm]||(sum[nm]=new Array(12).fill(0));t[0]++;[4,5,6,7,8,10,11,14,15,16,17].forEach((k,i)=>t[i+1]+=+r[k]||0);});
  const out={};Object.entries(sum).forEach(([n,t])=>{const g=t[0],f=x=>Math.round(x/g*10)/10,pc=(m,a)=>a?(m/a).toFixed(3).replace(/^0/,""):"-";
    out[n]=`${AIF_HS} NBA regular season: ${g}gp, ${f(t[1])} min, FG% ${pc(t[3],t[4])} (${f(t[3])}/${f(t[4])}), FT% ${pc(t[6],t[7])} (${f(t[6])}/${f(t[7])}), 3PM ${f(t[5])}, REB ${f(t[8])}, AST ${f(t[9])}, STL ${f(t[10])}, BLK ${f(t[11])}, PTS ${f(t[2])}`;});
  AIF_H=out;}).catch(e=>console.warn("ai hist",e));}
// every add, drop and trade this season, from who had each player when (works in mirror mode too)
function aiTx(){const s0=piStart(),ev=[],tr={},nm=x=>TEAMS[x]?TEAMS[x].name:"team "+x;
  Object.entries(OWN).forEach(([n,a])=>{const iv=a.slice().sort((x,y)=>x.from-y.from);iv.forEach((i,k)=>{const prev=iv[k-1],next=iv[k+1],end=piEnd(i);
    if(i.from>s0){if(prev&&prev.team!==i.team&&piEnd(prev)===i.from){const key=i.from+":"+[prev.team,i.team].sort().join("-");(tr[key]||(tr[key]={sp:i.from,a:Math.min(prev.team,i.team),b:Math.max(prev.team,i.team),ga:[],gb:[]}))[prev.team<i.team?"ga":"gb"].push(n);}
      else ev.push({sp:i.from,T:i.team,t:`${nm(i.team)} added ${n}`});}
    if(end!==Infinity&&!(next&&next.team!==i.team&&next.from===end))ev.push({sp:end,T:i.team,t:`${nm(i.team)} dropped ${n}`});});});
  Object.values(tr).forEach(x=>ev.push({sp:x.sp,T:x.a,T2:x.b,t:`TRADE: ${nm(x.a)} sent ${x.ga.join(", ")||"nothing"} to ${nm(x.b)} for ${x.gb.join(", ")||"nothing"}`}));
  ev.sort((a,b)=>a.sp-b.sp||(a.t.startsWith("TRADE")?-1:0));
  return ev.map(e=>({T:e.T,T2:e.T2||0,t:`Wk${weekOf(e.sp)[0]} ${dow(e.sp).slice(0,3)} ${md(e.sp)}: ${e.t}`}));}
// every finished (and the current) matchup, category by category
function aiResults(){const cw=dwkNow()[0],L2=[],f=c=>c[1]==="pct"?(v=>v.toFixed(3).replace(/^0/,"")):(v=>String(Math.round(v)));
  for(let n=1;n<=cw;n++){const w=piWeek(n);if(!w)continue;const ds=dwkDays(w);L2.push(`WEEK ${n} (${md(w[1])} to ${md(w[2])})${n===cw?" - IN PROGRESS, totals so far":" - FINAL"}`);
    (W[n]||[]).forEach(([a,b])=>{if(!TEAMS[a]||!TEAMS[b])return;const A=dayTotals(a,ds),B=dayTotals(b,ds);if(!A||!B)return;const r=h2h(A,B);
      L2.push(`- ${TEAMS[a].name} ${r.join("-")} vs ${TEAMS[b].name}: `+CATS.map(c=>{const x=val(A,c),y=val(B,c);return `${c[0]} ${f(c)(x)}-${f(c)(y)}${Math.abs(x-y)<1e-9?" T":x>y?" W":" L"}`;}).join(", ")+` (W/L/T from ${TEAMS[a].name}'s side)`);});
    // that week's category standings across all teams
    const tot={};Object.keys(TEAMS).map(Number).forEach(x=>{const t=dayTotals(x,ds);if(t)tot[x]=t;});const ids=Object.keys(tot).map(Number);
    if(ids.length){L2.push(`  Week ${n} category ranks (all teams):`);CATS.forEach(c=>{const rk=x=>1+ids.filter(y=>val(tot[y],c)>val(tot[x],c)+1e-9).length;
      L2.push(`  ${c[0]}: `+ids.slice().sort((x,y)=>rk(x)-rk(y)).map(x=>`${rk(x)}. ${TEAMS[x].name} ${f(c)(val(tot[x],c))}`).join(" · "));});}}
  return L2.join("\n");}
// who plays whom in the weeks left, and NBA games per team per fantasy week
function aiSched(){const cw=dwkNow()[0],reg=regWeeks(),L2=[`FANTASY SCHEDULE (regular season has ${reg} weeks; playoffs after, top ${Math.min(+L.playoffTeams||4,Object.keys(TEAMS).length)} teams)`];
  for(let n=cw;n<=reg;n++){if(!CAL[n-1])continue;L2.push(`Week ${n} (${md(CAL[n-1][1])} to ${md(CAL[n-1][2])}): `+(W[n]||[]).filter(([a,b])=>TEAMS[a]&&TEAMS[b]).map(([a,b])=>`${TEAMS[a].name} vs ${TEAMS[b].name}`).join("; "));}
  const wks=[];for(let n=cw;n<=Math.min(CAL.length,cw+5);n++)wks.push(n);const tms=Object.keys(SCHED).sort();
  if(tms.length){L2.push("",`NBA GAMES PER TEAM PER FANTASY WEEK (weeks ${wks.join(", ")}; week ${cw} counts only games from today on)`);
    tms.forEach(t=>L2.push(`${t}: `+wks.map(n=>weekDaysAll(n).filter(sp=>(n>cw||sp>=TODAY)&&gameOn(t,sp)).length).join(" / ")));}
  return L2.join("\n");}
function aiDraft(){if(!Array.isArray(PICKS)||!PICKS.length)return "";const nm=x=>TEAMS[tnum(x)]?TEAMS[tnum(x)].name:String(x),ids=Object.keys(TEAMS).length||10;
  return `DRAFT RESULTS (pick number, round, team, player, and who has him now)\n`+PICKS.slice().sort((a,b)=>a.n-b.n).map(p=>{const o=ownerNow(p.player);return `${p.n}. (rd ${Math.ceil(p.n/ids)}) ${nm(p.team)}: ${p.player}${o?o===tnum(p.team)?"":` (now on ${TEAMS[o]?TEAMS[o].name:"?"})`:" (now free agent)"}`;}).join("\n");}
// free agents past the top 200: one compact line each
function aiMoreFA(skip){const out={};Object.values(DIR).forEach(D=>{if(!D.t||D.t==="FA"||ownerNow(D.n)||skip[D.n])return;const s=recentPG(D.n,400);if(!s)return;const l=recentPG(D.n,14);
  out[D.n]=`${D.n} (${D.t}, ${askPos(D.el)}) free agent${askInj(D.n)}${askOwn(D.n)} | Season ${s.g}gp ${askLine(s.pg)} | L14 ${askLine(l&&l.pg)}`+(AIF_H&&AIF_H[D.n]?` | ${AIF_H[D.n]}`:"");});return out;}
function aiFeedBuild(){const teams={};
  Object.keys(TEAMS).map(Number).forEach(T=>{let text="";try{const out=askBase(T,false,true).slice(1);out.push(...askMovesTxt(T));
      const r=DPL&&DPL_K&&DPL_K.startsWith(T+":")?DPL:null;if(r)out.push(...askPlanTxt(r));text=out.join("\n");}catch(e){console.warn(e);text="(couldn't build this team's data)";}
    teams[T]={name:TEAMS[T].name,rec:STAND[T]?STAND[T].rec.join("-"):"",text};});
  let league="",players={},moves={},board="",stats="",tx=[],results="",sched="",draft="",more={};try{league=[...askStandTxt(),...askFATxt(true)].join("\n").replace(/^\n/,"");}catch(e){console.warn(e);}
  try{players=aiPlayers();}catch(e){console.warn(e);}try{moves=aiMoves();}catch(e){console.warn(e);}try{board=aiBoard();}catch(e){console.warn(e);}try{stats=aiAnalytics();}catch(e){console.warn(e);}try{tx=aiTx();}catch(e){console.warn(e);}try{results=aiResults();}catch(e){console.warn(e);}try{sched=aiSched();}catch(e){console.warn(e);}try{draft=aiDraft();}catch(e){console.warn(e);}try{more=aiMoreFA(players);}catch(e){console.warn(e);}
  return {season:SEASON,at:Date.now(),v:typeof RELEASES!=="undefined"&&RELEASES[0]?RELEASES[0].v:"",league,teams,players,moves,board,stats,tx,results,sched,draft,more};}
// BUG-384 (Arp: Claude still read old data after he changed his drop list): the open app rebuilds the data every 2 minutes.
// BUG-385: the upload is now ~0.5 MB, so it goes up within 2 minutes when YOUR team changes (a move, your lineup, the planner's
// picks or your drop list), within 10 minutes for anything else (live scores, other teams), and every 20 minutes regardless
const AIF_MIN=2*60e3,AIF_OTHER=10*60e3;
const aiHashS=t=>{let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return String(h);};
const aiHash=v=>aiHashS(JSON.stringify([v.league,v.teams,v.players,v.moves,v.board,v.stats,v.tx,v.results,v.sched,v.draft,v.more]));
async function aiFeedPush(force){try{
  if(!SESSION||!SESSION.role||typeof Store==="undefined"||Store.local||!Store._call||!L||!Object.keys(TEAMS).length||!DAYS.length)return false;
  let last=0,lh="",lm="";try{last=+localStorage.getItem("dfAiAt")||0;lh=localStorage.getItem("dfAiH")||"";lm=localStorage.getItem("dfAiM")||"";}catch(e){}
  const age=Date.now()-last;if(!force&&age<AIF_MIN)return false;
  const v=aiFeedBuild(),h=aiHash(v),me=typeof myTeamNum==="function"?myTeamNum():0,hm=aiHashS(JSON.stringify([me?dNowP(me).map(p=>p.n+":"+slotOn(p,TODAY)):[],me&&DPL&&DPL_K&&DPL_K.startsWith(me+":")?[DPL.dl||[],(DPL.moves||[]).map(m=>m.x&&m.x.n)]:null,TXLOG.length]));
  if(!force&&age<AIF_EVERY&&!(hm!==lm)&&!(h!==lh&&age>=AIF_OTHER))return false;
  try{localStorage.setItem("dfAiAt",String(Date.now()));localStorage.setItem("dfAiH",h);localStorage.setItem("dfAiM",hm);}catch(e){}
  await Store._call("set",{c:"ai",i:SEASON,v});return true;}catch(e){console.warn("ai feed",e);return false;}}
// first check a minute after load (data and the planner are ready by then), then every 2 minutes while the app is on screen
setTimeout(()=>{if(SESSION&&SESSION.role)aiHistLoad();},5e3);
setTimeout(()=>{aiFeedPush();setInterval(()=>{if(!document.hidden)aiFeedPush();},AIF_MIN);},60e3);
