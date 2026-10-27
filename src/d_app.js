
/* ============================================================================
   NAVIGATION AND RENDERING
   ============================================================================ */
const SUBTABS={analytics:[["main","Insights"],["cmp","Compare"],["hist","History"]],team:[["sched","Schedule"],["stats","Stats"],["charts","Season charts"]],matchup:[["sched","Rosters"],["stats","Stats"],["track","Tracker"]],league:[["score","Scoreboard"],["stand","Standings"],["sched","Schedule"],["news","News"],["trades","Trades"],["tx","Transactions"],["draft","Draft results"],["nba","NBA schedule"],["setup","Settings"]],pickem:[["pick","Pick'em"],["records","Records"],["wrapped","Wrapped"],["trivia","Trivia"],["wham","Who had more?"]]};
const NAVS=["team","matchup","players","league","draft","analytics","pickem"];
let navSaved=false;try{const n=localStorage.getItem("dfNav");if(NAVS.includes(n)){nav=n;navSaved=true;}Object.assign(SUB,JSON.parse(localStorage.getItem("dfSub")||"{}"));}catch(e){}
function setNav(n,sub){nav=n;if(sub)SUB[n]=sub;MOVING=null;try{localStorage.setItem("dfNav",nav);localStorage.setItem("dfSub",JSON.stringify(SUB));}catch(e){}render();window.scrollTo({top:0});}
function renderChrome(){
  if(nav==="draft"&&draftHidden()){nav="league";SUB.league="draft";}
  if(SUB.league==="setup"&&!isCommish())SUB.league="score";
  document.querySelectorAll("#mainnav [data-nav]").forEach(b=>b.setAttribute("aria-selected",b.dataset.nav===nav));
  $("#mainnav [data-nav=\"draft\"]").hidden=draftHidden();
  const st=SUBTABS[nav]?.filter(([k])=>(nav!=="league"||(k==="draft"?PICKS.length>0:k==="setup"?isCommish():true))&&!(k==="track"&&simpleM())),sub=SUB[nav];
  $("#subtabs").innerHTML=st?st.map(([k,l])=>`<button data-sub="${k}" aria-selected="${sub===k}">${l}</button>`).join(""):"";
  $("#subtabs").hidden=!st||nav==="league"||(simpleM()&&!mFocus());
  const hasTeam=!!TEAMS[cur];
  $("#boxWrap").hidden=!(nav==="matchup"&&hasTeam);
  $("#daysWrap").hidden=!((nav==="team"||nav==="matchup"&&!simpleM())&&hasTeam);$("#daysWrap").classList.toggle("teamnav",nav==="team");
  $("#weekTitle").hidden=nav==="matchup";
  $("#daysHint").textContent=nav==="team"?"Starters with a game each day. Pick a day to see or set that day's lineup.":"Starters with a game each day (bench, IR and OUT not counted). Tap a day to filter.";
  $("#searchWrap").hidden=!((nav==="team"||nav==="matchup")&&sub!=="track"||nav==="players"||(nav==="league"&&sub==="nba"))||(simpleM()&&!mFocus());
  $("#compactBtn").style.visibility=(nav==="team"||nav==="matchup")?"":"hidden";$("#compactBtn").hidden=simpleM()&&!mFocus();
  const n=tradesNeedingMe(),dot=$("#offerDot");dot.hidden=!n;dot.textContent=n;
  $("#lgName").textContent=L?`${L.name} ${L.season}${L.uat?" · UAT":""}`:"Draft Fantasy";
  renderBanner();renderGate();
}
function renderBanner(){
  const b=$("#banner");let h="";
  if(Store.local)h+=`<div class="note">Preview mode: changes save in this browser only.</div>`;
  if(L?.uat&&nav==="team")h+=`<div class="note info banner">UAT test copy. Rosters, lineups and settings were copied from ESPN on ${esc(L.uatFrom||"Oct 22")}, and nothing here changes ESPN or the live app. Try lineups, Auto-set, adds, drops and trades freely.</div>`;
  if(L&&!draftDone()&&nav!=="draft"){const D=draftState();h+=`<div class="note info banner">${D.status==="live"?`The draft is live. Pick ${D.cur} of ${D.total} is on the clock.`:PICKS.length?`The draft is ${D.status==="paused"?"paused":"in progress"}: ${PICKS.length} of ${D.total} picks made.`:"Rosters fill from the draft, which hasn't started yet."} <button class="btn sm" data-nav="draft">Go to the draft</button></div>`;}
  if(mirror()&&(nav==="team"||nav==="league"&&["trades","tx"].includes(SUB.league))){const last=Math.max(0,...Object.values(ESPNDAYS).map(x=>x.at||0));
    h+=`<div class="note info banner">This season mirrors your ESPN league${last?` (rosters synced ${fmtStamp(last)} ET)`:""}. Set lineups and make moves on ESPN, then press Refresh to bring them in.</div>`;}
  const tn=tradesNeedingMe();
  if(tn&&!(nav==="league"&&(SUB.league==="trades"||SUB.league==="tx")))h+=`<div class="note info banner">${tn} ${tn===1?"trade needs":"trades need"} ${isCommish()?"a decision or vote":"your answer or vote"}. <button class="btn sm" data-sub-go="league:trades">Go to Trades</button></div>`;
  b.innerHTML=h;b.hidden=!h;
}
function renderRosters(){
  const el=$("#rosters");
  if(!L){el.innerHTML=emptyLeague();return;}
  const editing=document.activeElement&&el.contains(document.activeElement)&&/INPUT|SELECT/.test(document.activeElement.tagName)&&nav==="league"&&SUB.league==="setup";
  let h="";
  $("#daysWrap").classList.toggle("hdays",nav==="team");
  if(SUB.matchup==="players"&&!ptOn())SUB.matchup="stats";
  if(nav==="team"&&SUB.team==="charts"){tab="charts";h=(ptOn()?ptChartsTop():"")+seasonCharts();}
  else if(nav==="team"&&ptOn()){tab=SUB.team;h=ptTeam();}
  else if(nav==="matchup"&&ptOn()&&SUB.matchup==="players"){tab="stats";h=ptMatchup();}
  else if(nav==="team"){tab=SUB.team;h=lineupAlert()+dayPicker()+autoBar()+moveBar()+(TEAMS[cur]?teamSection(cur,"me",canEditTeam(cur)):"");}
  else if(nav==="matchup"&&simpleM()){tab=SUB.matchup;const fo=mFocus();
    if(!fo)h=tab==="track"&&TEAMS[cur]?trackerView():"";
    else{if(tab==="track")tab=SUB.matchup="stats";h=cbDays(true)+(tab==="stats"?statModeBar():schedLegend())+(duoOn()&&M.opp&&TEAMS[M.opp]?`<div class="sbs">${teamSection(cur,"me",false)}${teamSection(M.opp,"op",false)}</div>`:teamSection(fo==="me"?cur:M.opp,fo,false));}}
  else if(nav==="matchup"){tab=SUB.matchup;const fo=mFocus();h=tab==="track"?(TEAMS[cur]?trackerView():""):(tab==="stats"?statModeBar():schedLegend())+(fo?teamSection(fo==="me"?cur:M.opp,fo,false):teamSection(cur,"me",false)+(M.opp?teamSection(M.opp,"op",false):`<section class="panel team op"><p class="empty">${esc(noOppText())}</p></section>`));}
  else if(nav==="players")h=allView();
  else if(nav==="analytics")h=analyticsView();
  else if(nav==="pickem")h=funView();
  else if(nav==="league")h=({score:scoreView,stand:standView,sched:seasonView,trades:tradesView,news:newsView,tx:txView,draft:draftResultsView,nba:nbaView,setup:setupView}[SUB.league]||scoreView)();
  else h=draftView();
  if(editing&&el.dataset.view==="setup")return;
  el.dataset.view=nav==="league"?SUB.league:nav;
  el.innerHTML=h;
  el.querySelectorAll(".grpbtn").forEach(b=>b.onclick=()=>{open[b.dataset.k]=!open[b.dataset.k];renderRosters();});
  el.querySelectorAll("[data-log]").forEach(b=>b.onclick=e=>{if(e.target.closest("[data-pcard]"))return;const k=b.dataset.log;expanded.has(k)?expanded.delete(k):expanded.add(k);renderRosters();});
  el.querySelectorAll("[data-opp]").forEach(b=>b.onclick=()=>{hideOpp=b.dataset.opp==="hide";try{localStorage.setItem("dfHideOpp",hideOpp?"1":"0")}catch(e){}renderRosters();});
  el.querySelectorAll("[data-trk]").forEach(b=>b.onclick=()=>{const [k,v]=b.dataset.trk.split(":");TRK[k]=v;saveTrk();renderRosters();});
  el.querySelectorAll("[data-trksel]").forEach(s=>s.onchange=()=>{TRK[s.dataset.trksel]=+s.value;if(s.dataset.trksel==="to")TRK.toLatest=+s.value===weekOf(Math.min(TODAY,SEASON_END))[0];if(TRK.from>TRK.to){if(s.dataset.trksel==="from")TRK.to=TRK.from;else TRK.from=TRK.to;}saveTrk();renderRosters();});
  el.querySelectorAll("[data-pjmode]").forEach(b=>b.onclick=()=>{pjMode=b.dataset.pjmode;try{localStorage.setItem("dfPjMode",pjMode)}catch(e){}renderRosters();});
  el.querySelectorAll("[data-apmode]").forEach(b=>b.onclick=()=>{apMode=b.dataset.apmode;try{localStorage.setItem("dfApMode",apMode)}catch(e){}renderRosters();});
  el.querySelectorAll("[data-pjm2]").forEach(b=>b.onclick=()=>{pjMode=b.dataset.pjm2;try{localStorage.setItem("dfPjMode",pjMode)}catch(e){}renderRosters();});
  el.querySelectorAll("[data-apsort]").forEach(b=>b.onclick=()=>{const k=b.dataset.apsort;apSort=apSort===k?"-"+k:k;renderRosters();});
  el.querySelectorAll("[data-appos]").forEach(b=>b.onclick=()=>{apPos=b.dataset.appos;renderRosters();});
  el.querySelectorAll("[data-aptop]").forEach(b=>b.onclick=()=>{apTop=+b.dataset.aptop;renderRosters();});
  el.querySelectorAll("[data-apown2]").forEach(b=>b.onclick=()=>{apOwn=b.dataset.apown2;renderRosters();});
  el.querySelectorAll("[data-apown]").forEach(s=>s.onchange=()=>{apOwn=s.value;renderRosters();});
  el.querySelectorAll("[data-cmp]").forEach(b=>b.onclick=()=>{const k=b.dataset.cmp,i=CMP.indexOf(k);if(i>=0)CMP.splice(i,1);else{if(CMP.length>=4)CMP.shift();CMP.push(k);}renderRosters();});
  el.querySelectorAll("[data-cmpclear]").forEach(b=>b.onclick=()=>{CMP.length=0;renderRosters();});
  el.querySelectorAll("[data-smode]").forEach(b=>b.onclick=()=>{smode=b.dataset.smode;if(teamDay()&&(smode==="day"||smode==="week")){const on=smode==="day";smode="week";if(nav==="team")tday=on;else mday=on;try{localStorage.setItem(nav==="team"?"dfTeamDay":"dfMDay",on?"1":"0")}catch(e){}}try{localStorage.setItem("dfSmode",smode)}catch(e){}renderRosters();});
  const sp=el.querySelector("#seasonPick");if(sp)sp.onchange=()=>{SEASON=sp.value;FORM_DIRTY=false;try{localStorage.setItem("dfSeason",SEASON);}catch(e){}onLeagues();};
  fitScrolls();tick();renderMovePop();
}
function emptyLeague(){
  if(!booted)return `<section class="panel emptyst"><h2>Loading league</h2><p>Fetching the season, rosters and scores.</p></section>`;
  return `<section class="panel emptyst"><h2>No league yet</h2><p>${isCommish()?"Create the first season to set teams, categories and the draft.":"The commissioner hasn't created a season yet."}</p>
  ${isCommish()?`<div class="row" style="justify-content:center;margin-top:12px"><input type="text" id="newSeason" value="${seasonLabel()}" aria-label="Season name"><button class="btn" data-create="1">Create season</button></div>`:""}</section>`;
}
function render(){renderChrome();if(TEAMS[cur]){M={opp:opponentOf(cur)};renderBox();renderDays();}renderHero();renderRosters();}

