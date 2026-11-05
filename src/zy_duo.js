/* ============================================================================
   DASHBOARD ON THE iPHONE DUO (2.52, Arp 2026-11-05: "for the duo ui, we need to
   optimise the dashboard").
   Two-pane (unfolded, held wide): the right rail was half empty on the dashboard
   while the left side scrolled ~9,000px. Now the rail carries
   - the dashboard's own controls (board chips, Edit/Share, Live line, alerts),
     so the widgets start at the top of the left pane
   - a live score card (now and projected, every category) that stays on screen
     while the hero scrolls away
   - a section list (Today, Win the week, ...) that jumps the left pane and
     shows which section you're in
   Any unfolded Duo (two-pane or upright): half-width widgets stack beside each
   other instead of leaving gaps, like the computer layout (nepPack).
   ============================================================================ */
const dDuo=()=>typeof duoOn==="function"&&duoOn()&&nav==="dash"&&!!L;
let DDR_HTML="",DDR_ACT="";
function dDuoScore(){
  const T=dashT(),O=TEAMS[T]?dOpp(T):0;if(!T||!O)return "";
  let a,b;try{a=fcProj(T);b=fcProj(O);}catch(e){return "";}
  const r=h2h(a.now,b.now),pr=h2h(a.fin,b.fin),f=(v,c)=>c[1]==="pct"?pct(v):Math.round(v),rec=x=>`${x[0]}-${x[1]}${x[2]?`-${x[2]}`:""}`;
  const cells=CATS.map(c=>{const x=val(a.now,c),y=val(b.now,c),px=val(a.fin,c),py=val(b.fin,c),
      l=Math.abs(x-y)<1e-9?"":x>y?"me":"op",pl=Math.abs(px-py)<1e-9?"":px>py?"me":"op";
    return `<div class="ddc ${l}${pl&&pl!==l?" flip":""}" title="${c[0]}: now ${f(x,c)} to ${f(y,c)}, projected ${f(px,c)} to ${f(py,c)}"><b>${c[0]}</b><span>${f(x,c)}<i>·</i>${f(y,c)}</span></div>`;}).join("");
  return `<section class="ddsc" data-dgo="matchup"><div class="ddsh"><span class="hav me xs">${esc(tmInit(T))}</span><b>${rec(r)}</b><span class="muted">now · proj <b>${rec(pr)}</b></span><span class="hav op xs">${esc(tmInit(O))}</span></div><div class="ddcg">${cells}</div></section>`;}
// the board's section titles, each with how many widgets sit under it
function dDuoSecs(){
  const g=$("#dgrid");if(!g)return [];const out=[];let s=null;
  [...g.children].forEach(t=>{if(!t.classList.contains("dtile")||!t.dataset.dw)return;
    if(t.classList.contains("dk-hd")){const h=t.querySelector(".dth h3");s={id:t.dataset.dw,t:(h?h.textContent:"Section").replace(/^\s*\d+\s*/,"").trim()||"Section",n:0,f:t.classList.contains("folded")};out.push(s);}
    else if(s)s.n++;});
  return out;}
function dDuoRail(){
  const rail=$("#rail");let box=$("#dDuoRail");
  if(!dDuo()||!rail){if(box)box.remove();DDR_HTML="";document.body.classList.remove("ddrail");return;}
  const d=document.querySelector("#rosters .dash");if(!d)return;
  const q=s=>d.querySelector(":scope>"+s),acts=d.querySelector(".dhead .dacts"),bo=q(".dboards"),al=q(".dalerts"),note=q(".dnote");
  const secs=DASH_EDIT?[]:dDuoSecs();
  // board chips scroll sideways; Share sits with Edit so it never gets cut off
  let chips="",share="";if(bo){const c=bo.cloneNode(true),sh=c.querySelector("[data-dshare]");if(sh){share=sh.outerHTML;sh.remove();}chips=c.innerHTML;}
  const html=`<div class="ddtop"><div class="ddrow">${bo?`<div class="dboards">${chips}</div>`:""}<div class="ddacts">${share}${acts?acts.innerHTML:""}</div></div>${DASH_EDIT&&note?`<p class="dnote">${note.innerHTML}</p>`:""}</div>
    ${al&&!d.classList.contains("hasgp")?`<ul class="dalerts" role="list">${al.innerHTML}</ul>`:""}
    ${DASH_EDIT?"":dDuoScore()}
    ${secs.length>1?`<nav class="ddsec" aria-label="Jump to a section"><h4>Jump to<button data-ddjump="top" aria-label="Back to the top">↑ Top</button></h4><div class="ddsg">${secs.map(s=>`<button data-ddjump="${esc(s.id)}"${s.f?' class="ddf"':""}><span>${esc(s.t)}</span><small>${s.f?"hidden":s.n}</small></button>`).join("")}</div></nav>`:""}`;
  if(!box){box=document.createElement("div");box.id="dDuoRail";box.className="ddr";}
  const sb=$("#subbar"),at=sb&&sb.parentNode===rail?sb:null;
  if(box.parentNode!==rail||(at&&box.previousElementSibling!==at))at?at.after(box):rail.insertBefore(box,rail.firstChild);
  if(html!==DDR_HTML){box.innerHTML=html;DDR_HTML=html;DDR_ACT="";}
  document.body.classList.add("ddrail");dDuoSpy();}
