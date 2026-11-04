
/* ============================================================================
   CUSTOMIZE THE APP (2.28, Arp 2026-11-04: "allowing users to edit the UI.
   Each user should be able to login and edit the UI the way they want").
   The ✎ button opens Customize: reorder or hide the main tabs and each tab's
   sub-tabs, pick the tab the app opens on, and the text size. "Edit this page"
   puts ↑ ↓ and Hide on every card of the page, so a manager can rearrange
   My Team, League, Analytics and the rest. Saved per login in
   prefs/<team key>.ui (next to the columns from 2.25), so it follows the
   manager to any device. Logged out = the default layout.
   UI = {tabs:{o,h}, subs:{<tab>:{o,h}}, start, text, cards:{<tab/sub>:{o,h}}}
   ============================================================================ */
var UI={};
const uiLk=()=>{const k=typeof prefKey==="function"?prefKey():null;return k?"dfUI_"+k:null;};
let UI_K;
function uiSync(){const lk=uiLk();if(lk===UI_K)return false;UI_K=lk;UI={};if(lk)try{UI=JSON.parse(localStorage.getItem(lk)||"{}")||{};}catch(e){UI={};}uiText();return true;}
function uiSave(){const lk=uiLk();if(!lk)return;try{localStorage.setItem(lk,JSON.stringify(UI));}catch(e){}if(typeof savePrefs==="function")savePrefs();}
// called by loadPrefs with the server's copy
function uiLoad(u){if(!u||typeof u!=="object")return;uiSync();UI=u;try{const lk=uiLk();if(lk)localStorage.setItem(lk,JSON.stringify(u));}catch(e){}uiText();
  if(u.start&&!UI_NAVED&&NAVS.includes(u.start)&&u.start!==nav){nav=u.start;}if(L)try{render();}catch(e){}}

const UI_NAMES={team:"My Team",matchup:"Matchup",players:"Players",league:"League",news:"News",pickem:"Fun",analytics:"Analytics",draft:"Draft"};
const uiTabsDefault=()=>[...document.querySelectorAll("#mainnav [data-nav]")].map(b=>b.dataset.nav).filter(k=>!UI_DEF||UI_DEF.includes(k));
let UI_DEF=null;   // the shipped tab order, read once before anything is moved
// a saved order plus anything the app added later (at its default spot), and what's hidden
function uiOrder(p,all){const o=((p&&p.o)||[]).filter(k=>all.includes(k));all.forEach((k,i)=>{if(o.includes(k))return;const prev=all.slice(0,i).reverse().find(x=>o.includes(x));o.splice(prev?o.indexOf(prev)+1:0,0,k);});
  return {o,h:new Set(((p&&p.h)||[]).filter(k=>all.includes(k)))};}

/* ---- text size ---- */
const UI_TEXT=[["sm","Smaller",.9],["","Normal",1],["lg","Bigger",1.1],["xl","Biggest",1.22]];
function uiText(){const t=UI_TEXT.find(x=>x[0]===(UI.text||""))||UI_TEXT[1];document.documentElement.style.fontSize=t[2]===1?"":(t[2]*100)+"%";}

