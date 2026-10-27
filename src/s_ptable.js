const ptName=n=>{if(n.length<=13)return n;const w=n.split(" ");return w.length>1?w[0][0]+". "+w.slice(1).join(" "):n;};

/* ============================================================================
   PHONE STATS TABLE (1.32, Arp 2026-10-24: "hard to see player stats on the
   phones"). On phones My Team and Matchup › Players show the roster as one
   table like ESPN's: player column pinned on the left, stats slide sideways,
   one short row per player. The header scrolls away, a one-row day strip
   stays pinned, chat moves to a header button. Display › Roster style
   switches back to the 1.31 cards ("cards"), so it's one tap to revert.
   ============================================================================ */
let RSTYLE="table";try{RSTYLE=localStorage.getItem("dfRStyle")||"table";}catch(e){}
const RSTYLES=[["table","Stats table"],["cards","Cards"]];
// 1.33 (Arp: "i want duo view to be better"): the two-pane Duo layout uses the table too; the rail keeps the header, team card and chat
const ptOn=()=>RSTYLE==="table"&&PHONE();
// views: day (the picked day) / week / season (per game) / proj (ESPN per game) / sched
let PTM="stats";try{PTM=localStorage.getItem("dfPtm")||"stats";}catch(e){}
let PTF="both";try{PTF=localStorage.getItem("dfPtf")||"both";}catch(e){}
const ptView=()=>nav==="team"?(SUB.team==="sched"?"sched":smode==="season"||smode==="proj"?smode:tday?"day":"week"):(PTM!=="stats"?PTM:selDay?"day":"week");
const ptDays=v=>v==="day"?[viewDay()]:DAYS;
const ptPct=(m,a)=>a?pct(m/a):"–";
// the viewed day for one player, short: his line if played, else the game, else "no game"
function ptSub(p,vd,id){const g=gameOn(p.t,vd),d=p.d[vd];
  if(d&&(vd<TODAY||vd===TODAY))return `<b class="${startedOn(p,vd)?"":"benched"}">${d[0]}/${d[4]}/${d[3]}</b>${startedOn(p,vd)?"":" bench"}`;
  if(!g)return slotOn(p,vd)!=null&&slotOn(p,vd)<12&&vd>=TODAY?`<b class="ptno">No game</b>`:"no game";
  const at=`${g[1]?"vs":"@"} ${g[0]}`;if(vd<TODAY)return STATS[vd]?`DNP · ${at}`:at;
  const lv=vd===TODAY&&LIVE&&LIVE.day===TODAY&&LIVE.g[p.t];
  const cs=id!=null&&vd>=TODAY&&slotOn(p,vd)===12&&benchPlan(id,vd).can.has(p.n);
  return `${cs?'<span class="canst dot" title="Can start">● start</span> ':""}${at} · ${lv?liveTxt(lv):vd===TODAY?fmtTime(g[2]):dow(vd)}`;}
function ptHead(v){
  if(v==="sched")return `<tr><th class="pl">Player</th>${DAYS.map(sp=>`<th class="${sp===viewDay()?"ptsel":""}">${dow(sp).slice(0,2)} ${dateOf(sp).getDate()}</th>`).join("")}<th>Left</th></tr>`;
  const lead=v==="day"?["MIN"]:v==="proj"?["MIN"]:["GP","MIN"];
  return `<tr><th class="pl">Player</th>${lead.map(l=>`<th>${l}</th>`).join("")}${CATS.map(c=>`<th>${c[0]}</th>`).join("")}</tr>`;}
