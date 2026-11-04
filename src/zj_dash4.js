/* ============================================================================
   DASHBOARD 4 (2.32, Arp 2026-11-04: "1 and 3 are good ... do 5 and 6", and for
   2 "come up with the most useful dashboard information for a team manager").
   - More than one dashboard (chips under the title, swipe on phones).
   - Share a layout: a link that adds your dashboard to a friend's app.
   - Live refresh: redraws every 30 s while games are on (60 s otherwise) and
     flashes any number that changed, green up / red down.
   - Alert badges: a red count on the Dashboard tab and an alert strip on top
     for things that need you (lineup holes, OUT starters, trades, illegal roster).
   - A new manager default, and the commissioner can make any dashboard the
     league default (L.dashDef) for everyone who hasn't arranged their own.
   ============================================================================ */
// the default for a team manager: score, lineup, what to do today
DASH_DEF.splice(0,DASH_DEF.length,["mu","w"],["lu","s"],["sw","s"],["wp","w"],["ij","s"],["gl","w"],["fa","s"],["sm","w"],["tr","s"],["cd","s"]);
const DASH_MAXB=6;
const dashBName=()=>{const c=dashCur();return c==="main"?((UI.dash&&UI.dash.n)||"Home"):(dashBoards().find(b=>b.id===c)||{}).n||"Dashboard";};
function dashBoardSet(patch){UI={...UI,dash:{...(UI.dash||{}),...patch}};uiSave();}
function dashGoBoard(id,dir){if(id===dashCur())return;DSEEN.clear();dashBoardSet({cur:id});dashDraw();
  const g=$("#dgrid");if(g&&dir&&!dReduce())g.animate([{transform:`translateX(${dir*40}px)`,opacity:.2},{transform:"none",opacity:1}],{duration:260,easing:"cubic-bezier(.3,.7,.2,1)"});}
const dashAllBoards=()=>[{id:"main",n:(UI.dash&&UI.dash.n)||"Home"},...dashBoards()];

/* ---- alerts: things that need the manager now ---- */
function dashAlerts(T){const out=[];if(!T||!TEAMS[T]||!L)return out;const sp=TODAY,P=TEAMS[T].P;
  try{const lg=legalIssues(T);if(lg)out.push({lv:"bad",t:"Your roster isn't legal, so moves are locked. Fix it on My Team.",go:["team",""]});}catch(e){}
  const outSt=P.filter(p=>startedOn(p,sp)&&gameOn(p.t,sp)&&p.st==="OUT");
  if(outSt.length)out.push({lv:"bad",t:`${outSt.map(p=>dashLast(p.n)).join(", ")} ${outSt.length>1?"are":"is"} OUT but in your lineup today.`,go:["team",""]});
  let can=0;try{can=benchPlan(T,sp).extra||0;}catch(e){}
  if(can)out.push({lv:"warn",t:`${can} bench player${can>1?"s":""} could fill an empty starting spot today.`,go:["team",""]});
  let tr=0;try{tr=myTeamNum()===T?tradesNeedingMe():0;}catch(e){}
  if(tr)out.push({lv:"warn",t:`${tr} trade${tr>1?"s":""} waiting on you.`,go:["league","trades"]});
  return out;}
function dashBadge(){const b=$('#mainnav [data-nav="dash"]');if(!b)return;const T=myTeamNum();let n=0;try{n=T?dashAlerts(T).length:0;}catch(e){}
  let i=b.querySelector(".dnb");if(!n){if(i)i.remove();return;}if(!i){i=document.createElement("i");i.className="dnb";b.appendChild(i);}
  if(i.textContent!==String(n)){i.textContent=n;i.classList.remove("pop");void i.offsetWidth;i.classList.add("pop");}i.setAttribute("aria-label",`${n} thing${n>1?"s":""} need you`);}
const dLiveOn=()=>!!(LIVE&&Object.values(LIVE.g||{}).some(g=>g.s==="in"));