const pick=$("#teamPick"),wpick=$("#weekPick");
const fillWeeks=()=>{const ph=PHONE();wpick.innerHTML=WEEKS.map(w=>`<option value="${w[0]}">${ph?`Wk ${w[0]} · ${TODAY>=w[1]&&TODAY<=w[2]?"now":md(w[1])}`:weekLabel(w)+(TODAY>=w[1]&&TODAY<=w[2]?" (now)":"")}</option>`).join("");};
function load(){
  pick.value=cur;wpick.value=wk[0];
  DAYS=[];for(let sp=wk[1];sp<=wk[2];sp++)DAYS.push(sp);
  M={opp:opponentOf(cur)};selDay=null;MOVING=null;
  $("#prevW").disabled=wk[0]===1;$("#nextW").disabled=wk[0]===WEEKS.length;
  $("#weekTitle").textContent=weekLabel(wk);
  $("#todayBtn").disabled=wk===weekOf(TODAY);
  render();
}
pick.onchange=()=>{cur=+pick.value;try{localStorage.setItem("dfTeam",cur)}catch(e){}load();};
wpick.onchange=()=>{wk=WEEKS[+wpick.value-1];load();};
$("#prevW").onclick=()=>{if(wk[0]>1){wk=WEEKS[wk[0]-2];load();}};
$("#nextW").onclick=()=>{if(wk[0]<WEEKS.length){wk=WEEKS[wk[0]];load();}};
$("#swapBtn").onclick=()=>{if(!M.opp)return toast(noOppText());cur=M.opp;try{localStorage.setItem("dfTeam",cur)}catch(e){}load();};
$("#todayBtn").onclick=()=>{wk=weekOf(TODAY);load();};
const cBtn=$("#compactBtn");
function setCompact(on){document.body.classList.toggle("compact",on);cBtn.setAttribute("aria-pressed",on);try{localStorage.setItem("dfCompact",on?"1":"0")}catch(e){}}
cBtn.onclick=()=>setCompact(!document.body.classList.contains("compact"));
try{if(localStorage.getItem("dfCompact")==="1")setCompact(true);}catch(e){}
function fitScrolls(){document.querySelectorAll("main .scroll").forEach(s=>{s.classList.remove("fits");if(s.scrollWidth<=s.clientWidth+1)s.classList.add("fits");});
  const b=document.querySelector(".bar");document.documentElement.style.setProperty("--barh",(b&&getComputedStyle(b).position==="sticky"?b.offsetHeight:0)+"px");}
