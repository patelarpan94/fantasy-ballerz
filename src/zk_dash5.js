/* ============================================================================
   DASHBOARD 5 (2.33, Arp 2026-11-04: "what else do i need to add to dashboard
   so entire teams can be managed from here? ... set your lineup, review your
   roster for the day" then "add and push to uat").
   Action widgets that reuse the app's own moves, so every rule still applies
   (game-time locks, pickup and roster limits, waivers, trade review):
   Today's lineup, Roster, Quick add, My claims and offers, Week ahead, and
   alerts whose Fix button does the job in place.
   ============================================================================ */
const dCanEdit=T=>typeof canEditTeam==="function"&&canEditTeam(T);
const dGameTxt=(t,sp)=>{const g=gameOn(t,sp);return g?`${g[1]?"vs":"@"} ${g[0]}${sp===TODAY&&g[2]!=null?" · "+fmtTime(g[2]):""}`:"";};
// a slot button that opens the app's own move menu for TODAY (IR included); read-only tag when you can't edit
function dSlotBtn(p,T,sp){const s=slotOn(p,sp);if(s==null)return "";const cls=`s${s}${s===12?" bench":s===13?" ir":""}`;
  if(!dCanEdit(T))return `<span class="slot ${cls}">${SLOT[s]}</span>`;const lk=locked(p,sp),on=MOVING&&MOVING.n===p.n;
  return `<button class="mvb ${cls}${on?" on":""}${lk?" lk":""}" data-move="${esc(p.n)}" data-dmsp="${sp}" ${lk?"disabled":""} aria-haspopup="dialog" aria-expanded="${on}" title="${lk?"Locked: his game has started":"Move "+esc(p.n)}">${SLOT[s]}<span class="mvi" aria-hidden="true">${lk?"🔒":"▾"}</span></button>`;}
async function dAutoSet(T,days){if(!dCanEdit(T))return toast("You can only set your own lineup.");days=days.filter(sp=>sp>=TODAY&&sp<=SEASON_END);if(!days.length)return;
  const obj={};days.forEach(sp=>obj[sp]=autoLineup(T,sp));if(await saveSnaps(T,obj))toast(days.length>1?`Lineups set for ${days.length} days`:days[0]===TODAY?"Today's lineup is set":`Lineup set for ${dow(days[0])}`);}
const dDaysLeft=()=>DAYS.filter(sp=>sp>=TODAY);

/* ---- 1. today's lineup ---- */
DW.tl={name:"Today's lineup",desc:"Set today's lineup right here: tap a slot to move a player (or put him on IR), or Auto-set. OUT starters and empty spots are highlighted.",s:"w",
  view(w,T){const sp=TODAY;if(!DAYS.includes(sp)&&sp>SEASON_END)return dashEmpty("The season is over.");
    const P=TEAMS[T].P.filter(p=>slotOn(p,sp)!=null).slice().sort((a,b)=>slotOn(a,sp)-slotOn(b,sp));
    let can=0;try{can=benchPlan(T,sp).extra||0;}catch(e){}
    const st=P.filter(p=>slotOn(p,sp)<12),play=st.filter(p=>gameOn(p.t,sp)&&p.st!=="OUT").length;
    const row=p=>{const s=slotOn(p,sp),g=gameOn(p.t,sp),bad=s<12&&g&&p.st==="OUT",idle=s<12&&!g,fill=s===12&&g&&p.st!=="OUT"&&can>0,d=p.d&&p.d[sp];
      return `<li class="${bad?"bad":fill?"fill":idle?"idle":""}${s>=12?" off":""}">${dSlotBtn(p,T,sp)}<span class="dtln"><span class="dtlnm">${dashNm(p.n)} ${stTag(p.n,p.st)}</span><small class="muted">${esc(p.t||"")}${g?" · "+esc(dGameTxt(p.t,sp)):" · no game"}</small></span>
        <span class="dtls num">${d?`${Math.round(d[K.PTS])}/${Math.round(d[K.REB])}/${Math.round(d[K.AST])}`:bad?'<b class="badc">OUT</b>':fill?'<b class="warnc">Could start</b>':""}</span></li>`;};
    return `<div class="dtlh"><span><b class="dbig num">${dCount(play)}</b> of ${st.length} starters play today${can?` · <b class="warnc">${can} open spot${can>1?"s":""} the bench could fill</b>`:""}</span>
      ${dCanEdit(T)?`<span class="row"><button class="btn sm" data-dauto="today">Auto-set today</button></span>`:""}</div>
      <ol class="dtl">${P.map(row).join("")}</ol>${dCanEdit(T)?'<p class="dsm muted">Tap a slot to move a player. Changes save right away, and slots lock at tip-off.</p>':""}`;}};

