/* ============================================================================
   iPHONE DUO, ROUND 3 (2.85, Arp 2026-11-17: "fix all and do all" on the Duo
   review doc https://claude.ai/artifact/3jc6QQZtsC7mjNN9UGZyF8).
   Two-pane (open, held sideways):
   - BUG-356 the 8 big section tiles in the rail become one slim row of icons;
     the open section shows its name. Team, matchup and Refresh rows are tighter.
   - BUG-357 Chat moves to an icon (with its count) next to the team picker, so
     the chat bar no longer covers the bottom of the rail.
   - BUG-358 Matchup › Score shows both rosters under the category board.
   - BUG-359 the rail goes dark with New Era +, and "Jump to" sits above the alerts.
   - BUG-360 Players: filters at the top of the rail, Waivers below them, tighter
     table so names and the last column fit.
   - BUG-361 tap-to-detail: League scoreboard and standings teams open in the rail
     (their matchup or team) and a news story opens its player's card beside it.
   - BUG-365 optional Book split (50/50 on the fold line) in Display.
   Folded / upright:
   - BUG-362 folded My Team: shorter top (starters line and its links on one row).
   - BUG-363 the dashboard tab is called Dashboard everywhere (was Home on phones).
   - BUG-364 open upright: News in two columns.
   - BUG-366 optional Game night mode in Display: open upright, Matchup keeps the
     score on the top half and the rosters scroll on the bottom half.
   ============================================================================ */
// ---- preferences: Book split (two-pane) and Game night (upright), saved with the rest of Display
let DSPLIT="rail",DLIVEM=false;
try{DSPLIT=localStorage.getItem("dfSplit")==="book"?"book":"rail";DLIVEM=localStorage.getItem("dfLiveM")==="1";}catch(e){}
function duo3Body(){const b=document.body;b.classList.toggle("dbook",DSPLIT==="book");b.classList.toggle("livem",DLIVEM);
  NAVS_ALL.forEach(n=>b.classList.toggle("nav-"+n,typeof nav!=="undefined"&&nav===n));}
const NAVS_ALL=["team","dash","matchup","players","league","news","pickem","analytics","draft"];
function setSplit(v,quiet){DSPLIT=v==="book"?"book":"rail";try{localStorage.setItem("dfSplit",DSPLIT);}catch(e){}duo3Body();if(!quiet&&L)try{render();}catch(e){}}
function setLiveM(v,quiet){DLIVEM=!!v;try{localStorage.setItem("dfLiveM",DLIVEM?"1":"0");}catch(e){}duo3Body();if(!quiet&&L)try{render();}catch(e){}}
function duoPrefsHtml(row){return `<h3>Two-pane split</h3>${row("split",[["rail","Side rail"],["book","Book (half and half)"]],DSPLIT)}
  <p class="muted dsnote"><b>Side rail</b> keeps the page wide with the menu on the right. <b>Book</b> splits the screen on the fold line, for using the Duo half open like a book.</p>
  <h3>Game night (open upright)</h3>${row("livem",[["off","Off"],["on","On"]],DLIVEM?"on":"off")}
  <p class="muted dsnote">With the Duo open and upright, Matchup keeps the score on the top half and both rosters scroll on the bottom half, so you can stand it half open like a laptop during games.</p>`;}

// ---- BUG-363: one name for the dashboard tab
{const s=document.querySelector('#mainnav [data-nav="dash"] .dshort');if(s)s.textContent="Dashboard";}

// ---- BUG-358 / BUG-366: both rosters under the category board (two-pane, or Game night upright)
const duoRostersHere=()=>typeof ptOn==="function"&&ptOn()&&nav==="matchup"&&SUB.matchup==="stats"&&M.opp&&TEAMS[M.opp]&&TEAMS[cur]&&
  (duoOn()||(DLIVEM&&document.body.classList.contains("fold")&&innerHeight>innerWidth));
function duoMatchRosters(){
  const T=cur,opp=M.opp,v=ptView(),f=PTF==="me"||PTF==="op"?PTF:"both";
  const tb=(k,l)=>`<button data-ptf="${k}" aria-pressed="${f===k}" title="${esc(k==="me"?TEAMS[T].name:k==="op"?TEAMS[opp].name:"Both teams")}">${l}</button>`;
  const vb=(k,l)=>`<button data-ptm="${k}" aria-pressed="${PTM===k}">${l}</button>`;
  const views=`<div class="ptviews ptmrow" role="group">${tb("both","Both")+tb("me",esc(tmInit(T)))+tb("op",esc(tmInit(opp)))}<i class="ptsep"></i>${vb("stats",selDay?(selDay===TODAY?"Today":dow(selDay)+" "+dateOf(selDay).getDate()):"Week")}${vb("season","Season")}${vb("proj","Proj")}</div>`;
  const rows=(f!=="op"?ptRows(T,"me",v,false,f==="both"):"")+(f!=="me"?ptRows(opp,"op",v,false,f==="both"):"");
  return `<section class="duomr"><h3 class="duomh">Rosters <small class="muted">day follows the board above</small></h3>${views}${ptWrap(v,rows)}<p class="ptnote">${v==="week"?"This matchup, games in the starting lineup":v==="day"?"Stats for the picked day":v==="season"?"Season per game":"ESPN projection per game"} · tap a name for the player card</p></section>`;}

