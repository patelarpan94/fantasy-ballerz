
/* ============================================================================
   DASHBOARD (2.29, Arp 2026-11-04: "a dashboard page where users can go to
   use custom widgets with information" + "the dashboard layout can be changed
   by dragging and dropping ... create a edit button").
   A Dashboard tab of widget tiles. Edit: drag a tile by its ⠿ bar (mouse or
   finger) or use ↑ ↓, pick Small / Wide / Full width, ⚙ for a widget's own
   options, ✕ to remove, + Add widget from the catalog. Saved per login in
   UI.dash (prefs/<key>.ui, same as Customize), so it follows the manager.
   UI.dash = {w:[{id, k:<widget kind>, s:"s"|"w"|"f", o:{...}}], watch:[names]}
   ============================================================================ */
const DW={};   // widget kinds: {name, desc, def size, multi, opts(w) -> html | null, view(w,T,big) -> html}
const DASH_DEF=[["mu","w"],["lu","s"],["tr","s"],["nw","w"],["fa","s"],["st","s"],["gm","w"],["wl","s"],["ch","s"],["sc","s",{c:""}]];
let DASH_EDIT=false,DASH_DRAG=null;
const dashW=()=>{const d=UI.dash&&Array.isArray(UI.dash.w)?UI.dash.w:null;return d||DASH_DEF.map(([k,s,o],i)=>({id:"d"+i,k,s,o:o?{...o}:{}}));};
const dashT=()=>myTeamNum()||(TEAMS[cur]?cur:0);
function dashSet(w,extra){UI={...UI,dash:{...(UI.dash||{}),...(extra||{}),...(w?{w}:{})}};uiSave();}
const dashWatch=()=>(UI.dash&&UI.dash.watch)||[];
const dashNm=n=>`<span class="dnm" role="button" tabindex="0" data-pcard="${esc(n)}">${esc(n)}</span>`;
const dashLast=n=>{const w=n.split(" ").filter(x=>!/^(Jr\.?|Sr\.?|II|III|IV)$/.test(x));return w.slice(-1)[0]||n;};
const dashGo=(nv,sub,l)=>`<button class="btn ghost sm dgo" data-dgo="${nv}${sub?":"+sub:""}">${l} ›</button>`;
const dashEmpty=t=>`<p class="dempty muted">${t}</p>`;
const recentPG=(n,days=7)=>{const d=DAYLINES[n]||{},ls=Object.entries(d).filter(([sp])=>+sp>=TODAY-days&&+sp<=TODAY).map(([,l])=>l);if(!ls.length)return null;const t=lineSum(ls);return {pg:t.map(v=>v/ls.length),g:ls.length};};
const pra=pg=>`${pg[K.PTS].toFixed(1)}/${pg[K.REB].toFixed(1)}/${pg[K.AST].toFixed(1)}`;

/* ---- 1. my matchup: score now, projected, win %, each category ---- */
DW.mu={name:"My matchup",desc:"Category score now and projected, chance to win, and who leads each category.",s:"w",
  view(w,T,big){const opp=opponentOf(T);if(!opp||!TEAMS[opp])return dashEmpty("No matchup this week.");
    const a=fcProj(T),b=fcProj(opp),p=winProb(a,b),now=h2h(a.now,b.now),pr=h2h(a.fin,b.fin),pc=Math.round(p*100);
    const cell=c=>{const x=val(a.now,c),y=val(b.now,c),f=v=>c[1]==="pct"?pct(v):Math.round(v);const r=Math.abs(x-y)<1e-9?"t":x>y?"w":"l";return `<span class="dcat ${r}" title="${esc(c[0])}: ${f(x)} vs ${f(y)}"><b>${esc(c[0])}</b><span>${f(x)}</span><span>${f(y)}</span></span>`;};
    return `<button class="dmu" data-dgo="matchup"><span class="dmt me"><span class="hav me xs">${esc(tmInit(T))}</span><b>${esc(TEAMS[T].name)}</b></span><span class="dmsc"><b class="num">${now.join("-")}</b><small>proj ${pr.join("-")}</small></span><span class="dmt op"><b>${esc(TEAMS[opp].name)}</b><span class="hav op xs">${esc(tmInit(opp))}</span></span></button>
      <div class="dwin"><span class="${pc>=50?"up":"down"}">${pc}% to win</span><span class="dbar"><i style="width:${pc}%"></i></span></div>
      ${big?`<div class="dcats">${CATS.map(cell).join("")}</div>`:`<p class="muted dsm">Leading ${now[0]} of ${CATS.length} categories · ${gamesLeft(T)} games left vs ${gamesLeft(opp)}</p>`}`;}};