/* ---- 2. roster ---- */
DW.rr={name:"Roster",desc:"Your whole roster: status, games left this matchup, last 7 days, and Move, IR or Drop on each player.",s:"w",
  view(w,T,big){const sp=TODAY,P=TEAMS[T].P.slice().sort((a,b)=>(slotOn(a,sp)??12)-(slotOn(b,sp)??12)),ir=P.filter(p=>slotOn(p,sp)===13).length,ed=dCanEdit(T);
    const left=p=>dDaysLeft().filter(d=>gameOn(p.t,d)).length;
    return `<div class="dkpi"><span class="muted">${P.length} of ${ROSTER_MAX} spots used${ir?` · ${ir} on IR`:""}</span></div>
      <div class="drr" role="table" aria-label="Roster"><div class="drrh" role="row"><span>Slot</span><span>Player</span><span title="Games left this matchup">GL</span><span>Last 7</span>${ed?"<span></span>":""}</div>
      ${P.map(p=>{const r=recentPG(p.n,7);return `<div class="drrr" role="row">${dSlotBtn(p,T,sp)}<span class="dtln"><span class="dtlnm">${dashNm(p.n)} ${stTag(p.n,p.st)}</span><small class="muted">${esc(p.t||"")} · ${esc((p.el||[]).filter(e=>e<5).map(e=>SLOT[e]).join("/")||"")}</small></span>
        <b class="num">${left(p)}</b><span class="num dsm">${r?pra(r.pg):"–"}</span>${ed?`<button class="actb drop" data-drop="${esc(p.n)}" aria-label="Drop ${esc(p.n)}" title="Drop">−</button>`:""}</div>`;}).join("")}</div>
      ${ed?'<p class="dsm muted">Tap a slot for Move or IR. − drops a player (you confirm first).</p>':""}`;}};

/* ---- 3. quick add ---- */
DW.qa={name:"Quick add",desc:"Find any free agent and add him (pick who to drop), or put in a waiver claim. Shows the best pickups right now.",s:"s",
  view(w,T,big){const ed=dCanEdit(T);const fa=Object.values(DIR).filter(D=>!ownerNow(D.n)&&INJ[D.n]!=="OUT").map(D=>{const r=recentPG(D.n,14);return r?{D,r,z:zOf(r.pg)}:null;}).filter(Boolean).sort((a,b)=>b.z-a.z).slice(0,big?6:4);
    let left=null;try{left=pickupsLeft(T);}catch(e){}
    return `${ed?`<div class="dqa"><input id="dqaIn" list="dqaList" placeholder="Search free agents" aria-label="Search free agents" autocomplete="off"><button class="btn sm" data-dqa>Add</button></div>
      <datalist id="dqaList">${Object.values(DIR).filter(D=>!ownerNow(D.n)).map(D=>`<option value="${esc(D.n)}">${esc(D.t||"")}</option>`).join("")}</datalist>`:""}
      ${left!=null&&isFinite(left)&&ed?`<p class="dsm muted">${left} pickup${left===1?"":"s"} left ${L.addMode==="day"?"today":L.addMode==="season"?"this season":"this matchup"}</p>`:""}
      <ol class="dqal">${fa.map(x=>`<li><span>${dashNm(x.D.n)}<small class="muted">${esc(x.D.t||"")} · ${pra(x.r.pg)} · ${dDaysLeft().filter(d=>gameOn(x.D.t,d)).length} games left</small></span>${ed?`<button class="actb add" data-add="${esc(x.D.n)}" aria-label="Add ${esc(x.D.n)}" title="Add">+</button>`:""}</li>`).join("")}</ol>`;}};