/* ---- main tabs and sub-tabs ---- */
let UI_NAVED=false,UI_BOOT=true;
{const _sn=setNav;setNav=function(){UI_NAVED=true;return _sn.apply(this,arguments);};}
// the sub-tab bar and League's section icons are drawn by their own code; put their buttons in the user's order afterwards
// (a hidden sub-tab still shows while it's the one open, e.g. from a "Go to Trades" banner)
function uiSubDom(){const p=UI.subs&&UI.subs[nav];
  document.querySelectorAll("#subtabs, #heroWrap .licons").forEach(box=>{const bs=[...box.querySelectorAll(":scope>[data-sub]")];if(!bs.length)return;
    const keys=bs.map(b=>b.dataset.sub),{o,h}=uiOrder(p,keys),by=Object.fromEntries(bs.map(b=>[b.dataset.sub,b]));
    if(o.join()!==keys.join())o.forEach(k=>box.appendChild(by[k]));bs.forEach(b=>b.classList.toggle("uihide",h.has(b.dataset.sub)&&b.dataset.sub!==SUB[nav]));});}
{const _rh=renderHero;renderHero=function(){const r=_rh.apply(this,arguments);uiSubDom();return r;};}
function uiTabs(){const nv=$("#mainnav");if(!nv)return;if(!UI_DEF)UI_DEF=[...nv.querySelectorAll("[data-nav]")].map(b=>b.dataset.nav);
  const {o,h}=uiOrder(UI.tabs,UI_DEF),bs=Object.fromEntries([...nv.querySelectorAll("[data-nav]")].map(b=>[b.dataset.nav,b]));
  let changed=false;const now=[...nv.querySelectorAll("[data-nav]")].map(b=>b.dataset.nav).join();if(now!==o.join()){o.forEach(k=>bs[k]&&nv.appendChild(bs[k]));changed=true;}
  o.forEach(k=>bs[k]&&bs[k].classList.toggle("uihide",h.has(k)&&k!==nav));
  if(changed)nv.querySelector(".arppill")&&dispatchEvent(new Event("resize"));}
// the first tab that isn't hidden (My Team if they're all hidden)
const uiFirstTab=()=>{const {o,h}=uiOrder(UI.tabs,UI_DEF||NAVS);return o.find(k=>!h.has(k)&&!(k==="draft"&&typeof draftHidden==="function"&&draftHidden()))||"team";};
{const _rc=renderChrome;renderChrome=function(){uiSync();
  if(UI_BOOT&&L){UI_BOOT=false;const hid=uiOrder(UI.tabs,UI_DEF||NAVS).h;if(UI.start&&NAVS.includes(UI.start)&&!UI_NAVED)nav=UI.start;else if(hid.has(nav)&&!UI_NAVED)nav=uiFirstTab();
    const sp=UI.subs&&UI.subs[nav];if(sp&&SUBTABS[nav]){const {o,h}=uiOrder(sp,SUBTABS[nav].map(x=>x[0]));if(h.has(SUB[nav])){const f=o.find(k=>!h.has(k));if(f)SUB[nav]=f;}}}
  const r=_rc.apply(this,arguments);uiTabs();uiSubDom();return r;};}
{const _ss=saveSession;saveSession=function(s){_ss(s);if(uiSync()){UI_BOOT=true;if(!s)uiEditOff(true);if(L)try{render();}catch(e){}}};}

/* ---- page cards: every titled card in the page body can move up or down or hide ---- */
const uiScope=()=>{const sub=(typeof SUB==="object"&&SUB[nav])||(nav==="players"&&typeof APV!=="undefined"?APV:"")||"";return `${nav}/${sub}`;};
function uiCardTitle(u){const t=u.querySelector(".teamhead .tn, .phead h2, :scope>h2, :scope>h3");if(!t)return "";const c=t.cloneNode(true);c.querySelectorAll(".mgr,.uitb,button").forEach(x=>x.remove());return c.textContent.replace(/\s+/g," ").trim();}
// a key that survives the week number or team changing: team names and numbers are blanked
function uiCardKey(title){let s=title;Object.values(typeof TEAMS==="object"?TEAMS:{}).map(T=>T&&T.name).filter(Boolean).sort((a,b)=>b.length-a.length).forEach(n=>{s=s.split(n).join("@");});
  return s.replace(/\d+/g,"#").replace(/\s*·\s*Oct.*$|\s*·\s*(Nov|Dec|Jan|Feb|Mar|Apr).*$/,"").replace(/\s+/g," ").trim().toLowerCase();}
function uiUnits(){const box=$("#rosters");if(!box)return [];const seen={};
  return [...box.children].map(e=>{if(e.classList.contains("uiempty"))return null;const ti=uiCardTitle(e);if(!ti)return null;let k=uiCardKey(ti);seen[k]=(seen[k]||0)+1;if(seen[k]>1)k+="~"+seen[k];e.dataset.uik=k;e._uiTitle=ti;return e;}).filter(Boolean);}
