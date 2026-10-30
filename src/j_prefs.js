
/* ============================================================================
   DISPLAY SETTINGS (2026-10-22): theme and screen layout, saved per login in
   prefs/<team key> so they follow a manager to any phone or computer.
   Layout "auto" switches to the touch layout on a near-square touch screen
   wider than a phone, like an unfolded iPhone Duo (about 4:3).
   ============================================================================ */
const LAYOUTS=[["auto","Auto"],["touch","Phone style"],["duo","Two-pane"],["desktop","Desktop"]];
let LAYOUT="auto";try{LAYOUT=localStorage.getItem("dfLayout")||"auto";}catch(e){}
const foldLike=()=>{const w=innerWidth,h=innerHeight,r=w/h;return matchMedia("(pointer:coarse)").matches&&w>640&&w<=1100&&r>.65&&r<1.5;};
// Two-pane (1.27, Arp 2026-10-24): an unfolded Duo held wide gets the header, sections, notes and team card
// in a rail on the right, so the roster gets the full height on the left
const duoLike=()=>foldLike()&&innerWidth>innerHeight;
function applyLayout(){const duo=(LAYOUT==="duo"&&innerWidth>=760)||(LAYOUT==="auto"&&duoLike()),on=duo||LAYOUT==="touch"||(LAYOUT==="auto"&&foldLike()),was=document.body.classList.contains("fold")+":"+document.body.classList.contains("duow");
  document.body.classList.toggle("fold",on);document.body.classList.toggle("duow",duo);placeRail();if(was!==on+":"+duo&&typeof render==="function"&&L)try{render();}catch(e){}}
// move the notes (and on My Team the team card) into the rail, and back when the rail goes away
// (and, Arp 1.28, the page's own buttons: Schedule/Stats, search, Compact, League's section icons)
function placeRail(){const bar=document.querySelector("body>.bar"),main=document.querySelector("main"),ban=document.getElementById("banner"),hero=document.getElementById("heroWrap"),sb=document.getElementById("subbar"),ros=document.getElementById("rosters");if(!bar||!main||!ban||!hero||!sb||!ros)return;
  let rail=document.getElementById("rail");
  if(document.body.classList.contains("duow")){if(!rail){rail=document.createElement("div");rail.id="rail";bar.appendChild(rail);}
    if(sb.parentNode!==rail)rail.insertBefore(sb,rail.firstChild);
    const heroIn=typeof nav!=="undefined"&&(nav==="team"||nav==="league");if(heroIn&&hero.parentNode!==rail)sb.after(hero);else if(!heroIn&&hero.parentNode!==main)main.insertBefore(hero,main.firstChild);
    if(ban.parentNode!==rail||rail.lastChild!==ban)rail.appendChild(ban);}
  else{if(sb.parentNode!==ros.parentNode)ros.before(sb);if(hero.parentNode!==main)main.insertBefore(hero,main.firstChild);if(ban.parentNode!==main)main.insertBefore(ban,main.firstChild);}}
addEventListener("DOMContentLoaded",()=>{if(typeof render==="function"){const _r=render;render=function(){_r.apply(this,arguments);placeRail();};}placeRail();});
addEventListener("resize",()=>{clearTimeout(applyLayout._t);applyLayout._t=setTimeout(applyLayout,150);});
applyLayout();
const prefKey=()=>SESSION?(SESSION.role==="commish"?"commish":SESSION.team||null):null;
// BUG-167 (Arp 2026-10-29): a change here is stamped on this device (dfPrefsAt) and saves go out one at a time, newest last,
// so a slow save can't land after a newer one, and a tab opened before the save reaches the server keeps the newer local pick
const prefsLocalAt=k=>{try{const x=JSON.parse(localStorage.getItem("dfPrefsAt")||"null");return x&&x.k===k?+x.at||0:0;}catch(e){return 0;}};
let PREFS_Q=null,PREFS_AGAIN=false;
function pushPrefs(){if(PREFS_Q){PREFS_AGAIN=true;return PREFS_Q;}
  PREFS_Q=(async()=>{try{do{PREFS_AGAIN=false;const k=prefKey();if(!k||WRITE_BLOCKED)break;
    await Store.set("prefs",k,{theme:THEME,layout:LAYOUT,mlay:MLAY,rstyle:typeof RSTYLE==="string"?RSTYLE:"table",nba:typeof NBATHEME==="string"?NBATHEME:"",nbas:typeof NBASTR==="string"?NBASTR:"bold",style:typeof STYLE==="string"?STYLE:"classic",at:prefsLocalAt(k)||Date.now()});}while(PREFS_AGAIN);}
    catch(e){}finally{PREFS_Q=null;}})();return PREFS_Q;}