/* ---- extra page chrome: board chips, live pill, alert strip ---- */
function dashChrome(){const who=prefKey(),T=dashT(),c=dashCur(),bs=dashAllBoards(),al=T===myTeamNum()?dashAlerts(T):[];
  const chips=`<div class="dboards" role="tablist" aria-label="Your dashboards">${bs.map(b=>`<button role="tab" class="dbc" data-dboard="${esc(b.id)}" aria-selected="${b.id===c}">${esc(b.n)}</button>`).join("")}
    ${who&&bs.length<DASH_MAXB?`<button class="dbc add" data-dbnew title="New dashboard">+ New</button>`:""}<span class="dbsp"></span>
    ${who?`<button class="btn ghost sm" data-dshare title="Share this layout">↗ Share</button>`:""}</div>`;
  const ed=DASH_EDIT?`<div class="dbedit"><span class="muted">This dashboard:</span><button class="btn ghost sm" data-dbren>Rename</button>${c!=="main"?`<button class="btn ghost sm" data-dbdel>Delete</button>`:""}
    ${isCommish()?`<button class="btn ghost sm" data-dleague>★ Make league default</button>${L&&L.dashDef?`<button class="btn ghost sm" data-dleagueoff>Clear league default</button>`:""}`:""}</div>`:"";
  const live=`<p class="dlivep">${dLiveOn()?`<i class="dlive"></i><b>Live</b> · updates every 30 seconds`:`Updates on its own`}<span class="muted"> · ${new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</span></p>`;
  const alerts=al.length?`<ul class="dalerts" role="list">${al.map(a=>`<li class="${a.lv}"><span>${a.lv==="bad"?"⚠":"●"}</span><span>${esc(a.t)}</span><button class="btn sm${a.lv==="bad"?"":" ghost"}" data-dgo="${a.go[0]}${a.go[1]?":"+a.go[1]:""}">Fix ›</button></li>`).join("")}</ul>`:"";
  return chips+ed+live+alerts;}
{const _dv=dashView;dashView=function(){const h=_dv.apply(this,arguments);const i=h.indexOf('<div class="dgrid"');if(i<0)return h;
  const T=dashT();if(!TEAMS[T])return h;let x="";try{x=dashChrome();}catch(e){}
  return h.slice(0,i)+x+h.slice(i);};}

/* ---- live refresh: flash what changed ---- */
function dSnap(){const m={};document.querySelectorAll("#dgrid .dtile[data-dw]").forEach(t=>{m[t.dataset.dw]=[...t.querySelectorAll(".num")].map(e=>e.dataset.dcount??e.textContent);});return m;}
const dNum=s=>{const v=parseFloat(String(s).replace(/[^0-9.\-]/g,""));return isNaN(v)?null:v;};
{const _rr=renderRosters;renderRosters=function(){const dash=nav==="dash"&&!DASH_DRAG,before=dash?dSnap():null;const r=_rr.apply(this,arguments);
  try{if(dash&&before&&!dReduce())document.querySelectorAll("#dgrid .dtile[data-dw]").forEach(t=>{const old=before[t.dataset.dw];if(!old)return;const ns=[...t.querySelectorAll(".num")];if(ns.length!==old.length)return;
    ns.forEach((e,i)=>{const now=e.dataset.dcount??e.textContent;if(now===old[i])return;const a=dNum(old[i]),b=dNum(now);e.classList.remove("dflash","up","down");void e.offsetWidth;e.classList.add("dflash",a!=null&&b!=null&&b<a?"down":"up");});});}catch(e){}
  try{dashBadge();}catch(e){}return r;};}
let DASH_TICK=0;
setInterval(()=>{try{dashBadge();}catch(e){}if(nav!=="dash"||DASH_EDIT||DASH_DRAG||document.visibilityState!=="visible")return;if(sheet&&sheet().open)return;
  DASH_TICK+=15;if(DASH_TICK>=(dLiveOn()?30:60)){DASH_TICK=0;dashDraw();}},15000);

/* ---- board actions, share, league default ---- */
const b64e=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const b64d=s=>decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/"))));
const dashShareLink=()=>{const code=b64e(JSON.stringify({n:dashBName(),w:dashW().filter(w=>DW[w.k]).map(w=>[w.k,w.s,w.o&&Object.keys(w.o).length?w.o:0])}));return location.origin+location.pathname+"#dash="+code;};
function dashAddBoard(n,w){const bs=dashBoards();if(bs.length+1>=DASH_MAXB){toast(`You can have up to ${DASH_MAXB} dashboards. Delete one first.`);return false;}
  const id="b"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);dashBoardSet({boards:[...bs,{id,n:String(n).slice(0,24)||"Dashboard",w}],cur:id});DSEEN.clear();return true;}