let UI_BUSY=false,UI_OBS=null;
function uiCards(){const box=$("#rosters");if(!box||UI_BUSY)return;UI_BUSY=true;
  try{const us=uiUnits(),keys=us.map(u=>u.dataset.uik),p=UI.cards&&UI.cards[uiScope()];
    box.classList.toggle("uimany",us.length>1);
    const {o,h}=uiOrder(p,keys);
    if(o.join()!==keys.join()){const marks=us.map(u=>{const m=document.createComment("");u.before(m);return m;});const by=Object.fromEntries(us.map(u=>[u.dataset.uik,u]));
      o.forEach((k,i)=>marks[i].after(by[k]));marks.forEach(m=>m.remove());}
    us.forEach(u=>u.classList.toggle("uihid",h.has(u.dataset.uik)));
    box.querySelector(":scope>.uiempty")?.remove();
    if(us.length&&us.every(u=>h.has(u.dataset.uik))&&!document.body.classList.contains("uiedit"))box.insertAdjacentHTML("beforeend",`<p class="uiempty muted">You hid every card on this page. <button class="btn sm" data-uiedit>Edit this page</button></p>`);
    if(document.body.classList.contains("uiedit"))uiTools(us,o,h);}
  finally{UI_OBS&&UI_OBS.takeRecords();UI_BUSY=false;}}
function uiTools(us,o,h){const by=Object.fromEntries(us.map(u=>[u.dataset.uik,u])),n=o.length;
  o.forEach((k,i)=>{const u=by[k];let tb=u.querySelector(":scope>.uitb");if(!tb){tb=document.createElement("div");tb.className="uitb";u.prepend(tb);}
    const hid=h.has(k),nm=esc(u._uiTitle||"card");
    tb.innerHTML=`<span class="uitn">${hid?"Hidden · ":""}${i+1} of ${n}</span><button data-uimv="-1" data-uik="${esc(k)}" aria-label="Move ${nm} up"${i?"":" disabled"}>↑</button><button data-uimv="1" data-uik="${esc(k)}" aria-label="Move ${nm} down"${i<n-1?"":" disabled"}>↓</button><button class="uihb" data-uihide="${esc(k)}" aria-pressed="${hid}">${hid?"Show":"Hide"}</button>`;});}
function uiObserve(){const box=$("#rosters");if(!box||UI_OBS)return;UI_OBS=new MutationObserver(()=>{if(!UI_BUSY)uiCards();});UI_OBS.observe(box,{childList:true});uiCards();}
addEventListener("DOMContentLoaded",uiObserve);
{const _r=render;render=function(){const x=_r.apply(this,arguments);uiCards();uiEditBar();return x;};}
// move a card and slide the others into place
function uiSetCards(fn){const us=uiUnits(),keys=us.map(u=>u.dataset.uik),sc=uiScope(),{o,h}=uiOrder(UI.cards&&UI.cards[sc],keys);fn(o,h);
  const before=new Map(us.map(u=>[u,u.getBoundingClientRect().top]));
  UI={...UI,cards:{...(UI.cards||{}),[sc]:{o,h:[...h]}}};uiSave();uiCards();
  if(!matchMedia("(prefers-reduced-motion:reduce)").matches)us.forEach(u=>{const d=before.get(u)-u.getBoundingClientRect().top;if(!d)return;u.animate([{transform:`translateY(${d}px)`},{transform:"none"}],{duration:260,easing:"cubic-bezier(.2,.8,.2,1)"});});}

/* ---- edit mode for the page ---- */
function uiEditOn(){if(!prefKey())return toast("Log in to arrange the page. It's saved for your team.");
  const us=uiUnits();if(us.length<2){toast("This page has one card, so there's nothing to move. Use ✎ Customize for tabs.");return;}
  document.body.classList.add("uiedit");uiCards();uiEditBar();window.scrollTo({top:Math.max(0,us[0].getBoundingClientRect().top+scrollY-120),behavior:"smooth"});}
