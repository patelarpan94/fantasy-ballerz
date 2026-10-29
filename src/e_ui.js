
/* ============================================================================
   SLEEPER / ESPN-STYLE LAYER (2026-10-22): matchup hero with win odds, ESPN's
   category board, team header, league icon row, trending
   players, docked league chat and a theme switch. These sit on top of the
   existing views; nothing the app already showed is removed.
   ============================================================================ */
const IC=d=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON={
  Matchup:IC("M4 7h7v10H4zM13 7h7v10h-7z"),Schedule:IC("M4 6h16v14H4zM4 10h16M8 3v5M16 3v5"),Trades:IC("M4 8h13l-3-3M20 16H7l3 3"),
  Transactions:IC("M6 4h12v16H6zM9 8h6M9 12h6M9 16h4"),News:IC("M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5")};
const LICON={score:ICON.Matchup,stand:IC("M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M10 13.5h4l.5 3.5h-5zM8 20h8"),
  sched:ICON.Schedule,news:ICON.News,trades:ICON.Trades,tx:ICON.Transactions,draft:IC("M5 4h14v16H5zM9 9h6M9 13h6M9 17h3"),
  pickem:IC("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12l3 3 5-6"),records:IC("M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V6a2 2 0 0 1 1-2zM5 18a2 2 0 0 1 2-2h11M9 8h5"),nba:IC("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"),setup:IC("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .2-1.3-1.5.3-2-3-1-1 1.8h-2L10 3.7l-3 1 .3 2L6 8.2 4 8 3 11l2 1v0l-2 1 1 3 2-.2 1.3 1.5-.3 2 3 1 1-1.8h2l1 1.8 3-1-.3-2 1.3-1.5 2 .2 1-3z")};

const tmInit=id=>initials(TEAMS[id]?.name||"?");
const teamRank=id=>standOrder().indexOf(+id)+1;
// current streak of weekly results, newest first (e.g. "2W")
function streakOf(id){let s="",k=0;
  for(let n=regWeeks();n>=1;n--){if(!weekDone(n))continue;const pr=(W[n]||[]).find(p=>p[0]===id||p[1]===id);if(!pr)continue;
    const o=pr[0]===id?pr[1]:pr[0],r=h2h(wt(id,n),wt(o,n)),x=r[0]>r[1]?"W":r[0]<r[1]?"L":"T";
    if(!s){s=x;k=1;}else if(x===s)k++;else break;}
  return s?k+s:"";}
// box scores so far plus ESPN per-game projections for each starter's remaining games this matchup
function fcProj(T){const now=score(T),rem=new Array(11).fill(0);
  TEAMS[T].P.filter(healthy).forEach(p=>{const pg=pgLine(p.pj);if(!pg)return;DAYS.forEach(sp=>{if(upcoming(p.t,sp)&&gameOn(p.t,sp)&&startedOn(p,sp))pg.forEach((v,i)=>rem[i]+=v);});});
  return {now,fin:now.map((v,i)=>v+rem[i]),done:DAYS.length>0&&DAYS[DAYS.length-1]<TODAY};}
// chance to win the matchup: each category's odds from its projected margin, then P(more category wins than losses)
function winProb(a,b){
  // a finished matchup is decided: 100% for the winner (BUG-163)
  if(a.done&&b.done){const r=h2h(a.fin,b.fin);return r[0]>r[1]?1:r[0]<r[1]?0:.5;}
  const ps=CATS.map(c=>{const x=val(a.fin,c),y=val(b.fin,c),rel=(x-y)/Math.max(Math.abs(x),Math.abs(y),1e-9);return 1/(1+Math.exp(-rel*(c[1]==="pct"?60:12)));});
  let d={0:1};ps.forEach(p=>{const n={};for(const k in d){n[+k+1]=(n[+k+1]||0)+d[k]*p;n[+k-1]=(n[+k-1]||0)+d[k]*(1-p);}d=n;});
  let w=0;for(const k in d)w+=+k>0?d[k]:+k===0?d[k]/2:0;return w;}