async function savePrefs(){const k=prefKey();if(!k||WRITE_BLOCKED)return;try{localStorage.setItem("dfPrefsAt",JSON.stringify({k,at:Date.now()}));}catch(e){}return pushPrefs();}
async function loadPrefs(){const k=prefKey();if(!k)return;const p=await Store.get("prefs",k).catch(()=>null);
  // this device changed the display after the server's copy was saved: keep it and send it again
  if(prefsLocalAt(k)>(p&&p.at||0)){pushPrefs();return;}
  if(!p)return;
  if(p.theme&&p.theme!==THEME){THEME=p.theme;try{localStorage.setItem("dfTheme",THEME);}catch(e){}applyTheme();}
  if(p.layout&&p.layout!==LAYOUT){LAYOUT=p.layout;try{localStorage.setItem("dfLayout",LAYOUT);}catch(e){}applyLayout();}
  if(p.rstyle&&typeof RSTYLE==="string"&&p.rstyle!==RSTYLE){RSTYLE=p.rstyle;try{localStorage.setItem("dfRStyle",RSTYLE);}catch(e){}if(L)try{render();}catch(e){}}
  if(p.mlay&&p.mlay!==MLAY&&MLAYS.some(([k])=>k===p.mlay)){MLAY=p.mlay;try{localStorage.setItem("dfMLay",MLAY);}catch(e){}if(L)try{render();}catch(e){}}
  if(p.style&&typeof setStyle==="function"&&p.style!==STYLE)setStyle(p.style);
  if(p.nbas&&typeof setNbaStr==="function"&&p.nbas!==NBASTR)setNbaStr(p.nbas);
  if(p.nba!=null&&typeof setNbaTheme==="function"&&p.nba!==NBATHEME)setNbaTheme(p.nba);}
{const _ss=saveSession;saveSession=function(s){const before=prefKey();_ss(s);if(s&&prefKey()!==before)loadPrefs();};}
addEventListener("load",()=>setTimeout(loadPrefs,600));
// the ◐ button opens Display: theme and layout, saved for this login
function displaySheet(){
  const row=(name,opts,cur)=>`<div class="tabs sm dsrow" role="group" aria-label="${name}">${opts.map(([k,l])=>`<button data-ds="${name}:${k}" aria-selected="${cur===k}"${prefKey()?"":" disabled"}>${l}</button>`).join("")}</div>`;
  const who=prefKey()?(prefKey()==="commish"?"the commissioner login":esc(teamName(tnum(prefKey())))):"";
  openSheet("Display",`<h3>Theme</h3>${row("theme",[["auto","Match device"],["light","Light"],["dark","Dark"]],THEME)}
    ${typeof nbaThemeHtml==="function"?nbaThemeHtml():""}
    <h3>Layout</h3>${row("layout",LAYOUTS,LAYOUT)}
    <h3>Roster style (phones)</h3>${typeof RSTYLES!=="undefined"?row("rstyle",RSTYLES,RSTYLE):""}
    <p class="muted dsnote"><b>Stats table</b> shows My Team and Matchup › Players as one table like ESPN (player on the left, stats slide sideways). <b>Cards</b> is the earlier layout with a card per player.</p>

    <p class="muted dsnote"><b>Auto</b> uses the phone layout on phones and on an unfolded foldable like the iPhone Duo, and the desktop layout on computers. <b>Two-pane</b> puts the menu, notes and team card in a rail on the right (for an unfolded foldable held wide; Auto picks it there). <b>Phone style</b> always uses the touch layout with the bottom tabs. ${document.body.classList.contains("fold")?"This screen is using the foldable layout now.":""}</p>
    <p class="muted dsnote">${who?`Saved for ${who}, so it follows you to any device you log in on.`:"Not logged in, so the app uses the default look. Log in to pick your own; it's saved for your team on every device."}</p>
    <div class="sheetacts"><button class="btn" data-sheet="close">Done</button></div>`);}
$("#themeBtn").onclick=displaySheet;
document.addEventListener("click",e=>{const b=e.target.closest("[data-ds]");if(!b)return;const [k,v]=b.dataset.ds.split(":");
  if(k==="theme"){THEME=v;try{localStorage.setItem("dfTheme",v);}catch(x){}applyTheme();}
  else if(k==="rstyle"){RSTYLE=v;try{localStorage.setItem("dfRStyle",v);}catch(x){}if(L)render();}
  else if(k==="nbastr"){setNbaStr(v);}
  else if(k==="style"){if(typeof setStyle==="function")setStyle(v);}
  else if(k==="mlay"){MLAY=v;try{localStorage.setItem("dfMLay",v);}catch(x){}if(L)render();}
  else{LAYOUT=v;try{localStorage.setItem("dfLayout",v);}catch(x){}applyLayout();}
  b.parentElement.querySelectorAll("button").forEach(x=>x.setAttribute("aria-selected",x===b));savePrefs();});
{const _at=applyTheme;applyTheme=function(){_at();const b=$("#themeBtn");if(b){b.title="Display: theme and layout";b.setAttribute("aria-label",b.title);}};applyTheme();}
