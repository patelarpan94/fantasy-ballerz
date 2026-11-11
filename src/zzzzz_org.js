/* ============================================================================
   2.79 (2026-11-11). Arp approved the "New Era + dashboard: organizing proposal"
   doc ("go"). New Era + goes from 30 tiles to 16 in 6 sections ordered by when
   you act: Tonight, Pickups, Your opponent, Next week, Trades, The season.
   - Merged tiles with tabs: Opponent (Moves, Forecast, Scout), Pickup alerts
     (Injuries, Role changes, Opportunity), Protect your ratios (Tonight,
     Close out). The tip-off countdown is a line inside the Matchup arena.
   - Jump chips under the arena; section titles carry to-do counts.
   - Week-aware: Next week moves up under Tonight on the matchup's last 3 days,
     and Tonight folds itself once the day's last game has tipped off.
   Every old tile stays in + Add widget.
   ============================================================================ */
const ORG_LS="dfOrgTab";
let ORG_TAB=(()=>{try{return JSON.parse(localStorage.getItem(ORG_LS)||"{}")||{};}catch(e){return {};}})();
const orgSaveTab=()=>{try{localStorage.setItem(ORG_LS,JSON.stringify(ORG_TAB));}catch(e){}};
const orgLate=()=>{const i=DAYS.indexOf(TODAY);return i>=0&&i>=DAYS.length-3;};
const orgNow=()=>typeof dwkMode!=="function"||dwkMode()==="now";
const orgSafe=(f,d)=>{try{return f();}catch(e){return d;}};

// a tile made of other tiles, one tab at a time
function orgTabs(key,w,T,tabs,def){const live=tabs.filter(t=>DW[t.k]&&(!t.ok||t.ok()));if(!live.length)return dashEmpty("Nothing to show right now.");
  let on=ORG_TAB[key];if(!live.some(t=>t.id===on))on=def&&live.some(t=>t.id===def)?def:live[0].id;
  const cur=live.find(t=>t.id===on);let body;try{body=DW[cur.k].view({...w,k:cur.k,o:w.o||{}},T,true);}catch(e){body=dashEmpty("This part couldn't load right now.");}
  return `<div class="og-tabs" role="tablist" aria-label="${esc(DW[key].name)}">${live.map(t=>{const n=t.n?orgSafe(t.n,0):0;
      return `<button role="tab" data-ogtab="${key}" data-ogv="${t.id}" aria-selected="${t.id===on}">${esc(t.l)}${n?` <span class="og-n">${n}</span>`:""}</button>`;}).join("")}</div>
    <div class="og-body dk-in-${esc(cur.k)}">${body}</div>`;}
document.addEventListener("click",e=>{const b=e.target.closest("[data-ogtab]");if(!b)return;e.stopPropagation();ORG_TAB={...ORG_TAB,[b.dataset.ogtab]:b.dataset.ogv};orgSaveTab();dashDraw();},true);

// ---- counts that drive the tabs and section badges ----
const orgFresh=()=>orgSafe(()=>{const seen=new Set(wireSeen());return dWire().filter(s=>!seen.has(wireKey(s))&&s.bens.some(b=>!b.own)).length;},0);
const orgRoles=()=>orgSafe(()=>wnRoles().length,0);
const orgOpps=()=>orgSafe(()=>dOppRadar().filter(s=>s.bens.some(b=>!b.own)).length,0);
const orgFix=T=>orgSafe(()=>dashAlerts(T).filter(a=>!(a.go&&a.go[0]==="dash")).length,0)+orgSafe(()=>{const r=wnRatio(T);return r?r.out.length:0;},0);

DW.ox={name:"Opponent",desc:"Everything about this week's opponent in one tile: the moves they made, the moves they're likely to make, and a scouting report.",s:"f",
  view(w,T){const now=orgNow();return orgTabs("ox",w,T,[{id:"mv",l:"Moves",k:"ow"},{id:"fc",l:"Forecast",k:"of",ok:()=>now},{id:"sc",l:"Scout",k:"op",ok:()=>now}],"mv");}};
DW.pa={name:"Pickup alerts",desc:"One feed for who to grab: new injuries and the teammates who gain, free agents whose minutes just jumped, and starters out whose backups produce more.",s:"w",
  view(w,T){const f=orgFresh();return orgTabs("pa",w,T,[{id:"in",l:"Injuries",k:"fw",n:orgFresh},{id:"rc",l:"Role changes",k:"rc",n:orgRoles},{id:"op",l:"Opportunity",k:"or",n:orgOpps}],f?"in":undefined);}};