const ptNcols=v=>v==="sched"?DAYS.length+1:(v==="day"||v==="proj"?1:2)+CATS.length;
function ptCells(p,v,id){
  const nc=ptNcols(v);
  if(v==="sched")return DAYS.map(sp=>{const g=gameOn(p.t,sp),d=p.d[sp];let x="·",c="";
      if(g){if(sp<TODAY||(sp===TODAY&&d)){if(d){x=d[0];c=startedOn(p,sp)?"ptpl":"ptbe";}else{x=STATS[sp]?"DNP":"?";c="ptmu";}}else x=(g[1]?"":"@")+g[0];}
      return `<td class="${c}${sp===viewDay()?" ptsel":""}">${x}</td>`;}).join("")+`<td>${healthy(p)?DAYS.filter(sp=>upcoming(p.t,sp)&&gameOn(p.t,sp)).length:"–"}</td>`;
  if(v==="season"||v==="proj"){const g=perGameOf(v==="proj"?p.pj:p.ss);if(!g)return `<td colspan="${nc}" class="ptmsg">${v==="proj"?"No ESPN projection":"No games this season"}</td>`;
    const f=c=>c[1]==="pct"?`${pct(val(g.t,c))}<small>${Math.round(g.tot[c[2]]/g.gp*10)/10}/${Math.round(g.tot[c[3]]/g.gp*10)/10}</small>`:val(g.t,c).toFixed(1);
    return (v==="season"?`<td>${g.gp}</td>`:"")+`<td>${g.t[K.MIN].toFixed(0)}</td>`+CATS.map(c=>`<td>${f(c)}</td>`).join("");}
  const days=ptDays(v),{t,gp}=totals([p],days);
  if(v==="day"&&!gp){const vd=days[0],g=gameOn(p.t,vd),d=p.d[vd];
    const msg=d&&!startedOn(p,vd)?`${d[0]} pts on the bench (not counted)`:!g?"No game":vd<TODAY?(STATS[vd]?"Didn't play":"No box score yet"):`${g[1]?"vs":"@"} ${g[0]} · ${vd===TODAY?fmtTime(g[2]):dow(vd)+" "+md(vd)}`;
    return `<td colspan="${nc}" class="ptmsg">${msg}</td>`;}
  const z=gp?"":" ptmu";
  return (v==="week"?`<td class="${z}">${gp}</td>`:"")+`<td class="${z}">${gp?t[K.MIN]:"–"}</td>`+CATS.map(c=>`<td class="${z}">${gp?(c[1]==="pct"?`${ptPct(t[c[2]],t[c[3]])}<small>${t[c[2]]}/${t[c[3]]}</small>`:val(t,c)):"–"}</td>`).join("");}
function ptTotal(id,v,lab){if(v!=="day"&&v!=="week")return "";const {t,gp}=totals(TEAMS[id].P,ptDays(v));
  return `<tr class="pttot"><td class="pl">${lab}</td>${v==="week"?`<td>${gp}</td>`:""}<td>${gp?t[K.MIN]:"–"}</td>${CATS.map(c=>`<td>${gp?(c[1]==="pct"?`${ptPct(t[c[2]],t[c[3]])}<small>${t[c[2]]}/${t[c[3]]}</small>`:val(t,c)):"–"}</td>`).join("")}</tr>`;}
function ptRows(id,side,v,editable,title){
  const P=TEAMS[id].P,vd=viewDay(),nc=ptNcols(v);let h=title?`<tr class="ptteam ${side}"><td class="pl"><span class="hav ${side} xs">${esc(tmInit(id))}</span>${esc(TEAMS[id].name)}</td><td colspan="${nc}"></td></tr>`:"";
  GROUPS.forEach(([key,lab,f,collapsible])=>{
    let list=P.filter(p=>f(slotOn(p,vd)));if(key==="off")list=list.filter(p=>DAYS.some(sp=>p.sl[sp]!=null));
    const empties=key==="start"?openSlots(id,vd):[];if(!list.length&&!empties.length)return;
    const k="pt"+side+key,isOpen=!collapsible||open[k];
    h+=`<tr class="ptgrp"><td class="pl">${collapsible?`<button class="grpbtn" data-k="${k}" aria-expanded="${!!isOpen}"><span class="chev">›</span>${lab} · ${list.length}</button>`:`${lab}`}</td><td colspan="${nc}"></td></tr>`;
    if(!isOpen)return;
    if(key==="start")list.sort((a,b)=>LINEUP.indexOf(slotOn(a,vd))-LINEUP.indexOf(slotOn(b,vd)));
    list.forEach(p=>{const warn=key==="start"&&vd>=TODAY&&(!gameOn(p.t,vd)||p.st==="OUT"),mv=MOVING&&MOVING.n===p.n&&MOVING.team===id;
      const st=p.st==="DAY_TO_DAY"?'<span class="st dtd">DTD</span>':p.st==="OUT"?'<span class="st out">OUT</span>':"";
      h+=`<tr class="${warn?"ptwarn":""}${mv?" mving":""}${key!=="start"?" ptbn":""}"><td class="pl"><div class="ptp">${slotTag(p,id,editable)}<div class="ptn"><span class="nmb" role="button" tabindex="0" data-pcard="${esc(p.n)}" title="${esc(p.n)}">${esc(ptName(p.n))}</span>${st}<small>${esc(p.t)} · ${ptSub(p,vd,id)}</small></div></div></td>${ptCells(p,v,id)}</tr>`;});
    empties.forEach(s=>{h+=`<tr class="ptempty"><td class="pl"><div class="ptp"><span class="slot">${SLOT[s]}</span><div class="ptn"><span class="muted">Empty</span></div></div></td><td colspan="${nc}"></td></tr>`;});
    if(key==="start")h+=ptTotal(id,v,"Starters total");});
  return h;}