/* ---- 2. lineup check for today ---- */
DW.lu={name:"Lineup check",desc:"Today's starters with a game, starters who won't play, and open spots the bench could fill.",s:"s",
  view(w,T){const sp=TODAY,P=TEAMS[T].P,st=P.filter(p=>startedOn(p,sp)),play=st.filter(p=>gameOn(p.t,sp)&&p.st!=="OUT"),idle=st.filter(p=>!gameOn(p.t,sp)||p.st==="OUT");
    let can=0;try{can=benchPlan(T,sp).extra||0;}catch(e){}
    const ok=!can;return `<div class="dlu ${ok?"ok":"warn"}"><span class="dbig num">${play.length}</span><span>starter${play.length===1?"":"s"} playing today<br><small class="muted">${gamesLeft(T)} starter games left this matchup</small></span></div>
      ${idle.length?`<p class="dsm"><b>Won't play:</b> ${idle.map(p=>`${dashNm(p.n)}${p.st==="OUT"?" <small class=\"badc\">OUT</small>":" <small class=\"muted\">no game</small>"}`).join(", ")}</p>`:""}
      <p class="dsm ${ok?"okc":"badc"}">${ok?"✓ Lineup is set for today.":`${can} bench player${can>1?"s":""} could start today.`}</p>${ok?"":dashGo("team","","Fix lineup")}`;}};

/* ---- 3. news and injuries for my players ---- */
DW.nw={name:"My players' news",desc:"Latest stories and injury notes about players on your roster.",s:"w",
  view(w,T,big){const mine=new Set(TEAMS[T].P.map(p=>p.n)),list=newsAll().filter(a=>(a.p||[]).some(n=>mine.has(n))).slice(0,big?6:3);
    const inj=TEAMS[T].P.filter(p=>p.st&&p.st!=="ACTIVE");
    return `${inj.length?`<div class="dinj">${inj.map(p=>`<span>${dashNm(dashLast(p.n))} ${stTag(p.n,p.st)}</span>`).join("")}</div>`:""}
      ${list.length?`<ol class="dnews">${list.map(a=>`<li><a href="${esc(a.u||"#")}" target="_blank" rel="noopener noreferrer">${esc(a.h)}</a><small class="muted">${esc(newsSrc(a))} · ${ago(a.at)} · ${(a.p||[]).filter(n=>mine.has(n)).slice(0,2).map(dashNm).join(", ")}</small></li>`).join("")}</ol>`:dashEmpty("No stories about your players this week.")}
      ${dashGo("news","latest","All news")}`;}};

/* ---- 4. hot free agents (last 7 days), with who plays today ---- */
DW.fa={name:"Hot free agents",desc:"The best free agents over the last 7 days. ● = plays today, good for streaming.",s:"s",
  view(w,T,big){const fa=Object.values(DIR).filter(D=>!ownerNow(D.n)).map(D=>{const r=recentPG(D.n);return r&&r.g>=2?{D,r,z:zOf(r.pg)}:null;}).filter(Boolean).sort((a,b)=>b.z-a.z).slice(0,big?8:5);
    return fa.length?`<ol class="dlist">${fa.map(x=>`<li><span>${dashNm(x.D.n)} <small class="muted">${esc(x.D.t||"")}${gameOn(x.D.t,TODAY)?' <b class="okc" title="Plays today">●</b>':""}</small></span><small class="num">${pra(x.r.pg)}</small></li>`).join("")}</ol><p class="muted dsm">Points / rebounds / assists per game, last 7 days</p>${dashGo("players","","Players")}`:dashEmpty("Not enough box scores yet.");}};

/* ---- 5. trades and waivers ---- */
DW.tr={name:"Trades and waivers",desc:"Trades waiting on you, your open offers and claims, the next waiver run and the trade deadline.",s:"s",
  view(w,T){const need=tradesNeedingMe(),me=myTeamNum(),mineOpen=me?TXS.filter(t=>isTrade(t)&&["proposed","review"].includes(t.status)&&(tnum(t.from)===me||tnum(t.to)===me)).length:0;
    let claims=0,next=0;try{claims=myClaims(T).length;next=nextProcess(Date.now());}catch(e){}
    const dl=L.trades&&L.trades.deadline||(SEASON==="2026-27"?1803056400000:0),dd=dl?Math.ceil((dl-Date.now())/864e5):null;
    const row=(b,l,c)=>`<li class="${c||""}"><b class="num">${b}</b><span>${l}</span></li>`;
    return `<ul class="dstat">${row(need,need===1?"trade needs you":"trades need you",need?"hot":"")}${row(mineOpen,"open trades with you")}${row(claims,claims===1?"waiver claim":"waiver claims")}</ul>
      ${next?`<p class="dsm muted">Next waiver run: ${esc(fmtET(next))}</p>`:""}${dd!=null?`<p class="dsm ${dd<=7&&dd>=0?"badc":"muted"}">${dd>0?`Trade deadline in ${dd} day${dd>1?"s":""}`:"Trade deadline has passed"}</p>`:""}
      ${dashGo("league","trades","Trades")}`;}};

/* ---- 6. standings and power rank ---- */
DW.st={name:"Standings",desc:"The league table with your team highlighted, plus your power ranking.",s:"s",
  view(w,T,big){const o=standOrder(),i=o.indexOf(T),show=big?o:o.slice(0,5);if(!big&&i>=5)show.push(T);
    let pw="";try{const pr=powerRows(),pi=pr.findIndex(r=>r.x===T);if(pi>=0)pw=`Power rank #${pi+1} of ${pr.length}`;}catch(e){}
    return `<ol class="dstand">${show.map(x=>`<li class="${x===T?"me":""}"><span class="num dr">${o.indexOf(x)+1}</span><span class="dtn">${esc(TEAMS[x].name)}</span><b class="num">${STAND[x].rec.join("-")}</b></li>`).join("")}</ol>${pw?`<p class="dsm muted">${pw}</p>`:""}${dashGo("league","stand","Standings")}`;}};

/* ---- 7. watchlist ---- */
DW.wl={name:"Watchlist",desc:"Players you pin: status, owner and their last 5 games. Add players with ⚙ or from any player card.",s:"s",
  view(w,T,big){const ws=dashWatch();if(!ws.length)return dashEmpty(`No players yet. ${prefKey()?"Open any player card and tap ☆ Watch, or use ⚙ here.":"Log in to keep a watchlist."}`);
    return `<ol class="dlist">${ws.slice(0,big?12:6).map(n=>{const r=recentPG(n,30),d=DAYLINES[n]||{},last=Object.keys(d).map(Number).filter(sp=>sp<=TODAY).sort((a,b)=>b-a).slice(0,5),r5=last.length?lineSum(last.map(sp=>d[sp])).map(v=>v/last.length):null,o=ownerNow(n);
      return `<li><span>${dashNm(n)} ${stTag(n)}<br><small class="muted">${esc(DIR[n]?.t||"")} · ${o?(o===T?"Your team":esc(teamName(o))):"Free agent"}</small></span><small class="num" title="Last ${last.length} games: points / rebounds / assists">${r5?pra(r5):"–"}</small></li>`;}).join("")}</ol><p class="muted dsm">Last 5 games, points / rebounds / assists</p>`;},
  opts(){const ws=dashWatch();return `<p class="muted dsnote">Add a player by name. You can also tap ☆ Watch on any player card.</p>
    <div class="row dwadd"><input id="dwIn" list="dwList" placeholder="Player name" autocomplete="off" aria-label="Player to watch"><datalist id="dwList">${Object.keys(DIR).sort().map(n=>`<option value="${esc(n)}">`).join("")}</datalist><button class="btn sm" data-dwadd>Add</button></div>
    <ul class="collist">${ws.map(n=>`<li class="colrow"><label><span>${esc(n)}</span></label><button class="colmv" data-dwdel="${esc(n)}" aria-label="Remove ${esc(n)}">✕</button></li>`).join("")}</ul>`;}};

/* ---- 8. league chat ---- */
DW.ch={name:"League chat",desc:"The latest league chat messages. Tap to open the chat.",s:"s",
  view(w,T,big){const ms=chatMsgs("league").slice(-(big?6:3)).reverse();
    return ms.length?`<ol class="dchat">${ms.map(m=>`<li><b>${esc(chatName(m.from))}</b> <small class="muted">${ago(m.at)}</small><span>${esc(String(m.text||"").slice(0,140))}</span></li>`).join("")}</ol><button class="btn ghost sm dgo" data-dchat>Open chat ›</button>`:dashEmpty(SESSION?"No messages yet.":"Log in to see the league chat.");}};

/* ---- 9. tonight's NBA games, your players marked ---- */
DW.gm={name:"Tonight's games",desc:"Today's NBA games with live scores, and which of your players are in each.",s:"w",
  view(w,T,big){const sp=TODAY,mineBy={};TEAMS[T].P.forEach(p=>{(mineBy[p.t]=mineBy[p.t]||[]).push(p);});
    const gs=Object.entries(SCHED).filter(([t,d])=>d[sp]&&d[sp][1]).map(([h,d])=>{const a=d[sp][0],lg=LIVE&&(LIVE.g[h]||LIVE.g[a]);return {h,a,tm:d[sp][2],lg,mine:[...(mineBy[a]||[]),...(mineBy[h]||[])]};})
      .sort((x,y)=>(y.mine.length>0)-(x.mine.length>0)||(x.tm??9999)-(y.tm??9999));
    if(!gs.length)return dashEmpty("No NBA games today.");
    const sh=gs.slice(0,big?12:5);
    return `<ol class="dgames">${sh.map(g=>`<li class="${g.mine.length?"mine":""}"><span class="dgm"><b>${esc(g.a)} @ ${esc(g.h)}</b><small class="${g.lg&&g.lg.s==="in"?"live":"muted"}">${g.lg?esc(liveTxt(g.lg)):esc(fmtTime(g.tm))}</small></span><small>${g.mine.length?g.mine.map(p=>`${dashNm(dashLast(p.n))}${startedOn(p,sp)?"":" <span class=\"muted\">(BE)</span>"}`).join(", "):'<span class="muted">none of yours</span>'}</small></li>`).join("")}</ol>${gs.length>sh.length?`<p class="muted dsm">+${gs.length-sh.length} more games</p>`:""}`;}};

/* ---- 10. one stat: this matchup and season, with league rank ---- */
DW.sc={name:"Stat card",desc:"Pick any category. Shows your number this matchup and this season, and your rank in the league. Add more than one.",s:"s",multi:true,
  view(w,T){const c=CATS.find(x=>x[0]===w.o.c)||CATS[0],ids=Object.keys(TEAMS).map(Number).filter(x=>TEAMS[x].P.length),f=v=>c[1]==="pct"?pct(v):Math.round(v);
    const rk=get=>{const v=get(T);return {v,r:1+ids.filter(x=>get(x)>v+1e-9).length};};
    const wk=rk(x=>val(score(x),c)),ss=rk(x=>val(STAND[x]?.vbs||ZERO(),c)),ord=n=>n+(["th","st","nd","rd"][(n%100>10&&n%100<14)?0:n%10<4?n%10:0]);
    return `<div class="dsc"><span class="dsck">${esc(c[0])}</span><div><b class="num dbig">${f(wk.v)}</b><small>this matchup · <b>${ord(wk.r)}</b> of ${ids.length}</small></div><div><b class="num">${f(ss.v)}</b><small>season · <b>${ord(ss.r)}</b> of ${ids.length}</small></div></div>`;},
  opts(w){return `<p class="muted dsnote">Which category?</p><div class="tabs sm dsrow" role="group" aria-label="Category">${CATS.map(c=>`<button data-dsccat="${esc(c[0])}" aria-selected="${(w.o.c||CATS[0][0])===c[0]}">${esc(c[0])}</button>`).join("")}</div>`;}};
const dwTitle=w=>w.k==="sc"?`${DW.sc.name} · ${(CATS.find(x=>x[0]===w.o.c)||CATS[0])[0]}`:DW[w.k].name;

/* ---- the page ---- */
function dashView(){
  if(!L)return emptyLeague();const T=dashT(),who=prefKey(),ws=dashW().filter(w=>DW[w.k]);
  if(!TEAMS[T])return dashEmpty("Pick a team at the top to see its dashboard.");
  const SZ=[["s","Small"],["w","Wide"],["f","Full"]];
  const tile=(w,i)=>{let body;const big=w.s!=="s"||PHONE();try{body=DW[w.k].view(w,T,big);}catch(e){body=dashEmpty("This widget couldn't load right now.");}
    return `<section class="dtile sz-${w.s}" data-dw="${esc(w.id)}" aria-label="${esc(dwTitle(w))}">
      ${DASH_EDIT?`<div class="dtb"><span class="dgrip" data-dgrip="${esc(w.id)}" title="Drag to move" aria-hidden="true">⠿</span><span class="dtt">${esc(dwTitle(w))}</span>
        <button data-dmv="-1" data-dwid="${esc(w.id)}" aria-label="Move ${esc(dwTitle(w))} earlier"${i?"":" disabled"}>↑</button><button data-dmv="1" data-dwid="${esc(w.id)}" aria-label="Move ${esc(dwTitle(w))} later"${i<ws.length-1?"":" disabled"}>↓</button>
        <span class="dszs" role="group" aria-label="Size">${SZ.map(([k,l])=>`<button data-dsz="${k}" data-dwid="${esc(w.id)}" aria-pressed="${w.s===k}" title="${l}">${l[0]}</button>`).join("")}</span>
        ${DW[w.k].opts?`<button data-dopt="${esc(w.id)}" aria-label="Options for ${esc(dwTitle(w))}">⚙</button>`:""}<button data-ddel="${esc(w.id)}" aria-label="Remove ${esc(dwTitle(w))}">✕</button></div>`:""}
      <div class="dth"><h3>${esc(dwTitle(w))}</h3>${!DASH_EDIT&&DW[w.k].opts&&who?`<button class="dopt" data-dopt="${esc(w.id)}" aria-label="Options for ${esc(dwTitle(w))}">⚙</button>`:""}</div><div class="dbody">${body}</div></section>`;};
  const head=`<div class="dhead"><div><h2>Dashboard</h2><span class="muted">${esc(TEAMS[T].name)}${T===myTeamNum()?"":" (picked at the top)"}</span></div><div class="row dacts">
    ${DASH_EDIT?`<button class="btn ghost sm" data-dreset>Reset</button><button class="btn sm ghost" data-dadd>+ Add widget</button><button class="btn sm" data-dedit="0">Done</button>`:`<button class="btn sm" data-dedit="1"${who?"":` disabled title="Log in to edit your dashboard"`}>✎ Edit</button>`}</div></div>
    ${DASH_EDIT?`<p class="dnote">Drag a widget by its ⠿ bar to move it${PHONE()?"":", or pick S, W or F for its width"}. ✕ removes it, ⚙ changes its options.</p>`:""}`;
  return `<div class="dash${DASH_EDIT?" editing":""}">${head}<div class="dgrid" id="dgrid">${ws.map(tile).join("")}${DASH_EDIT?`<button class="dtile dadd" data-dadd><span>+</span>Add widget</button>`:""}</div>${!who?`<p class="muted dsm">This is the default dashboard. Log in to make it your own; it's saved for your team on every device.</p>`:""}</div>`;}
{const _rr=renderRosters;renderRosters=function(){document.body.classList.toggle("navdash",nav==="dash");if(nav!=="dash")return _rr.apply(this,arguments);if(DASH_DRAG)return;const el=$("#rosters");el.dataset.view="dash";el.innerHTML=dashView();};}
const dashDraw=()=>{if(nav==="dash"&&!DASH_DRAG){const sy=scrollY;renderRosters();scrollTo(0,sy);}};

/* ---- editing ---- */
function dashMove(id,to){const w=dashW().slice(),i=w.findIndex(x=>x.id===id);if(i<0||to<0||to>=w.length)return;const [x]=w.splice(i,1);w.splice(to,0,x);dashSet(w);}
function dashCatalog(){const ws=dashW();openSheet("Add a widget",`<div class="dcatl">${Object.entries(DW).map(([k,d])=>{const has=ws.some(w=>w.k===k);return `<div class="dcatr"><div><b>${esc(d.name)}</b><span class="muted">${esc(d.desc)}</span></div><button class="btn sm${has&&!d.multi?" ghost":""}" data-daddk="${k}"${has&&!d.multi?" disabled":""}>${has&&!d.multi?"Added":"Add"}</button></div>`;}).join("")}</div><div class="sheetacts"><button class="btn" data-sheet="close">Done</button></div>`);}
function dashOpts(id){const w=dashW().find(x=>x.id===id);if(!w||!DW[w.k].opts)return;openSheet(dwTitle(w),`<div class="dopts" data-doptid="${esc(id)}">${DW[w.k].opts(w)}</div><div class="sheetacts"><button class="btn" data-sheet="close">Done</button></div>`);}
function dashWatchSet(ws){dashSet(null,{watch:ws});dashDraw();}
document.addEventListener("click",e=>{let b;
  if((b=e.target.closest("[data-dgo]"))&&!DASH_EDIT){const [n,s]=b.dataset.dgo.split(":");setNav(n,s||undefined);return;}
  if((b=e.target.closest("[data-dchat]"))){if(!CHAT_OPEN)($("#chatFab:not([hidden])")||$("#chatDock:not([hidden])"))?.click();setTimeout(()=>{try{chatOpen("league");}catch(x){}},60);return;}
  if((b=e.target.closest("[data-dedit]"))){if(!prefKey())return toast("Log in to edit your dashboard.");DASH_EDIT=b.dataset.dedit==="1";dashDraw();if(!DASH_EDIT)toast("Dashboard saved");return;}
  if(!prefKey())return;
  if((b=e.target.closest("[data-dadd]"))){dashCatalog();return;}
  if((b=e.target.closest("[data-daddk]"))){const k=b.dataset.daddk,w=dashW().slice(),id="d"+Date.now().toString(36);w.push({id,k,s:DW[k].s,o:k==="sc"?{c:(CATS[w.filter(x=>x.k==="sc").length%CATS.length]||CATS[0])[0]}:{}});dashSet(w);dashCatalog();dashDraw();toast(`${DW[k].name} added at the end`);return;}
  if((b=e.target.closest("[data-dmv]"))){const id=b.dataset.dwid,i=dashW().findIndex(x=>x.id===id);dashMove(id,i+ +b.dataset.dmv);dashDraw();requestAnimationFrame(()=>document.querySelector(`[data-dmv="${b.dataset.dmv}"][data-dwid="${CSS.escape(id)}"]:not(:disabled)`)?.focus());return;}
  if((b=e.target.closest("[data-dsz]"))){const w=dashW().map(x=>x.id===b.dataset.dwid?{...x,s:b.dataset.dsz}:x);dashSet(w);dashDraw();return;}
  if((b=e.target.closest("[data-ddel]"))){const w=dashW().filter(x=>x.id!==b.dataset.ddel);dashSet(w);dashDraw();return;}
  if((b=e.target.closest("[data-dopt]"))){dashOpts(b.dataset.dopt);return;}
  if((b=e.target.closest("[data-dreset]"))){if(!confirm("Put the dashboard back to the default widgets? Your watchlist stays."))return;const d={...(UI.dash||{})};delete d.w;UI={...UI,dash:d};uiSave();dashDraw();toast("Dashboard back to the default");return;}
  if((b=e.target.closest("[data-dsccat]"))){const id=b.closest("[data-doptid]").dataset.doptid,w=dashW().map(x=>x.id===id?{...x,o:{...x.o,c:b.dataset.dsccat}}:x);dashSet(w);dashOpts(id);dashDraw();return;}
  if((b=e.target.closest("[data-dwadd]"))){const i=$("#dwIn"),n=Object.keys(DIR).find(x=>x.toLowerCase()===String(i.value).trim().toLowerCase());if(!n)return toast("Pick a player from the list");const ws=dashWatch();if(!ws.includes(n))dashWatchSet([...ws,n]);const id=b.closest("[data-doptid]").dataset.doptid;dashOpts(id);toast(`Watching ${n}`);return;}
  if((b=e.target.closest("[data-dwdel]"))){dashWatchSet(dashWatch().filter(x=>x!==b.dataset.dwdel));const id=b.closest("[data-doptid]").dataset.doptid;dashOpts(id);return;}
  if((b=e.target.closest("[data-dwatch]"))){const n=b.dataset.dwatch,ws=dashWatch(),on=ws.includes(n);dashWatchSet(on?ws.filter(x=>x!==n):[...ws,n]);b.textContent=on?"☆ Watch":"★ Watching";b.setAttribute("aria-pressed",!on);toast(on?`Removed ${n} from your watchlist`:`Added ${n} to your watchlist`);return;}
});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="dwIn"){e.preventDefault();$("[data-dwadd]")?.click();}});