window.addEventListener("resize",()=>fitScrolls());
const qEl=$("#q"),qX=$("#qClear");
qEl.addEventListener("input",()=>{Q=norm(qEl.value.trim());qX.hidden=!qEl.value;renderRosters();});
qX.onclick=()=>{qEl.value="";Q="";qX.hidden=true;renderRosters();qEl.focus();};

// one delegated handler for the app's own buttons
// player names inside a row button are spans (a button can't hold another button)
document.addEventListener("keydown",e=>{const pc=e.target.closest?.("span[data-pcard]");if(pc&&(e.key==="Enter"||e.key===" ")){e.preventDefault();e.stopPropagation();playerCard(pc.dataset.pcard);}},true);
document.addEventListener("click",async e=>{
  const pc=e.target.closest("span[data-pcard]");if(pc){playerCard(pc.dataset.pcard);return;}
  const b=e.target.closest("button");if(!b||b.disabled)return;const d=b.dataset;
  if(d.nav){setNav(d.nav);}
  else if(d.subGo){const [n,sb]=d.subGo.split(":");setNav(n,sb);}
  else if(d.sub){SUB[nav]=d.sub;CONFIRM=null;try{localStorage.setItem("dfSub",JSON.stringify(SUB));}catch(_){}render();}
  else if(d.team){cur=+d.team;try{localStorage.setItem("dfTeam",cur)}catch(_){}nav="matchup";SUB.matchup="sched";load();}
  else if(d.week){wk=WEEKS[+d.week-1];nav="matchup";load();}
  else if(d.move){const vd=viewDay(),was=MOVING;MOVING=MOVING&&MOVING.n===d.move?null:{team:cur,n:d.move,sp:vd};renderRosters();if(!MOVING&&was)document.querySelector(`#rosters [data-move="${CSS.escape(was.n)}"]`)?.focus();}
  else if(d.here){await doMove(+d.here);}
  else if(d.auto){await autoSet(d.auto);}
  else if(d.cact)await codeAct(d.cact);
  else if(d.logout){sheet().close();logout();}
  else if(d.add)sheetAdd(d.add);
  else if(d.drop)sheetDrop(d.drop);
  else if(d.trade)sheetTrade(d.trade);
  else if(d.sheet)await sheetAct(b);
  else if(d.trv)await tradeAct(d.trv);
  else if(d.tradewith!=null)sheetTradeWith(+d.tradewith);
  else if(d.dpick)await doPick(d.dpick);
  else if(d.dconf){DCONF=d.dconf;renderRosters();clearTimeout(DCONF_T);DCONF_T=setTimeout(()=>{if(DCONF===d.dconf){DCONF=null;renderRosters();}},4000);}
  else if(d.dq)await queueAct("toggle",d.dq);
  else if(d.dqm)await queueAct("move",d.dqm);
  else if(d.dact)await draftAct(d.dact);
  else if(d.dpos){DPOS=d.dpos;renderRosters();}
  else if(d.drv){DRV=d.drv;renderRosters();}
  else if(d.pcard)playerCard(d.pcard);
  else if(d.newsf){NEWSF=d.newsf;renderRosters();}
  else if(d.anmode){ANMODE=d.anmode;try{localStorage.setItem("dfAnMode",ANMODE)}catch(_){}renderRosters();}
  else if(d.sact)await setupAct(d.sact);
  else if(d.rmteam){const F=FORM;F.teams=F.teams.filter(t=>t.id!==d.rmteam);F.draft.order=F.draft.order.filter(x=>x!==d.rmteam);FORM_DIRTY=true;renderRosters();}
  else if(d.up||d.down){const o=FORM.draft.order,i=+(d.up??d.down),j=d.up!=null?i-1:i+1;[o[i],o[j]]=[o[j],o[i]];FORM_DIRTY=true;renderRosters();}
  else if(d.create){const s=($("#newSeason").value||"").trim().replace(/[^A-Za-z0-9_\-.]/g,"");if(!s)return toast("Give the season a name, like 2026-27.");SEASON=s;if(await saveL(newLeague(s))){nav="league";SUB.league="setup";}}
});
let DCONF_T=null;
document.addEventListener("change",e=>{const t=e.target;
  if(t.dataset.dset){draftSetInput(t);}
  else if(t.dataset.autodaily){setAutoDaily(t.checked);}
  else if(t.dataset.dauto){const T=myTeamNum();if(T)saveQueue(T,{auto:t.checked});}
  else if(t.id==="drost"){DROST=+t.value;renderRosters();}
  else if(t.id==="drt"){DRT=+t.value;renderRosters();}
  else if(t.id==="trWith"){sheetTradeWith(+t.value||0);}
});
document.addEventListener("toggle",e=>{if(e.target.id==="dsetBox")DSET_OPEN=e.target.open;},true);
document.addEventListener("input",e=>{
  const t=e.target;
  if(t.id==="dq"){DQ=t.value;const pos=t.selectionStart;renderRosters();const q=$("#dq");if(q){q.focus();q.setSelectionRange(pos,pos);}return;}
  if(t.dataset.code){codeInput(t);return;}
  if(nav==="league"&&SUB.league==="setup")setupInput(t);
});
$("#sheetClose").onclick=()=>sheet().close();
sheet().addEventListener("click",e=>{if(e.target===sheet())sheet().close();});

