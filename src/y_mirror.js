/* ============================================================================
   ESPN MIRROR SWITCH (2.5): the commissioner turns mirroring on or off in
   League › Settings. On: rosters and lineups copy ESPN, moves happen on ESPN,
   and nobody needs a team code (only the commissioner logs in, for Settings).
   Off: every ESPN move since mirroring started is copied in as an
   "ESPN import" add or drop, ESPN's lineups are copied for those days, and
   the app runs the league again.
   ============================================================================ */
const espnLg=()=>({league:L?.espn?.league||234626984,season:L?.espn?.season||2027});
function espnUrl(T){const E=espnLg();return T?`https://fantasy.espn.com/basketball/team?leagueId=${E.league}&teamId=${T}&seasonId=${E.season}`:`https://fantasy.espn.com/basketball/league?leagueId=${E.league}`;}
const ymdOf=sp=>{const d=dateOf(sp);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const lastEspnSync=()=>Math.max(0,...Object.values(ESPNDAYS).map(x=>x.at||0));

// what switching off would copy in: ESPN's day-by-day rosters compared with the app's own rosters
function mirrorPlan(){
  const src=L.source;delete L.source;
  try{buildOwnership();}finally{L.source=src;}
  const own={};Object.keys(OWN).forEach(n=>{const T=ownerNow(n);if(T)own[n]=T;});
  buildOwnership();
  const lastTx=Math.max(1,...TXS.map(t=>+t.day||0));
  const from=+L.mirrorFrom||lastTx,days=Object.keys(ESPNDAYS).map(Number).filter(d=>d>=from&&d<=Math.min(TODAY,SEASON_END)).sort((a,b)=>a-b);
  const moves=[],snaps={};
  days.forEach(sp=>{const cur={},sl={};
    for(const [T,es] of Object.entries(ESPNDAYS[sp].r||{}))es.forEach(e=>{cur[e[0]]=tnum(T);(sl[tnum(T)]=sl[tnum(T)]||{})[e[0]]=e[1];});
    if(!Object.keys(cur).length)return;
    Object.keys(own).forEach(n=>{if(cur[n]!==own[n]){moves.push({type:"drop",team:tkey(own[n]),add:null,drop:n,dropDay:sp,day:sp});delete own[n];}});
    Object.keys(cur).forEach(n=>{if(!own[n]){moves.push({type:"add",team:tkey(cur[n]),add:n,drop:null,addDay:sp,day:sp});own[n]=cur[n];}});
    Object.entries(sl).forEach(([T,m])=>(snaps[T]=snaps[T]||{})[sp]=m);});
  return {moves,snaps,days};
}
async function mirrorOn(){
  const next=JSON.parse(JSON.stringify(L));delete next.id;next.source="espn";next.mirrorFrom=TODAY;
  if(!await saveL(next))return;FORM=null;FORM_DIRTY=false;
  toast("Mirroring ESPN. Pulling ESPN rosters now.");setTimeout(()=>$("#refreshBtn")?.click(),400);
}
async function mirrorOff(){
  const P=mirrorPlan(),t0=Date.now(),stamp=t0.toString(36);
  try{
    for(let i=0;i<P.moves.length;i++)await Store.set("tx",`${SEASON}_imp${stamp}_${i}`,{season:SEASON,...P.moves[i],at:t0+i,by:"ESPN import",role:"commish"});
    for(const [T,s] of Object.entries(P.snaps)){const id=`${SEASON}_t${T}`,d=LUDOCS[T];
      if(d)await Store.update("lineups",id,{snaps:{...(d.snaps||{}),...s}});else await Store.set("lineups",id,{season:SEASON,team:tkey(T),snaps:s});}
  }catch(e){showErr(e);return;}
  const next=JSON.parse(JSON.stringify(L));delete next.id;delete next.source;delete next.mirrorFrom;next.liveFrom=ymdOf(TODAY);
  if(!await saveL(next))return;FORM=null;FORM_DIRTY=false;
  toast(`The app runs the league now. Copied ${P.moves.length} ESPN ${P.moves.length===1?"move":"moves"}.`);
}
function mirrorSheet(on){
  if(on){openSheet("Mirror ESPN?",`<p>Rosters and lineups will copy ESPN each time ESPN data comes in. Adds, drops, trades, waivers and lineup changes in the app turn off, so the league makes moves on ESPN.</p>
    <p>Team codes aren't needed while mirroring: anyone can open the app and look around. Only the commissioner logs in, to reach Settings.</p>
    <div class="sheetacts"><button class="btn ghost" data-sheet="close">Cancel</button><button class="btn" data-mir="yes-on">Mirror ESPN</button></div>`);return;}
  const P=mirrorPlan(),last=lastEspnSync(),ls=P.moves.slice(0,40).map(m=>`<li>Day ${m.day}: ${esc(teamName(m.team))} ${m.type==="add"?"adds":"drops"} <b>${esc(m.add||m.drop)}</b></li>`).join("");
  openSheet("Run the league in the app?",`<p>${P.moves.length?`These ESPN moves get copied in first (no waivers for them):`:"No ESPN moves to copy: the rosters already match."}</p>${ls?`<ul class="mirl">${ls}${P.moves.length>40?`<li>…and ${P.moves.length-40} more</li>`:""}</ul>`:""}
    <p class="muted">ESPN data from ${last?fmtStamp(last)+" ET":"never"}. Moves made on ESPN after that won't be copied, so ${isCommish()?"press Refresh first if that's old":"pull ESPN first if that's old"}. ESPN's lineups for days ${P.days.length?`${P.days[0]}–${P.days[P.days.length-1]}`:"–"} are copied too.</p>
    <p>After this, moves happen in the app and team codes are needed again.</p>
    <div class="sheetacts"><button class="btn ghost" data-sheet="close">Cancel</button><button class="btn" data-mir="yes-off">Copy and switch</button></div>`);
}
document.addEventListener("click",async e=>{const b=e.target.closest("[data-mir]");if(!b||!isCommish())return;const a=b.dataset.mir;
  if(a==="on"||a==="off")return mirrorSheet(a==="on");
  b.disabled=true;sheet().close();if(a==="yes-on")await mirrorOn();else if(a==="yes-off")await mirrorOff();});

// League › Settings: the switch sits above Waivers
{const _sv=setupView;setupView=function(){const h=_sv();if(!L||!isCommish())return h;const m=mirror(),last=lastEspnSync();
  const sec=`<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Mirror ESPN rosters</h2><span class="hint">${m?"On":"Off"}</span></div><div class="pbody">
    <p>${m?`On since ${L.mirrorFrom?esc(fmtDay(+L.mirrorFrom)):"before the switch existed"}. Rosters and lineups copy ESPN${last?` (last ESPN data ${fmtStamp(last)} ET)`:""}, moves happen on ESPN, and only you need to log in.`:"Off. The app runs the league: moves, waivers and lineups happen here, and every team logs in with its code."}</p>
    <div class="row">${m?`<button class="btn" data-mir="off">Turn off and run the league here</button>`:`<button class="btn ghost" data-mir="on">Mirror ESPN instead</button>`}</div>
    <span class="hint">${m?"Turning off copies every ESPN move since mirroring started, so rosters match on day one.":"Use this to pause the app and let ESPN run the league. You can switch back any time."}</span></div></section>`;
  const at='<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Waivers</h2>';
  return h.includes(at)?h.replace(at,sec+at):h+sec;};}
const fmtDay=sp=>dateOf(sp).toLocaleDateString("en-US",{month:"short",day:"numeric"});

// no team logins while mirroring: the code screen only opens when someone asks for it
const mirrorOpen=()=>mirror()&&hasCommish()&&!GATE.want;
{const _rw=renderWho;renderWho=function(){_rw.apply(this,arguments);let b=$("#mLogin");
  const show=mirror()&&!SESSION&&!!BADGES;
  if(show&&!b){$("#whoBtn").insertAdjacentHTML("afterend",`<button class="btn sm ghost" id="mLogin" type="button">Log in</button>`);b=$("#mLogin");}
  if(b)b.hidden=!show;};}
document.addEventListener("click",e=>{if(e.target.closest("#mLogin")){GATE.want=true;renderGate();}else if(e.target.closest("#gSkip")){GATE.want=false;GATE.buf="";GATE.msg="";renderGate();}});
{const _rg=renderGate;renderGate=function(){_rg.apply(this,arguments);const s=$("#gSkip");if(s)s.hidden=!(mirror()&&hasCommish());
  if(SESSION&&GATE.want)GATE.want=false;
  if(GATE.want&&mirror()){$("#gSub").textContent="Only the commissioner needs to log in while the league mirrors ESPN. Team codes still work for chat and Pick'em.";}};}

// Display is locked to the default look when nobody is logged in (2.6, Arp): Match device theme,
// no team colors, Auto layout, Stats table rows. Logging in brings back that team's own settings.
function displayDefaults(){document.documentElement.classList.add("dslock");THEME="auto";applyTheme();LAYOUT="auto";applyLayout();RSTYLE="table";NBATHEME="";NBASTR="bold";applyNbaTheme();}
function displayLocal(){document.documentElement.classList.remove("dslock");try{THEME=localStorage.getItem("dfTheme")||"auto";LAYOUT=localStorage.getItem("dfLayout")||"auto";RSTYLE=localStorage.getItem("dfRStyle")||"table";NBATHEME=localStorage.getItem("dfNbaTheme")||"";NBASTR=localStorage.getItem("dfNbaStr")||"bold";}catch(e){}
  applyTheme();applyLayout();applyNbaTheme();}
{const _ss=saveSession;saveSession=function(s){const had=!!SESSION;_ss.apply(this,arguments);if(!!s===had)return;s?displayLocal():displayDefaults();if(L)try{render();}catch(e){}};}
setTimeout(()=>{if(!SESSION){displayDefaults();if(L)try{render();}catch(e){}}},0);
document.addEventListener("click",e=>{if(!SESSION&&e.target.closest("[data-ds],[data-nbat]")){e.stopImmediatePropagation();e.preventDefault();toast("Log in to change the display settings.");}},true);
