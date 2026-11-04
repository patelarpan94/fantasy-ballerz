
/* ============================================================================
   PICK YOUR COLUMNS (2.25, Arp 2026-11-04: "make the stats adjustable for
   users, they can move over items as they want, an edit view gear, on all
   the pages"). Every stat table gets a ⚙ in its top-left header cell. It opens
   Columns: tick a column to show or hide it, drag ⠿ (or use ▲ ▼) to move it.
   Saved per login in prefs/<team key>.cols, so it follows the manager to any
   device. The first column (player / team) and blank tool columns stay put.
   Works on the finished table, so any table with 3+ stat headers is covered
   without changing the code that draws it.
   ============================================================================ */
var COLS={};
const colsLk=()=>{const k=typeof prefKey==="function"?prefKey():null;return k?"dfCols_"+k:null;};
function colsReadLocal(){const lk=colsLk();COLS={};if(!lk)return;try{COLS=JSON.parse(localStorage.getItem(lk)||"{}")||{};}catch(e){COLS={};}}
// SESSION is read after this file loads, so the copy for the current login is picked up on first use and on every login change
let COLS_K;const colsSync=()=>{const lk=colsLk();if(lk!==COLS_K){COLS_K=lk;colsReadLocal();}};
function colsSave(){const lk=colsLk();if(!lk)return;try{localStorage.setItem(lk,JSON.stringify(COLS));}catch(e){}if(typeof savePrefs==="function")savePrefs();}
// called by loadPrefs with the server's copy
function colsLoad(c){if(!c||typeof c!=="object")return;colsSync();COLS=c;try{const lk=colsLk();if(lk)localStorage.setItem(lk,JSON.stringify(c));}catch(e){}if(L)try{render();}catch(e){}}
const COL_STATS=()=>new Set([...(typeof CATS!=="undefined"?CATS.map(c=>String(c[0]).toUpperCase()):[]),"GP","MIN","USG%","PTS","REB","AST","STL","BLK","TO","3PM","FG%","FT%","3P%","TS%","FG","FT","FGA","FTA","3PA"]);
const COL_DAY=/^(MON|TUE|WED|THU|FRI|SAT|SUN|MO|TU|WE|TH|FR|SA|SU)\b/;
const colLabel=th=>{const c=th.cloneNode(true);c.querySelectorAll(".pvh,small,.colg,svg").forEach(x=>x.remove());return c.textContent.replace(/[↑↓▲▼]/g,"").replace(/\s+/g," ").trim();};
// the player/team column, blank tool columns (compare tick, + − ⇄), Slot and day columns never move
const colLocked=(k,i)=>(k=k.replace(/#\d+$/,""),i===0||k===""||k==="PLAYER"||k==="SLOT"||COL_DAY.test(k));
function colsInfo(t){
  if(!t.tHead||t.tHead.rows.length!==1||t.closest("dialog,#sheet,.colsx"))return null;
  const ths=[...t.tHead.rows[0].cells];if(ths.length<4||ths.some(c=>c.colSpan>1))return null;
  const st=COL_STATS(),labels=ths.map(colLabel),seen={};
  const keys=labels.map(l=>{const k=l.toUpperCase();seen[k]=(seen[k]||0)+1;return seen[k]>1?k+"#"+seen[k]:k;});
  if(keys.filter(k=>st.has(k)).length<3)return null;
  return {ths,labels,keys,lock:keys.map((k,i)=>colLocked(k,i))};}
function colsScope(t){const cls=[...t.classList].filter(c=>!["num","apph","pjt"].includes(c)).sort().join(".");
  const sub=(typeof SUB==="object"&&SUB[nav])||(nav==="players"&&typeof APV!=="undefined"?APV:"")||"";
  return `${nav}/${sub}/${cls}${PHONE()?"/ph":""}`;}
function colsTableKey(t){const sc=colsScope(t);t.dataset.cscope=sc;
  if(t.closest("section.team"))return sc;   // both rosters on Matchup share one setting
  let i=0;document.querySelectorAll("table[data-cscope]").forEach(x=>{if(x!==t&&x.dataset.cscope===sc&&(x.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING))i++;});
  return i?sc+"/"+i:sc;}
// the movable columns in the user's order (new columns the app adds later go at the end), and which are hidden
function colsOrder(key,mov){colsSync();const p=COLS[key]||{},o=(p.o||[]).filter(k=>mov.includes(k));mov.forEach(k=>{if(!o.includes(k))o.push(k);});return {o,h:new Set((p.h||[]).filter(k=>mov.includes(k)))};}
function colsApply(t){
  t.dataset.cdone="1";const I=colsInfo(t);if(!I)return;
  const key=colsTableKey(t);t.dataset.ckey=key;
  const g=document.createElement("button");g.className="colg";g.type="button";g.dataset.colg=key;g.title="Edit columns";g.setAttribute("aria-label","Edit columns");g.textContent="⚙";
  I.ths[0].prepend(g);I.ths[0].classList.add("colgh");
  const n=I.keys.length,mov=I.keys.filter((k,i)=>!I.lock[i]);t._cols={labels:I.labels,keys:I.keys,lock:I.lock};
  colsSync();if(!COLS[key])return;
  const {o,h}=colsOrder(key,mov),vis=o.filter(k=>!h.has(k)).map(k=>I.keys.indexOf(k));
  const perm=[];let v=0;for(let i=0;i<n;i++){if(I.lock[i])perm.push(i);else if(v<vis.length)perm.push(vis[v++]);}
  if(perm.length===n&&perm.every((x,i)=>x===i))return;
  const keep=new Set(perm);
  const fix=row=>{const cells=[...row.cells];
    if(cells.length===n&&cells.every(c=>c.colSpan===1)){const nw=perm.map(i=>cells[i]);cells.forEach(c=>{if(!keep.has(cells.indexOf(c)))c.remove();});nw.forEach(c=>row.appendChild(c));return;}
    let s=0;cells.forEach(c=>{const sp=c.colSpan||1;let cnt=0;for(let j=s;j<s+sp;j++)if(j>=n||keep.has(j))cnt++;s+=sp;if(!cnt)c.remove();else if(cnt!==sp)c.colSpan=cnt;});};
  [t.tHead,...t.tBodies,t.tFoot].filter(Boolean).forEach(sec=>[...sec.rows].forEach(fix));
  const cg=t.querySelector(":scope>colgroup");
  if(cg){const cs=[...cg.children];if(cs.length===n&&cs.every(c=>!c.span||c.span===1)){const nw=perm.map(i=>cs[i]);cs.forEach(c=>c.remove());nw.forEach(c=>cg.appendChild(c));
    if(/px$/.test(t.style.width)&&nw.every(c=>/px$/.test(c.style.width)))t.style.width=nw.reduce((a,c)=>a+parseFloat(c.style.width),0)+"px";}}
  const hid=n-perm.length;if(hid>0&&/px$/.test(t.style.minWidth))t.style.minWidth=Math.max(0,parseFloat(t.style.minWidth)-hid*60)+"px";
}
function colsScan(){document.querySelectorAll("table:not([data-cdone])").forEach(t=>{try{colsApply(t);}catch(e){t.dataset.cdone="1";}});}
new MutationObserver(colsScan).observe(document.documentElement,{childList:true,subtree:true});
addEventListener("DOMContentLoaded",colsScan);

/* ---- the Columns sheet ---- */
let COLED=null;
function colsTitle(t){const tn=t.closest("section")?.querySelector(".teamhead .tn, h2, h3");const x=tn?colLabel(tn):"";const pg={team:"My Team",matchup:"Matchup",players:"Players",league:"League",draft:"Draft",analytics:"Analytics",pickem:"Pick'em"}[nav]||"";return x&&x!==pg?`${pg} · ${x}`:pg;}
function colsSheet(key){
  const t=document.querySelector(`table[data-ckey="${CSS.escape(key)}"]`);if(!t||!t._cols)return;
  const C=t._cols,mov=C.keys.filter((k,i)=>!C.lock[i]),lab=k=>C.labels[C.keys.indexOf(k)]||k;
  COLED={key,mov,lab,title:colsTitle(t),fixed:C.keys.filter((k,i)=>C.lock[i]&&k).map(lab)};colsSheetDraw();}
function colsSheetDraw(){
  if(!COLED)return;const {key,mov,lab}=COLED,{o,h}=colsOrder(key,mov),who=typeof prefKey==="function"&&prefKey();
  const rows=o.map((k,i)=>`<li class="colrow${h.has(k)?" off":""}" data-ck="${esc(k)}"><span class="colh" aria-hidden="true">⠿</span><label><input type="checkbox" data-colshow="${esc(k)}"${h.has(k)?"":" checked"}${who?"":" disabled"}><span>${esc(lab(k))}</span></label><button class="colmv" data-colmv="-1" data-ck="${esc(k)}" aria-label="Move ${esc(lab(k))} left"${i&&who?"":" disabled"}>▲</button><button class="colmv" data-colmv="1" data-ck="${esc(k)}" aria-label="Move ${esc(lab(k))} right"${i<o.length-1&&who?"":" disabled"}>▼</button></li>`).join("");
  const html=`<div class="colsx"><p class="muted dsnote">${COLED.title?`<b>${esc(COLED.title)}</b>. `:""}Untick a column to hide it. Drag ⠿ or use ▲ ▼ to move it: top of the list = left side of the table.${COLED.fixed.length?` ${esc(COLED.fixed.join(", "))} stay${COLED.fixed.length>1?"":"s"} where ${COLED.fixed.length>1?"they are":"it is"}.`:""}</p>
    ${who?"":`<p class="dsnote"><b>Log in to pick your columns.</b> They're saved for your team and follow you to any device.</p>`}
    <ul class="collist${who?"":" ro"}">${rows}</ul>
    <p class="muted dsnote">${who?`Saved for ${who==="commish"?"the commissioner login":esc(teamName(tnum(who)))} for this table on ${PHONE()?"phones":"bigger screens"}, on every device you log in on.`:""}</p>
    <div class="sheetacts"><button class="btn ghost" data-colreset${who&&COLS[key]?"":" disabled"}>Reset to default</button><button class="btn" data-sheet="close">Done</button></div></div>`;
  if(sheet().open&&$("#sheetBody .colsx")){$("#sheetBody").innerHTML=html;}else openSheet("Columns",html);}
function colsSet(o,h){const {key}=COLED;COLS={...COLS,[key]:{o,h:[...h]}};colsSave();colsSheetDraw();try{render();}catch(e){}}
document.addEventListener("click",e=>{
  let b=e.target.closest("[data-colg]");if(b){e.preventDefault();e.stopPropagation();colsSheet(b.dataset.colg);return;}
  if(!COLED||!e.target.closest(".colsx"))return;
  b=e.target.closest("[data-colmv]");if(b){const {o,h}=colsOrder(COLED.key,COLED.mov),i=o.indexOf(b.dataset.ck),j=i+ +b.dataset.colmv;if(i<0||j<0||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];colsSet(o,h);
    requestAnimationFrame(()=>$(`#sheetBody [data-colmv="${b.dataset.colmv}"][data-ck="${CSS.escape(b.dataset.ck)}"]`)?.focus());return;}
  b=e.target.closest("[data-colreset]");if(b){const c={...COLS};delete c[COLED.key];COLS=c;colsSave();colsSheetDraw();try{render();}catch(x){}toast("Columns reset");}
},true);
document.addEventListener("change",e=>{const x=e.target.closest("[data-colshow]");if(!x||!COLED)return;const {o,h}=colsOrder(COLED.key,COLED.mov);
  if(x.checked)h.delete(x.dataset.colshow);else{if(o.length-h.size<=1){x.checked=true;return toast("Keep at least one column");}h.add(x.dataset.colshow);}colsSet(o,h);});
// drag ⠿ to move (mouse or finger)
let COLDRAG=null;
document.addEventListener("pointerdown",e=>{const hd=e.target.closest(".colsx .colh");if(!hd||!COLED||!(typeof prefKey==="function"&&prefKey()))return;const li=hd.closest(".colrow");
  e.preventDefault();COLDRAG={li,id:e.pointerId};li.classList.add("drag");try{hd.setPointerCapture(e.pointerId);}catch(x){}});
document.addEventListener("pointermove",e=>{if(!COLDRAG||e.pointerId!==COLDRAG.id)return;e.preventDefault();const ul=COLDRAG.li.parentNode;
  const over=[...ul.children].find(r=>{if(r===COLDRAG.li)return false;const b=r.getBoundingClientRect();return e.clientY>=b.top&&e.clientY<=b.bottom;});
  if(!over)return;const b=over.getBoundingClientRect();if(e.clientY<b.top+b.height/2)ul.insertBefore(COLDRAG.li,over);else over.after(COLDRAG.li);});
const colDrop=e=>{if(!COLDRAG||e.pointerId!==COLDRAG.id)return;const ul=COLDRAG.li.parentNode;COLDRAG.li.classList.remove("drag");COLDRAG=null;
  const o=[...ul.children].map(r=>r.dataset.ck),{h}=colsOrder(COLED.key,COLED.mov);colsSet(o,h);};
document.addEventListener("pointerup",colDrop);document.addEventListener("pointercancel",colDrop);
{const s=document.createElement("style");s.textContent=`
.colgh{white-space:nowrap}
.colg{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-right:4px;border-radius:6px;font-size:.85rem;line-height:1;color:var(--accent);opacity:.75;vertical-align:middle}
.colg:hover,.colg:focus-visible{opacity:1;background:var(--accent-wash)}
.collist{list-style:none;margin:8px 0;padding:0;display:flex;flex-direction:column;gap:3px}
.colrow{display:flex;align-items:center;gap:8px;padding:2px 6px;border:1px solid var(--line);border-radius:10px;background:var(--surface);user-select:none;-webkit-user-select:none}
.colrow.off span{color:var(--muted)}
.colrow.off label span{text-decoration:line-through}
.colrow.drag{box-shadow:0 6px 18px rgba(0,0,0,.25);border-color:var(--accent);position:relative;z-index:1}
.colrow label{flex:1;display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600}
.colrow input{width:18px;height:18px;accent-color:var(--accent)}
.colh{cursor:grab;touch-action:none;color:var(--muted);font-size:1.1rem;padding:4px 2px}
.collist.ro .colh{cursor:default;opacity:.4}
.colmv{all:unset;cursor:pointer;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;color:var(--accent);font-size:.8rem}
.colmv:hover{background:var(--accent-wash)}
.colmv:disabled{opacity:.25;cursor:default;background:none}
`;document.head.appendChild(s);}