const winBar=p=>`<div class="hwin"><span class="hpct ${p>=.5?"up":"down"}">${Math.round(p*100)}% win</span><span class="hbar ${p>=.5?"up":"down"}"><i style="width:${Math.round(p*100)}%"></i></span></div>`;
function heroSide(id,side,p){
  const r=STAND[id]?.rec||[0,0,0],rk=teamRank(id),stk=streakOf(id),m=managerOf(id);
  return `<div class="hside ${side}"><div class="hwho"><span class="hav ${side}">${esc(tmInit(id))}</span><div class="hmeta"><button class="tlink hname" data-team="${id}">${esc(TEAMS[id].name)}</button><span class="hsub">${r.join("-")}${stk?` · ${stk}`:""}${rk?` · ${ord(rk)}`:""}${m?` · ${m}`:""}</span></div></div>${p==null?"":winBar(p)}</div>`;}
function matchupHero(){
  const me=cur,opp=M.opp;if(!TEAMS[me])return "";
  if(!opp||!TEAMS[opp])return `<section class="panel hero"><div class="hrow solo">${heroSide(me,"me",null)}</div><p class="hnote">${esc(noOppText())}</p></section>`;
  const a=fcProj(me),b=fcProj(opp),p=winProb(a,b),now=started()?h2h(a.now,b.now):null,pr=h2h(a.fin,b.fin);
  return `<section class="panel hero" aria-label="Matchup summary"><div class="hrow">${heroSide(me,"me",p)}<div class="hmid"><span class="hvs">VS</span>${now?`<span class="hrec num" data-tk="hrec">${now.join("-")}</span><span class="hlab">now</span>`:""}<span class="hproj num">${pr.join("-")}</span><span class="hlab">projected</span></div>${heroSide(opp,"op",1-p)}</div></section>`;}
// ESPN-style category board: one row per category, the leader highlighted, projected finish underneath
function catBoard(){
  const me=cur,opp=M.opp;if(!TEAMS[me]||!opp||!TEAMS[opp])return "";
  // a picked day (strip above or the day buttons here) shows that day's categories; Week = the whole matchup
  const sd=selDay,A=sd?dayProj(me,sd):fcProj(me),B=sd?dayProj(opp,sd):fcProj(opp),a=A.now,b=B.now,live=sd?sd<=TODAY&&(A.gp+B.gp>0||sd<TODAY):started();
  const f=(v,c)=>c[1]==="pct"?pct(v):Math.round(v);
  const sub=(arr,c)=>c[1]==="pct"&&live?`<small>${arr[c[2]]}/${arr[c[3]]}</small>`:"";
  if(MLAY==="hershy")return hershyBoard(me,opp);
  if(MLAY!=="classic")return simpleBoard(me,opp,sd,A,B,a,b,live,f);
  const rows=CATS.map(c=>{const x=val(a,c),y=val(b,c),lead=live&&Math.abs(x-y)>1e-9?(x>y?"me":"op"):"";
    const side=(v,arr,s,P)=>`<div class="cbv ${s}${lead===s?" lead":""}"><b class="num" data-tk="cb:${c[0]}:${s}">${live?show(v,c):"–"}</b>${sub(arr,c)}${sd&&sd<TODAY?"":`<span class="cbp num">proj ${f(val(P.fin,c),c)}</span>`}</div>`;
    return `<div class="cbrow">${side(x,a,"me",A)}<div class="cbc">${c[0]}<span class="cba" aria-hidden="true">${lead==="me"?"◂":lead==="op"?"▸":""}</span></div>${side(y,b,"op",B)}</div>`;}).join("");
  const ga=counts(me),gb=counts(opp),gl=[["Played",0],["Left",1],["Could start from bench",2]].map(([l,i])=>`<div class="cbrow gms"><div class="cbv me${i===2&&ga[i]?" bx":""}"><b class="num">${i===2?(ga[i]?"+"+ga[i]:"0"):ga[i]}</b></div><div class="cbc">${l}<span class="cbs">${esc(scope())}</span></div><div class="cbv op${i===2&&gb[i]?" bx":""}"><b class="num">${i===2?(gb[i]?"+"+gb[i]:"0"):gb[i]}</b></div></div>`).join("");
  return `<section class="panel catboard" aria-label="Category scoreboard"><div class="cbhead"><span class="me">${esc(TEAMS[me].name)}</span><span class="eyebrow">${sd?esc(dow(sd)+" "+dateOf(sd).getDate()):"Week"}</span><span class="op">${esc(TEAMS[opp].name)}</span></div>${cbDays()}${rows}<div class="cbsec">Starter games</div>${gl}</section>`;}