/* ---- 4. my claims and offers ---- */
DW.co={name:"My claims and offers",desc:"Your waiver claims and every trade that involves you or needs your vote, with Accept, Reject, Cancel and vote buttons.",s:"s",
  view(w,T){const me=myTeamNum();let cl=[];try{cl=myClaims(T);}catch(e){}
    const tr=TXS.filter(t=>isTrade(t)&&!t.reverses&&(t.status==="proposed"||t.status==="review")&&(tnum(t.to)===T||tnum(t.from)===T||(t.status==="review"&&me===T)||isCommish()));
    if(!cl.length&&!tr.length)return `<p class="dempty okc">✓ Nothing pending. No claims or trade offers.</p>${dashGo("league","trades","Trades")}`;
    const ed=dCanEdit(T);
    return `${cl.length?`<p class="dcoh">Waiver claims</p><ol class="dcol">${cl.map(c=>`<li><span>+ ${dashNm(c.add)}${c.drop?`<small class="muted"> drop ${esc(c.drop)}</small>`:""}<br><small class="muted">runs ${esc(fmtET(nextProcess?nextProcess(c.at||Date.now()):c.at))}</small></span>${ed?`<button class="btn ghost sm" data-wcancel="${esc(c.id)}">Cancel</button>`:""}</li>`).join("")}</ol>`:""}
      ${tr.length?`<p class="dcoh">Trades</p><ol class="dcol tr">${tr.map(t=>`<li><div><b>${esc(teamName(t.from))}</b> → <b>${esc(teamName(t.to))}</b><br><small class="muted">${t.give.map(esc).join(", ")||"nothing"} for ${t.get.map(esc).join(", ")||"nothing"} · ${esc(tradeState(t))}</small></div><div class="dcoa">${typeof tradeMsgActs==="function"?tradeMsgActs(t):""}</div></li>`).join("")}</ol>`:""}`;}};

/* ---- 5. week ahead ---- */
DW.wa={name:"Week ahead",desc:"How many of your starters play each day left in the matchup, with one tap to auto-set a day or the whole rest of the week.",s:"w",
  view(w,T){const days=dDaysLeft();if(!days.length)return dashEmpty("No days left in this matchup.");const ed=dCanEdit(T),n=LINEUP.length;
    const cells=days.map((sp,i)=>{const P=TEAMS[T].P,pl=P.filter(p=>startedOn(p,sp)&&gameOn(p.t,sp)&&p.st!=="OUT").length;let can=0;try{can=benchPlan(T,sp).extra||0;}catch(e){}
      return `<div class="dwac${can?" warn":""}${sp===TODAY?" today":""}" style="--d:${i*50}ms"><span class="dwad">${sp===TODAY?"Today":dow(sp).slice(0,3)}</span><span class="dwar"><i style="--p:${(pl/n*100).toFixed(0)}%"></i></span><b class="num">${pl}<small>/${n}</small></b>
        <small class="${can?"warnc":"muted"}">${can?`+${can} possible`:"best set"}</small>${ed&&can?`<button class="btn ghost sm" data-dauto="${sp}">Set</button>`:""}</div>`;}).join("");
    const tot=days.reduce((s,sp)=>s+TEAMS[T].P.filter(p=>startedOn(p,sp)&&gameOn(p.t,sp)&&p.st!=="OUT").length,0);
    return `<div class="dtlh"><span><b class="dbig num">${dCount(tot)}</b> starter games left as set</span>${ed?`<button class="btn sm" data-dauto="week">Auto-set rest of week</button>`:""}</div><div class="dwa">${cells}</div>`;}};

