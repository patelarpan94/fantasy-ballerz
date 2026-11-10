/* ============================================================================
   DASHBOARD 7 (2.36, Arp 2026-11-04: "review all widgets for improvements"
   then "do it all"). Every fix from the widget review: overlapping widgets
   merged, + Add / Move / IR / Propose / reply buttons where you already see the
   player, plain words instead of jargon, shorter phone tiles, cleaner charts and
   early-season states. Widgets keep their keys, so saved dashboards still work.
   ============================================================================ */
const dShort=id=>{const n=String(TEAMS[id]&&TEAMS[id].name||"?");return n.length<=12?n:n.split(/\s+/)[0].slice(0,12);};
const dAddBtn=(n,T)=>dCanEdit(T)&&!ownerNow(n)?`<button class="actb add" data-add="${esc(n)}" aria-label="Add ${esc(n)}" title="Add">+</button>`:"";
const dStarted=t=>{const g=gameOn(t,TODAY);if(!g)return false;const Lg=dLive(t);if(Lg)return Lg.s!=="pre";return g[2]!=null&&etMinutes()>=g[2];};
const dWrap=(k,f)=>{const v=DW[k].view;DW[k].view=function(w,T,big){return f(v.call(this,w,T,big),w,T,big);};};

/* ---- bugs ---- */
// Rivalry: neutral bar until you've played them
dWrap("rv",(h)=>h.replace(/<div class="dsplit"><i class="me dg2" style="--w:0%"><\/i><i class="op"><\/i><\/div>(<p class="dsm muted">Categories 0-0-0)/,'<div class="dsplit none"></div>$1'));
// Today's lineup: a game that has tipped but the live feed hasn't caught up
dGameSt=function(t,sp){const g=gameOn(t,sp);if(!g)return `<span class="dgs none">no game</span>`;const vs=`${g[1]?"vs":"@"} ${esc(g[0])}`;
  const Lg=sp===TODAY?dLive(t):null;
  if(Lg&&Lg.s==="in")return `<span class="dgs in"><i aria-hidden="true"></i>${vs} · <b>${esc(liveTxt(Lg))}</b></span>`;
  if(Lg&&Lg.s==="post")return `<span class="dgs post"><i aria-hidden="true"></i>${vs} · ${esc(liveTxt(Lg))}</span>`;
  if(sp===TODAY&&!Lg&&dStarted(t))return `<span class="dgs in"><i aria-hidden="true"></i>${vs} · <b>in progress</b></span>`;
  return `<span class="dgs pre">${vs}${sp===TODAY&&g[2]!=null?` · <b>${esc(fmtTime(g[2]))}</b>`:""}</span>`;};
dWrap("tl",(h,w,T)=>{TEAMS[T].P.forEach(p=>{if(dStarted(p.t)&&!(p.d&&p.d[TODAY])){const re=new RegExp(`(data-pcard="${esc(p.n).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}"(?:(?!</li>)[\\s\\S])*?<span class="dtls">)<span class="num">[^<]*</span><small class="muted">proj</small>`);h=h.replace(re,'$1<small class="muted">in progress</small>');}});
  // phones: bench and IR fold behind a toggle
  if(PHONE()&&!DTL_OPEN){const nb=TEAMS[T].P.filter(p=>(slotOn(p,TODAY)??0)>=12).length;if(nb)h=h.replace('<ol class="dtl','<ol class="dtl fold').replace(/(<\/ol>)/,`$1<button class="btn ghost sm dtlmore" data-dtlb>Show bench and IR (${nb})</button>`);}
  return h;});
let DTL_OPEN=false;
// Tip-off countdown: count games that have tipped even before the live feed arrives
dWrap("cd",(h)=>{const n=Object.entries(SCHED).filter(([,d])=>d[TODAY]&&d[TODAY][1]).filter(([t])=>{const Lg=dLive(t);return Lg?Lg.s==="in":dStarted(t);}).length;
  return h.replace(/<li class="(hot)?"><b class="num">\d+<\/b><span>(<i class="dlive"><\/i>)?live now<\/span><\/li>/,`<li class="${n?"hot":""}"><b class="num">${n}</b><span>${n?'<i class="dlive"></i>':""}live now</span></li>`);});

/* ---- overlaps ---- */
// Lineup check: one status line that jumps to Today's lineup
DW.lu.desc="A one-line lineup status for today. Tap to jump to Today's lineup.";
DW.lu.view=function(w,T){const sp=TODAY,st=TEAMS[T].P.filter(p=>startedOn(p,sp)),play=st.filter(p=>gameOn(p.t,sp)&&p.st!=="OUT").length,out=st.filter(p=>gameOn(p.t,sp)&&p.st==="OUT");
  let can=0;try{can=benchPlan(T,sp).extra||0;}catch(e){}const ok=!can&&!out.length;
  return `<button class="dlu1 ${ok?"ok":"warn"}" data-dlujump><b class="dbig num">${play}</b><span>of ${st.length} starters play today${out.length?` · <b class="badc">${out.length} OUT</b>`:""}${can?` · <b class="warnc">${can} open spot${can>1?"s":""}</b>`:""}<br><small class="muted">${ok?"✓ Lineup is set":"Tap to fix"} · ${gamesLeft(T)} starter games left</small></span><span aria-hidden="true">›</span></button>`;};