// day buttons: on the board (Week + each day); on a team view (solo) just the days, for that team's day stats
function cbDays(solo,noWeek){const simple=MLAY!=="classic",opp=M.opp&&TEAMS[M.opp]?M.opp:null,fo=mFocus(),vd=viewDay();
  const cnt=sp=>!simple?"":solo?`<small>${playing(fo==="op"?opp:cur,sp)} ${sp<TODAY?"played":"starts"}</small>`:MLAY==="hershy"&&opp?`<small><span class="op">${playing(opp,sp)}</span> · <span class="me">${playing(cur,sp)}</span></small>`:`<small><span class="me">${playing(cur,sp)}</span>${opp?` · <span class="op">${playing(opp,sp)}</span>`:""}</small>`;
  const b=(v,l,on,sp)=>`<button data-cbday="${v}" aria-pressed="${on}"${sp===TODAY?' class="tod"':""}><span>${l}</span>${sp?cnt(sp):simple?"<small>all days</small>":""}</button>`;
  const h=`<div class="cbdays${simple?" s":""}${solo?" solo":""}" role="group" aria-label="${solo?"Pick a day":"Show categories for"}">${solo||noWeek?"":b("","Week",!selDay,0)}${DAYS.map(sp=>b(sp,sp===TODAY?"Today":`${dow(sp)} ${dateOf(sp).getDate()}`,solo||noWeek?vd===sp:selDay===sp,sp)).join("")}</div>`;
  return solo?`<section class="panel cbsolo">${h}<p class="cbkey muted">Starters with a game that day</p></section>`:h;}
// simple board: one line per category; tap a row for makes/attempts, projection and the week's graph
function simpleBoard(me,opp,sd,A,B,a,b,live,f){
  const rows=CATS.map((c,ci)=>{const x=val(a,c),y=val(b,c),lead=live&&Math.abs(x-y)>1e-9?(x>y?"me":"op"):"",open=CBX.has(c[0]);
    const v=(vv,s)=>`<div class="cbv ${s}${lead===s?" lead":""}"><b class="num" data-tk="cb:${c[0]}:${s}">${live?show(vv,c):"–"}</b></div>`;
    let det="";if(open){const d=(arr,P)=>`<div>${c[1]==="pct"&&live?`<span>${arr[c[2]]}/${arr[c[3]]}</span>`:""}${sd&&sd<TODAY?"":`<span>proj ${f(val(P.fin,c),c)}</span>`}</div>`;
      det=`<div class="cbx"><div class="cbxv">${d(a,A)}<div></div>${d(b,B)}</div>${cbGraph(ci)}</div>`;}
    return `<button class="cbrow s${open?" open":""}" data-cbx="${c[0]}" aria-expanded="${open}">${v(x,"me")}<div class="cbc">${c[0]}<span class="cba" aria-hidden="true">${lead==="me"?"◂":lead==="op"?"▸":""}</span></div>${v(y,"op")}</button>${det}`;}).join("");
  const ga=counts(me),gb=counts(opp),g=x=>`<b class="num">${x[0]}</b> played · <b class="num">${x[1]}</b> left${x[2]?` · <span class="bx">+${x[2]} bench</span>`:""}`;
  return `<section class="panel catboard simple" aria-label="Category scoreboard"><div class="cbhead"><span class="me">${esc(TEAMS[me].name)}</span><span class="eyebrow">${sd?esc(dow(sd)+" "+dateOf(sd).getDate()):"Week"}</span><span class="op">${esc(TEAMS[opp].name)}</span></div>${cbDays()}${rows}
    <div class="cbgames"><span class="me">${g(ga)}</span><span class="cbgl">Starter games · ${esc(scope())}</span><span class="op">${g(gb)}</span></div>
    <div class="cbfoot"><span class="muted">Tap a category for details and its graph</span></div></section>`;}