// the manager default now leads with the action widgets
/* ---- section titles, so a dashboard reads in clean groups ---- */
DW.hd={name:"Section title",desc:"A heading that splits your dashboard into groups, like Today or Moves. ⚙ to rename it. Add as many as you like.",s:"f",multi:true,
  view(w){return w.o&&w.o.sub?`<p class="dhds muted">${esc(w.o.sub)}</p>`:"";},
  opts(w){return `<p class="muted dsnote">Section name</p><div class="dqa"><input id="dhdIn" maxlength="30" value="${esc((w.o&&w.o.t)||"")}" aria-label="Section name"><button class="btn sm" data-dhdsave>Save</button></div>`;}};
const H=(t,sub)=>["hd","f",{t,sub}];
// the default: grouped so a manager reads it top to bottom (Arp: "make it clean and organized")
DASH_DEF.splice(0,DASH_DEF.length,
  H("Today","Your score, your lineup and anything waiting on you"),["mu","w"],["co","s"],["tl","w"],["cd","s"],
  H("This matchup","Where each category is headed, your games left and who's hurt"),["sw","s"],["wp","w"],["wa","w"],["ij","s"],
  H("Moves","Add, drop and stream"),["qa","s"],["sm","w"],["rr","f"]);
// 2.34 (Arp: "add all the tools needed to manage a team to the default widgets to all players"):
// every login's main dashboard that was arranged by hand gets the missing team tools once, as a "Manage your team" group after My matchup
const DASH_MGMT=[["tl","w"],["co","s"],["wa","w"],["qa","s"],["rr","f"]];
function dashMgmtMigrate(){if(!prefKey()||!UI.dash||!Array.isArray(UI.dash.w)||UI.dash.mg>=1)return;
  const w=UI.dash.w.slice(),miss=DASH_MGMT.filter(([k])=>!w.some(x=>x.k===k)),id=i=>"g"+Date.now().toString(36)+Math.random().toString(36).slice(2,5)+i;
  if(miss.length){const at=w.findIndex(x=>x.k==="mu")+1;w.splice(at,0,{id:id("h"),k:"hd",s:"f",o:{t:"Manage your team"}},...miss.map(([k,s],i)=>({id:id(i),k,s,o:{}})));}
  UI={...UI,dash:{...UI.dash,w,mg:1}};uiSave();}
document.addEventListener("click",e=>{const b=e.target.closest("[data-dhdsave]");if(!b)return;const id=b.closest("[data-doptid]")?.dataset.doptid,v=($("#dhdIn").value||"").trim().slice(0,30);if(!id)return;
  dashSet(dashW().map(x=>x.id===id?{...x,o:{...x.o,t:v||"Section"}}:x));sheet().close();dashDraw();});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="dhdIn"){e.preventDefault();$("[data-dhdsave]")?.click();}});
{const _rr=renderRosters;renderRosters=function(){if(nav==="dash"&&!DASH_DRAG&&!DASH_EDIT)try{dashMgmtMigrate();}catch(e){}return _rr.apply(this,arguments);};}

/* ---- clicks ---- */
document.addEventListener("click",async e=>{let b;
  if((b=e.target.closest("#dgrid [data-move]"))&&nav==="dash"){e.stopPropagation();const T=dashT(),n=b.dataset.move,sp=+b.dataset.dmsp||TODAY;
    if(cur!==T){cur=T;try{localStorage.setItem("dfTeam",cur);}catch(x){}}
    MOVING=MOVING&&MOVING.n===n?null:{team:T,n,sp};renderRosters();renderMovePop();return;}
  if((b=e.target.closest("[data-dauto]"))&&nav==="dash"){e.stopPropagation();const T=dashT(),v=b.dataset.dauto;b.disabled=true;
    await dAutoSet(T,v==="today"?[TODAY]:v==="week"?dDaysLeft():[+v]);return;}
  if((b=e.target.closest("[data-dqa]"))){const i=$("#dqaIn"),q=String(i&&i.value||"").trim().toLowerCase(),n=Object.keys(DIR).find(x=>x.toLowerCase()===q);
    if(!n)return toast("Pick a player from the list");if(ownerNow(n))return toast(`${n} is already on a roster`);if(cur!==dashT())cur=dashT();sheetAdd(n);return;}
},true);
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="dqaIn"){e.preventDefault();$("[data-dqa]")?.click();}});

