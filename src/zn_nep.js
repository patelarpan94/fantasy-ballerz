/* ============================================================================
   NEW ERA + (2.37, Arp 2026-11-04: "make a custom dashboard (CALL IT NEW ERA +)
   ... make it extreme ... any new widgets ... any new tools ... any new
   animations or graphics. it needs to have a wow factor while being clean and
   easy to read").
   A ready-made dashboard every login gets once, with its own aurora look, and
   8 new widgets: Matchup arena, Live ticker, Moves that win, Category targets,
   League scoreboard, Lineup efficiency, Bench points wasted, Trophy case.
   All motion is transform/opacity only and stops under Reduce Motion.
   ============================================================================ */
const NEP_ID="nep";
const dNowP=T=>{if(!TEAMS[T])return [];const s=new Set(rosterNow(T));return TEAMS[T].P.filter(p=>s.has(p.n));};
const dPct=v=>Math.round(v*100);
const dCatV=(c,v)=>c[1]==="pct"?pct(v):Math.round(v);
const dExpCats=(A,B)=>CATS.reduce((s,c)=>s+dLogit(val(A,c),val(B,c),c),0);
const dRemDays=t=>DAYS.filter(sp=>upcoming(t,sp)&&gameOn(t,sp));

/* ---- 1. matchup arena: the hero ---- */
DW.xa={name:"Matchup arena",desc:"Your matchup as a big live scoreboard: win chance ring, momentum since yesterday, every category battle and the games-left duel.",s:"f",
  view(w,T){const opp=dOpp(T);if(!opp)return dashEmpty("No matchup this week.");const u=++NEP_U;
    const a=fcProj(T),b=fcProj(opp),p=winProb(a,b),now=h2h(a.now,b.now),pr=h2h(a.fin,b.fin),pc=dPct(p);
    // momentum = what the last day of games did, both ends worked out the same way (BUG-340)
    let mom=null;try{const D=dMatchDays(T,opp);if(D.length>1)mom=Math.round((D[D.length-1].p-D[D.length-2].p)*100);}catch(e){}
    const live=dLiveOn(),ga=gamesLeft(T),gb=gamesLeft(opp),gt=Math.max(1,ga+gb);
    const side=(id,cls)=>{const r=STAND[id]&&STAND[id].rec||[0,0,0];let sk="";try{sk=streakOf(id)||"";}catch(e){}
      return `<div class="xa-team ${cls}"><span class="xa-crest ${cls}">${esc(tmInit(id))}</span><b>${esc(PHONE()?dShort(id):TEAMS[id].name)}</b><small>${r.join("-")}${sk?` · ${esc(sk)}`:""}</small></div>`;};
    const chip=(c,i)=>{const x=val(a.now,c),y=val(b.now,c),fx=val(a.fin,c),fy=val(b.fin,c),pp=dLogit(fx,fy,c),s=x+y>0?x/(x+y):.5,st=pp>=.7?"safe":pp<=.3?"lost":"swing";
      return `<div class="xa-cat ${st}" style="--d:${i*60}ms" title="${esc(c[0])}: ${dCatV(c,x)} vs ${dCatV(c,y)} now, projected ${dCatV(c,fx)} vs ${dCatV(c,fy)}"><span class="xa-cn">${esc(c[0])}</span>
        <span class="xa-cv"><b class="${x>y?"lead":""}">${dCatV(c,x)}</b><i class="xa-cb"><i style="--w:${(s*100).toFixed(1)}%"></i></i><b class="${y>x?"lead":""}">${dCatV(c,y)}</b></span>
        <span class="xa-cp">${st==="safe"?"likely yours":st==="lost"?"likely theirs":"toss-up"} · ${dPct(pp)}%</span></div>`;};
    return `<div class="xa${live?" live":""}"><div class="xa-bg" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="xa-top"><span>${esc(weekName(wk[0]))}</span>${live?'<span class="xa-live"><i class="dlive"></i>LIVE</span>':""}${mom!=null&&mom!==0?`<span class="xa-mom ${mom>0?"up":"down"}">${mom>0?"▲":"▼"} win chance ${mom>0?"up":"down"} ${Math.abs(mom)} since yesterday</span>`:""}</div>
      <div class="xa-main">${side(T,"me")}
        <div class="xa-core"><svg class="xa-ring" viewBox="0 0 120 120" role="img" aria-label="${pc}% chance to win"><defs><linearGradient id="xag${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="xa-s1"/><stop offset="1" class="xa-s2"/></linearGradient></defs>
          <circle class="xa-rt" cx="60" cy="60" r="52"/><circle class="xa-rv" stroke="url(#xag${u})" cx="60" cy="60" r="52" pathLength="100" style="--p:${pc}" transform="rotate(-90 60 60)"/></svg>
          <div class="xa-num"><b>${dCount(pc,0,"xa"+T)}<small>%</small></b><span>to win</span></div></div>
        ${side(opp,"op")}</div>
      <div class="xa-score"><b class="num">${now.join("-")}</b><span>now</span><i></i><b class="num">${pr.join("-")}</b><span>projected${b.ofc?" · with their likely moves":""}</span></div>
      <div class="xa-cats">${CATS.map(chip).join("")}</div>
      <div class="xa-gl"><span><b class="num">${ga}</b> games left</span><i class="xa-glb"><i style="--w:${(ga/gt*100).toFixed(1)}%"></i></i><span><b class="num">${gb}</b> games left</span></div></div>`;}};