// My claims and offers absorbs Trades and waivers' extras; Trades and waivers now shows the same
const dTrExtra=T=>{let next=0;try{next=nextProcess(Date.now());}catch(e){}const dl=L.trades&&L.trades.deadline||(SEASON==="2026-27"?1803056400000:0),dd=dl?Math.ceil((dl-Date.now())/864e5):null;
  return `<p class="dsm muted dcox">${next?`Next waiver run ${esc(fmtET(next))}`:""}${next&&dd!=null?" · ":""}${dd!=null?`<span class="${dd<=7&&dd>=0?"badc":""}">${dd>0?`trade deadline in ${dd} day${dd>1?"s":""}`:"trade deadline has passed"}</span>`:""}</p>`;};
dWrap("co",(h,w,T)=>h+dTrExtra(T));
DW.tr.view=function(w,T,big){return DW.co.view(w,T,big);};DW.tr.hide=true;DW.tr.desc="Now part of My claims and offers.";
DW.fa.hide=true;DW.fa.desc="Now part of Quick add.";
// the catalog skips retired widgets you don't already have
dashCatalog=function(){const ws=dashW();openSheet("Add a widget",`<div class="dcatl">${Object.entries(DW).filter(([k,d])=>!d.hide||ws.some(w=>w.k===k)).map(([k,d])=>{const has=ws.some(w=>w.k===k);return `<div class="dcatr"><div><b>${esc(d.name)}</b><span class="muted">${esc(d.desc)}</span></div><button class="btn sm${has&&!d.multi?" ghost":""}" data-daddk="${k}"${has&&!d.multi?" disabled":""}>${has&&!d.multi?"Added":"Add"}</button></div>`;}).join("")}</div><div class="sheetacts"><button class="btn" data-sheet="close">Done</button></div>`);};
// Hot free agents (for dashboards that still have it): photos, + Add, ownership, a key
DW.fa.view=function(w,T,big){const own=NBA&&NBA.own||{},fa=Object.values(DIR).filter(D=>!ownerNow(D.n)).map(D=>{const r=recentPG(D.n);return r&&r.g>=2?{D,r,z:zOf(r.pg)}:null;}).filter(Boolean).sort((a,b)=>b.z-a.z).slice(0,big?8:5);
  if(!fa.length)return dashEmpty("Not enough box scores yet.");
  return `<ol class="dqal">${fa.map(x=>`<li>${dFace(x.D.n,x.D.t,"sm")}<span>${dashNm(x.D.n)}<small class="muted">${esc(x.D.t||"")}${gameOn(x.D.t,TODAY)?' · <b class="okc">plays today</b>':""} · <span class="num">${pra(x.r.pg)}</span></small></span>${own[x.D.n]?`<span class="dqo num"><b>${Math.round(+own[x.D.n][0])}%</b><small class="muted">owned</small></span>`:"<span></span>"}${dAddBtn(x.D.n,T)}</li>`).join("")}</ol><p class="muted dsm">Points / rebounds / assists per game, last 7 days</p>`;};
// Roster: the season view (today's slots live in Today's lineup)
// players on the team today: TEAMS[T].P also holds everyone who was ever on it this season (BUG-342)
function dCurP(T){const sp=Math.min(TODAY,SEASON_END);return TEAMS[T]?TEAMS[T].P.filter(p=>slotOn(p,sp)!=null):[];}
DW.rr.desc="Your whole roster for the season: games left, season average, form over the last 10 games, plus Move, IR and Drop.";
DW.rr.view=function(w,T){const sp=TODAY,ed=dCanEdit(T),P=dCurP(T).slice().sort((a,b)=>(slotOn(a,sp)??12)-(slotOn(b,sp)??12)),ir=P.filter(p=>slotOn(p,sp)===13).length;
  const left=p=>dDaysLeft().filter(d=>gameOn(p.t,d)).length;
  return `<div class="dkpi"><span class="muted">${P.length} of ${ROSTER_MAX} spots used${ir?` · ${ir} on IR`:""}</span></div>
    <div class="drr drr2" role="table" aria-label="Roster"><div class="drrh" role="row"><span>Slot</span><span></span><span>Player</span><span title="Games left this matchup">GL</span><span>Season</span><span>Form</span>${ed?"<span></span>":""}</div>
    ${P.map(p=>{const s=recentPG(p.n,400),d=p.d||{},ks=Object.keys(d).map(Number).filter(x=>x<=TODAY).sort((a,b)=>a-b).slice(-10),v=ks.map(x=>gscore(d[x])),avg=v.length?v.reduce((a,b)=>a+b,0)/v.length:0;
      return `<div class="drrr" role="row">${dSlotBtn(p,T,sp)}${dFace(p.n,p.t,"sm")}<span class="dtln"><span class="dtlnm">${dashNm(p.n)} ${stTag(p.n,p.st)}</span><small class="muted">${esc(p.t||"")} · ${esc((p.el||[]).filter(e=>e<5).map(e=>SLOT[e]).join("/")||"")}</small></span>
      <b class="num">${left(p)}</b><span class="num dsm">${s?pra(s.pg):"–"}</span><span class="drrf">${v.length>1?DCH.spark(v,{w:64,h:20,cls:v[v.length-1]>=avg?"up":"down"}):"–"}</span>${ed?`<button class="actb drop" data-drop="${esc(p.n)}" aria-label="Drop ${esc(p.n)}" title="Drop">−</button>`:""}</div>`;}).join("")}</div>
    <p class="dsm muted">Season = points / rebounds / assists per game. Form = game score, last 10 games.${ed?" Tap a slot for Move or IR.":""}</p>`;};