function uiEditOff(quiet){if(!document.body.classList.contains("uiedit"))return;document.body.classList.remove("uiedit");document.querySelectorAll(".uitb").forEach(x=>x.remove());uiCards();uiEditBar();if(!quiet)toast("Page saved");}
function uiEditBar(){let b=$("#uiEditBar");const on=document.body.classList.contains("uiedit");
  if(on&&uiUnits().length<2){uiEditOff(true);return;}
  if(!on){if(b)b.hidden=true;return;}
  if(!b){b=document.createElement("div");b.id="uiEditBar";b.className="uieditbar";b.setAttribute("role","region");b.setAttribute("aria-label","Editing this page");document.body.appendChild(b);}
  const sc=uiScope(),has=!!(UI.cards&&UI.cards[sc]),pg=UI_NAMES[nav]||"";
  const st=(SUBTABS[nav]||[]).find(x=>x[0]===SUB[nav]);
  b.innerHTML=`<span class="uiebt"><b>Editing ${esc(pg)}${st&&SUBTABS[nav].length>1?` › ${esc(st[1])}`:""}</b><span>Move cards with ↑ ↓, or hide them</span></span><button class="btn ghost sm" data-uicardreset${has?"":" disabled"}>Reset page</button><button class="btn sm" data-uidone>Done</button>`;b.hidden=false;}
addEventListener("keydown",e=>{if(e.key==="Escape"&&document.body.classList.contains("uiedit")&&!document.querySelector("dialog[open]"))uiEditOff();});