const ptWrap=(v,rows)=>`<div class="ptw"><table class="pt num"><thead>${ptHead(v)}</thead><tbody>${rows}</tbody></table></div>`;
// one-row day strip, pinned while you scroll
function ptStrip(T,withWeek){const vd=viewDay(),i=DAYS.indexOf(vd);
  const prev=DAYS[i-1]??(wk[0]>1?"prevwk":""),next=DAYS[i+1]??(wk[0]<WEEKS.length?"nextwk":"");
  const wkb=withWeek?`<button class="ptd${selDay?"":" on"}" data-cbday=""><b>Week</b><i>all</i></button>`:"";
  const on=sp=>withWeek?selDay===sp:sp===vd;
  return `<div class="ptstrip"><button class="ptar" data-dsel="${withWeek?"":prev}" ${withWeek||!prev?"hidden":""} aria-label="Previous day">‹</button>${wkb}${DAYS.map(sp=>`<button class="ptd${on(sp)?" on":""}${sp===TODAY?" tod":""}" ${withWeek?`data-cbday="${sp}"`:`data-dsel="${sp}"`}><b>${sp===TODAY?"Today":dow(sp)}</b><i>${dateOf(sp).getDate()} · ${playing(T,sp)}</i></button>`).join("")}<button class="ptar" data-dsel="${withWeek?"":next}" ${withWeek||!next?"hidden":""} aria-label="Next day">›</button></div>`;}
function ptViews(opts,curV,attr){return `<div class="ptviews" role="group">${opts.map(([k,l])=>`<button ${attr}="${k}" aria-pressed="${curV===k}">${l}</button>`).join("")}</div>`;}
function ptScore(T,opp,link){if(!opp)return "";const a=fcProj(T),b=fcProj(opp),r=h2h(a.now,b.now),p=winProb(a,b);
  return `<${link?'button class="ptscore" data-nav2="matchup"':'div class="ptscore"'}><b>${r[0]}-${r[1]}${r[2]?`-${r[2]}`:""}</b> vs ${esc(TEAMS[opp].name)} <span class="ptwin ${p>=.5?"up":"down"}">${Math.round(p*100)}% win</span>${link?'<span class="ptgo">›</span></button>':"</div>"}`;}
// My Team
function ptTeam(){
  const T=cur;if(!TEAMS[T])return "";const v=ptView(),vd=viewDay(),edit=canEditTeam(T),opp=M.opp&&TEAMS[M.opp]?M.opp:null;
  const score=duoOn()?"":ptScore(T,opp,true);
  const start=TEAMS[T].P.filter(p=>startedOn(p,vd)),idle=start.filter(p=>!gameOn(p.t,vd)||p.st==="OUT").length,can=vd>=TODAY?benchPlan(T,vd).extra:0;
  const line=vd<TODAY?`${onDay(T,vd)} starters played ${dow(vd)}`:`${start.length-idle} of ${start.length} starters play${idle?` · <span class="dpw">${idle} no game</span>`:""}${can?` · <span class="dpg">${can} on bench could start</span>`:""}`;
  const auto=edit&&vd>=TODAY?`<button class="ptlink" data-auto="day">Auto-set ${vd===TODAY?"today":dow(vd)}</button><button class="ptlink" data-auto="week">Rest of matchup</button>`:"";
  const views=ptViews([["day",vd===TODAY?"Today":dow(vd)+" "+dateOf(vd).getDate()],["week","Week"],["season","Season"],["proj","Proj"],["sched","Sched"],["charts","Charts"]],v,"data-ptv");
  const note=v==="season"?"Season per game; FG%/FT% with makes/attempts per game":v==="proj"?"ESPN projection per game":v==="sched"?"Points on days played · BE = on the bench · @ = away":v==="week"?"This matchup, games in the starting lineup":"";
  return `${score}${ptStrip(T,false)}<div class="ptline"><span>${line}</span>${auto}</div>${views}${ptWrap(v,ptRows(T,"me",v,edit))}${note?`<p class="ptnote">${note} · tap a name for the player card, a slot to move him</p>`:`<p class="ptnote">Tap a name for the player card, a slot to move him</p>`}`;}