// ---- BUG-361: details in the rail
const duoDock=(title,html)=>{DOCK=true;try{openSheet(title,html);}finally{DOCK=false;}$("#sheetBody").scrollTop=0;};
const recTxt=r=>`${r[0]}-${r[1]}${r[2]?`-${r[2]}`:""}`;
function duoMatchCard(id){
  const pair=(W[wk[0]]||[]).find(p=>p.includes(id));if(!pair)return duoTeamCard(id);
  const [a,b]=pair[0]===id?pair:[pair[1],pair[0]];
  let A,B,p=null;try{A=fcProj(a);B=fcProj(b);p=winProb(A,B);}catch(e){A=null;}
  const sa=score(a),sb=score(b),live=started(),f=(v,c)=>c[1]==="pct"?pct(v):Math.round(v);
  const rows=CATS.map(c=>{const x=val(sa,c),y=val(sb,c),px=A?val(A.fin,c):null,py=A?val(B.fin,c):null,l=!live||Math.abs(x-y)<1e-9?"":x>y?"me":"op";
    return `<tr><td class="nm">${c[0]}</td><td class="num${l==="me"?" ld":""}">${live?f(x,c):"–"}${px!=null?`<small>${f(px,c)}</small>`:""}</td><td class="num${l==="op"?" ld":""}">${live?f(y,c):"–"}${py!=null?`<small>${f(py,c)}</small>`:""}</td></tr>`;}).join("");
  const r=live?h2h(sa,sb):null,pr=A?h2h(A.fin,B.fin):null;
  return `<div class="duocard"><div class="mbhead"><span class="hav me xs">${esc(tmInit(a))}</span><b>${r?recTxt(r):"–"}</b><span class="muted">now${pr?` · proj ${recTxt(pr)}`:""}</span><span class="hav op xs">${esc(tmInit(b))}</span></div>
    <p class="duowho"><b>${esc(teamName(a))}</b>${p!=null?` <span class="muted">${Math.round(p*100)}%</span>`:""}<br><span class="muted">vs</span> <b>${esc(teamName(b))}</b>${p!=null?` <span class="muted">${Math.round((1-p)*100)}%</span>`:""}</p>
    <table class="mbt"><thead><tr><th></th><th class="num">${esc(tmInit(a))}</th><th class="num">${esc(tmInit(b))}</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="foot-note">Big number is now, small is projected at the end of the matchup.</p>
    <div class="sheetacts"><button class="btn" data-duogo="${a}">Open full matchup</button></div></div>`;}
function duoTeamCard(id){
  const st=typeof STAND!=="undefined"&&STAND[id]?STAND[id]:null,ord_=typeof standOrder==="function"?standOrder():[],pos=ord_.indexOf(id)+1;
  let ps=[];try{ps=dCurP(id);}catch(e){ps=(TEAMS[id].P||[]).filter(Boolean);}
  const list=ps.map(p=>`<li><button class="nmb" data-pcard="${esc(p.n)}"><b>${esc(p.n)}</b></button><small class="muted">${esc(DIR[p.n]?.t||p.t||"")}${INJ[p.n]&&INJ[p.n]!=="ACTIVE"?` · ${esc(INJ[p.n])}`:""}</small></li>`).join("");
  return `<div class="duocard"><div class="mbhead"><span class="hav xs">${esc(tmInit(id))}</span><b>${esc(teamName(id))}</b></div>
    <p class="duowho">${st?`${recTxt(st.rec)}`:""}${pos?` · ${ord(pos)} place`:""}</p>
    <h4 class="duoh">Roster</h4><ul class="duorl">${list}</ul>
    <div class="sheetacts"><button class="btn" data-duogo="${id}">Open their matchup</button></div></div>`;}