{const s=document.createElement("style");s.textContent=`
.warnc{color:#b08800}
.dtlh{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:.86rem}
.dtl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.dtl li{display:grid;grid-template-columns:78px 1fr auto;gap:10px;align-items:center;padding:5px 6px;border-radius:10px}
.dtl li.off{opacity:.78}.dtl li.bad{background:color-mix(in srgb,var(--loss,#c62828) 10%,transparent)}
.dtl li.fill{background:color-mix(in srgb,#d4a017 12%,transparent)}.dtl li.idle .dtln small{color:var(--loss,#c62828)}
.dtl li.off:first-of-type,.dtl li:not(.off)+li.off{margin-top:6px;border-top:1px dashed var(--line);padding-top:8px}
.dtln{display:flex;flex-direction:column;min-width:0;line-height:1.25}.dtlnm{display:flex;align-items:center;gap:6px;min-width:0}.dtlnm .dnm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dtls{font-size:.82rem;text-align:right}
.dtl .mvb,.drr .mvb,.dtl .slot,.drr .slot{min-width:54px;justify-content:center}
.drr{display:flex;flex-direction:column;gap:2px;font-size:.86rem}
.drrh,.drrr{display:grid;grid-template-columns:78px 1fr 34px 92px 30px;gap:8px;align-items:center;padding:4px 6px;border-radius:8px}
.drrh{font-size:.7rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.drrr:nth-child(odd){background:color-mix(in srgb,var(--chip,#eef) 55%,transparent)}
.dqa{display:flex;gap:6px}.dqa input{flex:1;min-width:0;font:inherit;padding:7px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink)}
.dqal,.dcol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.dqal li,.dcol li{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.86rem}
.dqal li>span{display:flex;flex-direction:column;min-width:0}
.dcol.tr li{flex-direction:column;align-items:stretch;padding:8px;border:1px solid var(--line);border-radius:12px}
.dcoa{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px}
.dcoh{margin:4px 0 0;font-size:.72rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.dwa{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}
.dwac{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:10px;border-radius:12px;background:var(--chip,#eef);font-size:.8rem}
.dwac.today{outline:2px solid var(--accent);outline-offset:-2px}.dwac.warn{background:color-mix(in srgb,#d4a017 14%,var(--chip,#eef))}
.dwad{font-weight:800}.dwac b{font-size:1.2rem}.dwac b small{font-size:.7rem;color:var(--muted)}
.dwar{width:100%;height:6px;border-radius:3px;background:color-mix(in srgb,var(--line) 70%,transparent);overflow:hidden}.dwar i{display:block;height:100%;width:var(--p);background:var(--accent);border-radius:3px}
.dfirst .dwac{animation:drise .5s cubic-bezier(.3,.7,.2,1) both;animation-delay:var(--d)}.dfirst .dwar i{animation:dbarin .8s cubic-bezier(.3,.7,.2,1) both}
.dtile.dk-hd{background:none!important;border:0!important;box-shadow:none!important;padding:14px 2px 0;gap:2px;backdrop-filter:none!important}
.dtile.dk-hd::before{display:none}.dtile.dk-hd .dth .dopt{display:none}
.dtile.dk-hd .dth h3{font-family:var(--f-display);font-size:1.15rem;letter-spacing:.02em;color:var(--ink);text-transform:none;display:flex;align-items:center;gap:10px;width:100%}
.dtile.dk-hd .dth{flex:1}.dtile.dk-hd .dth h3::after{content:"";flex:1;height:1px;background:var(--line)}
.dtile.dk-hd .dhds{margin:0;font-size:.82rem}.dtile.dk-hd:first-child{padding-top:0}
.dash.editing .dtile.dk-hd{border:1px dashed var(--line)!important;padding:10px}
@media (max-width:640px){.drrh,.drrr{grid-template-columns:74px 1fr 28px 30px}.drrh span:nth-child(4),.drrr>span.num{display:none}}
`;document.head.appendChild(s);}