// Hershy (1.26, Hersh's layout): ESPN's board with a day column on each edge and no leader tags.
// Opponent on the left, you on the right: their day · their week | cat | your week · your day.
function hershyBoard(me,opp){
  const vd=viewDay(),dl=vd===TODAY?"Today":`${dow(vd)} ${dateOf(vd).getDate()}`,wkL=fcProj(me).now,wkO=fcProj(opp).now,dyL=dayProj(me,vd),dyO=dayProj(opp,vd);
  const wkLive=started(),dyLive=vd<TODAY||(vd===TODAY&&dyL.gp+dyO.gp>0);
  const rows=CATS.map(c=>{const pair=(o,m,live)=>{const x=val(o,c),y=val(m,c),ld=live&&Math.abs(x-y)>1e-9?(x>y?"o":"m"):"";return [`<b class="num${ld==="o"?" ld":""}">${live?show(x,c):"–"}</b>`,`<b class="num${ld==="m"?" ld":""}">${live?show(y,c):"–"}</b>`];};
    const [od,md2]=pair(dyO.now,dyL.now,dyLive),[ow,mw]=pair(wkO,wkL,wkLive);
    return `<div class="hbrow"><div class="hbd">${od}</div><div class="hbw">${ow}</div><div class="hbc">${c[0]}</div><div class="hbw">${mw}</div><div class="hbd">${md2}</div></div>`;}).join("");
  const ga=counts(me),gb=counts(opp),g=x=>`<b class="num">${x[0]}</b> played · <b class="num">${x[1]}</b> left${x[2]?` · <span class="bx">+${x[2]} bench</span>`:""}`;
  return `<section class="panel catboard hershy" aria-label="Category scoreboard"><div class="cbhead"><span class="op">${esc(TEAMS[opp].name)}</span><span class="eyebrow">${esc(weekName(wk[0]))}</span><span class="me">${esc(TEAMS[me].name)}</span></div>${cbDays(false,true)}
    <div class="hbrow hbh"><div class="hbd">${esc(dl)}</div><div class="hbw">Week</div><div class="hbc"></div><div class="hbw">Week</div><div class="hbd">${esc(dl)}</div></div>${rows}
    <div class="cbgames"><span class="op">${g(gb)}</span><span class="cbgl">Starter games · ${esc(scope())}</span><span class="me">${g(ga)}</span></div></section>`;}
// running totals this week for one category (the Tracker chart for just that row)
function cbGraph(ci){
  if(!DAYS.some(sp=>sp<TODAY))return `<p class="muted cbxn">No games played yet this week.</p>`;
  const labels=DAYS.map(sp=>[`${dow(sp)[0]}${dateOf(sp).getDate()}`,`${dow(sp)} ${dateOf(sp).getDate()}`]),A=[],B=[];let ra=null,rb=null;
  DAYS.forEach(sp=>{if(sp>=TODAY){A.push(null);B.push(null);return;}const x=dayTotals(cur,[sp])||new Array(10).fill(0),y=dayTotals(M.opp,[sp])||new Array(10).fill(0);ra=ra?ra.map((v,i)=>v+x[i]):x.slice();rb=rb?rb.map((v,i)=>v+y[i]):y.slice();A.push(ra);B.push(rb);});
  const fig=miniCharts(labels,A,B,TEAMS[cur].name,TEAMS[M.opp].name,true).split("</figure>").find(s=>s.includes(`<b>${CATS[ci][0]}</b>`));
  return fig?fig+"</figure>":"";}
document.addEventListener("click",e=>{let b=e.target.closest("[data-cbx]");
  if(b){const k=b.dataset.cbx;CBX.has(k)?CBX.delete(k):CBX.add(k);renderHero();return;}
  b=e.target.closest("[data-mview]");if(b){setNav("matchup",b.dataset.mview);return;}
  b=e.target.closest("[data-mlay]");if(b){setMLay(b.dataset.mlay);}});