/* unique SVG ids per render: iPhone Safari drops gradients/glows when a re-render reuses the same id */
let NEP_U=0;
/* ---- 2. live ticker ---- */
DW.lt={name:"Live ticker",desc:"A scrolling ticker of tonight's lines for your players and your opponent's, with game scores. Pauses when you hover.",s:"f",
  view(w,T){const sp=TODAY,opp=dOpp(T),ps=[...TEAMS[T].P.map(p=>[p,"me"]),...(opp?TEAMS[opp].P.map(p=>[p,"op"]):[])].filter(([p])=>startedOn(p,sp)&&gameOn(p.t,sp));
    if(!ps.length)return `<p class="lt-none">No games for either team today. ${(()=>{const n=DAYS.find(d=>d>sp&&TEAMS[T].P.some(p=>gameOn(p.t,d)));return n?`Next games ${dow(n)}.`:"";})()}</p>`;
    const item=([p,cls])=>{const d=p.d&&p.d[sp],Lg=dLive(p.t),g=gameOn(p.t,sp),st=Lg?liveTxt(Lg):dStarted(p.t)?"in progress":g&&g[2]!=null?fmtTime(g[2]):"";
      return `<span class="lt-i ${cls}${Lg&&Lg.s==="in"?" on":""}"><i class="lt-dot"></i><b>${esc(dashLast(p.n))}</b>${d?`<span class="num">${d[K.PTS]}/${d[K.REB]}/${d[K.AST]}</span>`:`<span class="muted">${p.st==="OUT"?"OUT":"–"}</span>`}<small>${esc(p.t)} · ${esc(st)}</small></span>`;};
    ps.sort((x,y)=>((y[0].d&&y[0].d[sp]?gscore(y[0].d[sp]):-1)-(x[0].d&&x[0].d[sp]?gscore(x[0].d[sp]):-1)));
    const row=ps.map(item).join(""),dur=Math.max(20,ps.length*3.2);
    return `<div class="lt" style="--dur:${dur}s"><span class="lt-lab"><i class="dlive"></i>${dLiveOn()?"LIVE":"TONIGHT"}</span><div class="lt-win"><div class="lt-run">${row}<span aria-hidden="true" class="lt-dup">${row}</span></div></div></div>
      <p class="dsm muted lt-key"><i class="dkey me"></i>${esc(dShort(T))}${opp?` <i class="dkey op"></i>${esc(dShort(opp))}`:""} · points / rebounds / assists so far</p>`;}};

/* ---- 3. moves that win (tool) ---- */
let DMW_K="",DMW=null;
function dMovesThatWin(T){const opp=dOpp(T);if(!opp)return null;const a=fcProj(T),b=fcProj(opp),base=dExpCats(a.fin,b.fin);
  const act=dNowP(T).filter(p=>slotOn(p,TODAY)!==13),full=dNowP(T).length>=ROSTER_MAX||act.length>=13;
  const left=p=>DAYS.filter(sp=>upcoming(p.t,sp)&&gameOn(p.t,sp)&&startedOn(p,sp)).length;
  let drop=null;if(full){drop=act.filter(p=>p.st!=="OUT").map(p=>{const r=recentPG(p.n,14),pj=pgLine(p.pj);return {p,z:r?zOf(r.pg):pj?zOf(pj):-9,pj,g:left(p)};}).sort((x,y)=>x.z-y.z)[0]||null;}
  const fa=Object.values(DIR).filter(D=>!ownerNow(D.n)&&INJ[D.n]!=="OUT").map(D=>{const r=recentPG(D.n,14);return r?{D,r,z:zOf(r.pg)}:null;}).filter(Boolean).sort((x,y)=>y.z-x.z).slice(0,40);
  const out=fa.map(x=>{const pj=pgLine(x.D.pj)||x.r.pg,days=DAYS.filter(sp=>sp>=TODAY&&upcoming(x.D.t,sp)&&gameOn(x.D.t,sp)&&openFit(T,sp,x.D.el));if(!days.length)return null;
    const fin=a.fin.map((v,i)=>v+(+pj[i]||0)*days.length-(drop&&drop.pj?(+drop.pj[i]||0)*drop.g:0)),gain=dExpCats(fin,b.fin)-base;
    const flips=CATS.filter(c=>dLogit(val(a.fin,c),val(b.fin,c),c)<.5&&dLogit(val(fin,c),val(b.fin,c),c)>=.5).map(c=>c[0]);
    return {D:x.D,n:days.length,gain,flips};}).filter(x=>x&&x.gain>.02).sort((x,y)=>y.gain-x.gain).slice(0,3);
  return {base,out,drop};}