DW.pr={name:"Protect your ratios",desc:"Who to sit tonight to protect FG% or FT%, and from Friday which categories are safe, gone or still open.",s:"f",
  view(w,T){return orgTabs("pr",w,T,[{id:"tn",l:"Tonight",k:"rg",n:()=>{const r=wnRatio(T);return r?r.out.length:0;}},{id:"co",l:"Close out",k:"cl"}],orgLate()?"co":"tn");}};

// ---- Matchup arena: the tip-off countdown as one line ----
function orgCd(T){const now=Date.now();let next=null;
  for(const sp of [TODAY,TODAY+1,TODAY+2]){TEAMS[T].P.filter(p=>startedOn(p,sp)||sp>TODAY).forEach(p=>{const tip=dTip(sp,p.t);if(tip&&tip>now&&(!next||tip<next.tip))next={tip,p,sp};});if(next)break;}
  const mine=TEAMS[T].P.filter(p=>gameOn(p.t,TODAY)&&startedOn(p,TODAY)).length;
  return `<p class="og-cd"><span aria-hidden="true">⏱</span>${next?`<span>${esc(dashLast(next.p.n))} tips off ${next.sp===TODAY?"today":esc(dow(next.sp))} in <b class="num" data-dtick="${next.tip}">--:--:--</b></span>`:`<span>No more tip-offs for your players in the next 2 days</span>`}<small class="muted">${mine} of your starters play today</small></p>`;}
{const _v=DW.xa.view;DW.xa.view=function(w,T){const h=_v.apply(this,arguments);if(!nepOn()||!orgNow()||!dOpp(T)||dashW().some(x=>x.k==="cd"))return h;return h+orgSafe(()=>orgCd(T),"");};}

// ---- Jump chips ----
const ORG_SEC={tn:"Tonight",pk:"Pickups",op:"Opponent",nw:"Next week",tr:"Trades",sn:"Season"};
function orgSecs(){const out=[];dashW().forEach(w=>{if(w.k==="hd")out.push({id:w.id,t:String((w.o&&w.o.t)||"Section"),sec:w.o&&w.o.sec});});return out;}
function orgBadge(sec,T){if(!orgNow())return "";if(sec==="tn"){const n=orgFix(T);return n?`${n} to fix`:"";}if(sec==="pk"){const n=orgFresh();return n?`${n} new`:"";}return "";}
DW.jc={name:"Jump to",desc:"A row of chips that scrolls to each section of the board, with a count when a section needs you.",s:"f",
  view(w,T){const s=orgSecs();if(s.length<2)return "";
    return `<nav class="og-jc" aria-label="Jump to a section">${s.map(x=>{const b=orgBadge(x.sec,T);return `<button data-ddjump="${esc(x.id)}">${esc(x.sec&&ORG_SEC[x.sec]||x.t)}${b?` <span class="og-n">${esc(b.split(" ")[0])}</span>`:""}</button>`;}).join("")}</nav>`;}};