function setMLay(v){MLAY=v;try{localStorage.setItem("dfMLay",v);}catch(x){}if(typeof savePrefs==="function")savePrefs();render();
}
// one day: starters' actual stats, plus projections for starters still to play that day
function dayProj(T,sp){const {t,gp}=totals(TEAMS[T].P,[sp]),rem=new Array(11).fill(0);
  if(sp>=TODAY)TEAMS[T].P.filter(healthy).forEach(p=>{const pg=pgLine(p.pj);if(pg&&upcoming(p.t,sp)&&gameOn(p.t,sp)&&startedOn(p,sp))pg.forEach((v,i)=>rem[i]+=v);});
  return {now:t,gp,fin:t.map((v,i)=>v+rem[i])};}
document.addEventListener("click",e=>{const b=e.target.closest("[data-cbday]");if(!b)return;selDay=b.dataset.cbday?+b.dataset.cbday:null;MOVING=null;try{renderBox();renderDays();renderHero();}catch(x){}renderRosters();});
function teamHeader(){
  const id=cur;if(!TEAMS[id])return "";
  const r=STAND[id]?.rec||[0,0,0],rk=teamRank(id),stk=streakOf(id),opp=M.opp,m=managerOf(id);
  let wp="";if(opp&&TEAMS[opp]){const p=winProb(fcProj(id),fcProj(opp));wp=`<div class="thwin">${winBar(p)}<span class="muted">vs <button class="tlink inl" data-team="${opp}">${esc(TEAMS[opp].name)}</button> this matchup</span></div>`;}
  return `<section class="panel thead2"><div class="thtop"><span class="hav me lg">${esc(tmInit(id))}</span><div class="hmeta"><span class="thname">${esc(TEAMS[id].name)}</span><span class="hsub">${r.join("-")}${stk?` · ${stk}`:""}${rk?` · ${ord(rk)} of ${Object.keys(TEAMS).length}`:""}${m?` · ${m}`:""}</span></div></div>${wp}</section>`;}
function leagueIcons(){
  const items=SUBTABS.league.filter(([k])=>k==="draft"?PICKS.length>0:k==="setup"?isCommish():true);
  return `<nav class="licons" aria-label="League sections">${items.map(([k,l])=>`<button data-sub="${k}" aria-current="${SUB.league===k}"><span class="lic">${LICON[k]||""}</span>${l}</button>`).join("")}</nav>`;}
function renderHero(){
  const el=$("#heroWrap");if(!el)return;let h="";
  if(L&&Object.keys(TEAMS).length){
    if(nav==="matchup")h=matchupHero()+focusBar()+(simpleM()&&!mFocus()&&M.opp&&TEAMS[M.opp]?`<div class="tabs mview" role="group" aria-label="Matchup view"><button data-mview="stats" aria-selected="${SUB.matchup!=="track"}">Scoreboard</button><button data-mview="track" aria-selected="${SUB.matchup==="track"}">Tracker</button></div>`:"")+(SUB.matchup!=="track"&&!mFocus()?catBoard():"");
    else if(nav==="team")h=teamHeader();
    else if(nav==="league")h=leagueIcons();}
  el.innerHTML=h;el.hidden=!h;
  if(el.querySelector(".catboard")||mFocus())$("#boxWrap").hidden=true;}
// your team · Matchup · their team (ESPN's switch under the score)
function focusBar(){
  const opp=M.opp;if(!TEAMS[cur]||!opp||!TEAMS[opp])return "";const f=mFocus()||"both";
  const b=(k,inner)=>`<button data-mfocus="${k}" class="${k}" aria-pressed="${f===k}">${inner}</button>`,nm=(id,s)=>`<span class="hav ${s} xs">${esc(tmInit(id))}</span><span class="mfn">${esc(TEAMS[id].name)}</span>`;
  return `<div class="mfocus" role="group" aria-label="Show">${b("me",nm(cur,"me"))}${b("both","Matchup")}${b("op",nm(opp,"op"))}</div>`;}
document.addEventListener("click",e=>{const b=e.target.closest("[data-mfocus]");if(!b)return;mfocus=b.dataset.mfocus;try{localStorage.setItem("dfMFocus",mfocus);}catch(x){}
  if(mfocus!=="both"&&SUB.matchup==="track")SUB.matchup="stats";render();});