/* ---- drag and drop (mouse or finger) on the ⠿ bar ---- */
function dashDragStart(e,grip){const tile=grip.closest(".dtile");if(!tile)return;e.preventDefault();
  const r=tile.getBoundingClientRect();DASH_DRAG={tile,id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top,x:e.clientX,y:e.clientY,raf:0};
  tile.classList.add("drag");document.body.classList.add("ddragging");try{grip.setPointerCapture(e.pointerId);}catch(x){}
  const ph=document.createElement("div");ph.className=`dtile dph sz-${[...tile.classList].find(c=>c.startsWith("sz-")).slice(3)}`;ph.style.height=r.height+"px";tile.after(ph);DASH_DRAG.ph=ph;
  Object.assign(tile.style,{position:"fixed",left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px",zIndex:1300,pointerEvents:"none"});
  const loop=()=>{if(!DASH_DRAG)return;const y=DASH_DRAG.y,h=innerHeight,edge=70;if(y<edge)scrollBy(0,-Math.ceil((edge-y)/5));else if(y>h-edge)scrollBy(0,Math.ceil((y-(h-edge))/5));dashDragOver();DASH_DRAG.raf=requestAnimationFrame(loop);};DASH_DRAG.raf=requestAnimationFrame(loop);}
function dashDragOver(){const D=DASH_DRAG;if(!D)return;D.tile.style.left=(D.x-D.dx)+"px";D.tile.style.top=(D.y-D.dy)+"px";
  const g=$("#dgrid");if(!g)return;const tiles=[...g.querySelectorAll(".dtile[data-dw]")].filter(t=>t!==D.tile);
  const over=tiles.find(t=>{const r=t.getBoundingClientRect();return D.x>=r.left&&D.x<=r.right&&D.y>=r.top&&D.y<=r.bottom;});if(!over)return;
  const r=over.getBoundingClientRect(),before=(D.x-r.left)/r.width+(D.y-r.top)/r.height<1;
  const ref=before?over:over.nextSibling;if(ref===D.ph||(ref&&ref.previousSibling===D.ph&&!before))return;
  const prev=new Map(tiles.map(t=>[t,t.getBoundingClientRect()]));g.insertBefore(D.ph,before?over:over.nextSibling);
  if(!matchMedia("(prefers-reduced-motion:reduce)").matches)tiles.forEach(t=>{const a=prev.get(t),b=t.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;if(dx||dy)t.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"none"}],{duration:200,easing:"ease-out"});});}