// slot menu: close on a click outside it or on the dim backdrop
document.addEventListener("click",e=>{if(!MOVING)return;if(e.target.closest("#movePop")||e.target.closest("[data-move]"))return;MOVING=null;renderRosters();},true);
window.addEventListener("resize",()=>{if(MOVING)renderMovePop();});
// chat
$("#chatFab").onclick=()=>{CHAT_OPEN=!CHAT_OPEN;if(CHAT_OPEN)renderChat.jump=true;renderChat();};
$("#chatClose").onclick=()=>{CHAT_OPEN=false;renderChat();$("#chatFab").focus();};
$("#chatBack").onclick=()=>chatOpen(null);
$("#chatBody").addEventListener("click",e=>{const g=e.target.closest("[data-chgo]");if(g){if(PHONE()){CHAT_OPEN=false;renderChat();}setNav("league",g.dataset.chgo);return;}const r=e.target.closest("[data-chat]");if(r)chatOpen(r.dataset.chat);});
$("#chatForm").addEventListener("submit",e=>{e.preventDefault();chatSend();});
$("#chatInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();chatSend();}else if(e.key==="Escape"){CHAT_CH?chatOpen(null):$("#chatClose").click();}});
$("#chatInput").addEventListener("input",chatGrow);
$("#chatPane").addEventListener("keydown",e=>{if(e.key==="Escape"&&e.target.id!=="chatInput"){e.stopPropagation();CHAT_CH?chatOpen(null):$("#chatClose").click();}});
// help
const helpDlg=$("#helpDlg");
$("#helpBtn").onclick=()=>{helpDlg.showModal();helpDlg.querySelector(".hbody").scrollTop=0;};
$("#helpClose").onclick=()=>helpDlg.close();
helpDlg.addEventListener("click",e=>{if(e.target===helpDlg)helpDlg.close();});
helpDlg.querySelectorAll(".htoc a").forEach(a=>a.onclick=e=>{e.preventDefault();helpDlg.querySelector(a.getAttribute("href")).scrollIntoView({block:"start",behavior:"smooth"});});
document.addEventListener("keydown",e=>{
  if(!gate.hidden||helpDlg.open||sheet().open)return;
  const t=e.target,typing=t&&/INPUT|SELECT|TEXTAREA/.test(t.tagName);
  if(e.key==="?"&&!typing){$("#helpBtn").click();e.preventDefault();return;}
  if(typing){if(e.key==="Escape"&&t.id==="q"){qX.click();t.blur();}return;}
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==="Escape"&&MOVING){MOVING=null;renderRosters();}
  else if(e.key==="ArrowLeft"){$("#prevW").click();e.preventDefault();}
  else if(e.key==="ArrowRight"){$("#nextW").click();e.preventDefault();}
  else if(e.key==="/"){if($("#searchWrap").hidden)setNav("players");qEl.focus();e.preventDefault();}
  else if(e.key==="t"||e.key==="T")$("#todayBtn").click();
  else if(e.key==="s"||e.key==="S")$("#swapBtn").click();
  else if(/^[1-7]$/.test(e.key)&&!(e.key==="5"&&draftHidden()))setNav(NAVS[+e.key-1]);
});
// badge tooltips: hover on desktop, tap on phones
(()=>{const tip=document.createElement("div");tip.id="awTip";tip.hidden=true;document.body.appendChild(tip);let c=null,at=0;
  const show=el=>{if(c!==el)at=Date.now();c=el;tip.textContent=el.dataset.tip;tip.hidden=false;const r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;
    let x=Math.min(Math.max(8,r.left+r.width/2-w/2),innerWidth-w-8),y=r.top-h-8;if(y<8)y=r.bottom+8;tip.style.left=x+"px";tip.style.top=y+"px";};
  const hide=()=>{c=null;tip.hidden=true;};
  document.addEventListener("mouseover",e=>{const a=e.target.closest?.(".awd");if(a)show(a);else if(c&&Date.now()-at>600)hide();});
  document.addEventListener("click",e=>{const a=e.target.closest?.(".awd");if(a){e.preventDefault();e.stopPropagation();c===a&&!tip.hidden&&Date.now()-at>500?hide():show(a);}else hide();},true);
  document.addEventListener("mouseout",e=>{if(e.target.closest?.(".awd")&&!e.relatedTarget?.closest?.(".awd")&&Date.now()-at>600)hide();});
  addEventListener("scroll",hide,true);})();

/* ============================================================================
   STATS FEED: ESPN's public NBA scoreboard, box scores and injury report,
   read through the Claude desktop app's browser and saved for everyone.
   In Apps Script this becomes UrlFetchApp on a nightly trigger.
   ============================================================================ */