let DASH_PENDING=null;
function dashCheckShare(){const m=/#dash=([A-Za-z0-9_-]+)/.exec(location.hash||"");if(m){try{const d=JSON.parse(b64d(m[1]));if(d&&Array.isArray(d.w))DASH_PENDING=d;}catch(e){}history.replaceState(null,"",location.pathname+location.search);}
  if(!DASH_PENDING||!L||!prefKey())return;const d=DASH_PENDING,ws=d.w.filter(x=>Array.isArray(x)&&DW[x[0]]);
  openSheet("A dashboard was shared with you",`<p>Add <b>${esc(String(d.n||"Dashboard").slice(0,24))}</b> with ${ws.length} widget${ws.length===1?"":"s"} as a new dashboard? Your own dashboards stay as they are.</p>
    <p class="muted dsm">${ws.map(x=>esc(DW[x[0]].name)).join(", ")}</p><div class="sheetacts"><button class="btn ghost" data-sheet="close">Not now</button><button class="btn" data-dshadd>Add it</button></div>`);}
addEventListener("hashchange",dashCheckShare);
{let tries=0;const t=setInterval(()=>{if(++tries>40)return clearInterval(t);if(typeof L!=="undefined"&&L&&prefKey()){clearInterval(t);dashCheckShare();}else if(/#dash=/.test(location.hash))dashCheckShare();},1500);}
document.addEventListener("click",e=>{let b;
  if((b=e.target.closest("[data-dboard]"))){const ids=dashAllBoards().map(x=>x.id),a=ids.indexOf(dashCur()),z=ids.indexOf(b.dataset.dboard);dashGoBoard(b.dataset.dboard,z>a?1:-1);return;}
  if(!prefKey())return;
  if((b=e.target.closest("[data-dbnew]"))){const n=prompt("Name your new dashboard (for example Game night):","");if(n==null)return;if(dashAddBoard(n.trim()||"Dashboard",[])){DASH_EDIT=true;dashDraw();dashCatalog();}return;}
  if((b=e.target.closest("[data-dbren]"))){const n=prompt("Rename this dashboard:",dashBName());if(n==null||!n.trim())return;const c=dashCur();
    if(c==="main")dashBoardSet({n:n.trim().slice(0,24)});else dashBoardSet({boards:dashBoards().map(x=>x.id===c?{...x,n:n.trim().slice(0,24)}:x)});dashDraw();return;}
  if((b=e.target.closest("[data-dbdel]"))){const c=dashCur();if(c==="main"||!confirm(`Delete the ${dashBName()} dashboard?`))return;dashBoardSet({boards:dashBoards().filter(x=>x.id!==c),cur:"main"});DSEEN.clear();dashDraw();toast("Dashboard deleted");return;}
  if((b=e.target.closest("[data-dshare]"))){const link=dashShareLink();
    openSheet(`Share ${dashBName()}`,`<p>Anyone in the league who opens this link gets a copy of this dashboard's layout as a new dashboard. They see their own team's numbers, not yours.</p>
      <input class="dshl" id="dshIn" readonly value="${esc(link)}" aria-label="Share link"><div class="sheetacts">${navigator.share?`<button class="btn ghost" data-dshsend>Send…</button>`:""}<button class="btn" data-dshcopy>Copy link</button></div>`);
    setTimeout(()=>$("#dshIn")?.select(),50);return;}
  if((b=e.target.closest("[data-dshcopy]"))){const v=$("#dshIn").value;(navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(()=>toast("Link copied. Paste it in a chat."),()=>{$("#dshIn").select();document.execCommand&&document.execCommand("copy");toast("Link copied");});return;}
  if((b=e.target.closest("[data-dshsend]"))){navigator.share({title:"My Fantasy Ballerz dashboard",url:$("#dshIn").value}).catch(()=>{});return;}
  if((b=e.target.closest("[data-dshadd]"))){const d=DASH_PENDING;DASH_PENDING=null;sheet().close();if(!d)return;
    const w=d.w.filter(x=>Array.isArray(x)&&DW[x[0]]).map(([k,s,o],i)=>({id:"s"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)+i,k,s:["s","w","f"].includes(s)?s:DW[k].s,o:o&&typeof o==="object"?o:{}}));
    if(dashAddBoard(d.n||"Shared",w)){if(nav!=="dash")setNav("dash");else dashDraw();toast(`${d.n||"Dashboard"} added`);}return;}
  if((b=e.target.closest("[data-dleague]"))&&isCommish()){if(!confirm("Make this layout the starting dashboard for everyone in the league who hasn't arranged their own?"))return;
    const def=dashW().filter(w=>DW[w.k]).map(w=>[w.k,w.s,w.o&&Object.keys(w.o).length?w.o:0]);saveL({...L,dashDef:def}).then(ok=>{if(ok)toast("League default dashboard saved");});return;}
  if((b=e.target.closest("[data-dleagueoff]"))&&isCommish()){const n={...L};delete n.dashDef;saveL(n).then(ok=>{if(ok){toast("League default cleared");dashDraw();}});return;}
});
// swipe between dashboards on phones (not while editing)
{let sw=null;
  document.addEventListener("touchstart",e=>{if(nav!=="dash"||DASH_EDIT||e.touches.length!==1||!e.target.closest("#dgrid")||e.target.closest(".dch,.dtm,.dhm"))return sw=null;sw={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
  document.addEventListener("touchend",e=>{if(!sw)return;const t=e.changedTouches[0],dx=t.clientX-sw.x,dy=t.clientY-sw.y;sw=null;if(Math.abs(dx)<70||Math.abs(dy)>Math.abs(dx)*.6)return;
    const ids=dashAllBoards().map(x=>x.id);if(ids.length<2)return;const i=ids.indexOf(dashCur()),j=i+(dx<0?1:-1);if(j<0||j>=ids.length)return;dashGoBoard(ids[j],dx<0?1:-1);},{passive:true});}

{const s=document.createElement("style");s.textContent=`
.dboards{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.dbc{all:unset;cursor:pointer;padding:6px 12px;border-radius:999px;font-size:.84rem;font-weight:650;background:var(--chip,#eef);color:var(--ink);white-space:nowrap}
.dbc[aria-selected="true"]{background:var(--accent);color:#fff}
.dbc.add{background:none;border:1px dashed var(--line);color:var(--accent)}
.dbc:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.dbsp{flex:1}
.dbedit{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:.84rem}
.dlivep{margin:-4px 0 0;font-size:.76rem;color:var(--muted);display:flex;align-items:center;gap:6px}.dlivep b{color:var(--loss,#c62828)}
.dalerts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.dalerts li{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;font-size:.88rem;border:1px solid;animation:dslidein .4s cubic-bezier(.3,.7,.2,1) both}
.dalerts li>span:nth-child(2){flex:1}
.dalerts li.bad{background:color-mix(in srgb,var(--loss,#c62828) 10%,var(--surface));border-color:color-mix(in srgb,var(--loss,#c62828) 40%,transparent);color:var(--ink)}
.dalerts li.bad>span:first-child{color:var(--loss,#c62828)}
.dalerts li.warn{background:color-mix(in srgb,#d4a017 12%,var(--surface));border-color:color-mix(in srgb,#d4a017 45%,transparent)}
.dalerts li.warn>span:first-child{color:#b08800}
@keyframes dslidein{from{transform:translateY(-6px);opacity:0}}
#mainnav [data-nav="dash"]{position:relative}
.dnb{position:absolute;top:2px;right:2px;min-width:16px;height:16px;padding:0 4px;box-sizing:border-box;border-radius:8px;background:var(--loss,#d32f2f);color:#fff;font:800 10px/16px var(--f-body,system-ui);font-style:normal;text-align:center;box-shadow:0 0 0 2px var(--surface)}
.dnb.pop{animation:dnbpop .5s cubic-bezier(.3,1.6,.4,1)}
@keyframes dnbpop{from{transform:scale(.2)}}
.num.dflash{animation:dflash 1.6s ease-out}
.num.dflash.up{--fl:var(--win,#1a7f37)}.num.dflash.down{--fl:var(--loss,#c62828)}
@keyframes dflash{0%{background:color-mix(in srgb,var(--fl) 35%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--fl) 35%,transparent);border-radius:4px}100%{background:transparent;box-shadow:0 0 0 3px transparent}}
.dshl{width:100%;box-sizing:border-box;font:inherit;font-size:.8rem;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--chip,#eef);color:var(--ink)}
html.arp .dbc{border-radius:999px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--line) 70%,transparent)}
html.arp .dbc[aria-selected="true"]{background:var(--accent);box-shadow:0 6px 16px -8px var(--accent)}
html.arp .dalerts li{border-radius:16px;backdrop-filter:blur(10px)}
@media (prefers-reduced-motion:reduce){.dalerts li,.dnb.pop,.num.dflash{animation:none}}
`;document.head.appendChild(s);}