document.addEventListener("pointerdown",e=>{const g=e.target.closest("[data-dgrip], .dash.editing .dtb");if(!g||e.target.closest(".dtb button")||!DASH_EDIT||e.button>0)return;dashDragStart(e,g);});
document.addEventListener("pointermove",e=>{if(!DASH_DRAG||e.pointerId!==DASH_DRAG.id)return;e.preventDefault();DASH_DRAG.x=e.clientX;DASH_DRAG.y=e.clientY;},{passive:false});
const dashDrop=e=>{const D=DASH_DRAG;if(!D||e.pointerId!==D.id)return;cancelAnimationFrame(D.raf);DASH_DRAG=null;document.body.classList.remove("ddragging");
  const g=$("#dgrid");const ids=[];g.querySelectorAll(".dtile[data-dw], .dph").forEach(t=>{if(t===D.ph)ids.push(D.tile.dataset.dw);else if(t!==D.tile)ids.push(t.dataset.dw);});
  const by=Object.fromEntries(dashW().map(w=>[w.id,w]));const w=ids.map(id=>by[id]).filter(Boolean);if(w.length===dashW().length)dashSet(w);dashDraw();};
document.addEventListener("pointerup",dashDrop);document.addEventListener("pointercancel",dashDrop);

/* ---- the tab, start tab, watch button on player cards ---- */
{const nv=$("#mainnav"),t=nv&&nv.querySelector('[data-nav="team"]');if(t){const b=document.createElement("button");b.setAttribute("role","tab");b.dataset.nav="dash";b.setAttribute("aria-selected","false");
  b.innerHTML=`<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/></svg><span class="dlong">Dashboard</span><span class="dshort">Home</span>`;t.after(b);}}