// which section is on screen: the last title above the upper third of the left pane
function dDuoSpy(){const box=$("#dDuoRail");if(!box||!dDuo())return;const secs=[...document.querySelectorAll("#dgrid>.dtile.dk-hd[data-dw]")];
  let act=secs.length?secs[0].dataset.dw:"";const lim=innerHeight*.35;secs.forEach(t=>{if(t.getBoundingClientRect().top<lim)act=t.dataset.dw;});
  if(scrollY<40)act=secs.length?secs[0].dataset.dw:"";
  if(act===DDR_ACT)return;DDR_ACT=act;box.querySelectorAll("[data-ddjump]").forEach(b=>b.classList.toggle("on",b.dataset.ddjump===act));}
{let raf=0;addEventListener("scroll",()=>{if(raf||!dDuo())return;raf=requestAnimationFrame(()=>{raf=0;dDuoSpy();});},{passive:true});}
document.addEventListener("click",e=>{const b=e.target.closest("[data-ddjump]");if(!b)return;e.preventDefault();
  const sm=matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth";
  if(b.dataset.ddjump==="top"){scrollTo({top:0,behavior:sm});return;}
  const t=document.querySelector(`#dgrid>.dtile[data-dw="${CSS.escape(b.dataset.ddjump)}"]`);if(!t)return;
  // the tiles under a section fade in as they scroll into view; show them now so the jump lands on real content
  let n=t.nextElementSibling;while(n&&!n.classList.contains("dk-hd")){n.classList.add("in");n=n.nextElementSibling;}t.classList.add("in");
  scrollTo({top:Math.max(0,t.getBoundingClientRect().top+scrollY-8),behavior:sm});});
{const _rr=renderRosters;renderRosters=function(){const r=_rr.apply(this,arguments);try{dDuoRail();}catch(e){}return r;};}
{const _pr=placeRail;placeRail=function(){_pr.apply(this,arguments);try{dDuoRail();}catch(e){}};}
// folding a section from its title changes the list's counts
{const _fa=dFoldApply;dFoldApply=function(){const r=_fa.apply(this,arguments);try{if(dDuo())dDuoRail();}catch(e){}return r;};}

// unfolded Duo (either way up): pack half-width widgets beside each other. Four columns, so S = half and W/F = full;
// Today's lineup and Their lineup stay full width here (each would be too narrow at half the left pane).
{const _np=nepPack;nepPack=function(){const r=_np.apply(this,arguments);const g=$("#dgrid");if(!g)return r;
  const on=nav==="dash"&&!DASH_EDIT&&!DASH_DRAG&&document.body.classList.contains("fold")&&innerWidth>640&&g.clientWidth>=480;
  g.classList.toggle("dfpack",on);
  if(!on){[...g.children].forEach(t=>{t.style.order="";t.classList.remove("dsolo");});if(!g.classList.contains("npack")){g.querySelectorAll(".dtile[data-dw]").forEach(t=>t.style.gridRowEnd="");if(DFP_RO){DFP_RO.disconnect();DFP_RO=null;}}return r;}
  g.classList.add("npack");g.style.setProperty("--nc",4);
  const ts=[...g.querySelectorAll(".dtile[data-dw]")];ts.forEach(t=>{t.classList.remove("dpl","dpr","dsolo");t.style.gridColumn="";});
  // half-width widgets go in pairs: a lone one borrows the next half-width widget from the same section (never across a
  // section title), and one with no partner at all stretches to full width instead of leaving half the row empty
  const isS=t=>t.classList.contains("sz-s")&&!t.classList.contains("dk-hd")&&!t.classList.contains("dfolded");
  let ord=0,sec=[];const flush=()=>{const left=sec.slice();while(left.length){const t=left.shift();t.style.order=ord++;
      if(!isS(t))continue;
      if(left.length&&isS(left[0])){const u=left.shift();u.style.order=ord++;continue;}
      const j=left.findIndex(isS);if(j>=0){const u=left.splice(j,1)[0];u.style.order=ord++;}else t.classList.add("dsolo");}
    sec=[];};
  [...g.children].forEach(t=>{if(!t.classList.contains("dtile")){t.style.order=9999;return;}if(t.classList.contains("dk-hd")){flush();t.style.order=ord++;}else sec.push(t);});flush();
  const fit=t=>{const h=t.getBoundingClientRect().height;t.style.gridRowEnd=h?`span ${Math.ceil((h+12)/4)}`:"";};
  ts.forEach(fit);
  if("ResizeObserver" in window){if(DFP_RO)DFP_RO.disconnect();DFP_RO=new ResizeObserver(es=>es.forEach(e=>fit(e.target)));ts.forEach(t=>DFP_RO.observe(t));}
  return r;};}