document.addEventListener("click",e=>{
  if(!duoOn()||!L)return;
  const t=e.target.closest(".tlink[data-team]");
  if(t&&nav==="league"&&(SUB.league==="score"||SUB.league==="stand")&&t.closest("#rosters")){
    e.preventDefault();e.stopPropagation();const id=+t.dataset.team;if(!TEAMS[id])return;
    try{SUB.league==="score"?duoDock(`${weekName(wk[0])} · ${teamName(id)}`,duoMatchCard(id)):duoDock(teamName(id),duoTeamCard(id));}catch(x){}
    document.querySelectorAll("#rosters .duosel").forEach(x=>x.classList.remove("duosel"));(t.closest("tr,.sccard")||t).classList.add("duosel");return;}
  const g=e.target.closest("[data-duogo]");if(g){const id=+g.dataset.duogo,pk=$("#teamPick");sheet().close();if(pk){pk.value=id;pk.onchange&&pk.onchange();}setNav("matchup","stats");return;}
  // a news story (not its link or a player chip) opens its first player's card in the rail, with the story on top
  const s=e.target.closest("#rosters .nwi");
  if(s&&nav==="news"&&!e.target.closest("a,button")){const pb=s.querySelector("[data-pcard]");if(!pb)return;
    const hd=s.querySelector("a b")?.textContent||"",d=s.querySelector("p")?.textContent||"",u=s.querySelector("a")?.getAttribute("href")||"";
    playerCard(pb.dataset.pcard);
    if(sheet().classList.contains("dock"))$("#sheetBody").insertAdjacentHTML("afterbegin",`<div class="duostory"><b>${esc(hd)}</b>${d?`<p>${esc(d)}</p>`:""}${u&&u!=="#"?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Read the full story ›</a>`:""}</div>`);
    document.querySelectorAll("#rosters .duosel").forEach(x=>x.classList.remove("duosel"));s.classList.add("duosel");}
},true);

// ---- BUG-359: on the dashboard the jump list sits right under the board controls, above the alerts
function duoDashOrder(){const box=$("#dDuoRail");if(!box)return;const sec=box.querySelector(".ddsec"),top=box.querySelector(".ddtop");if(sec&&top&&top.nextElementSibling!==sec)top.after(sec);}

// ---- render hooks (wrapped after every file has loaded, like r_duo)
addEventListener("DOMContentLoaded",()=>{
  const _rr=renderRosters;renderRosters=function(){const r=_rr.apply(this,arguments);duo3Body();
    try{if(duoRostersHere()){const el=$("#rosters");el.innerHTML=duoMatchRosters();el.dataset.view="matchup";}}catch(e){}
    try{duoDashOrder();}catch(e){}return r;};
  const _pr=placeRail;placeRail=function(){_pr.apply(this,arguments);try{duoDashOrder();}catch(e){}};
  duo3Body();});
addEventListener("resize",()=>setTimeout(duo3Body,200));

{const s=document.createElement("style");s.textContent=`
/* BUG-354 dashboard matchup arrows on dark stages */
.dash.dnep .dwk-b{background:rgba(255,255,255,.08);color:var(--ink);border-color:var(--line)}
/* BUG-356 one slim row of section icons in the rail; the open one shows its name */
body.fold.duow .mainnav{display:flex!important;gap:3px;grid-template-columns:none}
body.fold.duow .mainnav button{flex:1 1 0;min-width:0;font-size:0!important;padding:8px 0!important;gap:0;border-radius:9px;justify-content:center;align-items:center;flex-direction:row}
body.fold.duow .mainnav button[hidden]{display:none}
body.fold.duow .mainnav button svg{width:18px;height:18px;flex:none}
body.fold.duow .mainnav button[aria-selected="true"]{flex:0 0 auto;font-size:.62rem!important;padding:8px 8px!important;gap:5px;white-space:nowrap}
body.fold.duow .mainnav .dnb{top:-4px;right:-3px}
body.fold.duow>.bar{padding-bottom:14px!important;gap:8px}
body.fold.duow>.bar>.wrap{gap:6px}
body.fold.duow>.bar .teamnav select,body.fold.duow>.bar .weeknav select{padding-top:5px;padding-bottom:5px}
body.fold.duow>.bar .refresh #refreshBtn{padding:4px 10px;font-size:.78rem}
/* BUG-357 chat icon in the rail instead of the bar over its bottom */
body.fold.duow #chatDock{display:none!important}
body.fold.duow .bar #ptChat{display:inline-grid;place-items:center;flex:0 0 34px;min-width:34px}
/* BUG-365 Book split: the rail is half the screen, on the fold line */
body.fold.duow.dbook{--railw:50vw}
/* BUG-358 rosters under the board */
.duomr{margin-top:14px}.duomh{margin:0 0 8px;font-size:1rem;display:flex;align-items:baseline;gap:8px}.duomh small{font-size:.72rem;font-weight:500}
body.fold.duow.nav-matchup #heroWrap .panel{margin-bottom:0}
/* BUG-359 dark rail with New Era + */
body.fold.duow.nepon.nav-dash>.bar{--surface:#0f1730;--bg:#0a1124;--ink:#eef2ff;--muted:#97a3c6;--line:rgba(160,180,255,.16);--chip:rgba(255,255,255,.06);--accent-wash:color-mix(in srgb,var(--accent) 24%,transparent);background:#0a1124;color:var(--ink);border-left-color:rgba(160,180,255,.16);color-scheme:dark}
body.fold.duow.nepon.nav-dash>.bar select,body.fold.duow.nepon.nav-dash>.bar .btn.ghost,body.fold.duow.nepon.nav-dash>.bar .arrow,body.fold.duow.nepon.nav-dash>.bar .hbtn{background:rgba(255,255,255,.06);color:var(--ink);border-color:var(--line)}
body.fold.duow.nepon.nav-dash .mainnav button{background:rgba(255,255,255,.04);color:#c9d2ee;border-color:var(--line)}
body.fold.duow.nepon.nav-dash .mainnav button[aria-selected="true"]{background:var(--accent-wash);color:#fff;border-color:var(--accent)}
body.fold.duow.nepon.nav-dash .ddr .dalerts li{background:rgba(255,255,255,.05);color:var(--ink);border-color:var(--line)}
body.fold.duow.nepon.nav-dash #rail .note{background:rgba(255,255,255,.06);color:#c9d2ee;border-color:rgba(255,255,255,.12)}
body.fold.duow.nepon.nav-dash .rtop #lgName{color:var(--muted)}
/* BUG-360 Players: filters first, Waivers after, tighter table */
body.fold.duow #rail>.wpanel.railx{order:5}body.fold.duow #rail>#banner{order:6}
body.fold.duow #rail>.wpanel{padding:8px 10px}body.fold.duow #rail>.wpanel h2{font-size:.85rem}body.fold.duow #rail>.wpanel .hint{font-size:.7rem}
body.fold.duow.nav-players #rosters table th,body.fold.duow.nav-players #rosters table td{padding-left:5px;padding-right:5px}
body.fold.duow.nav-players #rosters table td:first-child{max-width:150px}
/* BUG-361 details in the rail */
.duocard .mbhead{display:flex;align-items:center;gap:8px;margin-bottom:6px}.duocard .mbhead b{font-family:var(--f-display);font-size:1.15rem}
.duocard .mbhead .muted{flex:1;font-size:.72rem}
.duowho{margin:0 0 10px;font-size:.85rem;line-height:1.45}
.duocard .mbt{width:100%}.duocard .mbt td small{display:block;font-size:.7rem;color:var(--muted)}.duocard .mbt td.ld{font-weight:800;color:var(--accent)}
.duoh{margin:8px 0 4px;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.duorl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}.duorl li{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--line)}
.duorl .nmb{all:unset;cursor:pointer}.duorl small{font-size:.7rem}
.duostory{padding:10px 12px;margin:0 0 12px;border:1px solid var(--line);border-radius:12px;background:var(--accent-wash)}.duostory b{display:block;font-size:.9rem;line-height:1.3}
.duostory p{margin:6px 0;font-size:.8rem;color:var(--muted)}.duostory a{font-size:.8rem;font-weight:700;color:var(--accent)}
body.fold.duow #rosters .duosel{outline:2px solid var(--accent);outline-offset:-2px;border-radius:10px}
body.fold.duow.nav-news #rosters .nwi{cursor:pointer}
/* BUG-362 folded My Team: the starters line and its links share one row that scrolls sideways */
@media (max-width:440px){body.ptab .ptline{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none;white-space:nowrap;gap:12px!important;padding-top:4px!important;padding-bottom:4px!important}
  body.ptab .ptline::-webkit-scrollbar{display:none}body.ptab .ptline>*{flex:none!important}
  body.ptab .ptscore{margin-bottom:6px!important}
  body.ptab .bar .weeknav select{font-size:.8rem!important;padding-left:6px;padding-right:18px}}
/* BUG-364 open upright: News in two columns */
@media (min-width:600px){body.fold:not(.duow) #rosters ol.nwl:not(.injl),body.fold:not(.duow) #rosters ul.nwl:not(.injl){display:grid;grid-template-columns:1fr 1fr;column-gap:12px}}
/* BUG-366 Game night: score on the top half, rosters scroll below */
@media (orientation:portrait){body.fold.livem:not(.duow).nav-matchup #heroWrap{position:sticky;top:0;z-index:6;max-height:50vh;max-height:50dvh;overflow-y:auto;background:var(--bg);box-shadow:0 8px 16px -12px rgba(0,0,0,.35)}
  body.fold.livem:not(.duow).nav-matchup>.bar{position:relative!important}}
`;document.head.appendChild(s);}