/* ---- the Customize sheet ---- */
let UI_SUBTAB="";
function uiSheet(){
  const who=prefKey(),dis=who?"":" disabled";if(!UI_DEF)uiTabs();
  const list=(id,keys,lab,h,extra)=>`<ul class="collist${who?"":" ro"}" data-uilist="${id}">${keys.map((k,i)=>`<li class="colrow${h.has(k)?" off":""}" data-ck="${esc(k)}"><span class="colh" aria-hidden="true">⠿</span><label><input type="checkbox" data-uishow="${id}:${esc(k)}"${h.has(k)?"":" checked"}${dis}><span>${esc(lab(k))}${extra?extra(k):""}</span></label><button class="colmv" data-uimove="${id}:${esc(k)}:-1" aria-label="Move ${esc(lab(k))} up"${i&&who?"":" disabled"}>▲</button><button class="colmv" data-uimove="${id}:${esc(k)}:1" aria-label="Move ${esc(lab(k))} down"${i<keys.length-1&&who?"":" disabled"}>▼</button></li>`).join("")}</ul>`;
  const T=uiOrder(UI.tabs,UI_DEF||NAVS);
  const subNavs=Object.keys(SUBTABS).filter(n=>SUBTABS[n].length>1).sort((a,b)=>T.o.indexOf(a)-T.o.indexOf(b));
  if(!subNavs.includes(UI_SUBTAB))UI_SUBTAB=subNavs.includes(nav)?nav:subNavs[0];
  const sl=SUBTABS[UI_SUBTAB].filter(([k])=>k!=="setup"||isCommish()),S=uiOrder(UI.subs&&UI.subs[UI_SUBTAB],sl.map(x=>x[0]));
  const nCards=Object.keys(UI.cards||{}).length,one=uiUnits().length>1;
  const html=`<div class="uisx">
    ${who?"":`<p class="dsnote"><b>Log in to customize the app.</b> Your layout is saved for your team and follows you to any device.</p>`}
    <h3>Tabs</h3><p class="muted dsnote">Untick a tab to hide it from the tab bar. Drag ⠿ or use ▲ ▼ to change the order: top of the list = first tab.${PHONE()?" Fewer tabs gives each one more room on the bottom bar.":""}</p>
    ${list("tabs",T.o,k=>UI_NAMES[k]||k,T.h,k=>k==="draft"&&typeof draftHidden==="function"&&draftHidden()?' <small class="muted">(shows during the draft)</small>':"")}
    <h3>Open the app on</h3><div class="tabs sm dsrow uistart" role="group" aria-label="Open the app on"><button data-uistart=""${dis} aria-selected="${!UI.start}">Last tab I used</button>${T.o.filter(k=>!T.h.has(k)&&k!=="draft").map(k=>`<button data-uistart="${k}"${dis} aria-selected="${UI.start===k}">${esc(UI_NAMES[k]||k)}</button>`).join("")}</div>
    <h3>Sub-tabs</h3><div class="tabs sm dsrow" role="group" aria-label="Which tab's sub-tabs">${subNavs.map(n=>`<button data-uisubtab="${n}" aria-selected="${UI_SUBTAB===n}">${esc(UI_NAMES[n]||n)}</button>`).join("")}</div>
    ${list("sub:"+UI_SUBTAB,S.o,k=>(sl.find(x=>x[0]===k)||[k,k])[1],S.h)}
    <h3>Text size</h3><div class="tabs sm dsrow" role="group" aria-label="Text size">${UI_TEXT.map(([k,l])=>`<button data-uitext="${k}"${dis} aria-selected="${(UI.text||"")===k}">${l}</button>`).join("")}</div>
    <h3>Cards on each page</h3><p class="muted dsnote">Rearrange or hide the cards on a page: open the page, tap ✎, then <b>Edit this page</b>. ${nCards?`You've arranged ${nCards} page${nCards>1?"s":""}.`:""}</p>
    <div class="row uibtns"><button class="btn sm" data-uiedit${who&&one?"":" disabled"}>Edit this page (${esc(UI_NAMES[nav]||"")})</button><button class="btn ghost sm" data-uiresetcards${who&&nCards?"":" disabled"}>Reset all pages</button></div>
    ${who?`<p class="muted dsnote">Saved for ${who==="commish"?"the commissioner login":esc(teamName(tnum(who)))}, on every device you log in on. Colors, theme and layout are under ◐ Display; stat columns under the ⚙ on each table.</p>`:""}
    <div class="sheetacts"><button class="btn ghost" data-uireset${who&&Object.keys(UI).length?"":" disabled"}>Reset everything</button><button class="btn" data-sheet="close">Done</button></div></div>`;
  if(sheet().open&&$("#sheetBody .uisx")){const sc=$("#sheetBody").scrollTop;$("#sheetBody").innerHTML=html;$("#sheetBody").scrollTop=sc;}else openSheet("Customize",html);}
function uiSetList(id,o,h){if(id==="tabs"){if(o.length-h.size<1)return toast("Keep at least one tab");UI={...UI,tabs:{o,h:[...h]}};if(UI.start&&h.has(UI.start))UI.start="";}
  else{const n=id.slice(4);if(o.length-h.size<1)return toast("Keep at least one sub-tab");UI={...UI,subs:{...(UI.subs||{}),[n]:{o,h:[...h]}}};
    if(n===nav&&h.has(SUB[nav])){const f=o.find(k=>!h.has(k));if(f)SUB[nav]=f;}}
  uiSave();if(id==="tabs"&&uiOrder(UI.tabs,UI_DEF).h.has(nav))nav=uiFirstTab();try{render();}catch(e){}uiSheet();}
function uiListState(id){if(id==="tabs")return uiOrder(UI.tabs,UI_DEF||NAVS);const n=id.slice(4);return uiOrder(UI.subs&&UI.subs[n],SUBTABS[n].filter(([k])=>k!=="setup"||isCommish()).map(x=>x[0]));}
document.addEventListener("click",e=>{
  let b=e.target.closest("[data-uiedit]");if(b){if(sheet().open)sheet().close();uiEditOn();return;}
  b=e.target.closest("[data-uidone]");if(b){uiEditOff();return;}
  b=e.target.closest("[data-uimv]");if(b){const k=b.dataset.uik,d=+b.dataset.uimv;uiSetCards((o)=>{const i=o.indexOf(k),j=i+d;if(i<0||j<0||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];});
    requestAnimationFrame(()=>{const nb=document.querySelector(`.uitb [data-uimv="${d}"][data-uik="${CSS.escape(k)}"]`);(nb&&!nb.disabled?nb:document.querySelector(`.uitb [data-uimv="${-d}"][data-uik="${CSS.escape(k)}"]`))?.focus({preventScroll:true});
      const u=document.querySelector(`#rosters>[data-uik="${CSS.escape(k)}"]`);u&&u.scrollIntoView({block:"nearest",behavior:"smooth"});});return;}
  b=e.target.closest("[data-uihide]");if(b){const k=b.dataset.uihide;uiSetCards((o,h)=>{if(h.has(k))h.delete(k);else h.add(k);});return;}
  b=e.target.closest("[data-uicardreset]");if(b){const c={...(UI.cards||{})};delete c[uiScope()];UI={...UI,cards:c};uiSave();uiCards();uiEditBar();toast("Page back to the default");return;}
  if(!e.target.closest(".uisx"))return;
  b=e.target.closest("[data-uimove]");if(b){const v=b.dataset.uimove,c2=v.lastIndexOf(":"),d=v.slice(c2+1),r=v.slice(0,c2),c1=r.lastIndexOf(":"),id=r.slice(0,c1),k=r.slice(c1+1);const s=uiListState(id),i=s.o.indexOf(k),j=i+ +d;if(i<0||j<0||j>=s.o.length)return;[s.o[i],s.o[j]]=[s.o[j],s.o[i]];uiSetList(id,s.o,s.h);
    requestAnimationFrame(()=>$(`#sheetBody [data-uimove="${CSS.escape(b.dataset.uimove)}"]`)?.focus());return;}
  b=e.target.closest("[data-uisubtab]");if(b){UI_SUBTAB=b.dataset.uisubtab;uiSheet();return;}
  b=e.target.closest("[data-uistart]");if(b){UI={...UI,start:b.dataset.uistart};uiSave();uiSheet();return;}
  b=e.target.closest("[data-uitext]");if(b){UI={...UI,text:b.dataset.uitext};uiSave();uiText();uiSheet();return;}
  b=e.target.closest("[data-uiresetcards]");if(b){UI={...UI,cards:{}};uiSave();uiCards();uiSheet();toast("Every page is back to the default");return;}
  b=e.target.closest("[data-uireset]");if(b){if(!confirm("Put tabs, sub-tabs, start tab, text size and every page's cards back to the default? Your theme, colors and columns stay."))return;UI={};uiSave();uiText();try{render();}catch(x){}uiSheet();toast("Back to the default layout");}
},true);
document.addEventListener("change",e=>{const x=e.target.closest("[data-uishow]");if(!x)return;const v=x.dataset.uishow,c=v.lastIndexOf(":"),id=v.slice(0,c),k=v.slice(c+1),s=uiListState(id);
  if(x.checked)s.h.delete(k);else s.h.add(k);if(s.o.length-s.h.size<1){x.checked=true;return toast(id==="tabs"?"Keep at least one tab":"Keep at least one sub-tab");}uiSetList(id,s.o,s.h);});