UI_NAMES.dash="Dashboard";
// d_app (built after this file) only restores tabs it knows, so the last-used Dashboard is restored here, before the first render
try{if(localStorage.getItem("dfNav")==="dash")nav="dash";}catch(e){}
addEventListener("DOMContentLoaded",()=>{if(!NAVS.includes("dash"))NAVS.push("dash");});
{const _sn=setNav;setNav=function(n){if(n!=="dash"&&DASH_EDIT)DASH_EDIT=false;return _sn.apply(this,arguments);};}
{const _ue=uiEditOn;uiEditOn=function(){if(nav==="dash"){if(!prefKey())return toast("Log in to edit your dashboard.");DASH_EDIT=true;dashDraw();return;}return _ue.apply(this,arguments);};}
{const _pc=playerCard;playerCard=function(n){const r=_pc.apply(this,arguments);try{if(prefKey()&&DIR[n]){const a=$("#sheetBody .sheetacts")||$("#sheetBody");const on=dashWatch().includes(n);
  if(a&&!$("#sheetBody [data-dwatch]"))a.insertAdjacentHTML(a.classList.contains("sheetacts")?"afterbegin":"beforeend",`<button class="btn ghost sm" data-dwatch="${esc(n)}" aria-pressed="${on}">${on?"★ Watching":"☆ Watch"}</button>`);}}catch(e){}return r;};}