const HOST="host:claude_browser",ESPN="https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const fmtStamp=ms=>new Date(ms).toLocaleString("en-US",{timeZone:"America/New_York",weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
const liveTxt=Lg=>Lg.s==="in"?`${Lg.d} · ${Lg.sc}`:Lg.s==="post"?`Final ${Lg.sc}`:Lg.d;
let busy=false;
function showUpdated(msg,err){
  const u=$("#updated");u.textContent=msg||(UPDATED?(PHONE()?fmtStamp(UPDATED).replace(/^\w+, /,"").replace(/ ([AP])M$/,(m,x)=>x.toLowerCase()):`Stats ${fmtStamp(UPDATED)} ET`):"No stats yet");u.classList.toggle("err",!!err);
  const age=UPDATED?Date.now()-UPDATED:Infinity;u.classList.toggle("stale",!msg&&age>3*3600e3&&age<=24*3600e3);u.classList.toggle("old",!msg&&age>24*3600e3);
  if(!msg)u.title=!UPDATED?"Press Refresh to load box scores.":age>24*3600e3?"Stats are more than a day old. Press Refresh.":age>3*3600e3?"Stats are a few hours old.":"Stats are current.";
  $("#foot").innerHTML=`Stats, injuries and news from ESPN${UPDATED?` · updated ${fmtStamp(UPDATED)} ET`:""} · how data works is in Help (?). <span class="keys">Keyboard: 1–7 sections · ← → weeks · / search · T today · S switch team</span>`;
}
let tabId=null;try{tabId=localStorage.getItem("dfTab2")||null;}catch(e){}
const textOf=r=>(r?.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
async function fetchJSON(mcp,url){
  let reused=false;
  if(tabId){try{await mcp.callTool(HOST,"navigate",{url,tabId},{cache:false});reused=true;}catch(e){if(e?.code!=="tool_error")throw e;tabId=null;}}
  if(!reused){const r=await mcp.callTool(HOST,"preview_start",{url},{cache:false});tabId=(textOf(r).match(/tabId\s+([\w-]+)/)||[])[1]||null;try{if(tabId)localStorage.setItem("dfTab2",tabId);}catch(e){}}
  const r=await mcp.callTool(HOST,"get_page_text",tabId?{tabId,max_chars:4000000}:{max_chars:4000000},{cache:false});
  const s=textOf(r),i=s.indexOf("{"),j=s.lastIndexOf("}");
  if(i<0||j<i)throw {code:"bad_page"};
  return JSON.parse(s.slice(i,j+1));
}
const ERR={cloud:"Data refreshes from ESPN automatically. The commissioner can also start a refresh any time.",server_not_connected:"Refresh runs from the Claude desktop app. Stats refreshed there show here too.",host_missing:"This window can't reach the Claude app's built-in browser (code: server_not_connected). Open the app from your artifacts list in the Claude desktop app and try again.",not_in_manifest:"Browser access was declined for this page.",approval_required:"Refresh needs your approval for the browser.",cancelled:"Refresh was cancelled.",bad_page:"ESPN didn't send data. Try again in a minute.",not_league:"Stats updated, but ESPN didn't send your league's rosters. Sign in to ESPN in the Claude app's browser, then press Refresh again."};
// mirror mode: league name, team names, categories, roster slots, playoff teams and the matchup schedule follow ESPN's settings.
// Only someone with Editor access (the commissioner's app owner) can save league settings, so others skip this step.
const ESPN_SLOT={0:"PG",1:"SG",2:"SF",3:"PF",4:"C",5:"G",6:"F",11:"UTIL",12:"BE",13:"IR"};
const ESPN_CAT={0:"PTS",1:"BLK",2:"STL",3:"AST",6:"REB",13:"FGM",15:"FTM",17:"TPM",19:"FGP",20:"FTP"};
async function syncEspnSettings(mcp,LG){
  if(!Store.canAdmin||(L.settingsFrom||"espn")!=="espn")return;
  showUpdated("Loading ESPN league settings…");
  const j=await fetchJSON(mcp,`${LG}?view=mSettings&view=mTeam&view=mMatchup`);
  const st=j.settings;if(!st)throw {code:"not_league"};
  const next=JSON.parse(JSON.stringify(L));
  if(st.name)next.name=String(st.name).trim()||next.name;
  const pt=+st.scheduleSettings?.playoffTeamCount;if(pt>=2)next.playoffTeams=pt;
  const lc=st.rosterSettings?.lineupSlotCounts;if(lc){const sl={};SLOT_KEYS.forEach(k=>sl[k]=0);for(const [id,c] of Object.entries(lc))if(ESPN_SLOT[id])sl[ESPN_SLOT[id]]=+c||0;
    if(Object.values(sl).some(Boolean)){next.slots=sl;next.maxRoster=Object.values(sl).reduce((a,b)=>a+b,0);}}
  const items=st.scoringSettings?.scoringItems;if(items?.length){const ks=items.map(x=>ESPN_CAT[x.statId]).filter(Boolean);const cats=Object.keys(CATDEF).filter(k=>ks.includes(k));if(cats.length)next.cats=DEFAULT_CATS.filter(k=>cats.includes(k)).concat(cats.filter(k=>!DEFAULT_CATS.includes(k)));}
  (j.teams||[]).forEach(t=>{const tm=next.teams.find(x=>x.id==="t"+t.id),nm=(t.name||[t.location,t.nickname].filter(Boolean).join(" ")).trim();if(tm&&nm)tm.name=nm;else if(!tm&&nm&&next.teams.length<MAX_TEAMS)next.teams.push({id:"t"+t.id,name:nm});});
  const reg=+st.scheduleSettings?.matchupPeriodCount;
  if(j.schedule?.length){const sc={};j.schedule.forEach(m=>{const n=m.matchupPeriodId;if(!n||(reg&&n>reg)||!m.home||!m.away)return;(sc[n]=sc[n]||[]).push([m.home.teamId,m.away.teamId]);});if(Object.keys(sc).length)next.schedule=sc;}
  if(JSON.stringify(next)!==JSON.stringify(L))await Store.set("league",next.season,next);
}
// mirror mode: copy each day's ESPN rosters and lineup slots (every team) into espn/<season>_d<day>
async function syncEspnLeague(mcp){
  const E=L.espn||{},LG=`https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${E.season||2027}/segments/0/leagues/${E.league||234626984}`;
  await syncEspnSettings(mcp,LG);
  const have=Object.keys(ESPNDAYS).map(Number),last=have.length?Math.max(...have):0;
  const days=[];for(let sp=Math.max(1,Math.min(last+1,TODAY));sp<=Math.min(TODAY,SEASON_END)&&days.length<10;sp++)days.push(sp);
  if(!days.includes(Math.min(TODAY,SEASON_END)))days.push(Math.min(TODAY,SEASON_END));
  for(const [i,sp] of days.entries()){
    showUpdated(`Loading ESPN rosters for ${dow(sp)} ${md(sp)} (${i+1} of ${days.length})…`);
    const j=await fetchJSON(mcp,`${LG}?view=mRoster&scoringPeriodId=${sp}`);
    if(!Array.isArray(j.teams))throw {code:"not_league"};
    const r={};j.teams.forEach(t=>{const es=t.roster?.entries;if(!es)return;
      r["t"+t.id]=es.map(e=>{const pl=e.playerPoolEntry?.player||{};return [pl.fullName,e.lineupSlotId,PRO[pl.proTeamId]||"FA",(pl.eligibleSlots||[]).filter(s=>s<=6||s===11)];}).filter(x=>x[0]);});
    if(!Object.keys(r).length)throw {code:"not_league"};
    await Store.set("espn",`${SEASON}_d${sp}`,{season:SEASON,sp,at:Date.now(),r});
  }
}
const ymd=sp=>{const d=dateOf(sp);return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;};
const etMin=iso=>{const t=new Date(iso),et=new Date(t.toLocaleString("en-US",{timeZone:"America/New_York"}));return et.getHours()*60+et.getMinutes();};
// one ESPN box score -> {name: [PTS,BLK,STL,AST,REB,3PM,FGM,FGA,FTM,FTA,MIN]}, plus each player's NBA team and position
function parseBox(sum,lines,info){
  (sum?.boxscore?.players||[]).forEach(tp=>{const ab=tp.team?.abbreviation;
    (tp.statistics||[]).forEach(st=>{const lab=(st.labels||st.names||[]).map(x=>String(x).toUpperCase()),ix=k=>lab.indexOf(k);
      (st.athletes||[]).forEach(a=>{const n=a.athlete?.displayName;if(!n)return;info[n]=[ab,a.athlete?.position?.abbreviation||""];
        const s=a.stats||[];if(a.didNotPlay||!s.length)return;
        const num=k=>{const i=ix(k);return i<0?0:(parseFloat(s[i])||0);},ma=k=>{const i=ix(k);if(i<0)return [0,0];const [m,t]=String(s[i]).split("-").map(Number);return [m||0,t||0];};
        const fg=ma("FG"),tp3=ma("3PT"),ft=ma("FT");
        lines[n]=[num("PTS"),num("BLK"),num("STL"),num("AST"),num("REB"),tp3[0],fg[0],fg[1],ft[0],ft[1],Math.round(num("MIN"))];});});});
}
// every field-goal attempt with its court spot -> {name: [[x,y,made,2|3,quarter]]} (same as espn_sync.py)
function parseShots(sum,out){const ids={};
  (sum?.boxscore?.players||[]).forEach(tp=>(tp.statistics||[]).forEach(st=>(st.athletes||[]).forEach(a=>{if(a.athlete?.id&&a.athlete?.displayName)ids[a.athlete.id]=a.athlete.displayName;})));
  (sum?.plays||[]).forEach(pl=>{if(!pl.shootingPlay||![2,3].includes(pl.pointsAttempted))return;const x=pl.coordinate?.x,y=pl.coordinate?.y;
    if(typeof x!=="number"||typeof y!=="number"||x<-5||x>55||y<-10||y>94)return;const n=ids[pl.participants?.[0]?.athlete?.id];
    if(n)(out[n]=out[n]||[]).push([Math.round(x*10)/10,Math.round(y*10)/10,pl.scoringPlay?1:0,pl.pointsAttempted,pl.period?.number||0]);});}
// cloud refresh: the Refresh button starts the league's ESPN refresh task in Claude's cloud, which saves fresh data here for everyone
const CLOUD="Claude Code Remote";
async function cloudRefresh(mcp,btn){
  const task=L.espn?.task;if(!mcp||!task)return false;
  // one pull at a time: skip if this browser started one in the last 10 minutes
  let last=0;try{last=+localStorage.getItem("dfCloudAt")||0;}catch(e){}
  if(Date.now()-last<10*60e3){showUpdated(`A cloud pull started ${Math.max(1,Math.round((Date.now()-last)/60e3))} min ago. New data shows here when it finishes.`);return true;}
  // and one pull at a time for the whole league: the first press claims refresh/<season> for 10 minutes
  const wait=at=>showUpdated(`A cloud pull started ${Math.max(1,Math.round((Date.now()-at)/60e3))} min ago. New data shows here when it finishes.`);
  try{await Store.claimSet("refresh",SEASON,{season:SEASON,at:Date.now(),by:myTeamNum()||0},cur=>Date.now()-(+cur.at||0)>=10*60e3);}
  catch(e){if(e?.code==="taken"){const cur=await Store.get("refresh",SEASON).catch(()=>null);wait(cur?.at||Date.now());return true;}}
  try{await mcp.callTool(CLOUD,"fire_trigger",{trigger_id:task},{cache:false});}
  catch(e){return false;}
  try{localStorage.setItem("dfCloudAt",String(Date.now()));}catch(e){}
  const was=UPDATED;busy=true;btn.disabled=true;showUpdated("Pulling ESPN in the cloud. New data shows here in a few minutes…");
  // the db listener updates UPDATED when the cloud run saves; give up waiting after 15 minutes
  const t0=Date.now(),iv=setInterval(()=>{if(UPDATED!==was||Date.now()-t0>15*60e3){clearInterval(iv);busy=false;btn.disabled=false;showUpdated();if(UPDATED!==was)toast("ESPN data refreshed.");}},3000);
  return true;
}
async function refresh(){
  if(busy||!L)return;const btn=$("#refreshBtn");
  let mcp=await claude.use("mcp");
  if(await cloudRefresh(mcp,btn))return;
  if(!mcp){
    // tell "turned off for this page" apart from "not available in this app", and offer the way back on
    const perms=await claude.use("permissions").catch(()=>null);let st="unavailable";
    try{st=perms?await perms.state("mcp"):"unavailable";}catch(e){}
    if(st==="prompt"&&perms){try{st=(await perms.request(["mcp"]))?.mcp||st;}catch(e){}if(st==="granted")mcp=await claude.use("mcp");}
    if(!mcp){
      if(st==="denied"&&perms){showUpdated("Browser access is off for this page.",true);
        openSheet("Turn on browser access",`<p>Refresh reads ESPN through the Claude app's browser, and that's switched off for this page. Open Permissions and allow the <b>claude_browser</b> connection, then press Refresh again.</p><div class="sheetacts"><button class="btn ghost" data-sheet="close">Not now</button><button class="btn" id="permBtn">Open Permissions</button></div>`);
        $("#permBtn").onclick=async()=>{try{await perms.manage();}catch(e){toast("Use the Permissions item in this artifact's menu.");}sheet().close();};}
      else showUpdated(L.espn?.task?ERR.cloud:`${ERR.server_not_connected} (browser: ${st})`,!L.espn?.task);
      return;}
  }
  busy=true;btn.disabled=true;
  try{
    TODAY=Math.max(1,Math.min(SEASON_END+1,todaySp()));
    const last=Math.min(TODAY,SEASON_END);let from=1;while(from<last&&STATS[from]?.final)from++;
    const days=[];for(let sp=from;sp<=last&&days.length<10;sp++)days.push(sp);
    let live=null;
    for(const [i,sp] of days.entries()){
      showUpdated(`Loading ${dow(sp)} ${md(sp)} (${i+1} of ${days.length})…`);
      const sb=await fetchJSON(mcp,`${ESPN}/scoreboard?dates=${ymd(sp)}`);
      const evs=sb.events||[],lines={},info={},shots={};let allPost=evs.length>0;
      for(const ev of evs){const state=ev.competitions?.[0]?.status?.type?.state||ev.status?.type?.state||"pre";
        if(state!=="post")allPost=false;if(state==="pre")continue;
        try{const sm=await fetchJSON(mcp,`${ESPN}/summary?event=${ev.id}`);parseBox(sm,lines,info);parseShots(sm,shots);}catch(e){if(e?.code&&!["tool_error","bad_page"].includes(e.code))throw e;allPost=false;}}
      if(sp===TODAY){const g={};evs.forEach(ev=>{const c=ev.competitions?.[0];if(!c)return;const s=c.status?.type||ev.status?.type||{};const tms=c.competitors||[];
        tms.forEach(me=>{const ot=tms.find(x=>x!==me),ab=me.team?.abbreviation;if(!ab)return;g[ab]={s:s.state||"pre",d:s.state==="pre"?fmtTime(etMin(ev.date)):(s.shortDetail||""),sc:`${me.score??0}-${ot?.score??0}`};});});
        live={day:TODAY,at:Date.now(),g};}
      await Store.set("stats",`${SEASON}_d${sp}`,{season:SEASON,sp,final:allPost||(!evs.length&&sp<TODAY),at:Date.now(),lines,info});
      if(Object.keys(shots).length){await Store.set("shots",`${SEASON}_d${sp}`,{season:SEASON,sp,at:Date.now(),p:shots});delete SHOTC[sp];}
    }
    showUpdated("Loading injuries…");
    let inj=NBA?.inj||{},injd=NBA?.injd||{},news=NBA?.news||[];
    try{const ij=await fetchJSON(mcp,`${ESPN}/injuries`);const m={},dd={};
      (ij.injuries||[]).forEach(t=>(t.injuries||[]).forEach(x=>{const n=x.athlete?.displayName,raw=String(x.status||x.type?.description||""),s=raw.toLowerCase();if(!n)return;m[n]=s.includes("out")?"OUT":s.includes("day")||s.includes("question")||s.includes("doubt")?"DAY_TO_DAY":"ACTIVE";
        const dt=x.details||{},at=Date.parse(x.date||"");dd[n]={s:raw,t:[dt.side&&dt.side!=="Not Specified"?dt.side:"",dt.type||"",dt.detail||""].filter(Boolean).join(" ").slice(0,60),r:String(dt.returnDate||"").slice(0,10),c:String(x.shortComment||x.longComment||"").slice(0,400),at:isNaN(at)?Date.now():at};}));inj=m;injd=dd;}
    catch(e){if(e?.code&&!["tool_error","bad_page"].includes(e.code))throw e;}
    let lgErr=null;
    if(mirror()){try{await syncEspnLeague(mcp);}catch(e){if(e?.code&&!["tool_error","bad_page","not_league"].includes(e.code))throw e;lgErr=e;}}
    showUpdated("Loading news…");
    try{const nw=await fetchJSON(mcp,`${ESPN}/news?limit=50`),seen=new Set(),out=[];
      (nw.articles||[]).forEach(a=>{const id=String(a.id||a.dataSourceIdentifier||a.headline||"");if(!a.headline||seen.has(id))return;seen.add(id);const at=Date.parse(a.published||a.lastModified||"");
        out.push({id,h:String(a.headline).slice(0,200),d:String(a.description||"").slice(0,300),u:a.links?.web?.href||"",at:isNaN(at)?Date.now():at,p:(a.categories||[]).filter(c=>c.type==="athlete").map(c=>c.description||c.athlete?.description||"").filter(Boolean).slice(0,6)});});
      // keep a week of stories so older items stay on player cards between pulls
      news.forEach(a=>{if(!seen.has(a.id)&&Date.now()-a.at<7*864e5){seen.add(a.id);out.push(a);}});news=out.sort((a,b)=>b.at-a.at).slice(0,120);}
    catch(e){if(e?.code&&!["tool_error","bad_page"].includes(e.code))throw e;}
    await Store.set("nba",SEASON,{season:SEASON,inj,injd,news,live:live||NBA?.live||null,own:NBA?.own||null,ownAt:NBA?.ownAt||null,at:Date.now()});
    if(days.length&&days[days.length-1]<last)toast("Loaded 10 days. Press Refresh again for the rest.");
    if(lgErr){showUpdated(ERR.not_league,true);busy=false;btn.disabled=false;return;}
  }catch(e){showUpdated((e?.code==="server_not_connected"?(L.espn?.task?ERR.cloud:ERR.host_missing):ERR[e?.code])||(e?.code?`Refresh failed (${e.code}). Try again.`:"Refresh failed. Try again."),true);busy=false;btn.disabled=false;return;}
  busy=false;btn.disabled=false;showUpdated();
}
$("#refreshBtn").onclick=refresh;
setInterval(()=>{if(!busy)showUpdated();const t=todaySp();if(t!==TODAY&&t>=1&&t<=SEASON_END+1){TODAY=t;queueRebuild();}},60000);


/* ============================================================================
   GATE: a dial pad that opens the app. Each code (badge) belongs to one team
   or to the commissioner. The first time, the app's owner sets the
   commissioner code; the commissioner then makes team codes in Settings.
   ============================================================================ */
const gate=$("#gate"),GATE={buf:"",first:"",fails:0,until:0,busy:false,msg:"",err:false};
try{SESSION=JSON.parse(localStorage.getItem("dfSession")||"null");}catch(e){SESSION=null;}
function saveSession(s){SESSION=s;try{s?localStorage.setItem("dfSession",JSON.stringify(s)):localStorage.removeItem("dfSession");}catch(e){}}
const sessionValid=()=>{const b=SESSION&&BADGES?.[SESSION.h];return !!b&&b.role===SESSION.role&&(b.team||null)===(SESSION.team||null);};
const hasCommish=()=>!!BADGES&&Object.values(BADGES).some(b=>b.role==="commish");
function gateMode(){if(!BADGES)return "load";if(!hasCommish())return Store.canAdmin?(GATE.first?"setup2":"setup1"):"none";return "login";}
const GATE_TXT={load:["Loading","Checking the league…"],login:["Enter your code","Your team's 6-digit badge number"],
  setup1:["Set the commissioner code","Pick 6 digits only you know. It unlocks every team, the draft and settings."],setup2:["Enter it again","To make sure it's right."],
  none:["Not set up yet","The commissioner hasn't made team codes yet. Check back soon."]};
function renderWho(){const w=$("#whoBtn");if(!SESSION){w.hidden=true;return;}const cm=SESSION.role==="commish";
  w.hidden=false;w.classList.toggle("cm",cm);w.innerHTML=`<span>${esc(cm?"Commissioner":teamName(SESSION.team))}</span><b>· Log out</b>`;}
function renderGate(){
  const on=BADGES?!sessionValid():!SESSION;
  gate.hidden=!on;document.documentElement.style.overflow=on?"hidden":"";renderWho();chatSync();
  if(!on)return;
  const m=gateMode(),[t,sub]=GATE_TXT[m],wait=Math.ceil((GATE.until-Date.now())/1000);
  $("#gLg").textContent=L?`${L.name} ${L.season}`:"Draft Fantasy";
  $("#gTitle").textContent=t;$("#gSub").textContent=sub;
  $("#gFoot").textContent=m.startsWith("setup")?"You're seeing this because you own this app. Team codes come next, in League → Settings.":"The commissioner gives each team its own 6-digit code.";
  const msg=$("#gMsg");msg.textContent=wait>0?`Too many tries. Wait ${wait} seconds.`:GATE.msg;msg.classList.toggle("err",GATE.err||wait>0);
  const dots=$("#gDots");[...dots.children].forEach((d,i)=>d.classList.toggle("on",i<GATE.buf.length));
  const off=m==="load"||m==="none"||GATE.busy||wait>0;
  gate.querySelectorAll(".key").forEach(k=>k.disabled=off);
  if(wait>0){clearTimeout(renderGate.t);renderGate.t=setTimeout(renderGate,1000);}
}
function gateFail(msg){GATE.buf="";GATE.msg=msg;GATE.err=true;const d=$("#gDots");d.classList.remove("shake");void d.offsetWidth;d.classList.add("shake","bad");
  setTimeout(()=>d.classList.remove("bad"),600);try{navigator.vibrate?.(120);}catch(e){}renderGate();}
function gateKey(k){
  if(GATE.busy||gate.hidden)return;const m=gateMode();if(m==="load"||m==="none"||GATE.until>Date.now())return;
  if(k==="back")GATE.buf=GATE.buf.slice(0,-1);
  else if(k==="clear")GATE.buf="";
  else if(/^\d$/.test(k)&&GATE.buf.length<6)GATE.buf+=k;
  GATE.msg="";GATE.err=false;renderGate();
  if(GATE.buf.length===6)gateSubmit();
}
async function gateSubmit(){
  const code=GATE.buf,m=gateMode();
  if(m==="setup1"){GATE.first=code;GATE.buf="";renderGate();return;}
  GATE.busy=true;GATE.msg=m==="setup2"?"Saving…":"Checking…";renderGate();
  try{
    const h=await badgeHash(code);
    if(m==="setup2"){
      if(code!==GATE.first){GATE.first="";GATE.busy=false;return gateFail("Those didn't match. Pick a code again.");}
      await Store.set("secret","codes",{codes:{commish:code},hashes:{commish:h},at:Date.now()});
      await Store.set("badges",h,{role:"commish",team:null,at:Date.now()});
      BADGES={...BADGES,[h]:{role:"commish",team:null}};GATE.first="";GATE.busy=false;
      login({h,role:"commish",team:null});toast("Commissioner code set. Make team codes in League → Settings.");return;}
    const b=BADGES?.[h];GATE.busy=false;
    if(!b){if(++GATE.fails>=5){GATE.fails=0;GATE.until=Date.now()+30000;}return gateFail("That code doesn't match a team.");}
    GATE.fails=0;login({h,role:b.role,team:b.team||null});
  }catch(e){GATE.busy=false;gateFail(e?.code?"Couldn't save. Try again.":"Something went wrong. Try again.");}
}
function login(s){
  saveSession(s);GATE.buf="";GATE.msg="";GATE.err=false;watchSecret();
  const T=s.team&&L?.teams.some(t=>t.id===s.team)?tnum(s.team):0;
  if(T){cur=T;try{localStorage.setItem("dfTeam",cur)}catch(e){}}
  renderGate();
  if(L&&TEAMS[cur]){if(T&&draftDone())nav="team";load();}else render();
}
function logout(msg){
  saveSession(null);GATE.buf="";GATE.first="";GATE.msg=msg||"";GATE.err=!!msg;MOVING=null;CODE_DIRTY=false;
  unSecret?.();unSecret=null;SECRET=null;renderGate();render();
}
let unSecret=null;
function watchSecret(){if(unSecret||!isCommish()||!Store.canAdmin)return;unSecret=Store.watch("secret",null,d=>{SECRET=d.find(x=>x.id==="codes")||null;if(nav==="league"&&SUB.league==="setup")renderRosters();});}
gate.addEventListener("click",e=>{const k=e.target.closest(".key");if(k&&!k.disabled)gateKey(k.dataset.k);});
document.addEventListener("keydown",e=>{
  if(gate.hidden||e.metaKey||e.ctrlKey||e.altKey)return;
  const k=/^\d$/.test(e.key)?e.key:e.key==="Backspace"?"back":e.key==="Escape"?"clear":null;
  if(!k)return;e.preventDefault();e.stopPropagation();
  const b=gate.querySelector(`.key[data-k="${k}"]`);if(b){b.classList.add("down");setTimeout(()=>b.classList.remove("down"),120);}
  gateKey(k);
},true);
$("#whoBtn").onclick=()=>openSheet("Log out?",`<p>${isCommish()?"You're logged in as the commissioner.":`You're logged in as ${esc(teamName(SESSION.team))}.`} You'll need your code to get back in on this device.</p>
  <div class="sheetacts"><button class="btn ghost" data-sheet="close">Stay</button><button class="btn danger" data-logout="1">Log out</button></div>`);
function onBadges(d){
  BADGES=Object.fromEntries(d.map(({id,...b})=>[id,b]));
  if(SESSION&&!sessionValid()){logout("Your code was changed. Enter the new one from the commissioner.");return;}
  if(SESSION)watchSecret();
  renderGate();
}

/* ============================================================================
   BOOT: watch the league, then everything for the chosen season
   ============================================================================ */
let UNSUB=[],rbT=null,firstLoad=true;
function queueRebuild(){clearTimeout(rbT);rbT=setTimeout(()=>{if(!L)return render();rebuild();WMAP=waiverMap();REV++;applyData();settleTrades();autoDaily();runWaivers();},40);}
function applyData(){
  const ids=L.teams.map(t=>tnum(t.id));
  pick.innerHTML=L.teams.map(t=>`<option value="${tnum(t.id)}">${esc(t.name)}</option>`).join("");
  if(firstLoad||!ids.includes(cur)){let saved=0;try{saved=+localStorage.getItem("dfTeam");}catch(e){}
    cur=myTeamNum()||(ids.includes(saved)?saved:ids[0]);wk=weekOf(Math.min(TODAY,SEASON_END));
    if(firstLoad&&!draftDone()&&!navSaved)nav="draft";
    firstLoad=false;fillWeeks();showUpdated();load();return;}
  pick.value=cur;showUpdated();
  // keep the day, week and any open move when data changes underneath
  DAYS=[];for(let sp=wk[1];sp<=wk[2];sp++)DAYS.push(sp);render();
}
function subscribeSeason(){
  UNSUB.forEach(u=>u&&u());UNSUB=[];const s=SEASON;
  PICKS=[];TXS=[];QUEUES={};VOTES=[];LUDOCS={};STATS={};NBA=null;ESPNDAYS={};CLAIMS=[];WDOCS=[];PICKEM=[];
  UNSUB.push(Store.watch("picks",s,d=>{PICKS=d;queueRebuild();}));
  UNSUB.push(Store.watch("tx",s,d=>{TXS=d;queueRebuild();}));
  UNSUB.push(Store.watch("votes",s,d=>{VOTES=d;queueRebuild();}));
  UNSUB.push(Store.watch("queue",s,d=>{QUEUES={};d.forEach(x=>QUEUES[tnum(x.team)]=x);if(nav==="draft")renderRosters();}));
  UNSUB.push(Store.watch("lineups",s,d=>{LUDOCS={};d.forEach(x=>LUDOCS[tnum(x.team)]=x);queueRebuild();}));
  UNSUB.push(Store.watch("stats",s,d=>{STATS={};d.forEach(x=>STATS[x.sp]=x);queueRebuild();}));
  UNSUB.push(Store.watch("nba",s,d=>{NBA=d[0]||null;queueRebuild();}));
  UNSUB.push(Store.watch("claims",s,d=>{CLAIMS=d;queueRebuild();}));
  UNSUB.push(Store.watch("pickem",s,d=>{PICKEM=d;queueRebuild();}));
  UNSUB.push(Store.watch("waivers",s,d=>{WDOCS=d;queueRebuild();}));
  UNSUB.push(Store.watch("espn",s,d=>{ESPNDAYS={};d.forEach(x=>{if(x.sp!=null)ESPNDAYS[x.sp]=x;});queueRebuild();}));
}
function onLeagues(){
  const had=L?.season;
  if(!SEASON||!SEASONS[SEASON]){let saved=null;try{saved=localStorage.getItem("dfSeason");}catch(e){}SEASON=SEASONS[saved]?saved:Object.keys(SEASONS).sort().reverse()[0]||null;}
  L=SEASON?SEASONS[SEASON]:null;
  if(L&&L.season!==had){firstLoad=true;subscribeSeason();}
  queueRebuild();
}
(async function boot(){
  render();showUpdated();renderGate();
  await Store.init();
  Store.watch("badges",null,onBadges);
  Store.watch("league",null,docs=>{booted=true;SEASONS=Object.fromEntries(docs.filter(d=>d&&d.season).map(d=>{const {id,...x}=d;return [x.season,x];}));onLeagues();});
})();
</script>
