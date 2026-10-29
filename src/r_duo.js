
/* ============================================================================
   TWO-PANE EXTRAS (1.30, Arp 2026-10-24): on the unfolded Duo the right rail
   also holds a live mini scoreboard on My Team, player cards (docked, not a
   pop-up) with what adding the player does to this matchup, and Matchup shows
   both rosters side by side when a team is picked.
   ============================================================================ */
const duoOn=()=>document.body.classList.contains("duow");
// ---- 1. mini scoreboard under the team card: now, then projected by the end of the matchup
function miniBoard(){
  const me=cur,op=M.opp;if(!TEAMS[me]||!op||!TEAMS[op])return "";
  const a=fcProj(me),b=fcProj(op),r=h2h(a.now,b.now),pr=h2h(a.fin,b.fin);
  const f=(v,c)=>c[1]==="pct"?pct(v):Math.round(v);
  const rows=CATS.map(c=>{const x=val(a.now,c),y=val(b.now,c),px=val(a.fin,c),py=val(b.fin,c),l=Math.abs(x-y)<1e-9?"":x>y?"me":"op",pl=Math.abs(px-py)<1e-9?"":px>py?"me":"op";
    return `<tr><td class="nm">${c[0]}</td><td class="num${l==="me"?" ld":""}">${f(x,c)}<small class="${pl==="me"?"ld":""}">${f(px,c)}</small></td><td class="num${l==="op"?" ld":""}">${f(y,c)}<small class="${pl==="op"?"ld":""}">${f(py,c)}</small></td></tr>`;}).join("");
  return `<section class="panel miniboard"><div class="mbhead"><b>${r[0]}-${r[1]}${r[2]?`-${r[2]}`:""}</b><span class="muted">now · proj ${pr[0]}-${pr[1]}${pr[2]?`-${pr[2]}`:""}</span></div>
    <table class="mbt"><thead><tr><th></th><th class="num"><span class="hav me xs">${esc(tmInit(me))}</span></th><th class="num"><span class="hav op xs">${esc(tmInit(op))}</span></th></tr></thead><tbody>${rows}</tbody></table>
    <p class="foot-note">Big number is now, small is projected at the end of the matchup with your current lineups.</p></section>`;}
{const _rh=renderHero;renderHero=function(){_rh.apply(this,arguments);const el=$("#heroWrap");if(!el||!duoOn()||nav!=="team"||!L)return;const h=miniBoard();if(h){el.insertAdjacentHTML("beforeend",h);el.hidden=false;}};}
// ---- 2. player card docked in the rail: a plain (non-modal) dialog, so the left side stays usable
let DOCK=false;
{const real=HTMLDialogElement.prototype.close;
 openSheet=function(title,html){const d=sheet();
   if(DOCK){if(d.open&&!d.classList.contains("dock"))real.call(d);d.classList.add("dock");$("#sheetTitle").textContent=title;$("#sheetBody").innerHTML=html;if(!d.open)d.show();$("#sheetBody").scrollTop=0;return;}
   if(d.open&&d.classList.contains("dock"))real.call(d);d.classList.remove("dock");$("#sheetTitle").textContent=title;$("#sheetBody").innerHTML=html;d.showModal();};
 sheet().addEventListener("close",()=>sheet().classList.remove("dock"));
 addEventListener("resize",()=>setTimeout(()=>{const d=sheet();if(d.open&&d.classList.contains("dock")&&!duoOn())real.call(d);},200));}
// ---- 4. what this player adds to your team's projected categories this matchup
function addImpact(n){
  const T=TEAMS[cur]?cur:0,o=ownerNow(n);if(!T||o===T||!DIR[n])return "";
  const pg=pgLine(DIR[n].pj),p=mkP(n);if(!pg)return "";
  const st=INJ[n]||"ACTIVE",left=st==="OUT"?[]:DAYS.filter(sp=>upcoming(p.t,sp)&&gameOn(p.t,sp));
  if(!left.length)return `<h3>${o?"If you traded for him":"If you add him"} · this matchup</h3><p class="muted imsum">${st==="OUT"?"He's out":"He has no games left"} this matchup, so he wouldn't change your categories until next week.</p>`;
  const a=fcProj(T),op=M.opp&&TEAMS[M.opp]?fcProj(M.opp):null,w=a.fin.map((v,i)=>v+(pg[i]||0)*left.length);
  const f=(v,c)=>c[1]==="pct"?pct(v):v.toFixed(0);
  const rows=CATS.map(c=>{const x=val(a.fin,c),y=val(w,c),z=op?val(op.fin,c):null,d=y-x,up=d>0;
    const was=z==null?null:x>z,now=z==null?null:y>z,flip=z!=null&&was!==now;
    const dt=Math.abs(d)<(c[1]==="pct"?.0005:.5)?"–":(d>0?"+":"")+(c[1]==="pct"?pct(Math.abs(d)).replace(/^/,d<0?"−":""):d.toFixed(0));
    return `<tr class="${flip?(now?"flipw":"flipl"):""}"><td class="nm">${c[0]}</td><td class="num">${f(x,c)}</td><td class="num${Math.abs(d)>1e-9?(up?" okc":" bad"):""}">${f(y,c)}</td><td class="num muted">${dt}</td>${op?`<td class="num">${f(z,c)}</td>`:""}</tr>`;}).join("");
  const r0=op?h2h(a.fin,op.fin):null,r1=op?h2h(w,op.fin):null;
  const lab=o?"If you traded for him":"If you add him";
  return `<h3>${lab} · this matchup</h3><p class="muted imsum">${left.length} game${left.length===1?"":"s"} left this matchup${st==="OUT"?" (he's out)":""}, if he starts every one.${r0?` Projected result <b>${r0[0]}-${r0[1]}${r0[2]?`-${r0[2]}`:""}</b> → <b>${r1[0]}-${r1[1]}${r1[2]?`-${r1[2]}`:""}</b>.`:""}</p>
    <div class="scroll"><table class="lg imtab"><thead><tr><th class="nm">Cat</th><th class="num">Now</th><th class="num">With him</th><th class="num">±</th>${op?`<th class="num">${esc(tmInit(M.opp))}</th>`:""}</tr></thead><tbody>${rows}</tbody></table></div>`;}
{const _pc=playerCard;playerCard=function(n){DOCK=duoOn();try{_pc(n);}finally{DOCK=false;}
  if(!sheet().classList.contains("dock"))return;const ov=$("#sheetBody [data-pane=\"ov\"]");const h=addImpact(n);if(ov&&h)ov.insertAdjacentHTML("afterbegin",h);};}