let DFP_RO=null;
DKEEP.push("dfpack","dsolo");

{const s=document.createElement("style");s.textContent=`
/* packed grid on the unfolded Duo */
body.fold .dgrid.npack.dfpack,body.fold:not(.duow) .dgrid.npack.dfpack{grid-template-columns:repeat(4,minmax(0,1fr));column-gap:12px}
body.fold .dgrid.npack.dfpack>.dtile{margin-bottom:12px}
body.fold .dgrid.npack.dfpack>.dtile.sz-s{grid-column:span 2}
body.fold .dgrid.npack.dfpack>.dtile.sz-w,body.fold .dgrid.npack.dfpack>.dtile.sz-f,body.fold .dgrid.npack.dfpack>.dtile.dk-hd,body.fold .dgrid.npack.dfpack>.dtile.dsolo{grid-column:1/-1}
/* two-pane: the dashboard's controls live in the rail */
body.duow.ddrail .dash>.dboards,body.duow.ddrail .dash>.dalerts,body.duow.ddrail .dash>.dnote,body.duow.ddrail .dash .dhead .dacts{display:none!important}
body.duow.ddrail .dash .dhead{margin-bottom:-4px}
body.duow.ddrail .dash .nep-title{font-size:2.1rem}
.ddr{display:flex;flex-direction:column;gap:8px}
.ddtop{display:flex;flex-direction:column;gap:6px}
.ddrow{display:flex;align-items:center;gap:6px}
.ddrow .dboards{flex:1;min-width:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;gap:4px}.ddrow .dboards::-webkit-scrollbar{display:none}
.ddrow .dboards .dbc{padding:5px 9px;font-size:.74rem;white-space:nowrap;flex:none}
.ddrow .dboards .btn{padding:4px 8px;font-size:.72rem;flex:none}
.ddrow .dboards .dbsp{display:none}
.ddacts{display:flex;gap:4px;flex:none}.ddacts:empty{display:none}.ddacts .btn{padding:5px 9px;font-size:.74rem}
.ddtop .dnote{margin:0;font-size:.72rem}
.ddr .dalerts li{font-size:.76rem;padding:6px 8px;flex-wrap:wrap;gap:6px}
.ddsc{padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--surface);cursor:pointer}
.ddsh{display:flex;align-items:center;gap:6px;margin-bottom:6px}.ddsh>b{font-family:var(--f-display);font-size:1.15rem;font-variant-numeric:tabular-nums}
.ddsh .muted{flex:1;font-size:.7rem}.ddsh .muted b{color:var(--ink)}
.ddcg{display:grid;grid-template-columns:repeat(4,1fr);gap:3px}
.ddc{display:flex;flex-direction:column;align-items:center;padding:3px 1px;border-radius:7px;background:var(--chip);font-variant-numeric:tabular-nums;line-height:1.2;min-width:0;border:1px solid transparent}
.ddc b{font-size:.58rem;letter-spacing:.04em;color:var(--muted)}
.ddc span{font-size:.68rem;font-weight:700;white-space:nowrap}.ddc span i{font-style:normal;color:var(--muted);margin:0 2px}
.ddc.me{background:color-mix(in srgb,var(--accent) 16%,var(--chip))}.ddc.me span{color:var(--accent)}.ddc.op{background:color-mix(in srgb,#c2410c 14%,var(--chip))}
.ddc.flip{border-color:#d4a017}
.ddsec{padding:6px 8px 8px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.ddsec h4{display:flex;align-items:center;justify-content:space-between;margin:0 2px 5px;font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.ddsec h4 button{font:inherit;font-size:.62rem;letter-spacing:.04em;border:0;background:transparent;color:var(--muted);cursor:pointer;padding:2px 4px}
.ddsg{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.ddsg button{display:flex;align-items:center;justify-content:space-between;gap:4px;font:inherit;font-size:.76rem;font-weight:600;padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink);cursor:pointer;text-align:left;min-width:0}
.ddsg button span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ddsg button small{font-size:.66rem;font-weight:500;color:var(--muted);flex:none}
.ddsg button.on{background:var(--accent-wash);border-color:var(--accent);color:var(--accent)}
.ddsg button.ddf span{opacity:.6}
`;document.head.appendChild(s);}