// chips scroll a little further so the sticky row doesn't cover the section title
document.addEventListener("click",e=>{const b=e.target.closest(".og-jc [data-ddjump]");if(!b)return;e.preventDefault();e.stopPropagation();
  const t=document.querySelector(`#dgrid>.dtile[data-dw="${CSS.escape(b.dataset.ddjump)}"]`);if(!t)return;
  let n=t.nextElementSibling;while(n&&!n.classList.contains("dk-hd")){n.classList.add("in");n=n.nextElementSibling;}t.classList.add("in");
  const bar=b.closest(".dtile"),off=(bar?bar.getBoundingClientRect().height:0)+16;
  scrollTo({top:Math.max(0,t.getBoundingClientRect().top+scrollY-off),behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth"});},true);

// the chip for the section on screen lights up and slides into view
let ORG_ACT="";
function orgSpy(){const bar=document.querySelector("#dgrid>.dtile.dk-jc");if(!bar||!nepOn())return;const lim=bar.getBoundingClientRect().bottom+40;let act="";
  document.querySelectorAll("#dgrid>.dtile.dk-hd[data-dw]").forEach(t=>{if(t.getBoundingClientRect().top<lim)act=t.dataset.dw;});
  if(act===ORG_ACT&&bar.querySelector(".og-jc button.on"))return;ORG_ACT=act;bar.querySelectorAll("[data-ddjump]").forEach(b=>{const on=b.dataset.ddjump===act;b.classList.toggle("on",on);
    if(on){const n=b.parentNode;n.scrollTo({left:Math.max(0,b.offsetLeft-n.clientWidth/2+b.clientWidth/2),behavior:"smooth"});}});}
{let raf=0;addEventListener("scroll",()=>{if(raf||nav!=="dash")return;raf=requestAnimationFrame(()=>{raf=0;try{orgSpy();}catch(e){}});},{passive:true});}

// ---- the layout ----
const OH=(sec,t,sub)=>["hd","f",{t,sub,sec}];
NEP_DEF.splice(0,NEP_DEF.length,
  ["xa","f"],["kp","f"],["jc","f"],
  OH("tn","Tonight","Set the lineup before tip-off"),["tl","w"],["otl","w"],["pr","f"],
  OH("pk","Pickups","Decide adds and drops"),["pl","f"],["pa","w"],["is","w"],
  OH("op","Your opponent","What they did and what they'll do"),["ox","f"],
  OH("nw","Next week","Line up Monday's pickups"),["nx","f"],
  OH("tr","Trades","Make the roster better for the season"),["tg","f"],["sb","w"],["id","w"],
  OH("sn","The season","Track the playoff race"),["sv","f"],["po","w"],["ps","w"],["ls","f"]);
NEP_VER=10;

// ---- week-aware order: Next week moves up under Tonight on the last 3 days ----
function orgMove(ws){const at=s=>ws.findIndex(w=>w.k==="hd"&&w.o&&w.o.sec===s);const a=at("nw"),t=at("tn");if(a<0||t<0||a<t)return ws;
  let e=a+1;while(e<ws.length&&ws[e].k!=="hd")e++;const blk=ws.slice(a,e),rest=ws.slice(0,a).concat(ws.slice(e));
  let i=rest.findIndex(w=>w.k==="hd"&&w.o&&w.o.sec==="tn")+1;while(i<rest.length&&rest[i].k!=="hd")i++;rest.splice(i,0,...blk);return rest;}
{const _dv=dashView;dashView=function(){if(!nepOn()||DASH_EDIT||!orgNow()||!orgLate()||!UI.dash)return _dv.apply(this,arguments);
  const keep=UI;try{const bs=dashBoards().map(b=>b.id===NEP_ID&&Array.isArray(b.w)?{...b,w:orgMove(b.w)}:b);UI={...UI,dash:{...UI.dash,boards:bs}};return _dv.apply(this,arguments);}finally{UI=keep;}};}

// fix: with a stage theme the board starts <div data-nst=.. class="dash ..">, so the other-matchup class never landed and
// today-only tiles showed on past and future matchups
{const _dv=dashView;dashView=function(){const h=_dv.apply(this,arguments);try{if(!L||DASH_EDIT||h.includes("dwk-off"))return h;const m=dwkMode();if(m==="now")return h;
  return h.replace(/(<div[^>]*\bclass=")dash\b/,`$1dash dwk-off${m==="past"?" dwk-past":""}`);}catch(e){return h;}};}

// ---- Tonight folds itself after the day's last game has tipped off (tap Show to open it again today) ----
const ORG_OPEN_LS="dfOrgOpen";
const orgOpened=()=>{try{return localStorage.getItem(ORG_OPEN_LS)===String(TODAY);}catch(e){return false;}};
function orgDayDone(){const ts=Object.keys(SCHED).map(t=>orgSafe(()=>dTip(TODAY,t),0)).filter(Boolean);return ts.length>0&&Date.now()>Math.max(...ts);}
const orgTonightId=()=>{const w=dashW().find(x=>x.k==="hd"&&x.o&&x.o.sec==="tn");return w&&w.id;};
const orgAutoFold=()=>nepOn()&&orgNow()&&!orgOpened()&&orgDayDone();
{const _fa=dFoldApply;dFoldApply=function(){const id=orgAutoFold()&&orgTonightId();if(!id||!UI.dash)return _fa.apply(this,arguments);
  const keep=UI,c=dashCur(),all={...(UI.dash.fold||{})};all[c]={...(all[c]||{}),[id]:1};try{UI={...UI,dash:{...UI.dash,fold:all}};return _fa.apply(this,arguments);}finally{UI=keep;}};}
// on window so it runs before the fold toggle on document
addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-dfold]");if(!b||nav!=="dash"||!orgAutoFold()||b.dataset.dfold!==orgTonightId())return;
  const real=((UI.dash&&UI.dash.fold)||{})[dashCur()]||{};if(real[b.dataset.dfold])return;
  e.stopPropagation();e.stopImmediatePropagation();try{localStorage.setItem(ORG_OPEN_LS,String(TODAY));}catch(x){}dFoldApply();},true);

// ---- section badges + half-width pairs on computers ----
function orgAfter(){if(!nepOn()||DASH_EDIT)return;const g=$("#dgrid");if(!g)return;const T=dashT();ORG_ACT="";try{orgSpy();}catch(e){}
  orgSecs().forEach(s=>{const t=g.querySelector(`.dtile.dk-hd[data-dw="${CSS.escape(s.id)}"] .dth h3`);if(!t)return;const b=s.sec?orgBadge(s.sec,T):"";let el=t.querySelector(".og-bd");
    if(!b){if(el)el.remove();return;}if(!el){el=document.createElement("span");el.className="og-bd";t.appendChild(el);}el.textContent=b;});
  const tn=orgTonightId();if(tn){const h=g.querySelector(`.dtile.dk-hd[data-dw="${CSS.escape(tn)}"]`);if(h){let n=h.querySelector(".og-auto");const on=orgAutoFold()&&h.classList.contains("folded");
    if(on&&!n){n=document.createElement("p");n.className="og-auto dhds muted";n.textContent="Today's games have all tipped off, so this section is folded until tomorrow.";h.querySelector(".dbody")?.appendChild(n);}else if(!on&&n)n.remove();}}}
{const _rr=renderRosters;renderRosters=function(){const r=_rr.apply(this,arguments);if(nav==="dash")try{orgAfter();}catch(e){}return r;};}
{const _fa=dFoldApply;dFoldApply=function(){const r=_fa.apply(this,arguments);try{orgAfter();}catch(e){}return r;};}
const ORG_PAIRS=[["pa","is"],["sb","id"],["po","ps"]];
{const _np=nepPack;nepPack=function(){const r=_np.apply(this,arguments);const g=$("#dgrid");if(!g||!g.classList.contains("npack")||g.classList.contains("dduo"))return r;
  const nc=+g.style.getPropertyValue("--nc")||0;if(nc<4)return r;const ts=[...g.children].filter(t=>t.classList.contains("dtile")&&!t.classList.contains("dfolded"));
  ts.forEach(t=>{if(t.classList.contains("ogh")){t.classList.remove("ogh");t.style.gridColumn="";}});
  for(let i=0;i+1<ts.length;i++){const a=ts[i],b=ts[i+1];if(ORG_PAIRS.some(([x,y])=>a.classList.contains("dk-"+x)&&b.classList.contains("dk-"+y))){a.classList.add("ogh");b.classList.add("ogh");a.style.gridColumn=b.style.gridColumn=`span ${nc/2}`;i++;}}
  return r;};}

// ---- other matchups: today-only merged tiles step aside ----
["pa","pr","jc"].forEach(k=>{try{DWK_NOW.add(k);}catch(e){}});
{const s=document.createElement("style");s.textContent=`.dash.dwk-off .dtile.dk-pa,.dash.dwk-off .dtile.dk-pr,.dash.dwk-off .dtile.dk-jc{display:none!important}
.og-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}
.og-tabs button{font:inherit;font-size:.78rem;font-weight:700;padding:5px 12px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.og-tabs button[aria-selected="true"]{background:var(--accent);border-color:var(--accent);color:#fff}
.og-n{min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:9px;background:var(--loss,#d32f2f);color:#fff;font-size:.66rem;font-weight:800;line-height:18px;text-align:center}
.og-tabs button[aria-selected="true"] .og-n{background:#fff;color:var(--accent)}
.og-cd{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:12px 0 0;padding:8px 12px;border-radius:12px;border:1px solid var(--line);font-size:.85rem}
.og-cd small{margin-left:auto}.og-cd b{font-variant-numeric:tabular-nums}
#dgrid>.dtile.dk-jc{position:sticky!important;top:6px;z-index:5;overflow-x:auto;padding:8px 10px!important;background:color-mix(in srgb,var(--surface) 97%,transparent);backdrop-filter:blur(8px)}
.dtile.dk-jc .dth{display:none}
.og-jc{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}.og-jc::-webkit-scrollbar{display:none}
.og-jc button{flex:none;font:inherit;font-size:.8rem;font-weight:700;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.og-jc button:hover{border-color:var(--accent)}.og-jc button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.og-bd{margin-left:10px;font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:2px 8px;border-radius:999px;background:var(--loss,#d32f2f);color:#fff;vertical-align:3px}
body.ddrail .dtile.dk-jc{display:none!important}
`;document.head.appendChild(s);}
