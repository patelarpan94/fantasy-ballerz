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
function aiFeedBuild(){const teams={};
  Object.keys(TEAMS).map(Number).forEach(T=>{let text="";try{const out=askBase(T,false,true).slice(1);out.push(...askMovesTxt(T));
      const r=DPL&&DPL_K&&DPL_K.startsWith(T+":")?DPL:null;if(r)out.push(...askPlanTxt(r));text=out.join("\n");}catch(e){console.warn(e);text="(couldn't build this team's data)";}
    teams[T]={name:TEAMS[T].name,rec:STAND[T]?STAND[T].rec.join("-"):"",text};});
  let league="";try{league=[...askStandTxt(),...askFATxt(true)].join("\n").replace(/^\n/,"");}catch(e){console.warn(e);}
  return {season:SEASON,at:Date.now(),v:typeof RELEASES!=="undefined"&&RELEASES[0]?RELEASES[0].v:"",league,teams};}
// BUG-384 (Arp: Claude still read old data after he changed his drop list): every 2 minutes the open app rebuilds
// the data and uploads it as soon as anything changed (a move, the planner, a score), at most once every 2 minutes;
// unchanged data still goes up every 20 minutes so Claude sees it's fresh
const AIF_MIN=2*60e3;
const aiHash=v=>{const t=JSON.stringify([v.league,v.teams]);let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return String(h);};
async function aiFeedPush(force){try{
  if(!SESSION||!SESSION.role||typeof Store==="undefined"||Store.local||!Store._call||!L||!Object.keys(TEAMS).length||!DAYS.length)return false;
  let last=0,lh="";try{last=+localStorage.getItem("dfAiAt")||0;lh=localStorage.getItem("dfAiH")||"";}catch(e){}
  const age=Date.now()-last;if(!force&&age<AIF_MIN)return false;
  const v=aiFeedBuild(),h=aiHash(v);
  if(!force&&h===lh&&age<AIF_EVERY)return false;
  try{localStorage.setItem("dfAiAt",String(Date.now()));localStorage.setItem("dfAiH",h);}catch(e){}
  await Store._call("set",{c:"ai",i:SEASON,v});return true;}catch(e){console.warn("ai feed",e);return false;}}
// first check a minute after load (data and the planner are ready by then), then every 2 minutes while the app is on screen
setTimeout(()=>{aiFeedPush();setInterval(()=>{if(!document.hidden)aiFeedPush();},AIF_MIN);},60e3);