// ---- Players: Sleeper-style sub-nav and a trending carousel (best value over the last 7 days)
function playersTop(){
  const from=Math.max(1,TODAY-7);
  const hot=Object.values(DIR).map(D=>{const r=lineRange(D.n,from,TODAY);if(!r)return null;const pg=r.t.map(v=>v/r.g),pj=pgLine(D.pj),za=zOf(pg);
    return {D,o:ownerNow(D.n),g:r.g,za,d:pj?za-zOf(pj):null,pg};}).filter(Boolean).sort((a,b)=>b.za-a.za).slice(0,12);
  const cards=hot.map(x=>{const pos=(x.D.el||[]).filter(e=>e<5).map(e=>SLOT[e]).join("/");
    return `<div class="tcard"><span class="tnm" role="button" tabindex="0" data-pcard="${esc(x.D.n)}">${esc(x.D.n)}</span><span class="tmeta">${esc(x.D.t||"")}${pos?` · ${pos}`:""} · ${x.o?esc(teamName(x.o)):"Free agent"}</span>
      <span class="tline num">${x.pg[K.PTS].toFixed(1)} pts · ${x.pg[K.REB].toFixed(1)} reb · ${x.pg[K.AST].toFixed(1)} ast</span>
      <div class="tfoot"><span class="tz ${x.za>=0?"up":"down"}" title="Value per game over the last ${x.g} games (z-score across your categories)">${x.za>=0?"+":""}${x.za.toFixed(1)}${x.d!=null?` <i>${x.d>=0?"▲":"▼"}${Math.abs(x.d).toFixed(1)} vs proj</i>`:""}</span>${actionBtn({n:x.D.n,oid:x.o})}</div></div>`;}).join("");
  return `<section class="panel team" id="trendSec"><div class="teamhead"><span class="tn">Trending</span><span class="sum">Best value per game over the last 7 days · tap a name for the player card</span></div>${hot.length?`<div class="tcar">${cards}</div>`:`<p class="empty">Trending fills in once a few days of box scores are in.</p>`}</section>`;}

