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
function aiFeedBuild(){const teams={};
  Object.keys(TEAMS).map(Number).forEach(T=>{let text="";try{const out=askBase(T,false,true).slice(1);
      const r=DPL&&DPL_K&&DPL_K.startsWith(T+":")?DPL:null;if(r)out.push(...askPlanTxt(r));text=out.join("\n");}catch(e){console.warn(e);text="(couldn't build this team's data)";}
    teams[T]={name:TEAMS[T].name,rec:STAND[T]?STAND[T].rec.join("-"):"",text};});
  let league="";try{league=[...askStandTxt(),...askFATxt(true)].join("\n").replace(/^\n/,"");}catch(e){console.warn(e);}
  return {season:SEASON,at:Date.now(),v:typeof RELEASES!=="undefined"&&RELEASES[0]?RELEASES[0].v:"",league,teams};}
async function aiFeedPush(force){try{
  if(!SESSION||!SESSION.role||typeof Store==="undefined"||Store.local||!Store._call||!L||!Object.keys(TEAMS).length||!DAYS.length)return false;
  let last=0;try{last=+localStorage.getItem("dfAiAt")||0;}catch(e){}
  if(!force&&Date.now()-last<AIF_EVERY)return false;
  try{localStorage.setItem("dfAiAt",String(Date.now()));}catch(e){}
  await Store._call("set",{c:"ai",i:SEASON,v:aiFeedBuild()});return true;}catch(e){console.warn("ai feed",e);return false;}}
// first push a minute after load (data and the planner are ready by then), then every few minutes it checks the clock
setTimeout(()=>{aiFeedPush();setInterval(()=>{if(!document.hidden)aiFeedPush();},3*60e3);},60e3);