// drag ⠿ to move (mouse or finger)
let UIDRAG=null;
document.addEventListener("pointerdown",e=>{const hd=e.target.closest(".uisx .colh");if(!hd||!prefKey())return;const li=hd.closest(".colrow");e.preventDefault();UIDRAG={li,id:e.pointerId};li.classList.add("drag");try{hd.setPointerCapture(e.pointerId);}catch(x){}});
document.addEventListener("pointermove",e=>{if(!UIDRAG||e.pointerId!==UIDRAG.id)return;e.preventDefault();const ul=UIDRAG.li.parentNode;
  const over=[...ul.children].find(r=>{if(r===UIDRAG.li)return false;const b=r.getBoundingClientRect();return e.clientY>=b.top&&e.clientY<=b.bottom;});
  if(!over)return;const b=over.getBoundingClientRect();if(e.clientY<b.top+b.height/2)ul.insertBefore(UIDRAG.li,over);else over.after(UIDRAG.li);});
const uiDrop=e=>{if(!UIDRAG||e.pointerId!==UIDRAG.id)return;const ul=UIDRAG.li.parentNode;UIDRAG.li.classList.remove("drag");UIDRAG=null;const id=ul.dataset.uilist,s=uiListState(id);uiSetList(id,[...ul.children].map(r=>r.dataset.ck),s.h);};
document.addEventListener("pointerup",uiDrop);document.addEventListener("pointercancel",uiDrop);