// ---- player card tabs
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-pctab]");if(t){const box=t.closest(".pcard");box.querySelectorAll("[data-pctab]").forEach(b=>b.setAttribute("aria-selected",b===t));box.querySelectorAll("[data-pane]").forEach(p=>p.hidden=p.dataset.pane!==t.dataset.pctab);return;}
});
function pcGameLog(n,t){
  const d=DAYLINES[n]||{},days=Object.keys(d).map(Number).sort((a,b)=>b-a);
  if(!days.length)return `<p class="muted">No box scores yet this season.</p>`;
  return `<div class="scroll"><table class="lg pcstats"><thead><tr><th class="nm">Date</th><th class="nm">Opp</th><th>MIN</th>${CATS.map(c=>`<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${days.map(sp=>{const l=d[sp],g=gameOn(t,sp);
    return `<tr><td class="nm">${dow(sp)} ${md(sp)}</td><td class="nm">${g?`${g[1]?"":"@"}${esc(g[0])}`:"–"}</td><td class="num">${l[K.MIN]??"–"}</td>${CATS.map(c=>`<td class="num">${c[1]==="pct"?`${l[c[2]]}/${l[c[3]]}`:l[c[2]]}</td>`).join("")}</tr>`;}).join("")}</tbody></table></div>`;}

// ---- docked league chat bar (phones): latest message one tap away, like Sleeper
const _renderChat=renderChat;
renderChat=function(){
  _renderChat();const dk=$("#chatDock");if(!dk)return;const me=chatMe();
  dk.hidden=!me||CHAT_OPEN;document.body.classList.toggle("hasdock",!dk.hidden);if(dk.hidden)return;
  const ms=chatMsgs("league"),last=ms[ms.length-1];
  $("#chatDockMsg").textContent=last?`${last.from===me?"You":chatName(last.from)}: ${last.text.split("\n")[0]}`:"Say something to the league";
  const u=["league",...new Set(CHAT_D.map(m=>m.ch))].reduce((s,ch)=>s+chatUnread(ch),0),c=$("#chatDockCount");c.hidden=!u;c.textContent=u>9?"9+":u;};
$("#chatDock").onclick=()=>{CHAT_OPEN=true;chatOpen("league");};

// ---- theme: Auto follows the device, Light keeps the Week Board look, Dark is Sleeper-style navy
const THEMES=["auto","light","dark"];let THEME="auto";try{THEME=localStorage.getItem("dfTheme")||"auto";}catch(e){}
function applyTheme(){const r=document.documentElement;if(THEME==="auto")r.removeAttribute("data-theme");else r.dataset.theme=THEME;
  const b=$("#themeBtn");if(b){b.textContent=THEME==="dark"?"☾":THEME==="light"?"☀":"◐";b.title=`Theme: ${THEME} (tap to change)`;b.setAttribute("aria-label",b.title);}}
$("#themeBtn").onclick=()=>{THEME=THEMES[(THEMES.indexOf(THEME)+1)%THEMES.length];try{localStorage.setItem("dfTheme",THEME)}catch(e){}applyTheme();};
applyTheme();
// ---- phone day picker on My Team: one day at a time, who plays and who sits ----
const DOWL=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
function dayPicker(){
  const T=cur;if(nav!=="team"||!TEAMS[T])return "";
  const vd=viewDay(),i=DAYS.indexOf(vd),edit=canEditTeam(T);
  const P=TEAMS[T].P,start=P.filter(p=>startedOn(p,vd)),plays=p=>!!gameOn(p.t,vd)&&p.st!=="OUT";
  const sPlay=start.filter(plays).length,idle=start.filter(p=>!plays(p)).length,can=vd>=TODAY?benchPlan(T,vd).extra:0;
  const chips=DAYS.map(sp=>`<button class="dpc${sp===vd?" on":""}${sp<TODAY?" past":""}${sp===TODAY?" tod":""}" data-dsel="${sp}" aria-pressed="${sp===vd}"><b>${sp===TODAY?"Today":dow(sp)}</b><span>${dateOf(sp).getDate()}</span><i>${playing(T,sp)}</i></button>`).join("");
  const msg=vd<TODAY?`${onDay(T,vd)} starters played`:`${sPlay} of ${start.length} starters play`+(idle?` · <span class="dpw">${idle} starter${idle>1?"s have":" has"} no game</span>`:"")+(can?` · <span class="dpg">${can} on the bench could start</span>`:"");
  const auto=edit&&vd>=TODAY?`<div class="dpa"><button class="btn sm" data-auto="day">Auto-set ${vd===TODAY?"today":dow(vd)}</button><button class="btn ghost sm" data-auto="week">Rest of matchup</button></div>`:"";
  return `<section class="dpick" aria-label="Pick a day"><div class="dph"><button class="dpn" data-dsel="${DAYS[i-1]??(wk[0]>1?"prevwk":"")}" ${i>0||wk[0]>1?"":"disabled"} aria-label="${i>0?"Previous day":"Previous matchup"}">‹</button><div class="dpt"><b>${DOWL[dateOf(vd).getDay()]}, ${md(vd)}${vd===TODAY?' <span class="tbadge">Today</span>':""}</b><span>${msg}</span></div><button class="dpn" data-dsel="${DAYS[i+1]??(wk[0]<WEEKS.length?"nextwk":"")}" ${i<DAYS.length-1||wk[0]<WEEKS.length?"":"disabled"} aria-label="${i<DAYS.length-1?"Next day":"Next matchup"}">›</button></div><div class="dpcs" style="--n:${DAYS.length}">${chips}</div></section>${auto}`;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-dsel]");if(!b||b.disabled||b.dataset.dsel==="")return;
  if(b.dataset.dsel==="nextwk"||b.dataset.dsel==="prevwk"){stepWeek(b.dataset.dsel==="nextwk"?1:-1);return;}
  selDay=+b.dataset.dsel;MOVING=null;try{renderBox();renderDays();if(typeof renderHero==="function")renderHero();}catch(x){}renderRosters();});