// Matchup › Players: both teams (or one) in the same table, same day
function ptMatchup(){
  const T=cur,opp=M.opp&&TEAMS[M.opp]?M.opp:null;if(!TEAMS[T])return "";const v=ptView();
  const f=opp?PTF:"me",tb=(k,l)=>`<button data-ptf="${k}" aria-pressed="${f===k}" title="${esc(k==="me"?TEAMS[T].name:k==="op"?TEAMS[opp].name:"Both teams")}">${l}</button>`;
  const vb=(k,l)=>`<button data-ptm="${k}" aria-pressed="${PTM===k}">${l}</button>`;
  const views=`<div class="ptviews ptmrow" role="group">${opp?tb("both","Both")+tb("me",esc(tmInit(T)))+tb("op",esc(tmInit(opp)))+'<i class="ptsep"></i>':""}${vb("stats",selDay?(selDay===TODAY?"Today":dow(selDay)+" "+dateOf(selDay).getDate()):"Week")}${vb("season","Season")}${vb("proj","Proj")}</div>`,chips="";
  const rows=(f!=="op"?ptRows(T,"me",v,false,f==="both"):"")+(opp&&f!=="me"?ptRows(opp,"op",v,false,f==="both"):"");
  return `${ptStrip(f==="op"?opp:T,true)}${chips}${views}${ptWrap(v,rows)}<p class="ptnote">${v==="week"?"This matchup, games in the starting lineup":v==="day"?"Stats for the picked day":v==="season"?"Season per game":"ESPN projection per game"} · tap a name for the player card</p>`;}
document.addEventListener("click",e=>{let b=e.target.closest("[data-ptv]");
  if(b){const v=b.dataset.ptv;if(v==="sched"||v==="charts")SUB.team=v;else{SUB.team="stats";smode=v==="season"||v==="proj"?v:"week";if(v==="day"||v==="week"){tday=v==="day";try{localStorage.setItem("dfTeamDay",tday?"1":"0");}catch(x){}}}
    try{localStorage.setItem("dfSmode",smode);localStorage.setItem("dfSub",JSON.stringify(SUB));}catch(x){}renderRosters();return;}
  b=e.target.closest("[data-ptm]");if(b){PTM=b.dataset.ptm;try{localStorage.setItem("dfPtm",PTM);}catch(x){}renderRosters();return;}
  b=e.target.closest("[data-ptf]");if(b){PTF=b.dataset.ptf;try{localStorage.setItem("dfPtf",PTF);}catch(x){}renderRosters();return;}
  b=e.target.closest("[data-ptmv]");if(b){setNav("matchup",b.dataset.ptmv);return;}
  b=e.target.closest("[data-nav2]");if(b){setNav(b.dataset.nav2);return;}
  b=e.target.closest("#ptChat");if(b){CHAT_OPEN=true;chatOpen("league");}});
// matchup header: Score · Players · Tracker instead of the team switch
{const _rh=renderHero;renderHero=function(){
  document.body.classList.toggle("ptab",ptOn());document.body.classList.toggle("ptpg",ptOn()&&(nav==="team"||nav==="matchup"));
  if(ptOn()&&nav==="matchup"&&mfocus!=="both")mfocus="both";
  if(!ptOn()||!L||!Object.keys(TEAMS).length||(nav!=="team"&&nav!=="matchup"))return _rh.apply(this,arguments);
  const el=$("#heroWrap");if(!el)return;
  if(nav==="team"){if(duoOn())return _rh.apply(this,arguments);el.innerHTML="";el.hidden=true;return;}
  if(SUB.matchup!=="track"&&SUB.matchup!=="players")SUB.matchup="stats";
  const s=SUB.matchup,has=M.opp&&TEAMS[M.opp];
  el.innerHTML=(s==="players"&&has?`<div class="ptscorewrap">${ptScore(cur,M.opp,false)}</div>`:matchupHero())+(has?`<div class="ptviews ptmv" role="group" aria-label="Matchup view"><button data-ptmv="stats" aria-pressed="${s==="stats"}">Score</button><button data-ptmv="players" aria-pressed="${s==="players"}">Players</button><button data-ptmv="track" aria-pressed="${s==="track"}">Tracker</button></div>`:"")+(s==="stats"?catBoard():"");
  el.hidden=false;$("#boxWrap").hidden=true;};}
// header chat button (the chat bar above the tabs is hidden in table mode)
{const bar=document.querySelector(".bar .teamnav");if(bar&&!$("#ptChat"))bar.insertAdjacentHTML("beforeend",`<button class="arrow ptchat" id="ptChat" aria-label="League chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg><span class="chatcount" id="ptChatN" hidden></span></button>`);
 const _rc=renderChat;renderChat=function(){_rc.apply(this,arguments);const n=$("#ptChatN"),c=$("#chatDockCount");if(n&&c){n.hidden=c.hidden;n.textContent=c.textContent;}};}