/* ---- action buttons where you already see the player ---- */
dWrap("et",(h,w,T)=>{if(!dCanEdit(T))return h;return h.replace(/(<li><span><span class="dnm"[^>]*data-pcard="([^"]+)"[\s\S]*?<\/b>)(<\/li>)/g,(m,a,n,c)=>{const nm=n.replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"');return a+(ownerNow(nm)?"":dAddBtn(nm,T))+c;});});
dWrap("sm",(h,w,T)=>{let out=h;if(dCanEdit(T))out=out.replace(/(<span class="dcn"><span class="dnm"[^>]*data-pcard="([^"]+)"[^>]*>[^<]*<\/span>)/g,(m,a,n)=>{const nm=n.replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"');return a+dAddBtn(nm,T);});
  return out.replace(/(<button class="btn ghost sm dgo" data-dgo="analytics:main")/,'<p class="dsm muted dsmk"><i class="on"></i> fits an open starting spot · <i class="off"></i> plays, but no open spot</p>$1');});
dWrap("wf",(h,w,T)=>{if(!dCanEdit(T))return h;return h.replace(/(dropped <span class="dnm"[^>]*data-pcard="([^"]+)"[^>]*>[^<]*<\/span>)/g,(m,a,n)=>{const nm=n.replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"');return a+(ownerNow(nm)?"":` <button class="btn ghost xs dwfa" data-add="${esc(nm)}">+ Add</button>`);});});
DW.ij.view=function(w,T){const P=dCurP(T).filter(p=>p.st&&p.st!=="ACTIVE");if(!P.length)return `<p class="dempty okc">✓ Everyone is healthy.</p>`;
  const now=Date.now(),span=28*864e5,ed=dCanEdit(T);
  return `<ol class="dinjl">${P.map(p=>{const ij=injOf(p.n)||{},r=ij.r?new Date(ij.r+"T12:00:00").getTime():null,fr=r?Math.max(.03,Math.min(1,(r-now)/span)):null,k=outKind(p.n),s=slotOn(p,TODAY),bad=p.st==="OUT"&&s!=null&&s<12;
    return `<li class="${bad?"bad":""}"><span>${dashNm(p.n)} ${stTag(p.n,p.st)}<br><small class="muted">${esc(ij.t||outWhy(p.n)||"")}${r?` · back ${retTxt(ij.r)}`:k==="ofs"?" · out for the season":""}</small>${bad?`<br><small class="badc">In your lineup today${ed?" · tap the slot to move him or put him on IR":""}</small>`:""}</span><span class="dinr">${ed&&s!=null?dSlotBtn(p,T,TODAY):""}<span class="dinb ${k||"dtd"}"><i class="dg2" style="--w:${fr==null?(k==="ofs"?100:12):(fr*100).toFixed(0)}%"></i></span></span></li>`;}).join("")}</ol><p class="dsm muted">Bar = time until the expected return (full bar = 4+ weeks)</p>`;};
dWrap("ch",(h)=>!chatMe()?h:h.replace(/<button class="btn ghost sm dgo" data-dchat>/,'<div class="dchr"><input id="dchIn" maxlength="500" placeholder="Message the league" aria-label="Message the league" autocomplete="off"><button class="btn sm" data-dchsend>Send</button></div><button class="btn ghost sm dgo" data-dchat>'));
async function dChatSend(){const i=$("#dchIn"),text=String(i&&i.value||"").trim().slice(0,500),me=chatMe();if(!text||!me)return;i.value="";
  try{await Store.set("chat",`${Date.now()}_${Math.random().toString(36).slice(2,7)}`,{ch:"league",members:["all"],from:me,text,at:Date.now(),by:Store.uid||null});toast("Sent to the league");if(typeof renderChat==="function")try{renderChat();}catch(e){}dashDraw();}
  catch(e){i.value=text;showErr(e);}}
// Trade idea: say who it favors, and propose it in one tap
DW.ti.desc="The best 1-for-1 trade that helps both teams, with who it favors and a Propose button.";
dWrap("ti",(h,w,T)=>{const t=DTI;if(!t)return h;const fair=Math.max(0,Math.min(1,Math.min(t.a,t.b)/Math.max(t.a,t.b,1e-9))),you=t.a>=t.b;
  const lab=fair>=.8?"Fair trade":fair>=.5?(you?"Leans your way":"Leans their way"):(you?"Lopsided, in your favor":"Lopsided, in their favor");
  return h.replace(/<span><b>\d+% fair<\/b><br><small class="muted">with ([\s\S]*?) · both teams improve<\/small><\/span>/,`<span><b>${lab}</b><br><small class="muted">Both teams improve, with $1</small></span>`)
    .replace(/(<button class="btn ghost sm dgo" data-dgo="analytics:main"[^>]*>[^<]*<\/button>)/,`<div class="dtiacts">${dCanEdit(T)?'<button class="btn sm" data-dtiprop>Propose this trade</button>':""}$1</div>`);});

/* ---- clarity ---- */
DW.tw.view=function(w,T){const opp=dOpp(T);if(!opp)return dashEmpty("No matchup this week.");const a=score(T),b=score(opp);
  return `<div class="dtug2"><div class="dtr2 dtugh2"><span></span><span class="me" title="${esc(TEAMS[T].name)}">${esc(tmInit(T))}</span><span></span><span class="op" title="${esc(TEAMS[opp].name)}">${esc(tmInit(opp))}</span></div>${CATS.map(c=>{const x=val(a,c),y=val(b,c),s=x+y>0?x/(x+y):.5;
    return `<div class="dtr2"><b>${esc(c[0])}</b><span class="num${x>y?" lead me":""}">${fmtC(c,x)}</span><span class="dtb2${x+y>0?"":" none"}"><i class="me dg2" style="--w:${(s*100).toFixed(1)}%"></i><i class="op"></i></span><span class="num${y>x?" lead op":""}">${fmtC(c,y)}</span></div>`;}).join("")}</div>`;};
dWrap("hc",(h)=>h.replace("Value vs projection (z-score), last 7 days","▲ playing above his ESPN projection, ▼ below it (last 7 days). The number is how far, in value."));
dWrap("rs",(h)=>h+'<p class="dsm muted">Line = game score over his last 10 games (points, boards, assists, stocks, threes). Number = his last game. Green = last game above his average.</p>');
dWrap("dv",(h)=>h.replace(/<text class="dax" x="[^"]*" y="[^"]*">↖ steals<\/text>/,`<text class="dax" x="${(window.DCH_W||300)-6}" y="12" text-anchor="end">above the line = steal</text>`));
dWrap("gl",(h)=>h.replace(/(<span class="dhc (?:me|op) past"[^>]*>)0(<\/span>)/g,"$1·$2"));
// Power rankings climb: short team names and each week's rank on hover
DW.bp.view=function(w,T){const cols=dWeekRanks();let pr=[];try{pr=powerRows();}catch(e){}
  if(pr.length)cols.push({l:"Power",r:Object.fromEntries(pr.map((x,i)=>[x.x,i+1]))});
  if(cols.length<2)return dashEmpty("The climb starts after the first matchup ends.");
  const ids=Object.keys(TEAMS).map(Number).filter(x=>cols[0].r[x]),n=ids.length,Wd=window.DCH_W||300,h=Math.max(140,n*18+30),P=26,R=PHONE()?82:110;
  const x=i=>P+i*(Wd-P-R)/(cols.length-1),y=r=>12+(r-1)*(h-30)/Math.max(1,n-1);
  const line=id=>cols.map((c,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${y(c.r[id]||n).toFixed(1)}`).join("");
  const order=ids.slice().sort((a,b)=>(a===T)-(b===T));
  return `<svg class="dch dbump" viewBox="0 0 ${Wd} ${h}" role="img" aria-label="Rank by week">
    ${cols.map((c,i)=>`<text class="dax" x="${x(i)}" y="${h-4}" text-anchor="middle">${esc(c.l)}</text>`).join("")}
    ${order.map(id=>{const me=id===T,last=cols[cols.length-1].r[id];return `<g class="dbl${me?" me":""}"><title>${esc(TEAMS[id].name)}: ${cols.map(c=>`${c.l} #${c.r[id]||n}`).join(", ")}</title><path class="dln dd ${me?"me":"oth"}" pathLength="1" d="${line(id)}"/>${cols.map((c,i)=>`<circle class="ddot ${me?"me":"oth"}" cx="${x(i)}" cy="${y(c.r[id]||n)}" r="${me?4:2.6}"/>`).join("")}<text class="dbt" x="${Wd-R+8}" y="${y(last)+3}">${last} ${esc(dShort(id))}</text></g>`;}).join("")}</svg>`;};

/* ---- layout ---- */
// Tonight's games: yours first (both teams' players), the rest folded into one line
DW.gm.view=function(w,T,big){const sp=TODAY,opp=dOpp(T),by=(id)=>{const m={};if(id)TEAMS[id].P.forEach(p=>{(m[p.t]=m[p.t]||[]).push(p);});return m;},mine=by(T),theirs=by(opp);
  const gs=Object.entries(SCHED).filter(([t,d])=>d[sp]&&d[sp][1]).map(([h,d])=>{const a=d[sp][0],lg=dLive(h)||dLive(a);return {h,a,tm:d[sp][2],lg,mine:[...(mine[a]||[]),...(mine[h]||[])],op:[...(theirs[a]||[]),...(theirs[h]||[])]};})
    .sort((x,y)=>(y.mine.length>0)-(x.mine.length>0)||(x.tm??9999)-(y.tm??9999));
  if(!gs.length)return dashEmpty("No NBA games today.");
  const st=g=>g.lg?`<small class="${g.lg.s==="in"?"live":"muted"}">${g.lg.s==="in"?'<i class="dlive"></i>':""}${esc(liveTxt(g.lg))}</small>`:dStarted(g.h)?'<small class="live"><i class="dlive"></i>in progress</small>':`<small class="muted">${esc(fmtTime(g.tm))}</small>`;
  const who=(xs,cls)=>xs.map(p=>`${dashNm(dashLast(p.n))}${startedOn(p,sp)?"":' <span class="muted">(BE)</span>'}`).join(", ");
  const card=g=>`<li class="${g.mine.length?"mine":""}"><span class="dgm"><b>${esc(g.a)} @ ${esc(g.h)}</b>${st(g)}</span>${g.mine.length?`<small><b class="me">You</b> ${who(g.mine)}</small>`:""}${g.op.length?`<small><b class="op">${esc(tmInit(opp))}</b> ${who(g.op)}</small>`:""}${!g.mine.length&&!g.op.length?'<small class="muted">none of yours</small>':""}</li>`;
  const yours=gs.filter(g=>g.mine.length||g.op.length),rest=gs.filter(g=>!g.mine.length&&!g.op.length);
  return `<ol class="dgames">${yours.map(card).join("")}</ol>${rest.length?`<details class="dgmore"><summary>+${rest.length} other game${rest.length>1?"s":""}</summary><ol class="dgames">${rest.map(card).join("")}</ol></details>`:""}`;};
// Strength of schedule: one compact row per matchup, with the opponent's record
DW.ss.view=function(w,T){let pr=[];try{pr=powerRows();}catch(e){}const rk=x=>pr.findIndex(r=>r.x===x)+1,n=pr.length||Object.keys(TEAMS).length,out=[];
  for(let k=wk[0];k<=CAL.length&&out.length<(PHONE()?3:4);k++){const m=(W[k]||[]).find(([a,b])=>a===T||b===T);if(!m)continue;out.push({k,o:m[0]===T?m[1]:m[0]});}
  if(!out.length)return dashEmpty("No matchups left.");
  return `<ol class="dss2">${out.map(x=>{const r=rk(x.o),lvl=r&&r<=n/3?"hard":r&&r>2*n/3?"easy":"mid",rec=STAND[x.o]&&STAND[x.o].rec;return `<li><small class="muted">${esc(weekName(x.k).replace("Matchup ","Wk "))}${x.k===wk[0]?" · now":""}</small><b>${esc(teamName(x.o))}</b><small class="muted num">${rec?rec.join("-"):""}${r?` · #${r}`:""}</small><span class="dsch ${lvl}">${lvl==="hard"?"Tough":lvl==="easy"?"Easier":"Even"}</span></li>`;}).join("")}</ol>`;};
// early season: charts that need a few points say when they fill in
dWrap("rc",(h,w,T)=>{const opp=dOpp(T);if(!opp)return h;const D=dMatchDays(T,opp);return D.length<3?`<div class="dkpi"><b class="dbig num">${D[D.length-1].w.join("-")}</b><span class="muted">categories now</span></div>${dashEmpty("The race chart fills in after the second day of games.")}`:h;});
dWrap("pr",(h,w,T)=>{let done=0;for(let n=1;n<=regWeeks();n++){if(!weekDone(n))break;done=n;}
  const o=standOrder(),P=Math.min(+L.playoffTeams||4,o.length),me=o.indexOf(T)+1,cut=STAND[o[P-1]],lead=STAND[o[0]],my=STAND[T];
  const gb=(x,y)=>x&&y?((x.rec[0]-y.rec[0])+(y.rec[1]-x.rec[1]))/2:0,g=me<=P?gb(my,STAND[o[P]]||my):gb(cut,my);
  const sub=`<p class="dsm muted">${me<=P?(o[P]?`${g>0?g:"0"} category wins ahead of #${P+1}`:""):`${g} category wins behind #${P}`}${me>1?(gb(lead,my)>0?` · ${gb(lead,my)} behind #1`:" · tied with #1"):""}</p>`;
  return done<3?h.replace(/<svg class="dch[\s\S]*<\/svg>|<p class="dempty[^"]*">[^<]*<\/p>/,"")+sub+dashEmpty("The race chart fills in after week 3."):h.replace(/(<\/div>)/,"$1"+sub);});
// My matchup on phones: short names
dWrap("mu",(h,w,T)=>{if(!PHONE())return h;const opp=opponentOf(T);let out=h.replace(`<b>${esc(TEAMS[T].name)}</b>`,`<b>${esc(dShort(T))}</b>`);if(opp&&TEAMS[opp])out=out.replace(`<b>${esc(TEAMS[opp].name)}</b>`,`<b>${esc(dShort(opp))}</b>`);return out;});

/* ---- more info ---- */
// Standings: games back, streak and movement since last week
DW.st.desc="The league table with games back, streak and movement since last week, plus your power ranking.";
DW.st.view=function(w,T,big){const o=standOrder(),i=o.indexOf(T),show=big?o:o.slice(0,5);if(!big&&i>=5)show.push(T);
  let pw="";try{const pr=powerRows(),pi=pr.findIndex(r=>r.x===T);if(pi>=0)pw=`Power rank #${pi+1} of ${pr.length}`;}catch(e){}
  const cols=dWeekRanks(),prev=cols.length>1?cols[cols.length-2].r:null,lead=STAND[o[0]];
  const res={};for(let n=1;n<=regWeeks();n++){if(!weekDone(n))break;(W[n]||[]).forEach(([a,b])=>{const r=h2h(wt(a,n),wt(b,n)),x=r[0]>r[1]?"W":r[0]<r[1]?"L":"T";(res[a]=res[a]||[]).push(x);(res[b]=res[b]||[]).push(x==="W"?"L":x==="L"?"W":"T");});}
  const streak=x=>{const r=res[x]||[];if(!r.length)return "";let k=1;while(k<r.length&&r[r.length-1-k]===r[r.length-1])k++;return r[r.length-1]+k;};
  const gb=x=>{const v=((lead.rec[0]-STAND[x].rec[0])+(STAND[x].rec[1]-lead.rec[1]))/2;return v>0?String(v):"–";};
  const mv=(x,r)=>{if(!prev||!prev[x])return '<span class="dmv"></span>';const d=prev[x]-r;return `<span class="dmv ${d>0?"up":d<0?"down":""}" title="${d?`${d>0?"Up":"Down"} ${Math.abs(d)} since last week`:"Same as last week"}">${d>0?"▲":d<0?"▼":"–"}</span>`;};
  return `<ol class="dstand dst2"><li class="dsth"><span></span><span></span><span>Team</span><span>W-L-T</span><span>GB</span><span>Strk</span></li>${show.map(x=>{const r=o.indexOf(x)+1;return `<li class="${x===T?"me":""}"><span class="num dr">${r}</span>${mv(x,r)}<span class="dtn">${esc(TEAMS[x].name)}</span><b class="num">${STAND[x].rec.join("-")}</b><span class="num muted">${gb(x)}</span><span class="num dstk ${(streak(x)[0]||"").toLowerCase()}">${streak(x)}</span></li>`;}).join("")}</ol>${pw?`<p class="dsm muted">${pw} · GB = category wins behind first</p>`:""}${dashGo("league","stand","Standings")}`;};
// Team radar: your opponent as a second outline (⚙)
DW.rd.desc="Your team against the league in every category, with your opponent as a second outline. The dashed ring is league average.";
dWrap("rd",(h,w,T)=>{const opp=dOpp(T);if(!opp||w.o.op==="0")return h;const S=dSeason(),n=S.ids.length,rk=dRanks(opp,S),N=rk.length,c=110,R=82;
  const pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/N;return [c+Math.cos(a)*R*v,c+Math.sin(a)*R*v];},vs=rk.map(x=>Math.max(.04,n>1?(n-x.r)/(n-1):.5));
  const poly=`<polygon class="drp op dgrow" points="${vs.map((v,i)=>pt(i,v).map(z=>z.toFixed(1)).join(",")).join(" ")}"/>`;
  return h.replace(/(<polygon class="drp me)/,poly+"$1").replace(/(<p class="dsm muted">)/,`$1<i class="dkey me"></i>${esc(dShort(T))} <i class="dkey op"></i>${esc(dShort(opp))} · `);});
DW.rd.opts=function(w){return `<p class="muted dsnote">Show your opponent?</p><div class="tabs sm dsrow" role="group"><button data-dopto="op:1" aria-selected="${w.o.op!=="0"}">Yes</button><button data-dopto="op:0" aria-selected="${w.o.op==="0"}">No</button></div>`;};
// My players' news: photos and each story's player status
DW.nw.view=function(w,T,big){const mine=new Set(dCurP(T).map(p=>p.n)),list=newsAll().filter(a=>(a.p||[]).some(n=>mine.has(n))).slice(0,big?6:3);
  const inStory=new Set(list.flatMap(a=>(a.p||[]).filter(n=>mine.has(n)))),inj=dCurP(T).filter(p=>p.st&&p.st!=="ACTIVE"&&!inStory.has(p.n));
  const pl=n=>{const p=TEAMS[T].P.find(q=>q.n===n);return `${dashNm(n)}${p&&p.st&&p.st!=="ACTIVE"?" "+stTag(n,p.st):""}`;};
  return `${list.length?`<ol class="dnews dnews2">${list.map(a=>{const ps=(a.p||[]).filter(n=>mine.has(n)),p0=TEAMS[T].P.find(q=>q.n===ps[0]);return `<li>${dFace(ps[0],p0&&p0.t,"sm")}<span><a href="${esc(a.u||"#")}" target="_blank" rel="noopener noreferrer">${esc(a.h)}</a><small class="muted">${ps.slice(0,2).map(pl).join(", ")} · ${esc(newsSrc(a))} · ${ago(a.at)}</small></span></li>`;}).join("")}</ol>`:dashEmpty("No stories about your players this week.")}
    ${inj.length?`<p class="dsm dinj2"><span class="muted">Also hurt:</span> ${inj.map(p=>`${dashNm(dashLast(p.n))} ${stTag(p.n,p.st)}`).join(" ")}</p>`:""}${dashGo("news","latest","All news")}`;};
// Daily production: projected bars before anyone has played
dWrap("dp",(h,w,T)=>{const opp=dOpp(T);if(!opp||!/No games played yet/.test(h))return h;const k=w.o.k||"PTS",i=K[k==="3PM"?"TPM":k]??K.PTS;
  const pj=(id,sp)=>TEAMS[id].P.filter(p=>healthy(p)&&gameOn(p.t,sp)&&startedOn(p,sp)).reduce((s,p)=>{const g=pgLine(p.pj);return s+(g?+g[i]||0:0);},0);
  const g=dDays().filter(sp=>sp>=TODAY).map(sp=>({l:dow(sp),v:[pj(T,sp),pj(opp,sp)]}));if(!g.some(x=>x.v[0]||x.v[1]))return h;
  return h.replace(/<p class="dempty[^"]*">No games played yet this matchup.<\/p>/,`<div class="dpj">${DCH.bars(g,{cls:["me","op"]})}</div><p class="dsm muted">Projected from today's lineups until games are played.</p>`);});

document.addEventListener("click",e=>{let b;
  if((b=e.target.closest("[data-dtlb]"))){DTL_OPEN=true;dashDraw();return;}
  if((b=e.target.closest("[data-dlujump]"))){const t=document.querySelector(".dk-tl");if(t){t.scrollIntoView({behavior:dReduce()?"auto":"smooth",block:"start"});t.classList.add("dflash2");setTimeout(()=>t.classList.remove("dflash2"),1200);}else setNav("team");return;}
  if((b=e.target.closest("[data-dchsend]"))){dChatSend();return;}
  if((b=e.target.closest("[data-dtiprop]"))){const t=DTI;if(t&&typeof offerTrade==="function"){if(cur!==dashT())cur=dashT();offerTrade(t.O,t.give,t.get);}return;}
});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="dchIn"){e.preventDefault();dChatSend();}});

{const s=document.createElement("style");s.textContent=`
.dsplit.none{background:var(--chip,#eef)}.dtb2.none{background:var(--chip,#eef)}.dtb2.none i.me{background:transparent;border:0}
.dtl.fold li.off,.dtl.fold li.dtlg:not(:first-child){display:none}.dtlmore{margin-top:6px}
.dlu1{display:flex;align-items:center;gap:10px;width:100%;text-align:left;font:inherit;color:inherit;background:none;border:0;padding:4px 2px;cursor:pointer;font-size:.86rem;line-height:1.3}
.dlu1>span:last-child{margin-left:auto;font-size:1.3rem;color:var(--muted)}.dlu1.warn .dbig{color:var(--loss,#c62828)}
.dk-tl.dflash2{outline:3px solid var(--accent);outline-offset:2px;transition:outline-color .6s}
.dcox{margin-top:8px}
.drr2 .drrh,.drr2 .drrr{grid-template-columns:62px 28px minmax(0,1fr) 28px 96px 68px 30px}
.drr2 .mvb,.drr2 .slot{min-width:0;width:100%;padding-left:4px;padding-right:4px}
.drrf{display:flex;align-items:center}.drrf .dsp{width:64px;height:20px}
.drr .dface.sm,.drr .arpface{width:28px;height:28px;min-width:28px}.drr .arpface .arptl{width:13px;height:13px}
@media (max-width:640px){.drr2 .drrh,.drr2 .drrr{grid-template-columns:56px minmax(0,1fr) 20px 50px 28px;gap:6px}.drr2 .drrh span:nth-child(2),.drr2 .drrh span:nth-child(5),.drr2 .drrr>span.num.dsm,.drr2 .drrr>.dface,.drr2 .drrr>.arpface{display:none!important}.drr2 .drrh span:nth-child(4){display:block}.drrf .dsp{width:50px}}
.dsmk{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.dsmk i{display:inline-block;width:9px;height:9px;border-radius:50%}.dsmk i.on{background:var(--win,#2e7d32)}.dsmk i.off{border:1.5px solid var(--muted)}
.dcn{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:6px;align-items:center}.dcn .actb{grid-column:2;grid-row:1/3;width:24px;height:24px;min-width:24px;font-size:.85rem}
.dwfa{display:inline-flex;align-items:center;margin-left:6px;padding:0 8px;height:20px;min-height:0;font-size:.7rem;vertical-align:1px}
.dinjl li{display:flex;align-items:center;justify-content:space-between;gap:8px}.dinjl li.bad{background:color-mix(in srgb,var(--loss,#c62828) 8%,transparent);border-radius:10px;padding:4px 6px}
.dinr{display:flex;align-items:center;gap:8px;flex:none}.dinr .dinb{width:72px;flex:none}.dinr .mvb,.dinr .slot{min-width:54px;justify-content:center}
.dchr{display:flex;gap:6px;margin:8px 0}.dchr input{flex:1;min-width:0;font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink)}
.dtug2{display:flex;flex-direction:column;gap:5px;font-size:.82rem}
.dtr2{display:grid;grid-template-columns:40px 52px 1fr 52px;gap:8px;align-items:center}.dtr2>span.num{text-align:center;color:var(--muted)}
.dtr2>span.num.lead{font-weight:800;color:var(--ink)}.dtr2>span.num.lead.me{color:var(--accent)}.dtr2>span.num.lead.op{color:var(--s-op,#e2701f)}
.dtugh2{font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.dtugh2 .me{color:var(--accent);text-align:center}.dtugh2 .op{color:var(--s-op,#e2701f);text-align:center}
.dtr2 .dtb2{height:10px;border-radius:5px}
.dgames small b.me{color:var(--accent)}.dgames small b.op{color:var(--s-op,#e2701f)}.dgames .live{color:var(--win,#2e7d32);font-weight:700}
.dgmore{margin-top:8px;font-size:.84rem}.dgmore summary{cursor:pointer;color:var(--muted);font-weight:700;padding:4px 2px}.dgmore[open] summary{margin-bottom:6px}
.dss2{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.dss2 li{display:grid;grid-template-columns:62px minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:6px 8px;border-radius:10px;background:var(--chip,#f1f1f5);font-size:.84rem}
.dss2 li b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dss2 .dsch{font-size:.72rem;font-weight:800}
.dpfr .dpb{height:6px;opacity:.5}.dpfr .dpb.me{top:2px}.dpfr .dpb.op{top:10px}
.dpfr .dpd{width:10px;height:10px;margin-left:-5px}.dpfr .dpd.me{top:0}.dpfr .dpd.op{top:8px}
.dhm i.lf:not(.today){display:none}
.dhc.past{opacity:.4}
.dst2 li{grid-template-columns:20px 12px minmax(0,1fr) auto 26px 30px}.dst2 .dsth{font-size:.66rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;background:none}
.dmv{font-size:.6rem;color:var(--muted)}.dmv.up{color:var(--win,#2e7d32)}.dmv.down{color:var(--loss,#c62828)}
.dstk{font-size:.76rem;text-align:right}.dstk.w{color:var(--win,#2e7d32)}.dstk.l{color:var(--loss,#c62828)}
.drp.op{fill:color-mix(in srgb,var(--s-op,#e2701f) 18%,transparent);stroke:var(--s-op,#e2701f);stroke-width:1.5;stroke-dasharray:4 3}
.dnews2 li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:8px;align-items:start}.dnews2 li>span{display:flex;flex-direction:column;min-width:0}
.dnews2 .dface.sm,.dnews2 .arpface{width:28px;height:28px;min-width:28px}.dnews2 .arpface .arptl{width:13px;height:13px}
.dinj2{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.dpj .dbr{opacity:.5}
.dqal li>span:empty{display:none}
.detl li:has(.actb){grid-template-columns:minmax(0,1fr) 50px 40px 24px}.detl .actb{width:24px;height:24px;min-width:24px;font-size:.85rem}
.dtiacts{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:6px}.dtiacts .dgo{margin:0}
.dtile .arpface.sm{width:28px!important;height:28px!important;min-width:28px;max-width:28px;box-sizing:border-box;padding:0}.dtile .arpface.sm .arptl{width:13px!important;height:13px!important;right:-3px!important;bottom:-2px!important}
`;document.head.appendChild(s);}