DW.mw={name:"Moves that win",desc:"A pickup coach: tests the best free agents against your open lineup spots for the rest of this matchup and shows the adds that win you the most categories.",s:"w",
  view(w,T){const k=T+":"+TODAY+":"+TXLOG.length+":"+(LIVE&&LIVE.at||0);if(k!==DMW_K){DMW_K=k;try{DMW=dMovesThatWin(T);}catch(e){DMW=null;}}const r=DMW;
    if(!r)return dashEmpty("No matchup this week.");const ed=dCanEdit(T);
    const head=`<div class="mw-h"><span class="mw-big num">${dRound(r.base).toFixed(1)}</span><span>of ${CATS.length} categories you're expected to win now${r.drop?`<br><small class="muted">Your roster is full, so these assume you drop ${dashNm(r.drop.p.n)} (your lowest value lately).</small>`:""}</span></div>`;
    if(!r.out.length)return head+`<p class="dempty okc">✓ No free agent adds a category right now. Your open spots are covered.</p>`;
    const mx=Math.max(...r.out.map(x=>x.gain));
    return head+`<ol class="mw-l">${r.out.map((x,i)=>`<li style="--d:${i*90}ms">${dFace(x.D.n,x.D.t,"sm")}<span class="mw-n">${dashNm(x.D.n)}<small class="muted">${esc(x.D.t||"")} · fills ${x.n} open spot${x.n>1?"s":""}${x.flips.length?"":" · strengthens close categories"}</small>${x.flips.length?`<span class="mw-f">${x.flips.map(f=>`<i>flips ${esc(f)}</i>`).join("")}</span>`:""}</span>
      <span class="mw-g"><b class="num okc">+${x.gain.toFixed(1)}</b><small class="muted">categories</small><i class="mw-gb"><i class="dg2" style="--w:${(x.gain/mx*100).toFixed(0)}%"></i></i></span>${ed?`<button class="btn sm" data-add="${esc(x.D.n)}">Add</button>`:""}</li>`).join("")}</ol>
      <p class="dsm muted">Uses ESPN projections for the games each player would fill. You pick who to drop when you add.</p>`;}};

/* ---- 4. category targets (tool) ---- */
DW.ct={name:"Category targets",desc:"What it takes to win each category by the end of the matchup: your projected finish against theirs, and how much more you need per game.",s:"s",
  view(w,T){const opp=dOpp(T);if(!opp)return dashEmpty("No matchup this week.");const a=fcProj(T),b=fcProj(opp),gl=Math.max(1,gamesLeft(T));
    const rows=CATS.map(c=>{const fx=val(a.fin,c),fy=val(b.fin,c),pp=dLogit(fx,fy,c),pc=c[1]==="pct";let need="";
      if(fx<fy){need=pc?`need +${(fy-fx).toFixed(3).replace(/^0/,"")}`:`need +${((fy-fx)/gl).toFixed(1)}/game`;}else need=pc?`ahead by ${(fx-fy).toFixed(3).replace(/^0/,"")}`:`ahead by ${Math.round(fx-fy)}`;
      const mx=Math.max(fx,fy,1e-9),lo=pc?Math.min(fx,fy)*.9:0;const pos=v=>((v-lo)/((mx-lo)||1)*100).toFixed(1);
      return {c,pp,fx,fy,need,pos};}).sort((x,y)=>Math.abs(x.pp-.5)-Math.abs(y.pp-.5));
    return `<ol class="ct-l">${rows.map((r,i)=>`<li class="${r.pp>=.7?"safe":r.pp<=.3?"lost":"swing"}" style="--d:${i*50}ms"><b>${esc(r.c[0])}</b><span class="ct-b"><i class="me dg2" style="--w:${r.pos(r.fx)}%"></i><i class="op dg2" style="--w:${r.pos(r.fy)}%"></i></span><span class="ct-n">${esc(r.need)}</span></li>`).join("")}</ol>
      <p class="dsm muted"><i class="dkey me"></i>your projected finish <i class="dkey op"></i>theirs · closest battles first · ${gl} starter games left</p>`;}};