// the ✎ button next to ◐ Display, and a way in from Display too
{const t=$("#themeBtn");if(t){const b=document.createElement("button");b.id="uiBtn";b.className="hbtn";b.title="Customize: tabs, cards and text size";b.setAttribute("aria-label",b.title);b.textContent="✎";b.onclick=uiSheet;t.after(b);}}
{const _ds=displaySheet;displaySheet=function(){_ds.apply(this,arguments);const a=$("#sheetBody .sheetacts");if(a)a.insertAdjacentHTML("beforebegin",`<h3>Customize</h3><p class="muted dsnote">Reorder or hide tabs, rearrange each page's cards and change the text size. <button class="btn sm" data-uiopen>✎ Customize</button></p>`);};
  $("#themeBtn").onclick=displaySheet;}
document.addEventListener("click",e=>{if(e.target.closest("[data-uiopen]"))uiSheet();});
uiSync();

{const s=document.createElement("style");s.textContent=`
.mainnav button.uihide,[data-sub].uihide{display:none!important}
#rosters>.uihid{display:none!important}
.uiempty{text-align:center;padding:30px 10px}
.uisx h3{margin-top:18px}
.uisx .collist{max-width:420px}
.uistart{flex-wrap:wrap}
.uibtns{gap:8px;flex-wrap:wrap}
body.uiedit #rosters>[data-uik]{position:relative;outline:2px dashed color-mix(in srgb,var(--accent) 55%,transparent);outline-offset:3px;border-radius:var(--r2,12px)}
body.uiedit #rosters>[data-uik]>:not(.uitb){pointer-events:none;user-select:none;-webkit-user-select:none}
body.uiedit #rosters>.uihid{display:block!important}
body.uiedit #rosters>.uihid>:not(.uitb){max-height:120px;overflow:hidden;opacity:.4;filter:grayscale(1)}
.uitb{position:sticky;top:calc(var(--barh,0px) + 6px);z-index:30;display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:6px;margin:0 0 -50px auto;width:max-content;max-width:100%;background:var(--accent);color:var(--on-accent,#fff);border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.22)}
.uitb .uitn{font-size:.78rem;font-weight:700;padding:0 6px;white-space:nowrap}
.uitb button{all:unset;cursor:pointer;min-width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;border-radius:9px;background:rgba(255,255,255,.2);font-weight:800;font-size:1.05rem}
.uitb button.uihb{font-size:.8rem;padding:0 10px}
.uitb button:hover,.uitb button:focus-visible{background:rgba(255,255,255,.34);outline:2px solid #fff;outline-offset:-2px}
.uitb button:disabled{opacity:.35;cursor:default;background:rgba(255,255,255,.1);outline:0}
body.uiedit #rosters>.uihid>.uitb{background:var(--muted)}
.uieditbar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom));z-index:1200;display:flex;align-items:center;gap:8px;padding:8px 8px 8px 16px;border-radius:16px;background:var(--surface);color:var(--ink);border:2px solid var(--accent);box-shadow:0 10px 30px rgba(0,0,0,.3);width:max-content;max-width:calc(100vw - 24px);box-sizing:border-box}
.uieditbar .uiebt{display:flex;flex-direction:column;line-height:1.2;margin-right:6px;min-width:0}
.uieditbar .uiebt span{font-size:.78rem;color:var(--muted)}
body.uiedit .chatfab,body.uiedit .chatdock{display:none!important}
@media (max-width:640px){
  body:not(.duow) .bar #uiBtn{display:none!important}
  .uieditbar{bottom:calc(var(--tabh,64px) + 12px + env(safe-area-inset-bottom));padding-left:12px}
  .uieditbar .uiebt span{display:none}
  .uitb{margin-bottom:-48px}
}
body.fold:not(.duow) .bar #uiBtn,body.duow #uiBtn{display:none!important}
body.fold:not(.duow) .uieditbar{bottom:calc(var(--tabh,64px) + 12px + env(safe-area-inset-bottom))}
`;document.head.appendChild(s);}