// ---- 5. (2.15, Arp 2026-10-29) the rail carries each page's controls: a slimmer header (league name with the
// Display, Release notes and Help icons), Matchup's score card, view switch and Advanced toggle, Players' filters,
// and My Team's starters line. Moved pieces are tagged .railx and swapped for the fresh ones on every render.
function duoTidy(){
  const wrap=document.querySelector("body>.bar>.wrap"),lg=$("#lgName"),ref=document.querySelector("body>.bar .refresh"),rail=$("#rail");if(!wrap||!lg||!ref)return;
  let top=wrap.querySelector(".rtop");const icons=["#themeBtn","#relBtn","#helpBtn"].map(s=>$(s)).filter(Boolean);
  if(!duoOn()){if(top){top.before(lg);icons.forEach(b=>ref.appendChild(b));top.remove();}
    document.querySelectorAll(".railx").forEach(e=>e.remove());return;}
  if(!top){top=document.createElement("div");top.className="rtop";wrap.insertBefore(top,wrap.firstChild);}
  if(lg.parentNode!==top)top.appendChild(lg);icons.forEach(b=>{if(b.parentNode!==top)top.appendChild(b);});
  if(!rail)return;
  // kind: m = Matchup (from #heroWrap), p = Players (from #rosters), t = My Team (from #rosters)
  const plan={m:nav==="matchup"?[["#heroWrap",[".hero",".ptscorewrap",".ptmv",".advt"]]]:[],p:nav==="players"?[["#rosters",[".apv",".wpanel",".apctl"]]]:[],t:nav==="team"?[["#rosters",[".ptline"]]]:[]};
  for(const [k,src] of Object.entries(plan)){
    const fresh=src.flatMap(([w,sels])=>{const box=$(w);return box?sels.map(s=>box.querySelector(":scope "+s)).filter(e=>e&&!e.closest("#rail")):[];});
    const old=[...rail.querySelectorAll(".railx.rx"+k)];
    if(!src.length){old.forEach(e=>e.remove());continue;}
    if(!fresh.length)continue;
    old.forEach(e=>e.remove());
    // Matchup and Players go under the page buttons (sub-tabs, search); My Team's line sits above the team card
    let at=k==="t"?null:$("#subbar");
    fresh.forEach(e=>{e.classList.add("railx","rx"+k);if(k==="t"){const h=$("#heroWrap");h&&h.parentNode===rail?rail.insertBefore(e,h):rail.appendChild(e);}else if(at&&at.parentNode===rail){at.after(e);at=e;}else rail.insertBefore(e,rail.firstChild);});}
  duoFades();}
// a table that runs past the left pane fades at the right edge until it's scrolled to the end
function duoFades(){document.querySelectorAll("main .scroll").forEach(s=>s.classList.toggle("more",duoOn()&&s.scrollWidth-s.clientWidth-s.scrollLeft>4));}
document.addEventListener("scroll",e=>{const s=e.target;if(s?.classList?.contains("scroll"))s.classList.toggle("more",duoOn()&&s.scrollWidth-s.clientWidth-s.scrollLeft>4);},true);
{const _pr=placeRail;placeRail=function(){_pr.apply(this,arguments);try{duoTidy();}catch(e){}};}
// wrapped once every file has loaded, so the tidy runs after all the other render add-ons
addEventListener("DOMContentLoaded",()=>{const _rr=renderRosters;renderRosters=function(){_rr.apply(this,arguments);if(duoOn())try{duoTidy();}catch(e){}};
  const _rh=renderHero;renderHero=function(){_rh.apply(this,arguments);if(duoOn())try{duoTidy();}catch(e){}};});
// docked player card: the per-game table turns sideways (one row per category) so all of it fits the rail
{const _pc=playerCard;playerCard=function(n){_pc.apply(this,arguments);if(!sheet().classList.contains("dock"))return;
  const t=$("#sheetBody table.pcstats");if(!t)return;const head=[...t.tHead.rows[0].cells].map(c=>c.innerHTML),rows=[...t.tBodies[0].rows].map(r=>[...r.cells].map(c=>c.innerHTML));
  t.outerHTML=`<table class="lg pcstats pcv"><thead><tr><th class="nm">${head[0]}</th>${rows.map(r=>`<th class="num">${r[0]}</th>`).join("")}</tr></thead><tbody>${head.slice(1).map((h,i)=>`<tr><td class="nm">${h}</td>${rows.map(r=>`<td class="num">${r[i+1]}</td>`).join("")}</tr>`).join("")}</tbody></table>`;};}