/* ---- 5. league scoreboard ---- */
DW.ls={name:"League scoreboard",desc:"Every matchup this week: category score now and each team's chance to win.",s:"w",
  view(w,T){const ms=(W[wk[0]]||[]).filter(([x,y])=>TEAMS[x]&&TEAMS[y]);if(!ms.length)return dashEmpty("No matchups this week.");
    const rows=ms.map(([x,y])=>{const a=fcProj(x),b=fcProj(y),p=winProb(a,b),s=h2h(a.now,b.now);return {x,y,p,s,me:x===T||y===T};}).sort((u,v)=>v.me-u.me);
    return `<ol class="ls-l">${rows.map((r,i)=>`<li class="${r.me?"me":""}" style="--d:${i*60}ms"><span class="ls-t${r.p>=.5?" fav":""}"><span class="hav xs ${r.x===T?"me":"nt"}">${esc(tmInit(r.x))}</span>${esc(dShort(r.x))}</span>
      <span class="ls-c"><b class="num">${r.s.join("-")}</b><i class="ls-bar"><i class="dg2" style="--w:${dPct(r.p)}%"></i></i><small class="muted num">${dPct(r.p)}% · ${100-dPct(r.p)}%</small></span>
      <span class="ls-t r${r.p<.5?" fav":""}">${esc(dShort(r.y))}<span class="hav xs ${r.y===T?"me":"nt"}">${esc(tmInit(r.y))}</span></span></li>`).join("")}</ol>`;}};