{const s=document.createElement("style");s.textContent=`
.mainnav .dshort{display:none}
body.navdash #subbar{display:none!important}
.dash{display:flex;flex-direction:column;gap:12px}
.dhead{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap}
.dhead h2{margin:0;font-family:var(--f-display);font-size:1.6rem;line-height:1.1}
.dhead .muted{font-size:.82rem}
.dacts{gap:8px;flex-wrap:wrap}
.dnote{margin:0;font-size:.85rem;color:var(--muted)}
.dgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;grid-auto-flow:row dense;align-items:start}
.dtile{background:var(--surface);border:1px solid var(--line);border-radius:var(--r2,14px);padding:14px 16px;min-width:0;box-sizing:border-box;position:relative;display:flex;flex-direction:column;gap:8px}
.dtile.sz-w{grid-column:span 2}.dtile.sz-f{grid-column:1/-1}
.dth{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dth h3{margin:0;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.dopt{all:unset;cursor:pointer;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;color:var(--accent);font-size:1.05rem}
.dopt:hover,.dopt:focus-visible{background:var(--accent-wash)}
.dbody{display:flex;flex-direction:column;gap:8px;min-width:0}
.dempty{margin:6px 0;font-size:.88rem}
.dsm{margin:0;font-size:.82rem}
.dgo{align-self:flex-start}
.dnm{cursor:pointer;font-weight:600}.dnm:hover{text-decoration:underline}
.dbig{font-size:1.9rem;font-weight:800;line-height:1}
.dmu{all:unset;cursor:pointer;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}
.dmt{display:flex;align-items:center;gap:8px;min-width:0}.dmt b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dmt.op{justify-content:flex-end;text-align:right}
.dmsc{display:flex;flex-direction:column;align-items:center}.dmsc b{font-size:1.7rem;line-height:1}.dmsc small{color:var(--muted);font-size:.75rem}
.dwin{display:flex;align-items:center;gap:10px;font-size:.82rem;font-weight:700}.dwin .up{color:var(--win,#1a7f37)}.dwin .down{color:var(--loss,#c62828)}
.dbar{flex:1;height:6px;border-radius:3px;background:var(--chip,#e8e8ee);overflow:hidden}.dbar i{display:block;height:100%;background:var(--accent)}
.dcats{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}
.dcat{display:flex;flex-direction:column;align-items:center;padding:5px 2px;border-radius:9px;background:var(--chip,#f1f1f5);font-size:.78rem}
.dcat b{font-size:.7rem;color:var(--muted)}.dcat span:nth-child(3){color:var(--muted);font-size:.72rem}
.dcat.w{background:color-mix(in srgb,var(--win,#1a7f37) 16%,transparent)}.dcat.l{background:color-mix(in srgb,var(--loss,#c62828) 13%,transparent)}
.dlu{display:flex;align-items:center;gap:12px}.dlu.warn .dbig{color:var(--loss,#c62828)}.dlu.ok .dbig{color:var(--win,#1a7f37)}
.dinj{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:.84rem}
.dnews,.dlist,.dchat,.dgames,.dstand{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.dnews li{display:flex;flex-direction:column;gap:2px}.dnews a{color:var(--ink);font-weight:600;text-decoration:none;line-height:1.3}.dnews a:hover{text-decoration:underline}.dnews small{font-size:.75rem}
.dlist li{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:.88rem}.dlist li>small{white-space:nowrap}
.dstat{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.dstat li{display:flex;flex-direction:column;align-items:center;text-align:center;font-size:.74rem;color:var(--muted);padding:8px 4px;border-radius:10px;background:var(--chip,#f1f1f5)}
.dstat li b{font-size:1.5rem;color:var(--ink)}.dstat li.hot{background:var(--accent-wash)}.dstat li.hot b{color:var(--accent)}
.dstand li{display:grid;grid-template-columns:24px 1fr auto;gap:8px;font-size:.88rem;padding:2px 6px;border-radius:7px}
.dstand li.me{background:var(--accent-wash);font-weight:700}.dstand .dr{color:var(--muted)}.dstand .dtn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dchat li{display:flex;flex-wrap:wrap;gap:2px 6px;font-size:.86rem}.dchat li span{flex-basis:100%;color:var(--ink);overflow-wrap:anywhere}
.dgames li{display:flex;flex-direction:column;gap:1px;font-size:.85rem;padding:5px 8px;border-radius:9px;border:1px solid var(--line)}
.dgames li.mine{border-color:color-mix(in srgb,var(--accent) 45%,var(--line))}
.dgm{display:flex;justify-content:space-between;gap:8px}.dgm .live{color:var(--loss,#c62828);font-weight:700}
.dtile.sz-w .dgames,.dtile.sz-f .dgames{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.dsc{display:grid;grid-template-columns:auto 1fr 1fr;align-items:center;gap:12px}
.dsc>div{display:flex;flex-direction:column}.dsc small{font-size:.75rem;color:var(--muted)}.dsc b.num:not(.dbig){font-size:1.2rem}
.dsck{font-family:var(--f-display);font-weight:800;font-size:1.05rem;padding:8px 10px;border-radius:10px;background:var(--accent);color:var(--on-accent,#fff)}
.dwadd{gap:8px}.dwadd input{flex:1;min-width:0;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);font:inherit}
.dcatl{display:flex;flex-direction:column;gap:8px}
.dcatr{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:12px}
.dcatr>div{display:flex;flex-direction:column;gap:2px}.dcatr .muted{font-size:.82rem}
/* edit mode */
.dash.editing .dtile[data-dw]{outline:2px dashed color-mix(in srgb,var(--accent) 55%,transparent);outline-offset:2px;padding-top:0}
.dash.editing .dbody{pointer-events:none;user-select:none;-webkit-user-select:none;max-height:260px;overflow:hidden;opacity:.85}
.dtb{display:flex;align-items:center;gap:4px;margin:0 -16px 4px;padding:6px 8px;background:var(--accent);color:var(--on-accent,#fff);border-radius:var(--r2,14px) var(--r2,14px) 0 0;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.dtb .dgrip{font-size:1.2rem;padding:0 4px}
.dtb .dtt{flex:1;min-width:0;font-weight:700;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dtb button{all:unset;cursor:pointer;min-width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(255,255,255,.18);font-weight:800;font-size:.9rem}
.dtb button:hover,.dtb button:focus-visible{background:rgba(255,255,255,.34);outline:2px solid #fff;outline-offset:-2px}
.dtb button:disabled{opacity:.35;cursor:default}
.dtb .dszs{display:inline-flex;gap:2px;margin:0 4px;padding:2px;border-radius:9px;background:rgba(0,0,0,.15)}
.dtb .dszs button{min-width:26px;height:26px;background:none;font-size:.75rem}.dtb .dszs button[aria-pressed="true"]{background:#fff;color:var(--accent)}
.dash.editing .dth{display:none}
.dtile.drag{box-shadow:0 18px 40px rgba(0,0,0,.35);transform:rotate(1.2deg) scale(1.02);opacity:.96}
.dph{border:2px dashed var(--accent);background:var(--accent-wash);opacity:.7}
body.ddragging{cursor:grabbing;user-select:none;-webkit-user-select:none}
.dadd{all:unset;cursor:pointer;box-sizing:border-box;border:2px dashed var(--line);border-radius:var(--r2,14px);min-height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:var(--muted);font-weight:700}
.dadd span{font-size:2rem;line-height:1}.dadd:hover,.dadd:focus-visible{border-color:var(--accent);color:var(--accent)}
@media (max-width:640px){
  .dgrid{grid-template-columns:1fr}.dtile.sz-w,.dtile.sz-f{grid-column:auto}
  .dtb .dszs{display:none}
  .mainnav .dlong{display:none}.mainnav .dshort{display:inline}
}
body.fold:not(.duow) .dgrid{grid-template-columns:repeat(2,1fr)}
body.fold:not(.duow) .dtb .dszs{display:none}
body.fold:not(.duow) .mainnav .dlong{display:none}body.fold:not(.duow) .mainnav .dshort{display:inline}
`;document.head.appendChild(s);}