/* ---- 6. lineup efficiency ---- */
function dEff(id){let used=0,poss=0;DAYS.filter(sp=>sp<TODAY).forEach(sp=>{const pl=TEAMS[id].P.filter(p=>p.d&&p.d[sp]);used+=pl.filter(p=>startedOn(p,sp)).length;poss+=Math.min(LINEUP.length,pl.length);});return poss?used/poss:null;}
DW.ef={name:"Lineup efficiency",desc:"How many of your players' games this matchup counted (started), against the most you could have started. Ranked against the league.",s:"s",
  view(w,T){const e=dEff(T);let can=0;try{can=DAYS.filter(sp=>sp>=TODAY).reduce((s,sp)=>s+(benchPlan(T,sp).extra||0),0);}catch(e){}
    const ids=Object.keys(TEAMS).map(Number).filter(x=>TEAMS[x].P.length),all=ids.map(x=>[x,dEff(x)]).filter(x=>x[1]!=null).sort((u,v)=>v[1]-u[1]),rk=all.findIndex(x=>x[0]===T)+1;
    return `<div class="ef">${e==null?`<div class="ef-ring none">–</div>`:DCH.ring(e,{size:96,label:"started"})}<div><b class="num">${e==null?"Starts after day 1":`${dPct(e)}% of games counted`}</b>${rk?`<small class="muted">#${rk} of ${all.length} in the league</small>`:""}
      <small class="${can?"warnc":"okc"}">${can?`${can} more game${can>1?"s":""} you could start the rest of the week`:"✓ Rest of the week is set"}</small>${can&&dCanEdit(T)?`<button class="btn sm" data-dauto="week">Auto-set the week</button>`:""}</div></div>`;}};

/* ---- 7. bench points wasted ---- */
DW.bw={name:"Bench points wasted",desc:"Game score your bench put up this matchup that didn't count, the biggest misses, and where you rank in the league.",s:"s",
  view(w,T){const waste=id=>{const xs=[];TEAMS[id].P.forEach(p=>DAYS.filter(sp=>sp<=TODAY).forEach(sp=>{const d=p.d&&p.d[sp];if(d&&!startedOn(p,sp)&&slotOn(p,sp)===12)xs.push({p,sp,d,v:gscore(d)});}));return xs;};
    const mine=waste(T),tot=mine.reduce((s,x)=>s+x.v,0),ids=Object.keys(TEAMS).map(Number).filter(x=>TEAMS[x].P.length),rk=1+ids.filter(x=>x!==T&&waste(x).reduce((s,y)=>s+y.v,0)>tot).length;
    if(!mine.length)return `<p class="dempty okc">✓ Nothing wasted. Every game your players played this matchup counted.</p>`;
    return `<div class="dkpi"><b class="dbig num badc">${dCount(Math.round(tot))}</b><span class="muted">game score left on your bench · ${rk===1?"most in the league":`#${rk} of ${ids.length} (1 = most wasted)`}</span></div>
      <ol class="dlist">${mine.sort((x,y)=>y.v-x.v).slice(0,3).map(x=>`<li><span>${dashNm(x.p.n)} <small class="muted">${dow(x.sp)}</small></span><small class="num">${x.d[K.PTS]}/${x.d[K.REB]}/${x.d[K.AST]}</small></li>`).join("")}</ol>`;}};

/* ---- 8. trophy case ---- */
DW.tc={name:"Trophy case",desc:"Every weekly award your team has won this season, on a shelf.",s:"s",
  view(w,T){const me=TEAMS[T].name,won={};let weeks=0;for(let n=1;n<=CAL.length;n++){if(!weekDone(n))continue;weeks++;let a=null;try{a=weekAwards(n);}catch(e){}(a||[]).forEach(([i,t,v])=>{if(String(v).includes(me)){won[t]=won[t]||{i,n:0};won[t].n++;}});}
    const xs=Object.entries(won);if(!weeks)return dashEmpty("Awards are handed out when the first matchup ends.");
    if(!xs.length)return `<div class="tc-shelf empty"><span>🏆</span></div><p class="dsm muted">No trophies yet after ${weeks} matchup${weeks>1?"s":""}. Win an award to fill the shelf.</p>`;
    return `<div class="tc-shelf">${xs.map(([t,x],i)=>`<span class="tc-t" style="--d:${i*120}ms" title="${esc(t)}"><span class="tc-i">${x.i}</span>${x.n>1?`<b>×${x.n}</b>`:""}<small>${esc(t)}</small></span>`).join("")}</div><p class="dsm muted">${xs.reduce((s,[,x])=>s+x.n,0)} award${xs.reduce((s,[,x])=>s+x.n,0)>1?"s":""} in ${weeks} matchup${weeks>1?"s":""}</p>`;}};

/* ---- the board ---- */
const NEP_DEF=[["xa","f"],["lt","f"],["hd","f",{t:"Win the week"}],["mw","w"],["ct","s"],["pf","w"],["ef","s"],["hd","f",{t:"Your squad"}],["tl","w"],["cd","s"],["wc","w"],["hc","s"],["hd","f",{t:"Around the league"}],["ls","w"],["tc","s"],["bw","s"],["sw","s"],["bp","w"]];
const nepW=()=>NEP_DEF.map(([k,s,o],i)=>({id:"n"+i+Math.random().toString(36).slice(2,6),k,s,o:o?{...o}:{}}));
function nepAdd(){if(!prefKey()||(UI.dash&&UI.dash.nep))return;const bs=dashBoards();
  if(bs.some(b=>b.id===NEP_ID)){dashBoardSet({nep:1});return;}if(bs.length+1>=DASH_MAXB){dashBoardSet({nep:1});return;}
  dashBoardSet({boards:[...bs,{id:NEP_ID,n:"New Era +",w:nepW()}],cur:NEP_ID,nep:1});DSEEN.clear();}
{const _rr=renderRosters;renderRosters=function(){if(nav==="dash"&&!DASH_DRAG&&!DASH_EDIT)try{nepAdd();}catch(e){}return _rr.apply(this,arguments);};}
{const _dv=dashView;dashView=function(){const h=_dv.apply(this,arguments);return dashCur()===NEP_ID?h.replace('<div class="dash','<div class="dash dnep'):h;};}
// Reset on New Era + puts its own layout back
document.addEventListener("click",e=>{const b=e.target.closest("[data-dreset]");if(!b||dashCur()!==NEP_ID)return;e.preventDefault();e.stopImmediatePropagation();
  if(!confirm("Put New Era + back to its original widgets?"))return;dashSet(nepW());dashDraw();toast("New Era + is back to the original");},true);
// a soft tilt on the hero when you move over it (desktop only)
document.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse"||dReduce())return;const x=e.target.closest&&e.target.closest(".xa");if(!x)return;const r=x.getBoundingClientRect();
  x.style.setProperty("--mx",((e.clientX-r.left)/r.width*100).toFixed(1)+"%");x.style.setProperty("--my",((e.clientY-r.top)/r.height*100).toFixed(1)+"%");},{passive:true});

{const s=document.createElement("style");s.textContent=`
/* the New Era + board: aurora behind, glowing glass tiles, gradient section titles */
.dash.dnep{position:relative;isolation:isolate}
.dash.dnep::before{content:"";position:absolute;inset:-40px -16px auto;height:760px;z-index:-1;pointer-events:none;
  background:radial-gradient(40% 50% at 15% 20%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 70%),radial-gradient(35% 45% at 85% 10%,color-mix(in srgb,var(--s-op,#e2701f) 24%,transparent),transparent 70%),radial-gradient(45% 40% at 55% 60%,color-mix(in srgb,var(--nB2,#8b5cf6) 18%,transparent),transparent 70%);
  animation:nepaur 18s ease-in-out infinite alternate;opacity:.9}
@keyframes nepaur{to{transform:translate3d(0,24px,0) scale(1.06)}}
.dash.dnep .dhead h2{background:linear-gradient(90deg,var(--ink),var(--accent) 60%,var(--s-op,#e2701f));-webkit-background-clip:text;background-clip:text;color:transparent}
.dash.dnep .dtile:not(.dk-hd):not(.dk-xa){background:color-mix(in srgb,var(--surface) 82%,transparent);border:1px solid color-mix(in srgb,var(--accent) 16%,var(--line));box-shadow:0 1px 0 color-mix(in srgb,#fff 50%,transparent) inset,0 10px 30px -18px color-mix(in srgb,var(--accent) 45%,transparent);transition:transform .25s cubic-bezier(.3,.7,.2,1),box-shadow .25s}
@media (hover:hover){.dash.dnep:not(.editing) .dtile:not(.dk-hd):not(.dk-xa):hover{transform:translateY(-3px);box-shadow:0 1px 0 color-mix(in srgb,#fff 50%,transparent) inset,0 18px 40px -20px color-mix(in srgb,var(--accent) 60%,transparent)}}
.dash.dnep .dtile.dk-hd .dth h3{background:linear-gradient(90deg,var(--accent),var(--s-op,#e2701f));-webkit-background-clip:text;background-clip:text;color:transparent;font-size:1.25rem;text-transform:uppercase;letter-spacing:.06em}
.dash.dnep .dtile.dk-hd .dth h3::after{background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 50%,transparent),transparent)}
.dash.dnep .dtile.dk-xa,.dtile.dk-xa{padding:0;background:none;border:0;box-shadow:none;overflow:visible}.dtile.dk-xa>.dth{display:none}.dash.editing .dtile.dk-xa>.dth{display:flex}
/* matchup arena */
.xa{--me:var(--accent);--op:var(--s-op,#e2701f);position:relative;overflow:hidden;border-radius:22px;padding:18px 20px 16px;color:#eef2ff;background:linear-gradient(160deg,#0b1224,#121b36 55%,#0b1224);box-shadow:0 20px 50px -24px rgba(10,20,60,.7);isolation:isolate}
.xa::after{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(500px circle at var(--mx,50%) var(--my,0%),rgba(255,255,255,.08),transparent 40%);pointer-events:none}
.xa-bg{position:absolute;inset:0;z-index:-2;overflow:hidden}.xa-bg i{position:absolute;width:55%;aspect-ratio:1;border-radius:50%;filter:blur(50px);opacity:.45}
.xa-bg i:nth-child(1){background:var(--me);left:-12%;top:-30%;animation:xab1 14s ease-in-out infinite alternate}
.xa-bg i:nth-child(2){background:var(--op);right:-14%;top:-20%;animation:xab2 16s ease-in-out infinite alternate}
.xa-bg i:nth-child(3){background:#8b5cf6;left:30%;bottom:-60%;opacity:.25;animation:xab1 20s ease-in-out infinite alternate-reverse}
@keyframes xab1{to{transform:translate3d(12%,10%,0)}}@keyframes xab2{to{transform:translate3d(-10%,14%,0)}}
.xa-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#aab4d4}
.xa-live{display:inline-flex;align-items:center;gap:5px;color:#4ade80}.xa-mom{margin-left:auto;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.08);letter-spacing:.02em;text-transform:none;font-size:.76rem}
.xa-mom.up{color:#4ade80}.xa-mom.down{color:#f87171}
.xa-main{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin:10px 0 4px}
.xa-team{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;min-width:0}.xa-team b{font-size:1.05rem;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.xa-team small{color:#aab4d4;font-size:.76rem}
.xa-crest{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;font-weight:900;font-size:1.15rem;color:#fff;transform:rotate(-6deg);box-shadow:0 10px 24px -10px currentColor}
.xa-crest.me{background:linear-gradient(140deg,var(--me),color-mix(in srgb,var(--me) 50%,#000));color:color-mix(in srgb,var(--me) 60%,#fff)}.xa-crest.op{background:linear-gradient(140deg,var(--op),color-mix(in srgb,var(--op) 50%,#000));transform:rotate(6deg);color:color-mix(in srgb,var(--op) 60%,#fff)}
.xa-crest{color:#fff!important}
.xa .xa-team b,.xa .xa-num b,.xa .xa-score b{color:#fff!important}.xa .xa-cv b{color:#aab4d4!important}.xa .xa-cv b.lead,.xa .xa-gl b{color:#fff!important}.xa-live .dlive{background:#4ade80!important;box-shadow:0 0 0 3px rgba(74,222,128,.25)}
.xa-core{position:relative;width:150px;height:150px;display:grid;place-items:center}
.xa-ring{position:absolute;inset:0;width:100%;height:100%}.xa-rt{fill:none;stroke:rgba(255,255,255,.1);stroke-width:9}
.xa-rv{fill:none;stroke-width:9;stroke-linecap:round;stroke-dasharray:var(--p) 100;filter:drop-shadow(0 0 6px color-mix(in srgb,var(--me) 70%,transparent))}
.xa-s1{stop-color:var(--me)}.xa-s2{stop-color:var(--nB,#a78bfa)}
.dfirst .xa-rv{animation:xaring 1.4s cubic-bezier(.3,.7,.2,1) both}@keyframes xaring{from{stroke-dasharray:0 100}}
.xa-num{display:flex;flex-direction:column;align-items:center;line-height:1}.xa-num b{font-size:2.6rem;font-weight:900;letter-spacing:-.03em}.xa-num b small{font-size:1rem;margin-left:2px;opacity:.7}.xa-num>span{font-size:.7rem;color:#aab4d4;text-transform:uppercase;letter-spacing:.1em;margin-top:4px}
.xa-score{display:flex;align-items:baseline;justify-content:center;gap:8px;margin:2px 0 12px;color:#aab4d4;font-size:.78rem}.xa-score b{font-size:1.5rem;color:#fff;font-weight:900}.xa-score>i{width:1px;height:18px;background:rgba(255,255,255,.2);margin:0 8px}
.xa-cats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.xa-cat{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);font-size:.78rem}
.xa-cat.safe{border-color:color-mix(in srgb,var(--me) 55%,transparent);background:color-mix(in srgb,var(--me) 14%,rgba(255,255,255,.04))}.xa-cat.lost{border-color:color-mix(in srgb,var(--op) 45%,transparent)}
.xa-cat.swing{border-color:rgba(250,204,21,.5);background:rgba(250,204,21,.07)}
.dfirst .xa-cat{animation:drise .5s cubic-bezier(.3,.7,.2,1) both;animation-delay:var(--d)}
.xa-cn{font-weight:900;letter-spacing:.06em;font-size:.7rem;color:#c7d0ee}
.xa-cv{display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:center}.xa-cv b{font-weight:700;color:#aab4d4}.xa-cv b.lead{color:#fff;font-weight:900}
.xa-cb{display:block;height:6px;border-radius:3px;background:var(--op);overflow:hidden}.xa-cb>i{display:block;height:100%;width:var(--w);background:var(--me);border-right:2px solid #0b1224;transition:width .8s cubic-bezier(.3,.7,.2,1)}
.xa-cp{font-size:.66rem;color:#aab4d4}.xa-cat.swing .xa-cp{color:#facc15}.xa-cat.safe .xa-cp{color:color-mix(in srgb,var(--me) 40%,#fff)}
.xa-gl{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;margin-top:12px;font-size:.76rem;color:#aab4d4}.xa-gl b{color:#fff}
.xa-glb{display:block;height:8px;border-radius:4px;background:var(--op);overflow:hidden}.xa-glb>i{display:block;height:100%;width:var(--w);background:var(--me);border-right:2px solid #0b1224}
.xa.live .xa-ring{animation:xapulse 2.4s ease-in-out infinite}@keyframes xapulse{50%{transform:scale(1.03)}}
@media (max-width:640px){.xa{padding:14px 12px}.xa-core{width:116px;height:116px}.xa-num b{font-size:2rem}.xa-crest{width:44px;height:44px;border-radius:14px;font-size:.95rem}.xa-team b{font-size:.86rem}.xa-cats{grid-template-columns:repeat(2,minmax(0,1fr))}.xa-main{gap:6px}}
/* live ticker */
.lt{display:flex;align-items:center;gap:10px;overflow:hidden}.lt-lab{flex:none;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:10px;background:var(--ink);color:var(--surface);font-weight:900;font-size:.72rem;letter-spacing:.1em}
.lt-win{flex:1;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.lt-run{display:flex;width:max-content;animation:ltrun var(--dur) linear infinite}.lt-dup{display:flex}.lt:hover .lt-run{animation-play-state:paused}
@keyframes ltrun{to{transform:translate3d(-50%,0,0)}}
.lt-i{display:inline-flex;align-items:baseline;gap:6px;padding:6px 14px;white-space:nowrap;font-size:.84rem;border-right:1px solid var(--line)}.lt-i b{font-weight:800}.lt-i small{color:var(--muted);font-size:.7rem}.lt-i .num{font-weight:800}
.lt-dot{width:7px;height:7px;border-radius:50%;align-self:center}.lt-i.me .lt-dot{background:var(--accent)}.lt-i.op .lt-dot{background:var(--s-op,#e2701f)}.lt-i.on .lt-dot{box-shadow:0 0 0 3px color-mix(in srgb,var(--win,#2e7d32) 35%,transparent)}
.lt-none{margin:0;color:var(--muted)}.lt-key{margin-top:6px}
/* moves that win */
.mw-h{display:flex;align-items:center;gap:12px;font-size:.86rem;line-height:1.3}.mw-big{font-size:2.2rem;font-weight:900;color:var(--accent);letter-spacing:-.02em}
.mw-l{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
.mw-l li{display:grid;grid-template-columns:28px minmax(0,1fr) 110px auto;gap:10px;align-items:center;padding:8px 10px;border-radius:14px;background:var(--chip,#f1f1f5)}
.dfirst .mw-l li{animation:drise .5s cubic-bezier(.3,.7,.2,1) both;animation-delay:var(--d)}
.mw-n{display:flex;flex-direction:column;min-width:0}.mw-f{display:flex;gap:4px;flex-wrap:wrap;margin-top:3px}.mw-f i{font-style:normal;font-size:.66rem;font-weight:800;padding:2px 7px;border-radius:999px;background:color-mix(in srgb,var(--win,#2e7d32) 16%,transparent);color:var(--win,#2e7d32)}
.mw-g{display:flex;flex-direction:column;align-items:flex-end;line-height:1.1}.mw-g b{font-size:1.1rem}.mw-g small{font-size:.66rem}
.mw-gb{display:block;width:100%;height:5px;border-radius:3px;background:color-mix(in srgb,var(--line) 70%,transparent);margin-top:4px;overflow:hidden}.mw-gb i{display:block;height:100%;width:var(--w);background:var(--win,#2e7d32);border-radius:3px}
@media (max-width:640px){.mw-l li{grid-template-columns:28px minmax(0,1fr) auto}.mw-g{display:none}.mw-l li .mw-f{margin-top:2px}}
/* category targets */
.ct-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:.8rem}
.ct-l li{display:grid;grid-template-columns:38px 1fr 104px;gap:8px;align-items:center}.ct-n{text-align:right;font-size:.74rem;font-weight:700}
.ct-l li.safe .ct-n{color:var(--win,#2e7d32)}.ct-l li.lost .ct-n{color:var(--loss,#c62828)}.ct-l li.swing .ct-n{color:#b08800}
.ct-b{position:relative;height:12px;display:flex;flex-direction:column;gap:2px}.ct-b i{display:block;height:5px;border-radius:3px;width:var(--w)}.ct-b i.me{background:var(--accent)}.ct-b i.op{background:var(--s-op,#e2701f)}
/* league scoreboard */
.ls-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.ls-l li{display:grid;grid-template-columns:minmax(0,1fr) 150px minmax(0,1fr);gap:10px;align-items:center;padding:7px 10px;border-radius:14px;background:var(--chip,#f1f1f5);font-size:.84rem}
.ls-l li.me{background:var(--accent-wash);outline:1.5px solid color-mix(in srgb,var(--accent) 40%,transparent)}
.dfirst .ls-l li{animation:drise .5s cubic-bezier(.3,.7,.2,1) both;animation-delay:var(--d)}
.ls-t{display:flex;align-items:center;gap:6px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted)}.ls-t.fav{color:var(--ink);font-weight:800}.ls-t.r{justify-content:flex-end}
.ls-c{display:flex;flex-direction:column;align-items:center;gap:3px}.ls-c b{font-size:1rem}.ls-c small{font-size:.66rem}
.ls-bar{display:block;width:100%;height:6px;border-radius:3px;background:var(--s-op,#e2701f);overflow:hidden}.ls-bar i{display:block;height:100%;width:var(--w);background:var(--accent);border-right:2px solid var(--surface)}
.hav.nt{background:var(--chip,#e5e7eb);color:var(--muted)}
@media (max-width:640px){.ls-l li{grid-template-columns:minmax(0,1fr) 96px minmax(0,1fr);gap:6px;padding:6px 8px}.ls-t .hav{display:none}}
/* lineup efficiency */
.ef{display:flex;align-items:center;gap:14px}.ef>div:last-child{display:flex;flex-direction:column;gap:3px;font-size:.84rem}.ef .btn{align-self:flex-start;margin-top:4px}
.ef-ring{width:96px;height:96px;border-radius:50%;display:grid;place-items:center;background:var(--chip,#eef);color:var(--muted);font-weight:800;flex:none}
/* trophy case */
.tc-shelf{display:flex;flex-wrap:wrap;gap:10px;padding:12px 10px 14px;border-radius:14px;background:linear-gradient(180deg,transparent 70%,color-mix(in srgb,#b08800 22%,transparent) 70%,color-mix(in srgb,#b08800 22%,transparent) 76%,transparent 76%)}
.tc-shelf.empty{justify-content:center;font-size:2rem;filter:grayscale(1);opacity:.4}
.tc-t{position:relative;display:flex;flex-direction:column;align-items:center;width:72px;text-align:center;overflow:hidden}
.tc-i{font-size:2rem;line-height:1.1;position:relative}.tc-t b{position:absolute;top:0;right:6px;font-size:.7rem;padding:1px 5px;border-radius:999px;background:var(--accent);color:#fff}.tc-t small{font-size:.62rem;color:var(--muted);line-height:1.2;margin-top:2px}
.dfirst .tc-t{animation:dpop .55s cubic-bezier(.3,1.4,.4,1) both;animation-delay:var(--d)}
.tc-i::after{content:"";position:absolute;inset:-10%;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.75) 50%,transparent 65%);transform:translateX(-120%);animation:tcshine 4.5s ease-in-out infinite;animation-delay:var(--d)}
@keyframes tcshine{20%,100%{transform:translateX(120%)}}
@media (prefers-reduced-motion:reduce){.dash.dnep::before,.xa-bg i,.xa.live .xa-ring,.lt-run,.tc-i::after,.dfirst .xa-rv,.dfirst .xa-cat,.dfirst .mw-l li,.dfirst .ls-l li,.dfirst .tc-t{animation:none!important}.lt-win{overflow-x:auto}.lt-dup{display:none}}
`;document.head.appendChild(s);}
