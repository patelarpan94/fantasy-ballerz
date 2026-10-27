
/* ============================================================================
   PEOPLE, PERMISSIONS AND LOCKS
   ============================================================================ */
let REV=0,MOVING=null,WRITE_BLOCKED=false,FORM=null,FORM_DIRTY=false,CONFIRM=null,DQ="",DPOS="ALL",booted=false;
const $=s=>document.querySelector(s);
function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,3000);}
function showErr(e){
  if(e&&(e.code==="invalid_argument"||/denied|forbidden|unauth|permission/i.test(e.code||"")||e.status===403)){WRITE_BLOCKED=true;toast("This league is shared with you as view-only, so changes can't save. Ask the commissioner to share it so you can use it.");try{renderBanner();}catch(x){}}
  else if(e&&e.code==="quota_exceeded")toast("The league database is full.");
  else if(e&&e.code==="taken")toast("Someone got there first. The page has been updated.");
  else toast("Couldn't save. Try again.");
}
const teamName=id=>TEAMS[tnum(id)]?.name||L?.teams.find(t=>tnum(t.id)===tnum(id))?.name||"?";
// who is logged in comes from the badge code entered on the dial pad (see GATE)
const isCommish=()=>SESSION?.role==="commish";
const myTeamNum=()=>SESSION?.role==="team"?tnum(SESSION.team):0;
const canEditTeam=T=>!WRITE_BLOCKED&&!mirror()&&!!T&&(isCommish()||myTeamNum()===T);
const managerOf=T=>myTeamNum()===T?"You":"";
function etMinutes(){try{const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour:"numeric",minute:"numeric",hourCycle:"h23"}).formatToParts(new Date());return +p.find(x=>x.type==="hour").value*60+ +p.find(x=>x.type==="minute").value;}catch(e){return 0;}}
// a player locks for the day once his game has started
function locked(p,sp){if(sp<TODAY)return true;if(sp>TODAY)return false;const g=gameOn(p.t,sp);if(!g)return false;
  const lv=LIVE&&LIVE.g[p.t];if(lv)return lv.s!=="pre";return g[2]!=null&&etMinutes()>=g[2];}
const lockedName=(n,sp)=>{const D=DIR[n];return D?locked({t:D.t},sp):false;};
const newId=()=>`${SEASON}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

/* ============================================================================
   MY TEAM: Move → Here, auto-set lineups
   ============================================================================ */
function moveOptions(T,sp,n){
  const P=TEAMS[T].P,lu={};P.forEach(p=>{const s=p.sl[sp];if(s!=null)lu[p.n]=s;});
  const from=lu[n],opts=[],occ=s=>Object.keys(lu).filter(x=>lu[x]===s);
  [...new Set(LINEUP)].forEach(s=>{if(!canPlayN(n,s))return;const o=occ(s);
    if(s!==from&&o.length<(CAP[s]||0))opts.push({slot:s,label:SLOT[s],sub:"Open spot"});
    o.forEach(x=>{if(x===n)return;const px=P.find(q=>q.n===x);if(locked(px,sp))return;const back=(from===12||from===13||canPlayN(x,from))?(from===13?12:from):12;
      opts.push({slot:s,swap:x,back,label:SLOT[s],sub:`Swap with ${x}${back===12&&from!==12?" (he goes to the bench)":""}`});});});
  if(from!==12)opts.push({slot:12,label:"Bench",sub:""});
  if(from!==13&&CAP[13]&&isOut(n)&&occ(13).length<CAP[13])opts.push({slot:13,label:"IR",sub:"Open spot"});
  return opts;
}
function moveBar(){return "";}
// the slot menu: opens beside the player's slot button (a bottom sheet on phones)
function renderMovePop(){
  const pop=$("#movePop"),bd=$("#moveBd");
  const btn=MOVING&&MOVING.team===cur&&TEAMS[cur]?[...document.querySelectorAll("#rosters [data-move]")].find(b=>b.dataset.move===MOVING.n&&!b.disabled):null;
  if(!btn){pop.hidden=true;bd.hidden=true;return;}
  const sp=MOVING.sp,n=MOVING.n,P=TEAMS[cur].P.find(q=>q.n===n),from=P?.sl[sp],opts=moveOptions(cur,sp,n);
  // each choice shows who plays that day, and best moves (a player with a game in for one without) come first
  const pt=x=>(TEAMS[cur].P.find(q=>q.n===x)||{}).t??DIR[x]?.t,gtx=x=>{const g=gameOn(pt(x),sp);return g?`${g[1]?"vs":"@"} ${g[0]}${sp===TODAY&&g[2]!=null?" "+fmtTime(g[2]):""}`:"No game";};
  const me=!!gameOn(pt(n),sp),val=o=>{if(o.slot>=12)return me?-1:1;const other=o.swap?!!gameOn(pt(o.swap),sp):false;return (me?1:0)-(other?1:0);};
  const tag=o=>{const v=val(o);if(o.slot>=12)return me?'<span class="mpg bad">Loses a game</span>':"";return v>0?'<span class="mpg good">+1 game</span>':v<0?'<span class="mpg bad">Loses a game</span>':"";};
  const row=(o,i)=>`<button class="mpo" data-here="${i}"><span class="slot${o.slot===12?" bench":o.slot===13?" ir":""}">${o.label}</span><span class="mpt">${o.swap?`Swap with <b>${esc(o.swap)}</b>${o.back===12&&from!==12?' <span class="muted">· he goes to the bench</span>':""}`:o.slot===12?"Move to the bench":o.slot===13?"Move to IR":"Open spot"}${o.swap?`<small class="mpgm">${esc(gtx(o.swap))}</small>`:""}</span>${tag(o)}</button>`;
  const start=opts.map((o,i)=>[o,i]).filter(([o])=>o.slot<12).sort((a,b)=>val(b[0])-val(a[0])),rest=opts.map((o,i)=>[o,i]).filter(([o])=>o.slot>=12);
  pop.innerHTML=`<div class="mphead"><div><b>${esc(n)}</b><span>Now ${SLOT[from]} · ${dow(sp)} ${md(sp)} · <b class="${me?"mpme":"mpno"}">${esc(gtx(n))}</b></span></div><button class="chbtn" data-move="${esc(n)}" aria-label="Close">✕</button></div>
    <div class="mpbody">${start.length?`<div class="mpsec">Starting spots</div>${start.map(([o,i])=>row(o,i)).join("")}`:""}${rest.length?`${start.length?'<div class="mpsec">Other</div>':""}${rest.map(([o,i])=>row(o,i)).join("")}`:""}${opts.length?"":`<p class="empty">No open spots he's eligible for.</p>`}</div>
    <div class="mpfoot">Applies to ${dow(sp)} ${md(sp)} and later days, until you set a later day differently.</div>`;
  pop.hidden=false;
  const phone=PHONE();bd.hidden=!phone;pop.classList.toggle("sheetm",phone);
  if(phone){pop.style.left=pop.style.top="";}
  else{const r=btn.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight;
    let x=r.right+8,y=r.top+scrollY-8;if(x+w>innerWidth-12)x=Math.max(12,r.left-w-8);
    if(r.top+h>innerHeight-12)y=Math.max(scrollY+12,scrollY+innerHeight-h-12);
    pop.style.left=x+"px";pop.style.top=y+"px";}
  if(!pop.contains(document.activeElement))pop.querySelector(".mpo")?.focus({preventScroll:true});
}
async function saveSnaps(T,obj){
  const id=SEASON+"_t"+T;
  try{if(LUDOCS[T])await Store.update("lineups",id,{snaps:obj});else await Store.set("lineups",id,{season:SEASON,team:tkey(T),snaps:obj});return true;}catch(e){showErr(e);return false;}
}
async function doMove(i){
  const T=MOVING.team,sp=MOVING.sp,n=MOVING.n,o=moveOptions(T,sp,n)[i];if(!o)return;
  const map={};TEAMS[T].P.forEach(p=>{const s=p.sl[sp];if(s!=null)map[p.n]=s;});
  map[n]=o.slot;if(o.swap)map[o.swap]=o.back;
  MOVING=null;if(await saveSnaps(T,{[sp]:map}))toast(`${n} moved to ${SLOT[o.slot]}`);
}
// best lineup for a day: healthy players with a game first, by rank, fitted to slots by eligibility; locked players stay put
function autoLineup(T,sp){
  const P=TEAMS[T].P.filter(p=>p.sl[sp]!=null),map={},fixed=P.filter(p=>locked(p,sp)||p.sl[sp]===13);
  fixed.forEach(p=>map[p.n]=p.sl[sp]);
  const slots=LINEUP.slice();fixed.forEach(p=>{const i=slots.indexOf(p.sl[sp]);if(p.sl[sp]<12&&i>=0)slots.splice(i,1);});
  const rank=p=>p.rk&&(p.rk[0]||p.rk[1])?(p.rk[0]||p.rk[1]):999;
  const plays=p=>!!gameOn(p.t,sp)&&p.st!=="OUT";
  const cand=P.filter(p=>!fixed.includes(p)).sort((a,b)=>(plays(b)-plays(a))||(rank(a)-rank(b)));
  const owner=new Array(slots.length).fill(null);
  const tryA=(p,seen)=>{for(let j=0;j<slots.length;j++){if(seen[j]||!canPlayN(p.n,slots[j]))continue;seen[j]=1;if(owner[j]==null||tryA(owner[j],seen)){owner[j]=p;return true;}}return false;};
  cand.filter(plays).forEach(p=>tryA(p,[]));cand.filter(p=>!plays(p)).forEach(p=>tryA(p,[]));
  owner.forEach((p,j)=>{if(p)map[p.n]=slots[j];});cand.forEach(p=>{if(map[p.n]==null)map[p.n]=12;});
  return map;
}
function autoBar(){
  const T=cur;if(nav!=="team"||!TEAMS[T]||!canEditTeam(T))return "";
  const vd=viewDay();if(!DAYS.some(sp=>sp>=TODAY))return "";
  return `<section class="autobar" aria-label="Auto-set lineup"><div class="abtxt"><b>Auto-set lineup</b><span class="hint">Starts healthy players who have a game.</span></div>
    <div class="row"><button class="btn sm" data-auto="day" ${vd<TODAY?"disabled":""}>${vd===TODAY?"Today":dow(vd)+" "+md(vd)}</button><button class="btn ghost sm" data-auto="week">Every day of the matchup</button></div></section>`;
}
async function autoSet(which){
  const T=cur,vd=viewDay(),days=which==="week"?DAYS.filter(sp=>sp>=Math.max(TODAY,vd)):which==="today"?[TODAY]:[vd];
  if(!days.length||!canEditTeam(T))return;
  // build each day on top of the previous day's result so carry-forward stays consistent
  const obj={};days.forEach(sp=>obj[sp]=autoLineup(T,sp));
  if(await saveSnaps(T,obj))toast(days.length>1?`Lineups set for ${days.length} days`:`Lineup set for ${dow(days[0])} ${md(days[0])}`);
}
async function setAutoDaily(on){
  const T=cur,id=SEASON+"_t"+T;if(!canEditTeam(T))return;
  try{if(LUDOCS[T])await Store.update("lineups",id,{auto:on});else await Store.set("lineups",id,{season:SEASON,team:tkey(T),snaps:{},auto:on});
    toast(on?"Your lineup will be set each day":"Daily auto-set is off");if(on&&TODAY<=SEASON_END)saveSnaps(T,{[TODAY]:autoLineup(T,TODAY)});}catch(e){showErr(e);}
}
// teams with "every day" on get today's lineup set by the first logged-in app that opens, unless the manager already set today
const autoDone=new Set();
function autoDaily(){
  if(!SESSION||!L||WRITE_BLOCKED||TODAY<1||TODAY>SEASON_END)return;
  Object.entries(LUDOCS).forEach(([T,d])=>{T=+T;const k=T+"_"+TODAY;if(!d.auto||!TEAMS[T]||(typeof lgLocked==="function"&&lgLocked(T))||autoDone.has(k)||(d.snaps&&d.snaps[TODAY]))return;autoDone.add(k);saveSnaps(T,{[TODAY]:autoLineup(T,TODAY)});});
}

/* ============================================================================
   LEAGUE: scoreboard, standings + playoffs, season schedule, transactions
   ============================================================================ */
const rankList=vals=>vals.map(v=>1+vals.filter(o=>o>v+1e-9).length);
const ord=n=>n+(n%100>=11&&n%100<=13?"th":["th","st","nd","rd"][n%10]||"th");
const sec=(title,sum,body)=>`<section class="panel team"><div class="teamhead"><span class="tn">${title}</span><span class="sum">${sum}</span></div>${body}</section>`;
const colsCats=extra=>`<colgroup><col class="name">${"<col>".repeat(CATS.length)}${extra||""}</colgroup>`;
const tlink=id=>`<button class="tlink" data-team="${id}">${esc(TEAMS[id]?.name||"TBD")}</button>`;
function scoreView(){
  const live=started(),ids=Object.keys(TEAMS).map(Number);
  const pairs=W[wk[0]]||[];
  const rows=pairs.map(([hm,aw])=>{
    const sa=score(hm),sb=score(aw);let w=0,l=0,t=0;
    const cells=CATS.map(c=>{const x=val(sa,c),y=val(sb,c);if(live){x===y?t++:x>y?w++:l++;}return [x,y];});
    const r=(id,mine,rec)=>`<tr class="${id===cur||id===M.opp?"mine":""}"><td>${tlink(id)}</td>${CATS.map((c,i)=>{const [x,y]=cells[i],v=mine?x:y,o=mine?y:x;return `<td class="${live&&v>o?"lead":""}">${live?show(v,c):"–"}</td>`;}).join("")}<td class="rec">${rec}</td></tr>`;
    return r(hm,true,live?`${w}-${l}-${t}`:"–")+r(aw,false,live?`${l}-${w}-${t}`:"–")+`<tr class="gap"><td colspan="${CATS.length+2}"></td></tr>`;
  }).join("");
  const wk_=ids.map(id=>({id,sc:score(id)})),wRank=CATS.map(c=>rankList(wk_.map(w=>val(w.sc,c)))),n=ids.length;
  const ranks=wk_.map((w,i)=>`<tr class="${w.id===cur?"mine":""}"><td>${tlink(w.id)}</td>${CATS.map((c,ci)=>{const r=wRank[ci][i];return `<td class="rk${live&&r<=Math.ceil(n*.3)?" top":""}${live&&r>n-Math.ceil(n*.3)?" low":""}">${live?r:"–"}</td>`;}).join("")}<td class="c num">${live?(wRank.reduce((s,r)=>s+r[i],0)/CATS.length).toFixed(1):"–"}</td></tr>`).join("");
  const bye=BYES[wk[0]]?`<p class="foot-note">Bye: ${esc(TEAMS[BYES[wk[0]]]?.name||"")}</p>`:"";
  const aw=awardsCard(wk[0]),awE=aw.includes('class="empty"');
  return (awE?"":aw)+sec(`${weekLabel(wk)} · all matchups`,"Tap a team to open its matchup",pairs.length?`<div class="scroll"><table class="box lg num" style="min-width:${200+CATS.length*70}px">${colsCats('<col class="rec">')}<thead><tr><th>Team</th>${CATS.map(c=>`<th>${c[0]}</th>`).join("")}<th class="rec">W-L-T</th></tr></thead><tbody>${rows}</tbody></table></div>${bye}`:`<p class="empty">${esc(noOppText())}</p>`)
   +sec("This week's category ranks","1 = best in the league this week · last column is the average rank",`<div class="scroll"><table class="box lg rkt num" style="min-width:${200+CATS.length*60}px">${colsCats('<col class="rec">')}<thead><tr><th>Team</th>${CATS.map(c=>`<th>${c[0]}</th>`).join("")}<th class="rec">Avg</th></tr></thead><tbody>${ranks}</tbody></table></div>`)+(awE?aw:"");
}
function standView(){
  const order=standOrder(),P=Math.min(+L.playoffTeams||4,order.length),sRank=CATS.map(c=>rankList(order.map(id=>val(STAND[id].vbs,c))));
  const stand=order.map((id,i)=>`<tr class="${id===cur?"mine":""}${i===P?" cut":""}"><td class="c num">${i+1}</td><td class="nm">${tlink(id)}${taco(id)}</td><td class="rec">${STAND[id].rec.join("-")}</td><td class="num">${pctW(STAND[id].rec).toFixed(3).replace(/^0/,"")}</td>${CATS.map((c,ci)=>`<td>${show(val(STAND[id].vbs,c),c)}<small>${ord(sRank[ci][i])}</small></td>`).join("")}</tr>`).join("");
  const done=[];for(let n=1;n<=regWeeks();n++)if(weekDone(n))done.push(n);
  let br="";
  if(PO){br=sec(PO.champ?`Champion: ${esc(TEAMS[PO.champ].name)}`:"Playoff bracket",`Top ${P} · each round is one matchup week · ties go to the higher seed`,`<div class="bracket">${PO.rounds.map((r,ri)=>`<div class="bround"><h3>${weekName(r.n)} · ${md(CAL[r.n-1][1])}</h3>${r.pairs.map(p=>{const seed=id=>PO.seeds.indexOf(id)+1;const line=id=>id?`<div class="${p.win===id?"w":""}"><span><span class="sd">${seed(id)}</span>${esc(TEAMS[id].name)}</span></div>`:id===null?`<div><span class="muted">Bye</span></div>`:`<div><span class="muted">TBD</span></div>`;return `<div class="bm">${line(p.a)}${line(p.b)}</div>`;}).join("")}</div>`).join("")}</div>`);}
  return sec("Standings",`${done.length?`Through week ${done[done.length-1]}`:"No completed weeks yet"} · ${L.format==="most"?"one W per week for winning more categories":"every category counts as a W, L or T"} · dashed line = playoff cut (top ${P})`,`<div class="scroll"><table class="box lg num" style="min-width:${330+CATS.length*70}px"><colgroup><col style="width:44px"><col class="name"><col style="width:86px"><col style="width:64px">${"<col>".repeat(CATS.length)}</colgroup><thead><tr><th class="c">#</th><th class="nm">Team</th><th>W-L-T</th><th>Pct</th>${CATS.map(c=>`<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${stand}</tbody></table></div><p class="foot-note">Category columns are season totals from starting lineups (small number = league rank).</p>`)+br+powerView()+rivalView();
}
function seasonView(){
  const now=weekOf(Math.min(TODAY,SEASON_END))[0],start=+L.startWeek||1;
  const cards=CAL.map(w=>{const n=w[0];if(n<start)return "";const pairs=W[n]||[],po=isPlayoff(n);
    const res=([a,b])=>{if(!weekDone(n))return null;const r=h2h(wt(a,n),wt(b,n));return r;};
    const items=pairs.map(([a,b])=>{const r=res([a,b]);const cls=id=>`${id===cur?"mine":""}${r&&((id===a&&r[0]>r[1])||(id===b&&r[1]>r[0]))?" won":""}`;
      return `<li><span class="${cls(a)}">${esc(TEAMS[a].name)}</span><span class="vs">${r?`${r[0]}-${r[1]}-${r[2]}`:"vs"}</span><span class="${cls(b)}">${esc(TEAMS[b].name)}</span></li>`;}).join("");
    const bye=BYES[n]?`<li class="bye">${esc(TEAMS[BYES[n]]?.name||"")}: bye</li>`:"";
    const body=items||bye?items+bye:`<li class="bye">${po?"Set when the regular season ends":"No matchups"}</li>`;
    return `<section class="panel wkc${n===now?" now":""}"><h3><button class="tlink" data-week="${n}" style="font-size:1rem">${weekName(n)}</button><span>${md(w[1])} – ${md(w[2])}</span></h3><ul>${body}</ul></section>`;}).join("");
  return `<div class="note info">${regWeeks()-start+1} regular-season weeks${start>1?` starting in week ${start}`:""}, then ${playoffRounds()} playoff ${playoffRounds()>1?"rounds":"round"} for the top ${Math.min(+L.playoffTeams||4,L.teams.length)}. ${L.teams.length%2?"With an odd number of teams, one team has a bye each week. ":""}Finished weeks show the category score.</div><div class="weeks">${cards}</div>`;
}
function txView(){
  const fmtD=ms=>new Date(ms).toLocaleString("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  const done=TXLOG.slice().reverse().map(t=>{let parts="";
    if(t.type==="trade")parts=(t.reverses?`<span class="cmtag">Commissioner reversal</span><br>`:t.decidedRole==="commish"?`<span class="cmtag">Commissioner approved</span><br>`:"")+`<span class="tx trade">Traded</span> ${t.give.map(esc).join(", ")} <span class="muted">to ${esc(teamName(t.to))}</span><br><span class="tx trade">Traded</span> ${t.get.map(esc).join(", ")} <span class="muted">to ${esc(teamName(t.from))}</span>`;
    else parts=(t.add?`<span class="tx add">Added</span> ${esc(t.add)}${cups(t.add)} <span class="muted">to ${esc(teamName(t.team))}</span>`:"")+(t.add&&t.drop?"<br>":"")+(t.drop?`<span class="tx drop">Dropped</span> ${esc(t.drop)}${cups(t.drop)} <span class="muted">from ${esc(teamName(t.team))}</span>`:"");
    const rev="";
    return `<tr${t.ok?"":' class="txbad"'}><td class="num muted">${fmtD(t.eff||t.at)}</td><td>${t.type==="trade"?"Trade":"Free agent"}${t.ok?"":`<br><span class="muted" style="text-decoration:none">Didn't go through: ${esc(t.why)}</span>`}</td><td>${parts}${rev}</td></tr>`;}).join("");
  const open=tradesNeedingMe();
  return (open?`<div class="note info banner">${open} ${open===1?"trade needs":"trades need"} you. <button class="btn sm" data-sub-go="league:trades">Go to Trades</button></div>`:"")+sec("Transactions","Adds, drops and completed trades, newest first",done?`<div class="scroll"><table class="txt"><tbody>${done}</tbody></table></div>`:`<p class="empty">No adds, drops or trades yet.</p>`);
}
// ---- NBA schedule grid: all 30 teams by day for this week
function nbaView(){
  const teams=Object.keys(SCHED).filter(t=>t!=="FA");
  const mine=id=>{const c={};if(id&&TEAMS[id])TEAMS[id].P.filter(healthy).forEach(p=>c[p.t]=(c[p.t]||0)+1);return c;};
  const cm=mine(cur),co=mine(M.opp);
  const hits={};if(Q)Object.values(DIR).forEach(p=>{if(matches(p.n))(hits[p.t]=hits[p.t]||[]).push(p.n);});
  const rows=teams.filter(t=>!Q||norm(t).includes(Q)||hits[t]).map(t=>{const games=DAYS.filter(sp=>gameOn(t,sp));return {t,n:games.length,left:games.filter(sp=>upcoming(t,sp)).length,b2b:games.filter(sp=>gameOn(t,sp-1)).length};})
    .sort((a,b)=>b.n-a.n||a.t.localeCompare(b.t)).map(r=>{
      const cells=DAYS.map(sp=>{const g=gameOn(r.t,sp),cls=`g${sp<TODAY?" past":""}${sp===TODAY?" tod":""}${selDay===sp?" sel":""}`;
        if(!g)return `<td class="${cls}"><span class="none">·</span></td>`;
        const b2b=gameOn(r.t,sp-1),Lg=sp===TODAY&&LIVE&&LIVE.day===TODAY?LIVE.g[r.t]:null;
        return `<td class="${cls}"><span class="gm"><span class="at">${g[1]?"vs":"@"}</span><span>${g[0]}</span>${b2b?' <span class="b2b">B2B</span>':""}${Lg?`<span class="t ${Lg.s==="in"?"live":""}">${liveTxt(Lg)}</span>`:""}</span></td>`;}).join("");
      return `<tr><td class="pl"><b>${r.t}</b><span class="pmeta">${cm[r.t]?` · You ${cm[r.t]}`:""}${co[r.t]?` · Opp ${co[r.t]}`:""}</span>${hits[r.t]?`<div class="hits">${hits[r.t].slice(0,6).map(hlName).join(", ")}</div>`:""}</td>${cells}<td class="c"><span class="left">${r.n}</span></td><td class="c num">${r.left}</td><td class="c num">${r.b2b||"–"}</td></tr>`;
    }).join("");
  if(!rows)return `<section class="panel team"><div class="teamhead"><span class="tn">NBA schedule</span></div><p class="empty">No NBA team or player matches “${esc(Q)}”.</p></section>`;
  return `<section class="panel team"><div class="teamhead"><span class="tn">NBA schedule · ${weekLabel(wk).replace(/^.*? · /,"")}</span><span class="sum">"You"/"Opp" = healthy rostered players on that NBA team</span></div>
    <div class="scroll"><table class="grid nba" style="min-width:${260+DAYS.length*84}px"><colgroup><col class="pl">${DAYS.map(()=>"<col>").join("")}<col class="left"><col class="left"><col class="left"></colgroup>
    <thead><tr><th class="pl">Team</th>${DAYS.map(sp=>`<th class="${sp===TODAY?"todayh":""}">${dow(sp)} ${dateOf(sp).getDate()}</th>`).join("")}<th class="c">Games</th><th class="c">Left</th><th class="c">B2B</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

/* ============================================================================
   PLAYERS: free agents and everyone, with add (+), drop (−) and trade (⇄)
   ============================================================================ */
const actTeam=()=>canEditTeam(cur)?cur:myTeamNum();
function allPlayers(){
  const out=[];
  Object.values(DIR).forEach(D=>{const o=ownerNow(D.n);
    if(o&&TEAMS[o]){const p=TEAMS[o].P.find(q=>q.n===D.n);if(p){out.push({...p,k:"r|"+D.n,own:TEAMS[o].name,oid:o});return;}}
    if(!D.pj&&!D.ss)return;
    out.push({...mkP(D.n),k:"f|"+D.n,own:"Free agent",oid:0});});
  return out;
}
const apSrc=r=>apMode==="proj"?r.pj:r.ss;
let apTop=0;
const seasonRanked=()=>Object.values(DIR).some(p=>p.srk);
const rankOf=(r,sr)=>{if(!r.rk)return null;const v=apMode==="proj"||!sr?r.rk[1]:r.rk[0];return v||null;};
function compareView(list){
  const sel=CMP.map(k=>list.find(r=>r.k===k)).filter(Boolean);if(!sel.length)return "";
  const tot=pjMode==="tot",rowsDef=[["GP","gp"],["MIN","min"],...CATS.map(c=>[c[0],c])];
  const body=rowsDef.map(([lab,c])=>{const vals=sel.map(r=>statOf(apSrc(r),c,tot));const best=Math.max(...vals.filter(v=>v!=null));
    return `<tr><th>${lab}</th>${vals.map(v=>`<td class="r num${v!=null&&sel.length>1&&v===best&&c!=="gp"&&c!=="min"?" best":""}">${fmtStat(v,c,tot)}</td>`).join("")}</tr>`;}).join("");
  const wins=sel.map((r,i)=>CATS.filter(c=>{const vs=sel.map(x=>statOf(apSrc(x),c,tot));return vs[i]!=null&&vs[i]===Math.max(...vs.filter(v=>v!=null));}).length);
  return `<section class="panel team cmp"><div class="teamhead"><span class="tn">Compare</span><span class="sum">${apMode==="proj"?projTag+" ":""}${apMode==="proj"?"Full season":"Season so far"} · ${tot?"totals":"per game"} · best in each category highlighted <button class="mini-b" data-cmpclear>Clear</button></span></div>
  <div class="scroll"><table class="cmpt"><thead><tr><th></th>${sel.map(r=>`<th><div class="cmph">${playerCell(r)}<button class="cmpx" data-cmp="${esc(r.k)}" aria-label="Remove ${esc(r.n)}">✕</button></div><div class="cmpo">${esc(r.own)}</div></th>`).join("")}</tr></thead>
  <tbody>${body}<tr class="tot"><th>Categories won</th>${wins.map(w=>`<td class="r num${sel.length>1&&w&&w===Math.max(...wins)?" best":""}">${sel.length>1?w+" of "+CATS.length:"–"}</td>`).join("")}</tr></tbody></table></div></section>`;
}
function actionBtn(r){
  const T=actTeam();if(!T||WRITE_BLOCKED||mirror())return "";
  if(r.oid===0)return `<button class="actb add" data-add="${esc(r.n)}" aria-label="Add ${esc(r.n)}" title="Add">+</button>`;
  if(r.oid===T)return `<button class="actb drop" data-drop="${esc(r.n)}" aria-label="Drop ${esc(r.n)}" title="Drop">−</button>`;
  return `<button class="actb trade" data-trade="${esc(r.n)}" aria-label="Offer a trade for ${esc(r.n)}" title="Trade">⇄</button>`;
}
// ESPN % rostered across all leagues, with the latest daily change
const rostPct=n=>{const o=NBA?.own?.[n];return o?o[0]:null;};
const rostTxt=(n,cls="")=>{const o=NBA?.own?.[n];if(!o)return "–";const c=+o[1]||0;return `${(+o[0]).toFixed(1)}%${Math.abs(c)>=.05?` <span class="rch ${c>0?"up":"dn"}${cls}">${c>0?"▲":"▼"}${Math.abs(c).toFixed(1)}</span>`:""}`;};
function allView(){
  const tot=pjMode==="tot",all=allPlayers(),sr=seasonRanked();
  let list=all.filter(r=>matches(r.n)&&(!apTop||(rankOf(r,sr)!=null&&rankOf(r,sr)<=apTop))&&(apPos==="all"||(r.el||[]).includes(SLOT_ID[apPos]))&&(apOwn==="all"||(apOwn==="fa"?r.oid===0:apOwn==="ros"?r.oid!==0:String(r.oid)===apOwn)));
  const leftOf=r=>DAYS.filter(sp=>upcoming(r.t,sp)&&gameOn(r.t,sp)).length;
  const keyOf={rank:r=>-(rankOf(r,sr)??9999),name:r=>r.n,team:r=>r.own,left:leftOf,rost:r=>rostPct(r.n)??-1,gp:r=>statOf(apSrc(r),"gp",tot)??-1,min:r=>statOf(apSrc(r),"min",tot)??-1};
  CATS.forEach(c=>keyOf[c[0]]=r=>statOf(apSrc(r),c,tot)??-1);
  const desc=!apSort.startsWith("-"),k=apSort.replace(/^-/,""),f=keyOf[k]||keyOf.rank;
  list.sort((a,b)=>{const x=f(a),y=f(b);const c=typeof x==="string"?x.localeCompare(y):(y-x);return desc?c:-c;});
  const shown=list.slice(0,300);
  const th=(key,label,cls="r")=>`<th class="${cls}"><button class="sortb${k===key?" on":""}" data-apsort="${key}">${label}${k===key?(desc?" ↓":" ↑"):""}</button></th>`;
  const T=actTeam();
  // filters: whose players and position stay in view; the rest fold into More filters on phones
  const ownSel=`<select class="apown" data-apown aria-label="Whose players"><option value="fa"${apOwn==="fa"?" selected":""}>Free agents</option><option value="all"${apOwn==="all"?" selected":""}>All players</option><option value="ros"${apOwn==="ros"?" selected":""}>Rostered</option>${Object.values(TEAMS).map(t=>`<option value="${t.id}"${apOwn===String(t.id)?" selected":""}>${esc(t.name)}</option>`).join("")}</select>`;
  const posT=`<div class="tabs sm">${["all","PG","SG","SF","PF","C"].map(x=>`<button data-appos="${x}" aria-selected="${apPos===x}">${x==="all"?"All":x}</button>`).join("")}</div>`;
  const more=`<div class="tabs sm"><button data-apmode="season" aria-selected="${apMode==="season"}">Season</button><button data-apmode="proj" aria-selected="${apMode==="proj"}">Projected</button></div>
    <div class="tabs sm"><button data-pjm2="pg" aria-selected="${!tot}">Per game</button><button data-pjm2="tot" aria-selected="${tot}">Totals</button></div>
    <div class="tabs sm">${[0,25,50,100,150].map(x=>`<button data-aptop="${x}" aria-selected="${apTop===x}">${x?"Top "+x:"Any rank"}</button>`).join("")}</div>`;
  const moreSum=`${apMode==="proj"?"Projected":"Season"} · ${tot?"Totals":"Per game"} · ${apTop?"Top "+apTop:"Any rank"}`;
  const ctl=PHONE()?`<div class="smode apctl">${ownSel}${posT}<details class="apmore"${APMORE?" open":""}><summary>More filters <span class="muted">${moreSum}</span></summary><div class="apmorein">${more}</div></details></div>`:`<div class="smode apctl">${ownSel}${posT}${more}</div>`;
  // columns: the player is pinned on the left; on phones the categories come right after him so stats show without scrolling
  const ph=PHONE(),cmpC={w:46,h:()=>"<th></th>",d:r=>{const on=CMP.includes(r.k);return `<td class="c cmpc"><button class="cmpb${on?" on":""}" data-cmp="${esc(r.k)}" aria-pressed="${on}" aria-label="Compare ${esc(r.n)}" title="Compare">${on?"✓":""}</button></td>`;}},
    plC={w:ph?168:180,cls:"pl",h:()=>th("name","Player","pl"),d:r=>ph?`<td class="pl"><div class="apn">${playerCell(r)}${actionBtn(r)}</div></td>`:`<td class="pl">${playerCell(r)}</td>`},
    actC={w:52,h:()=>`<th class="c"></th>`,d:r=>`<td class="c">${actionBtn(r)}</td>`},
    teamC={w:100,h:()=>th("team","Team",""),d:r=>`<td class="own">${esc(r.own)}</td>`},
    rankC={w:54,h:()=>th("rank","Rank"),d:r=>`<td class="r num${rankOf(r,sr)?"":" zero"}">${rankOf(r,sr)??"–"}</td>`},
    rostC={w:116,h:()=>th("rost","Rost %"),d:r=>`<td class="r num rost${rostPct(r.n)==null?" zero":""}">${rostTxt(r.n)}</td>`},
    leftC={w:50,h:()=>th("left","Left","c"),d:r=>`<td class="c"><span class="left">${leftOf(r)}</span></td>`},
    statC=c=>({w:ph?(c==="min"?52:50):c==="gp"?48:c==="min"?60:64,h:()=>typeof c==="string"?th(c,c.toUpperCase()):th(c[0],c[0]),d:r=>{const v=statOf(apSrc(r),c,tot);return `<td class="r num${v==null?" zero":""}">${fmtStat(v,c,tot)}</td>`;}});
  const cols=ph?[plC,...CATS.map(statC),leftC,rankC,rostC,teamC,statC("gp"),statC("min"),cmpC]:[cmpC,plC,actC,teamC,rankC,rostC,leftC,statC("gp"),statC("min"),...CATS.map(statC)];
  const rows=shown.map(r=>`<tr${CMP.includes(r.k)?' class="cmpon"':""}>${cols.map(c=>c.d(r)).join("")}</tr>`).join("");
  const who=T?`Acting for <b>${esc(TEAMS[T]?.name||"")}</b> · ${rosterNow(T).length}/${ROSTER_MAX} on the roster${+L.addLimit?` · ${pickupTxt(T)}`:""}`:"Log in with your team code to add, drop and trade";
  if(APV==="market")return playersTop()+espnTrend()+marketHot();
  return ctl+compareView(all)+`<section class="panel team"><div class="teamhead"><span class="tn">${apOwn==="fa"?"Free agents":"Players"}</span><span class="sum">${who} · ${list.length} players · ${apMode==="proj"?projTag+" full season":"season so far"} ${tot?"totals":"per game"}</span></div>
  ${shown.length?`<div class="scroll apscroll"><table class="grid fa ap${ph?" apph":""}" style="width:${cols.reduce((t,c)=>t+c.w,0)}px;min-width:100%"><colgroup>${cols.map(c=>`<col style="width:${c.w}px">`).join("")}</colgroup>
  <thead><tr>${cols.map(c=>c.h()).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`:noMatch()}
  <p class="foot-note">${list.length>shown.length?`Showing the first ${shown.length}. Narrow with filters or search. `:""}Rank = ${apMode==="proj"||!sr?"ESPN preseason rank":"our season rank from per-game category stats"}. Rost % = share of all ESPN leagues that roster him, with the daily change. Left = games left this week. + adds a free agent, − drops one of yours, ⇄ offers a trade. Tick the box on the left to compare up to 4 players. Tap a column to sort; tap again to reverse.</p></section>`;
}

/* ---- sheets: add, drop, trade ---- */
const sheet=()=>$("#sheet");
function openSheet(title,html){$("#sheetTitle").textContent=title;$("#sheetBody").innerHTML=html;sheet().showModal();}
function rosterPick(T,name,type,checked,disableLocked){
  return `<div class="picklist">${rosterNow(T).map(n=>{const p=TEAMS[T].P.find(q=>q.n===n)||mkP(n);const lk=disableLocked&&lockedName(n,TODAY);return `<label><input type="${type}" name="${name}" value="${esc(n)}" ${checked.includes(n)?"checked":""}>${playerCell(p,false)}${lk?'<span class="lock">plays today · leaves tomorrow</span>':""}</label>`;}).join("")}</div>`;
}
const pickupsUsed=(T,sp)=>TXLOG.filter(t=>t.type==="add"&&t.add&&t.ok&&t.role!=="commish"&&tnum(t.team)===T&&weekOf(t.day||TODAY)[0]===weekOf(sp)[0]).length;
const pickupsLeft=T=>{const lim=+L.addLimit||0;return lim?Math.max(0,lim-pickupsUsed(T,TODAY)):Infinity;};
const pickupTxt=T=>{const lim=+L.addLimit||0;return lim?`${pickupsUsed(T,TODAY)} of ${lim} pickups used this matchup`:"";};
function sheetAdd(n){
  const T0=actTeam();if(T0&&!isCommish()&&pickupsLeft(T0)<=0){const nw=WEEKS[weekOf(TODAY)[0]];
    return openSheet(`Add ${n}`,`<p>You've used all ${L.addLimit} pickups for this matchup.${nw?` You can add players again on ${dow(nw[1])} ${md(nw[1])}.`:""}</p><div class="sheetacts"><button class="btn" data-sheet="close">OK</button></div>`);}
  const T=actTeam(),full=rosterNow(T).length>=ROSTER_MAX,lk=lockedName(n,TODAY);
  openSheet(`Add ${n}`,`<div class="picklist"><label style="cursor:default">${playerCell(mkP(n))}</label></div>
    <p>To <b>${esc(TEAMS[T].name)}</b>.${+L.addLimit&&!isCommish()?` This uses 1 of your ${pickupsLeft(T)} pickups left this matchup.`:""} ${lk?"His game today has started, so he joins tomorrow.":"He can play today if his game hasn't started."} New players fill an open starting slot if there is one, otherwise the bench.</p>
    <p class="flabel">${full?"Your roster is full. Drop one player:":"Drop a player (optional)"}</p>
    ${full?"":`<div class="picklist"><label><input type="radio" name="drop" value="" checked><span>Don't drop anyone</span></label></div>`}${rosterPick(T,"drop","radio",[],true)}
    <div class="sheetacts"><button class="btn ghost" data-sheet="close">Cancel</button><button class="btn good" data-sheet="add" data-n="${esc(n)}">Add player</button></div>`);
}
function sheetDrop(n){
  const T=actTeam();
  openSheet(`Drop ${n}`,`<div class="picklist"><label style="cursor:default">${playerCell(TEAMS[T].P.find(q=>q.n===n)||mkP(n))}</label></div><p>He goes back to free agency${lockedName(n,TODAY)?" after today's game":" right away"}. Anyone can add him after that.</p>
    <div class="sheetacts"><button class="btn ghost" data-sheet="close">Cancel</button><button class="btn danger" data-sheet="drop" data-n="${esc(n)}">Drop player</button></div>`);
}
async function sheetAct(b){
  const a=b.dataset.sheet,T=actTeam();
  if(a==="close"){sheet().close();return;}
  const body=$("#sheetBody"),day=n=>lockedName(n,TODAY)?TODAY+1:TODAY;
  try{
    if(a==="add"){const n=b.dataset.n,drop=(body.querySelector('input[name="drop"]:checked')||{}).value||null;
      if(rosterNow(T).length>=ROSTER_MAX&&!drop)return toast("Pick a player to drop first.");
      if(ownerNow(n))return toast(n+" is already on a roster.");
      if(!isCommish()&&pickupsLeft(T)<=0)return toast("No pickups left this matchup.");
      await Store.set("tx",newId(),{season:SEASON,type:"add",team:tkey(T),add:n,drop,addDay:day(n),dropDay:drop?day(drop):null,day:TODAY,at:Date.now(),...actor()});
      toast(`${n} added${drop?`, ${drop} dropped`:""}`);}
    else if(a==="drop"){const n=b.dataset.n;await Store.set("tx",newId(),{season:SEASON,type:"drop",team:tkey(T),add:null,drop:n,dropDay:day(n),day:TODAY,at:Date.now(),...actor()});toast(n+" dropped");}
    else if(a==="trade"){const O=+(body.querySelector("#trWith")?.value||b.dataset.o);if(!O)return toast("Pick a team to trade with.");const get=[...body.querySelectorAll('input[name="get"]:checked')].map(i=>i.value),give=[...body.querySelectorAll('input[name="give"]:checked')].map(i=>i.value);
      if(!get.length&&!give.length)return toast("Pick at least one player.");
      if(rosterNow(T).length-give.length+get.length>ROSTER_MAX)return toast("That would put your roster over "+ROSTER_MAX+". Add a player to send.");
      if(rosterNow(O).length-get.length+give.length>ROSTER_MAX)return toast("That would put their roster over "+ROSTER_MAX+".");
      const ctr=COUNTER&&TXS.find(x=>x.id===COUNTER&&x.status==="proposed"&&tnum(x.from)===O&&tnum(x.to)===T)?COUNTER:null;COUNTER=null;
      const offer={season:SEASON,type:"trade",status:"proposed",from:tkey(T),to:tkey(O),give,get,at:Date.now(),...(ctr?{counters:ctr}:{}),...actor()};const tid=newId();await Store.set("tx",tid,offer);
      if(ctr)await Store.update("tx",ctr,{status:"countered",counteredBy:tid,closedAt:Date.now()});
      tradeChat({...offer,id:tid},ctr?"counter":"offer");toast(ctr?`Counter offer sent to ${teamName(O)}`:`Offer sent to ${teamName(O)}`);}
    sheet().close();
  }catch(e){showErr(e);}
}
const actor=()=>({by:Store.uid||null,role:SESSION?.role||null,byTeam:SESSION?.team||null});

/* ============================================================================
   DRAFT ROOM
   ============================================================================ */
const POOLD=POOL_RAW.map(([n,t,el,rk,tot])=>({id:n,n,t,el,rk,tot,pg:tot.map((v,i)=>i===11?v:v/(tot[11]||1)),pos:el.filter(e=>e<5).map(e=>SLOT[e]).join("/")||"UTIL"}));
const PDB=Object.fromEntries(POOLD.map(p=>[p.id,p]));
const ROSTER_CAP_MAX=20,rosterCap=lg=>Math.max(1,Math.min(ROSTER_CAP_MAX,+lg.maxRoster||14)),rosterSize=lg=>SLOT_KEYS.reduce((s,k)=>s+(+lg.slots[k]||0),0);
const draftRounds=lg=>SLOT_KEYS.reduce((a,k)=>a+(k==="IR"?0:(+lg.slots[k]||0)),0);
const totalPicks=lg=>draftRounds(lg)*lg.draft.order.length;
function teamForPick(lg,n){const T=lg.draft.order.length,r=Math.floor((n-1)/T),i=(n-1)%T;return lg.draft.order[(lg.draft.type==="snake"&&r%2===1)?T-1-i:i];}
const avClass=p=>p.el.includes(4)&&!p.el.some(e=>e<3)?"c":p.el.some(e=>e===0||e===1)?"g":"f";
function draftState(){
  const total=totalPicks(L),byN={};PICKS.forEach(p=>byN[p.n]=p);
  let c=1;while(byN[c]&&c<=total)c++;
  const taken=new Set(PICKS.map(p=>p.player)),status=c>total?"done":L.draft.status;
  const last=PICKS.reduce((m,p)=>p.n>m.n?p:m,{n:0,at:0});
  return {total,byN,cur:c,taken,status,last,clockFrom:Math.max(last.at||0,L.draft.resumedAt||0),team:c<=total?teamForPick(L,c):null};
}
const draftDone=()=>!!L&&(mirror()||PICKS.length>=totalPicks(L));
const draftPlayers=team=>PICKS.filter(p=>tnum(p.team)===tnum(team)).sort((a,b)=>a.n-b.n).map(p=>PDB[p.player]).filter(Boolean);
const canPickFor=team=>!WRITE_BLOCKED&&(isCommish()||myTeamNum()===tnum(team));
// queues: queue/<season>_t<N> {season,team,ids:[player],auto}; the team's manager keeps it, autopick reads it
let QUEUES={},DCONF=null,DROST=0,DSET_OPEN=null;
const queueOf=T=>QUEUES[tnum(T)]||{ids:[],auto:false};
const CLOCKS=[[0,"No clock"],[30,"30 seconds"],[45,"45 seconds"],[60,"1 minute"],[90,"90 seconds"],[120,"2 minutes"],[180,"3 minutes"],[300,"5 minutes"],[600,"10 minutes"],[3600,"1 hour"],[28800,"8 hours"]];
const fmtClock=s=>!s?"No clock":s<60?s+" sec":s%3600===0?s/3600+(s===3600?" hour":" hours"):s%60===0?s/60+" min":Math.floor(s/60)+":"+String(s%60).padStart(2,"0")+" min";
const fmtWhen=ms=>new Date(ms).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
function untilTxt(ms){let s=Math.max(0,Math.round((ms-Date.now())/1000));const d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);
  return d?`${d}d ${h}h`:h?`${h}h ${m}m`:m?`${m}m ${s%60}s`:`${s%60}s`;}
function picksUntil(T,D){for(let n=D.cur;n<=D.total;n++)if(tnum(teamForPick(L,n))===T)return n-D.cur;return -1;}
function draftView(){
  const D=draftState(),mine=myTeamNum(),T=L.draft.order.length;
  let clock;
  if(D.status==="done")clock=`<div class="clock"><div class="pickno"><span class="big">✓</span><span class="sub">Done</span></div><div class="onclock"><div class="lbl">Draft complete</div><div class="ocn">${D.total} picks made</div></div><div class="row"><button class="btn ghost" data-sub-go="league:draft">Draft results</button><button class="btn ghost" data-nav="team">My team</button></div></div>`;
  else{
    const nxt=[];for(let n=D.cur+1;n<=Math.min(D.total,D.cur+6);n++){const t=teamForPick(L,n);nxt.push(`<span class="t${tnum(t)===mine?" mine":""}">#${n} ${esc(teamName(t))}</span>`);}
    const st=D.status==="setup"?(L.draft.startAt?`Starts ${fmtWhen(L.draft.startAt)}`:"Not started"):D.status==="paused"?"Paused":"On the clock";
    const ctl=isCommish()?(D.status==="live"?`<button class="btn ghost sm" data-dact="pause">Pause</button>`:`<button class="btn sm" data-dact="start">${D.status==="setup"?"Start draft":"Resume"}</button>`)+
      `<button class="btn ghost sm" data-dact="auto" ${D.status!=="live"?"disabled":""}>Autopick now</button><button class="btn ghost sm" data-dact="undo" ${D.last.n?"":"disabled"}>Undo last pick</button>`:"";
    const wait=mine?picksUntil(mine,D):-1;
    const me=!mine||D.status==="setup"?"":wait===0?`<span class="yourturn">You're on the clock</span>`:wait>0?`<span class="muted">You pick in ${wait} ${wait===1?"pick":"picks"} (#${D.cur+wait})</span>`:"";
    clock=`<div class="clock"><div class="pickno"><span class="big num">${(D.cur-1)%T+1}</span><span class="sub">Rd ${Math.floor((D.cur-1)/T)+1} · #${D.cur}</span></div>
      <div class="onclock${tnum(D.team)===mine?" mine":""}"><div class="lbl">${st}</div><div class="ocn">${esc(teamName(D.team))}</div></div>
      <div class="timer" id="timer">–:––</div>
      <div class="nextup">${me}<span class="eyebrow">Next</span>${nxt.join("")}<span style="flex:1"></span><span class="row">${ctl}</span></div></div>`;
  }
  const note=D.status==="setup"&&!PICKS.length?`<div class="note info">${isCommish()?"Set up the draft room below, then press Start draft. Managers can build their queues before it starts.":`The commissioner starts the draft${L.draft.startAt?` (planned for ${fmtWhen(L.draft.startAt)})`:""}. Each pick has ${fmtClock(L.draft.clock)}. Queue players now so you're ready.`}</div>`:"";
  const right=(mine?`<section class="panel">${queuePanel(mine,D)}</section>`:"")+`<section class="panel">${recentPanel(D)}</section>`;
  return `${note}<section class="panel">${clock}</section>
  ${isCommish()&&D.status!=="done"?draftSetupPanel(D):""}
  <div class="draftgrid"><section class="panel">${poolPanel(D)}</section><div class="dcol">${right}</div></div>
  <section class="panel">${boardPanel(D)}</section>
  <section class="panel">${rosterPanel(D)}</section>
  <p class="foot-note">Player pool: ESPN 2026-27 preseason projections, ${POOLD.length} players, ranked by ESPN preseason rank. Per-game numbers. Green = top 10% still available.</p>`;
}
// ---- commissioner: draft room setup (saves as you change it)
function draftSetupPanel(D){
  const dr=PICKS.length>0,lk=dr?"disabled":"",F=L.draft,open=DSET_OPEN??D.status==="setup";
  const clocks=CLOCKS.some(c=>c[0]===+F.clock)?CLOCKS:[...CLOCKS,[+F.clock,fmtClock(+F.clock)]].sort((a,b)=>a[0]-b[0]);
  const local=ms=>{if(!ms)return "";const d=new Date(ms-new Date(ms).getTimezoneOffset()*60000);return d.toISOString().slice(0,16);};
  return `<details class="panel dset" ${open?"open":""} id="dsetBox"><summary class="phead"><h2>Draft room setup</h2><span class="hint">${F.type==="snake"?"Snake":"Same order every round"} · ${fmtClock(+F.clock)} per pick · ${draftRounds(L)} rounds · ${T_(L)} teams</span></summary>
  <div class="pbody">
  ${Store.canAdmin?"":`<div class="note" style="margin-bottom:12px">Saving draft settings needs Editor access to this app.</div>`}
  ${dr?`<div class="note" style="margin-bottom:12px">Picks have been made, so the order and draft type are locked. Reset the draft in League → Settings to change them.</div>`:""}
  <div class="setup" style="gap:20px">
    <div class="fgrid" style="align-content:start">
      <div class="field"><label for="dType">Draft type</label><select id="dType" data-dset="type" ${lk}><option value="snake"${F.type==="snake"?" selected":""}>Snake (order flips each round)</option><option value="linear"${F.type==="linear"?" selected":""}>Same order every round</option></select></div>
      <div class="field"><label for="dClock">Time per pick</label><select id="dClock" data-dset="clock">${clocks.map(([v,l])=>`<option value="${v}"${+F.clock===v?" selected":""}>${l}</option>`).join("")}</select></div>
      <div class="field" style="grid-column:1/-1"><label for="dExpire">When time runs out</label><select id="dExpire" data-dset="auto"><option value="1"${F.autoOnExpire?" selected":""}>Autopick: first available player in the team's queue, else the best fit</option><option value="0"${F.autoOnExpire?"":" selected"}>Wait: the clock stays at 0:00 until someone picks</option></select></div>
      <div class="field" style="grid-column:1/-1"><label for="dStart">Planned start (shown to everyone)</label><div class="row"><input type="datetime-local" id="dStart" data-dset="startAt" value="${local(F.startAt)}" ${D.status!=="setup"?"disabled":""}>${F.startAt&&D.status==="setup"?`<button class="btn ghost sm" data-dact="clearStart">Clear</button>`:""}</div><span class="hint">The draft starts on its own at this time if you have the app open. You can also start it any time.</span></div>
    </div>
    <div><div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="flabel">Draft order</span><button class="btn ghost sm" data-dact="shuffle" ${lk}>Randomize</button></div>
      <div class="olist">${F.order.map((id,i)=>`<div class="orow"><span class="idx">${i+1}</span><span>${esc(teamName(id))}</span><span class="row" style="gap:4px"><button class="iconb" data-dact="up:${i}" aria-label="Move up" ${lk||i===0?"disabled":""}>↑</button><button class="iconb" data-dact="down:${i}" aria-label="Move down" ${lk||i===F.order.length-1?"disabled":""}>↓</button></span></div>`).join("")}</div>
      <p class="hint" style="margin-top:8px">Teams and roster slots (which set the number of rounds) are in League → Settings.</p></div>
  </div></div></details>`;
}
const T_=lg=>lg.draft.order.length;
// ---- available players
function poolPanel(D){
  const q=norm(DQ.trim()),posTest=DPOS==="ALL"?()=>true:p=>p.el.includes(SLOT_ID[DPOS]);
  const mine=myTeamNum(),Q_=mine?queueOf(mine).ids:[];
  const avail=POOLD.filter(p=>!D.taken.has(p.id)),list=avail.filter(p=>posTest(p)&&(!q||norm(p.n).includes(q)||p.t.toLowerCase()===q)).slice(0,150);
  const canPick=D.status==="live"&&canPickFor(D.team);
  const thr={};CATS.forEach(c=>{const v=avail.map(p=>val(p.pg,c)).sort((a,b)=>b-a);thr[c[0]]=v[Math.max(0,Math.floor(v.length*.1)-1)]??Infinity;});
  const rows=list.map(p=>{const inQ=Q_.includes(p.id);
    return `<tr><td class="rk num">${p.rk}</td><td class="l"><div class="pwho"><span class="av ${avClass(p)}">${initials(p.n)}</span><div><div class="pname">${esc(p.n)}${cups(p.n)}</div><div class="pmeta">${esc(p.pos)} · ${esc(p.t)}</div></div></div></td>
    ${CATS.map(c=>{const v=val(p.pg,c);return `<td class="num${v>=thr[c[0]]?" hi":""}">${c[1]==="pct"?pct(v):v.toFixed(1)}</td>`;}).join("")}
    <td class="acts">${mine&&!WRITE_BLOCKED?`<button class="qb${inQ?" on":""}" data-dq="${esc(p.id)}" aria-pressed="${inQ}" title="${inQ?"Remove from":"Add to"} your queue" aria-label="${inQ?"Remove":"Queue"} ${esc(p.n)}">${inQ?"★":"☆"}</button>`:""}${canPick?(DCONF===p.id?`<button class="btn good sm" data-dpick="${esc(p.id)}">Confirm</button>`:`<button class="btn sm" data-dconf="${esc(p.id)}">Draft</button>`):""}</td></tr>`;}).join("");
  return `<div class="phead"><h2>Available players</h2><span class="hint">${avail.length} left${mine?" · ☆ adds to your queue":""}</span></div>
  <div class="pbody" style="padding-bottom:8px"><div class="filters"><input type="search" id="dq" placeholder="Search name or NBA team" value="${esc(DQ)}" aria-label="Search draft pool">
  <div class="tabs sm" role="group" aria-label="Position">${["ALL","PG","SG","SF","PF","C"].map(k=>`<button data-dpos="${k}" aria-selected="${DPOS===k}">${k==="ALL"?"All":k}</button>`).join("")}</div></div></div>
  <div class="poolwrap"><table class="pool"><thead><tr><th>Rk</th><th class="l">Player</th>${CATS.map(c=>`<th>${c[0]}</th>`).join("")}<th></th></tr></thead><tbody>${rows||`<tr><td colspan="${CATS.length+3}" class="l muted" style="padding:16px">No available players match.</td></tr>`}</tbody></table></div>`;
}
// ---- your queue
function queuePanel(T,D){
  const q=queueOf(T),ids=q.ids.filter(id=>PDB[id]),onClock=D.status==="live"&&tnum(D.team)===T&&canPickFor(D.team);
  const rows=ids.map((id,i)=>{const p=PDB[id],gone=D.taken.has(id);
    return `<li class="${gone?"gone":""}"><span class="idx">${i+1}</span><div class="qn"><b>${esc(p.n)}</b><span class="pmeta">${esc(p.pos)} · ${esc(p.t)} · Rk ${p.rk}${gone?" · drafted":""}</span></div>
      <span class="row" style="gap:4px">${onClock&&!gone?(DCONF===id?`<button class="btn good sm" data-dpick="${esc(id)}">Confirm</button>`:`<button class="btn sm" data-dconf="${esc(id)}">Draft</button>`):""}<button class="iconb" data-dqm="up:${i}" aria-label="Move up" ${i===0?"disabled":""}>↑</button><button class="iconb" data-dqm="down:${i}" aria-label="Move down" ${i===ids.length-1?"disabled":""}>↓</button><button class="iconb" data-dqm="rm:${i}" aria-label="Remove ${esc(p.n)}">✕</button></span></li>`;}).join("");
  return `<div class="phead"><h2>Your queue</h2><span class="hint">${ids.filter(id=>!D.taken.has(id)).length} available</span></div>
  <div class="pbody" style="padding:10px 14px">
    <label class="row" style="font-size:.84rem;margin-bottom:8px"><input type="checkbox" data-dauto="1" ${q.auto?"checked":""} ${WRITE_BLOCKED?"disabled":""}>Autodraft for me: pick from my queue as soon as I'm on the clock</label>
    ${rows?`<ol class="queue">${rows}</ol>${ids.some(id=>D.taken.has(id))?`<button class="btn ghost sm" data-dqm="clean:0" style="margin-top:8px">Remove drafted players</button>`:""}`:`<p class="empty" style="padding:8px 0">Tap ☆ next to a player to line them up. ${L.draft.autoOnExpire?"If your time runs out, the first available player here is picked for you.":""}</p>`}
  </div>`;
}
function recentPanel(D){
  const last=PICKS.slice().sort((a,b)=>b.n-a.n).slice(0,8),T=L.draft.order.length;
  return `<div class="phead"><h2>Recent picks</h2><span class="hint">${PICKS.length} of ${D.total}</span></div>
  ${last.length?`<ol class="recent">${last.map(pk=>{const p=PDB[pk.player];return `<li><span class="pn num">${Math.floor((pk.n-1)/T)+1}.${(pk.n-1)%T+1}</span><div><b>${esc(p?.n||pk.player)}</b><span class="pmeta">${esc(p?.pos||"")} · ${esc(teamName(pk.team))}${pk.auto?" · autopick":""}</span></div></li>`;}).join("")}</ol>`:`<p class="empty">No picks yet.</p>`}`;
}
function boardPanel(D){
  const T=L.draft.order.length,R=draftRounds(L),mine=myTeamNum();
  let h=`<div class="phead"><h2>Draft board</h2><span class="hint">${L.draft.type==="snake"?"Snake":"Same order every round"} · ${R} rounds · ${T} teams</span></div><div class="scroll" style="padding:8px"><table class="board"><thead><tr><th></th>${L.draft.order.map(id=>`<th class="${tnum(id)===mine?"mine":""}">${esc(teamName(id))}</th>`).join("")}</tr></thead><tbody>`;
  for(let r=1;r<=R;r++){h+=`<tr><td class="rd">${r}</td>`;
    for(let i=0;i<T;i++){const n=(L.draft.type==="snake"&&r%2===0)?(r-1)*T+(T-i):(r-1)*T+i+1,pk=D.byN[n],p=pk&&PDB[pk.player];
      h+=p?`<td class="cell f ${avClass(p)==="f"?"fw":avClass(p)}"><b title="${esc(p.n)}">${esc(p.n)}</b>${esc(p.pos)} <span class="pn">#${n}</span></td>`:`<td class="cell${n===D.cur&&D.status!=="done"?" now":""}"><span class="pn">#${n}</span></td>`;}
    h+=`</tr>`;}
  return h+`</tbody></table></div>`;
}
// ---- any team's roster as it fills, with what's still open
function rosterPanel(D){
  const ids=L.draft.order.map(tnum),T=ids.includes(DROST)?DROST:(myTeamNum()||ids[0]);
  const ps=draftPlayers(tkey(T)),slots=[];SLOT_KEYS.forEach(k=>{if(k==="IR")return;for(let i=0;i<(+L.slots[k]||0);i++)slots.push({k,id:SLOT_ID[k],p:null});});
  ps.forEach(p=>{const s=slots.find(o=>!o.p&&o.k!=="BE"&&canPlay(p,o.id))||slots.find(o=>!o.p&&o.k==="BE");if(s)s.p=p;});
  const cnt={};["PG","SG","SF","PF","C"].forEach(k=>cnt[k]=ps.filter(p=>p.el.includes(SLOT_ID[k])).length);
  return `<div class="phead"><h2>Rosters</h2><span class="row"><select id="drost" aria-label="Team">${ids.map(i=>`<option value="${i}"${i===T?" selected":""}>${esc(teamName(i))}${i===myTeamNum()?" (you)":""}</option>`).join("")}</select><span class="hint">${ps.length} of ${draftRounds(L)} picks</span></span></div>
  <div class="pbody" style="padding:10px 14px 4px"><div class="poscount">${Object.entries(cnt).map(([k,v])=>`<span><b>${v}</b> ${k}</span>`).join("")}</div></div>
  <div class="scroll"><table class="txt"><tbody>${slots.map(o=>`<tr><td style="width:70px"><span class="slot${o.k==="BE"?" bench":""}">${o.k}</span></td><td>${o.p?`<b>${esc(o.p.n)}</b> <span class="muted">${esc(o.p.pos)} · ${esc(o.p.t)}</span>`:'<span class="muted">Open</span>'}</td></tr>`).join("")}</tbody></table></div>`;
}
async function doPick(pid,auto){
  const D=draftState();DCONF=null;if(D.status!=="live"||D.taken.has(pid))return;
  if(!auto&&!canPickFor(D.team))return;
  const id=SEASON+"_"+String(D.cur).padStart(3,"0");
  try{await Store.claimSet("picks",id,{season:SEASON,n:D.cur,team:D.team,player:pid,at:Date.now(),auto:!!auto,...actor()},d=>!d.player);
    toast(PDB[pid].n+" to "+teamName(D.team));
    const mine=myTeamNum();if(mine){const q=queueOf(mine);if(q.ids.includes(pid))saveQueue(mine,{ids:q.ids.filter(x=>x!==pid)});}
  }catch(e){if(!auto||e?.code!=="taken")showErr(e);}
}
// queue first, then the best player for an open starting spot, then the best player left
function autoChoice(D){
  const avail=POOLD.filter(p=>!D.taken.has(p.id)),q=queueOf(D.team).ids.find(id=>PDB[id]&&!D.taken.has(id));
  if(q)return PDB[q];
  const have=draftPlayers(D.team),open=[];SLOT_KEYS.forEach(k=>{const id=SLOT_ID[k];if(id>=12)return;const n=+L.slots[k]||0,used=have.filter(p=>canPlay(p,id)).length;if(used<n)open.push(id);});
  return (open.length&&avail.find(p=>open.some(s=>canPlay(p,s))))||avail[0];
}
async function doAutoPick(){const D=draftState();if(D.status!=="live")return;const p=autoChoice(D);if(p)await doPick(p.id,true);}
async function saveQueue(T,patch){const q=queueOf(T);const next={season:SEASON,team:tkey(T),ids:q.ids,auto:!!q.auto,...patch};QUEUES[T]=next;renderRosters();
  try{await Store.set("queue",`${SEASON}_t${T}`,next);}catch(e){showErr(e);}}
async function queueAct(kind,v){
  const T=myTeamNum();if(!T)return;const ids=queueOf(T).ids.slice();
  if(kind==="toggle"){const i=ids.indexOf(v);if(i>=0)ids.splice(i,1);else ids.push(v);return saveQueue(T,{ids});}
  const [a,ix]=v.split(":"),i=+ix;
  if(a==="rm")ids.splice(i,1);
  else if(a==="up"&&i>0)[ids[i-1],ids[i]]=[ids[i],ids[i-1]];
  else if(a==="down"&&i<ids.length-1)[ids[i+1],ids[i]]=[ids[i],ids[i+1]];
  else if(a==="clean"){const D=draftState();return saveQueue(T,{ids:ids.filter(id=>!D.taken.has(id))});}
  saveQueue(T,{ids});
}
const saveL=async next=>{try{await Store.set("league",next.season,next);return true;}catch(e){showErr(e);return false;}};
const saveDraft=patch=>saveL({...L,draft:{...L.draft,...patch}});
async function draftAct(a){
  const D=draftState();
  if(a==="start")await saveDraft({status:"live",resumedAt:Date.now()});
  else if(a==="pause")await saveDraft({status:"paused"});
  else if(a==="auto")await doAutoPick();
  else if(a==="undo"&&D.last.n){try{await Store.del("picks",SEASON+"_"+String(D.last.n).padStart(3,"0"));await saveDraft({resumedAt:Date.now()});toast("Pick #"+D.last.n+" undone");}catch(e){showErr(e);}}
  else if(a==="clearStart")await saveDraft({startAt:null});
  else if(a==="shuffle"&&!PICKS.length){const o=L.draft.order.slice();for(let i=o.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[o[i],o[j]]=[o[j],o[i]];}await saveDraft({order:o});toast("Draft order randomized");}
  else if(/^(up|down):/.test(a)&&!PICKS.length){const o=L.draft.order.slice(),i=+a.split(":")[1],j=a.startsWith("up")?i-1:i+1;if(j<0||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];await saveDraft({order:o});}
}
async function draftSetInput(t){
  const k=t.dataset.dset;
  if(k==="type")await saveDraft({type:t.value});
  else if(k==="clock")await saveDraft({clock:+t.value,resumedAt:draftState().status==="live"?Date.now():L.draft.resumedAt});
  else if(k==="auto")await saveDraft({autoOnExpire:t.value==="1"});
  else if(k==="startAt"){const ms=t.value?new Date(t.value).getTime():null;if(ms&&ms<Date.now())return toast("Pick a time in the future.");await saveDraft({startAt:ms});}
}
let autoBusy=false;
function tick(){
  if(!L)return;const D=draftState(),el=$("#timer");
  // planned start: the commissioner's open app starts it
  if(D.status==="setup"&&L.draft.startAt&&isCommish()&&Store.canAdmin&&Date.now()>=L.draft.startAt&&!autoBusy){autoBusy=true;saveDraft({status:"live",resumedAt:Date.now(),startAt:null}).finally(()=>setTimeout(()=>autoBusy=false,1500));}
  if(el){
    if(D.status==="setup"&&L.draft.startAt){el.textContent=untilTxt(L.draft.startAt);el.classList.remove("low");}
    else if(D.status!=="live"||!L.draft.clock){el.textContent="–:––";el.classList.remove("low");}
  }
  if(D.status!=="live")return;
  const left=L.draft.clock?Math.max(0,Math.ceil(L.draft.clock-(Date.now()-D.clockFrom)/1000)):Infinity;
  if(el&&L.draft.clock){el.textContent=left>=3600?untilTxt(Date.now()+left*1000):Math.floor(left/60)+":"+String(left%60).padStart(2,"0");el.classList.toggle("low",left<=10);}
  if(autoBusy||!SESSION)return;
  // any logged-in app can make the automatic pick; the pick slot lets only one through
  const autoTeam=queueOf(D.team).auto&&Date.now()-D.clockFrom>2500;
  if((left===0&&L.draft.autoOnExpire)||autoTeam){autoBusy=true;setTimeout(()=>doAutoPick().finally(()=>setTimeout(()=>autoBusy=false,1500)),myTeamNum()===tnum(D.team)||isCommish()?0:400+Math.random()*1200);}
}
setInterval(tick,1000);

/* ============================================================================
   SETTINGS (commissioner)
   ============================================================================ */
function seasonLabel(){const d=new Date(),y=d.getMonth()>=6?d.getFullYear():d.getFullYear()-1;return y+"-"+String((y+1)%100).padStart(2,"0");}
function nextSeason(s){const m=/^(\d{4})-(\d{2})$/.exec(s||"");if(!m)return seasonLabel();const y=+m[1]+1;return y+"-"+String((y+1)%100).padStart(2,"0");}
function newLeague(season,prev){
  const teams=prev?prev.teams.map(t=>({id:t.id,name:t.name})):Array.from({length:10},(_,i)=>({id:"t"+(i+1),name:"Team "+(i+1)}));
  return {name:prev?prev.name:"Our League",season,teams,cats:prev?prev.cats.slice():DEFAULT_CATS.slice(),slots:prev?{...prev.slots}:{...DEFAULT_SLOTS},maxRoster:prev?rosterCap(prev):14,
    playoffTeams:prev?prev.playoffTeams:4,addLimit:prev?.addLimit||0,startWeek:1,format:prev?.format||"each",
    draft:{type:prev?prev.draft.type:"snake",clock:prev?prev.draft.clock:90,autoOnExpire:prev?prev.draft.autoOnExpire:true,order:teams.map(t=>t.id),status:"setup",resumedAt:0},createdAt:Date.now()};
}
function setupView(){
  if(!FORM||!FORM_DIRTY){FORM=JSON.parse(JSON.stringify(L));FORM_DIRTY=false;}
  const F=FORM,ro=!isCommish(),dr=PICKS.length>0,dis=ro?"disabled":"",lockT=ro||dr?"disabled":"";
  const seasons=Object.keys(SEASONS).sort().reverse();
  return `${ro?`<div class="note info">Only the commissioner can change league settings.</div>`:Store.canAdmin?"":`<div class="note">You're logged in as commissioner, but saving settings and codes also needs Editor access to this app. Ask the app's owner to share it with you as an Editor.</div>`}
  ${mirror()?`<div class="note info">This season mirrors your ESPN league's rosters and lineups. ${(F.settingsFrom||"espn")==="espn"?"League name, team names, categories, roster slots, playoff teams and the schedule are copied from ESPN each time the commissioner presses Refresh, so changes made here get replaced. Switch that off under <b>Where settings come from</b>.":"League settings are set here in the app; Refresh only brings in games, stats, rosters and player news."}</div>`:""}
  ${dr&&!ro?`<div class="note">The draft has started, so teams, roster slots and draft order are locked. Reset the draft to change them.</div>`:""}
  <div class="setup">
  <section class="panel"><div class="phead"><h2>League</h2></div><div class="pbody fgrid">
    <div class="field" style="grid-column:1/-1"><label for="fName">League name</label><input type="text" id="fName" value="${esc(F.name)}" ${dis}></div>
    <div class="field"><label for="fStart">Season starts in week</label><select id="fStart" ${dis}>${CAL.slice(0,CAL.length-3).map(w=>`<option value="${w[0]}"${(+F.startWeek||1)===w[0]?" selected":""}>Week ${w[0]} · ${md(w[1])}</option>`).join("")}</select></div>
    <div class="field"><label for="fAdds">Pickups per matchup</label><input type="number" id="fAdds" min="0" max="30" value="${+F.addLimit||0}" ${dis}><span class="hint">0 = no limit. You can change it any time.</span></div>
    <div class="field"><label for="fPlayoff">Playoff teams</label><input type="number" id="fPlayoff" min="2" max="${F.teams.length}" value="${F.playoffTeams}" ${dis}></div>
    <div class="field" style="grid-column:1/-1"><label for="fFormat">Scoring</label><select id="fFormat" ${dis}><option value="each"${F.format!=="most"?" selected":""}>Each category counts (W-L-T per category)</option><option value="most"${F.format==="most"?" selected":""}>Most categories wins the week (one W, L or T)</option></select></div>
  </div></section>
  <section class="panel"><div class="phead"><h2>Teams</h2><span class="hint">${F.teams.length} of up to ${MAX_TEAMS}</span></div><div class="pbody tlist">
    ${F.teams.map((t,i)=>`<div class="trow"><span class="idx">${i+1}</span><input type="text" id="tn_${esc(t.id)}" data-tname="${esc(t.id)}" value="${esc(t.name)}" aria-label="Team ${i+1} name" ${dis}><button class="iconb" data-rmteam="${esc(t.id)}" aria-label="Remove ${esc(t.name)}" ${lockT||F.teams.length<=MIN_TEAMS?"disabled":""}>✕</button></div>`).join("")}
    <div class="row" style="margin-top:6px"><button class="btn ghost sm" data-sact="addTeam" ${lockT||F.teams.length>=MAX_TEAMS?"disabled":""}>Add team</button></div>
  </div></section>
  <section class="panel"><div class="phead"><h2>Categories</h2><span class="hint">${F.cats.length} selected</span></div><div class="pbody"><div class="catpick">
    ${Object.entries(CATDEF).map(([k,c])=>`<label><input type="checkbox" data-cat="${k}" ${F.cats.includes(k)?"checked":""} ${dis}>${c[0]}</label>`).join("")}
  </div></div></section>
  <section class="panel"><div class="phead"><h2>Roster slots</h2><span class="hint" id="slotHint">${rosterSize(F)} of ${rosterCap(F)} players max (IR included) · ${draftRounds(F)} draft rounds</span></div><div class="pbody">
    <div class="field capf"><label for="fCap">Max roster size this season</label><input type="number" id="fCap" min="1" max="${ROSTER_CAP_MAX}" value="${rosterCap(F)}" ${lockT}><span class="hint">Up to ${ROSTER_CAP_MAX}, IR included. No team can roster more than this. It carries over to next season, so change it there if the league wants a different size.</span></div>
    <div class="slotsf">${SLOT_KEYS.map(k=>`<div class="field"><label for="sl_${k}">${k}</label><input type="number" id="sl_${k}" data-slot="${k}" min="0" max="${(+F.slots[k]||0)+Math.max(0,rosterCap(F)-rosterSize(F))}" value="${F.slots[k]||0}" ${lockT}></div>`).join("")}</div>
  </div></section>
  <section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Draft</h2><span class="hint">${totalPicks(F)} picks · ${F.draft.type==="snake"?"snake":"same order every round"} · ${fmtClock(+F.draft.clock)} per pick</span></div><div class="pbody row">
    <span class="hint">Draft order, time per pick, autopick and the start time are set in the draft room.</span><button class="btn ghost sm" data-nav="draft">Open the draft room</button>
  </div></section>
  ${isCommish()?codesView():""}
  ${isCommish()?`<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Seasons</h2>${seasons.length>1?`<select id="seasonPick" aria-label="Season">${seasons.map(s=>`<option${s===SEASON?" selected":""}>${esc(s)}</option>`).join("")}</select>`:""}</div><div class="pbody row">
    <span class="hint">Start next season with the same teams and settings, a fresh draft and empty rosters.</span><input type="text" id="nextSeason" value="${esc(nextSeason(F.season))}" aria-label="New season name"><button class="btn ghost" data-sact="newSeason">Start new season</button>
    ${dr?(CONFIRM==="reset"?`<span class="confirm">Delete all ${PICKS.length} picks for ${esc(F.season)}? Rosters built from the draft go too. <button class="btn danger sm" data-sact="resetYes">Delete picks</button><button class="btn ghost sm" data-sact="cancel">Keep</button></span>`:`<button class="btn danger" data-sact="reset">Reset draft</button>`):""}
  </div></section>`:""}
  </div>
  ${ro?"":`<div class="savebar"><button class="btn" data-sact="save" ${FORM_DIRTY?"":"disabled"}>Save settings</button><button class="btn ghost" data-sact="discard" ${FORM_DIRTY?"":"disabled"}>Discard changes</button><span class="hint">${FORM_DIRTY?"Unsaved changes":"All changes saved"}</span></div>`}`;
}
async function setupAct(a){
  const F=FORM;
  if(a==="addTeam"){const id="t"+(Math.max(0,...F.teams.map(t=>tnum(t.id)))+1);F.teams.push({id,name:"Team "+(F.teams.length+1)});F.draft.order.push(id);FORM_DIRTY=true;}
  else if(a==="shuffle"){const o=F.draft.order;for(let i=o.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[o[i],o[j]]=[o[j],o[i]];}FORM_DIRTY=true;}
  else if(a==="save"){if(!F.cats.length)return toast("Pick at least one category.");if(!draftRounds(F))return toast("Add at least one roster slot.");if(rosterSize(F)>rosterCap(F))return toast(`The slots add up to ${rosterSize(F)} players, over the max of ${rosterCap(F)}. Lower a slot or raise the max.`);F.maxRoster=rosterCap(F);
    // the draft room saves its own settings, so keep those and only carry over team changes to the order
    const keep=L.draft.order.filter(id=>F.teams.some(t=>t.id===id)),add=F.teams.map(t=>t.id).filter(id=>!keep.includes(id));F.draft={...L.draft,order:[...keep,...add]};F.playoffTeams=Math.max(2,Math.min(+F.playoffTeams||2,F.teams.length));if(await saveL(F)){FORM_DIRTY=false;toast("Settings saved");}}
  else if(a==="discard")FORM_DIRTY=false;
  else if(a==="newSeason"){const s=($("#nextSeason").value||"").trim().replace(/[^A-Za-z0-9_\-.]/g,"");if(!s)return;if(SEASONS[s])return toast(s+" already exists.");if(await saveL(newLeague(s,L))){SEASON=s;FORM_DIRTY=false;toast(s+" created");}}
  else if(a==="reset")CONFIRM="reset";
  else if(a==="resetYes"){CONFIRM=null;for(const p of PICKS.slice())try{await Store.del("picks",p.id);}catch(e){showErr(e);break;}await saveL({...L,draft:{...L.draft,status:"setup"}});toast("Draft reset");}
  else if(a==="cancel")CONFIRM=null;
  renderRosters();
}
function setupInput(t){
  const F=FORM;if(!F)return false;
  if(t.id==="fName")F.name=t.value;
  else if(t.id==="fStart")F.startWeek=+t.value;
  else if(t.id==="fPlayoff")F.playoffTeams=Math.max(2,+t.value||2);
  else if(t.id==="fFormat")F.format=t.value;
  else if(t.id==="fAdds")F.addLimit=Math.max(0,Math.min(30,Math.round(+t.value||0)));
  else if(t.id==="fClock")F.draft.clock=Math.max(0,+t.value||0);
  else if(t.id==="fType")F.draft.type=t.value;
  else if(t.id==="fAuto")F.draft.autoOnExpire=t.checked;
  else if(t.dataset.tname){const tm=F.teams.find(x=>x.id===t.dataset.tname);if(tm)tm.name=t.value;}
  else if(t.dataset.slot){const k=t.dataset.slot,cap=rosterCap(F),room=cap-(rosterSize(F)-(+F.slots[k]||0));let v=Math.max(0,Math.round(+t.value||0));
    if(v>room){v=Math.max(0,room);t.value=v;toast(`Rosters max out at ${cap} players this season. Raise the max or lower another slot first.`);}F.slots[k]=v;}
  else if(t.id==="fCap"){let v=Math.max(1,Math.min(ROSTER_CAP_MAX,Math.round(+t.value||0)));if(v<rosterSize(F)){v=rosterSize(F);toast(`The slots already add up to ${v}. Lower a slot first.`);}if(String(v)!==t.value)t.value=v;F.maxRoster=v;}
  else if(t.dataset.cat)F.cats=t.checked?Object.keys(CATDEF).filter(k=>k===t.dataset.cat||F.cats.includes(k)):F.cats.filter(k=>k!==t.dataset.cat);
  else return false;
  const was=FORM_DIRTY;FORM_DIRTY=true;
  document.querySelectorAll('[data-sact="save"],[data-sact="discard"]').forEach(b=>b.disabled=false);const slh=document.getElementById("slotHint");if(slh)slh.textContent=`${rosterSize(F)} of ${rosterCap(F)} players max (IR included) · ${draftRounds(F)} draft rounds`;
  if(t.dataset.slot||t.id==="fCap")document.querySelectorAll("[data-slot]").forEach(i=>{i.max=(+F.slots[i.dataset.slot]||0)+Math.max(0,rosterCap(F)-rosterSize(F));});const sh=document.querySelector(".savebar .hint");if(sh)sh.textContent="Unsaved changes";
  if(t.type==="checkbox"||t.tagName==="SELECT"||t.dataset.slot||t.id==="fCap"||!was){const id=t.id,pos=t.selectionStart;renderRosters();const n=document.getElementById(id);if(n){n.focus();try{if(pos!=null)n.setSelectionRange(pos,pos);}catch(_){}}}
  return true;
}

/* ============================================================================
   ACCESS CODES (commissioner): one 6-digit badge code per team, plus the
   commissioner's own. Codes are stored hashed in badges/<hash>; the plain
   list lives in secret/codes, which only Editors can read.
   ============================================================================ */
let CODEF=null,CODE_DIRTY=false;
const codeKeys=()=>["commish",...L.teams.map(t=>t.id)];
const codeLabel=k=>k==="commish"?"Commissioner":teamName(k);
const codeActive=k=>!!BADGES&&Object.values(BADGES).some(b=>k==="commish"?b.role==="commish":b.team===k);
function randomCode(taken){let c;do{const a=new Uint32Array(1);crypto.getRandomValues(a);c=String(a[0]%1000000).padStart(6,"0");}while(taken.has(c)||/^(\d)\1{5}$/.test(c));return c;}
async function badgeHash(code){
  const te=new TextEncoder(),k=await crypto.subtle.importKey("raw",te.encode(code),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:te.encode("draft-fantasy-badge-v1"),iterations:150000,hash:"SHA-256"},k,160);
  return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function codesView(){
  const head=`<div class="phead"><h2>Access codes</h2><span class="hint">Each team logs in with its own 6-digit code</span></div>`;
  if(!Store.canAdmin)return `<section class="panel" style="grid-column:1/-1">${head}<div class="pbody"><p class="hint">Managing codes needs Editor access to this app.</p></div></section>`;
  if(!CODEF||!CODE_DIRTY){CODEF={...(SECRET?.codes||{})};CODE_DIRTY=false;}
  const rows=codeKeys().map(k=>{const on=codeActive(k),lbl=codeLabel(k);
    return `<div class="crow${k==="commish"?" cm":""}"><span class="cn">${esc(lbl)}</span><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="——————" id="code_${k}" data-code="${k}" value="${esc(CODEF[k]||"")}" aria-label="${esc(lbl)} code"><button class="btn ghost sm" data-cact="new:${k}">New</button><button class="btn ghost sm" data-cact="copy:${k}" ${CODEF[k]?"":"disabled"}>Copy</button><span class="cst${on?" ok":""}">${on?"Active":"No code"}</span></div>`;}).join("");
  const missing=codeKeys().some(k=>!CODEF[k]);
  return `<section class="panel" style="grid-column:1/-1">${head}<div class="pbody">
    <p class="hint" style="margin:0 0 10px">Send each manager only their own code. Changing or clearing a code logs that team out on every device. Anyone with a team's code can manage that team, so keep them private.</p>
    <div class="codes">${rows}</div>
    <div class="row" style="margin-top:12px"><button class="btn" data-cact="save" ${CODE_DIRTY?"":"disabled"}>Save codes</button>${missing?`<button class="btn ghost" data-cact="fill">Make codes for empty rows</button>`:""}${CODE_DIRTY?`<button class="btn ghost" data-cact="discard">Discard</button><span class="hint">Unsaved code changes</span>`:""}</div>
  </div></section>`;
}
function codeInput(t){
  const k=t.dataset.code,v=t.value.replace(/\D/g,"").slice(0,6);if(t.value!==v)t.value=v;
  CODEF[k]=v;const was=CODE_DIRTY;CODE_DIRTY=true;
  if(!was){const pos=t.selectionStart;renderRosters();const n=document.getElementById(t.id);if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(_){}}}
  // the page doesn't redraw while you type in Settings, so switch the Save button on here
  const sv=document.querySelector('[data-cact="save"]');if(sv){sv.disabled=false;if(!sv.parentElement.querySelector('[data-cact="discard"]'))sv.parentElement.insertAdjacentHTML("beforeend",`<button class="btn ghost" data-cact="discard">Discard</button><span class="hint">Unsaved code changes</span>`);}
}
async function codeAct(v){
  const [a,k]=v.split(":");
  if(a==="new"||a==="fill"){const taken=new Set(Object.values(CODEF).filter(Boolean));
    (a==="new"?[k]:codeKeys().filter(x=>!CODEF[x])).forEach(x=>{const c=randomCode(taken);taken.add(c);CODEF[x]=c;});CODE_DIRTY=true;}
  else if(a==="discard")CODE_DIRTY=false;
  else if(a==="copy"){const txt=k==="commish"?`Draft Fantasy commissioner code: ${CODEF[k]}`:`Your Draft Fantasy code for ${teamName(k)}: ${CODEF[k]}`;
    try{await navigator.clipboard.writeText(txt);toast(`Copied ${codeLabel(k)}'s code`);}catch(e){const i=document.getElementById("code_"+k);if(i){i.focus();i.select();}toast("Copy blocked here. The code is selected, so copy it yourself.");}return;}
  else if(a==="save"){await saveCodes();return;}
  renderRosters();
}
async function saveCodes(){
  const C={};codeKeys().forEach(k=>{if(CODEF[k])C[k]=CODEF[k];});
  if(!C.commish)return toast("The commissioner needs a code.");
  const bad=Object.keys(C).find(k=>!/^\d{6}$/.test(C[k]));if(bad)return toast(`${codeLabel(bad)}'s code needs 6 digits.`);
  const seen={};for(const k of Object.keys(C)){if(seen[C[k]])return toast(`${codeLabel(k)} and ${codeLabel(seen[C[k]])} have the same code.`);seen[C[k]]=k;}
  toast("Saving codes…");
  try{
    const H={};for(const k of Object.keys(C))H[k]=await badgeHash(C[k]);
    await Store.set("secret","codes",{codes:C,hashes:H,at:Date.now()});
    for(const [k,h] of Object.entries(H)){const want={role:k==="commish"?"commish":"team",team:k==="commish"?null:k};const b=BADGES?.[h];
      if(!b||b.role!==want.role||(b.team||null)!==want.team)await Store.set("badges",h,{...want,at:Date.now()});}
    // keep the commissioner logged in through a change of their own code
    if(isCommish()&&SESSION.h!==H.commish){BADGES={...BADGES,[H.commish]:{role:"commish",team:null}};saveSession({...SESSION,h:H.commish});}
    const keep=new Set(Object.values(H));
    for(const h of Object.keys(BADGES||{}))if(!keep.has(h))await Store.del("badges",h);
    CODE_DIRTY=false;toast("Codes saved");renderRosters();
  }catch(e){showErr(e);}
}

/* ============================================================================
   DRAFT RESULTS (League tab): every pick by round or by team, value against
   ESPN's preseason rank, and each team's projected category ranks
   ============================================================================ */
let DRV="board",DRT=0;
const draftHidden=()=>!!L&&draftDone()&&!isCommish();
function draftResultsView(){
  if(!PICKS.length)return `<section class="panel emptyst"><h2>No picks yet</h2><p>Results show here once the draft starts.</p></section>`;
  const T=L.draft.order.length,ps=PICKS.slice().sort((a,b)=>a.n-b.n),mine=myTeamNum(),done=draftDone();
  const tag=(pk,p)=>{const d=p.rk-pk.n;return d>=12?`<span class="vtag steal">Value +${d}</span>`:d<=-12?`<span class="vtag reach">Reach ${d}</span>`:"";};
  const row=pk=>{const p=PDB[pk.player];if(!p)return "";const me=tnum(pk.team)===mine;
    return `<tr class="${me?"mine":""}"><td class="num muted">${pk.n}</td><td class="num muted">${Math.floor((pk.n-1)/T)+1}.${String((pk.n-1)%T+1).padStart(2,"0")}</td><td class="l"><b>${esc(p.n)}</b> <span class="muted">${esc(p.pos)} · ${esc(p.t)}</span>${pk.auto?' <span class="vtag auto">Autopick</span>':""} ${tag(pk,p)}</td><td class="l">${esc(teamName(pk.team))}</td><td class="num">${p.rk}</td></tr>`;};
  const head=`<thead><tr><th>Pick</th><th>Rd</th><th class="l">Player</th><th class="l">Team</th><th title="ESPN preseason rank">ESPN rk</th></tr></thead>`;
  let body="";
  // board: one column per team in draft order, one row per round, like the ESPN draft board
  if(DRV==="board"){const R=Math.ceil(ps[ps.length-1].n/T),ids=L.draft.order.map(tnum),at={};ps.forEach(pk=>at[`${Math.floor((pk.n-1)/T)+1}|${tnum(pk.team)}`]=pk);
    const pc=pos=>/C/.test(pos||"")&&!/^(PG|SG|G)/.test(pos)?"c":/^(PG|SG|G)/.test(pos||"")?"g":"f";
    const cell=pk=>{const p=pk&&PDB[pk.player];if(!pk)return `<td class="dbc empty"></td>`;const nm=p?p.n:pk.player,sp=nm.indexOf(" ");
      return `<td class="dbc ${pc(p?.pos)}${tnum(pk.team)===mine?" mine":""}${DRT&&tnum(pk.team)!==DRT?" faded":""}"><button class="dbp" data-pcard="${esc(nm)}" title="${esc(nm)} · pick ${pk.n}${p?` · ESPN rank ${p.rk}`:""}"><span class="dbn">${Math.floor((pk.n-1)/T)+1}.${String((pk.n-1)%T+1).padStart(2,"0")}</span><b>${sp>0?esc(nm.slice(0,sp))+"<br>"+esc(nm.slice(sp+1)):esc(nm)}</b><span class="dbm">${esc(p?.pos||"")}${p?` · ${esc(p.t)}`:""}</span>${p?tag(pk,p):""}</button></td>`;};
    const board=`<div class="scroll dbwrap"><table class="dboard"><thead><tr><th class="dbr">Rd</th>${ids.map(t=>`<th class="${t===mine?"mine":""}">${esc(teamName(t))}</th>`).join("")}</tr></thead><tbody>${Array.from({length:R},(_,i)=>`<tr><th class="dbr">${i+1}</th>${ids.map(t=>cell(at[`${i+1}|${t}`])).join("")}</tr>`).join("")}</tbody></table></div>`;
    body=board;}
  else if(DRV==="round"){const R=Math.ceil(ps[ps.length-1].n/T);
    for(let r=1;r<=R;r++){const rows=ps.filter(pk=>Math.floor((pk.n-1)/T)+1===r&&(!DRT||tnum(pk.team)===DRT)).map(row).join("");
      if(rows)body+=`<tbody><tr class="grp"><td colspan="5">Round ${r}</td></tr>${rows}</tbody>`;}}
  else{const ids=L.draft.order.map(tnum).filter(t=>!DRT||t===DRT);
    ids.forEach(t=>{const rows=ps.filter(pk=>tnum(pk.team)===t).map(row).join("");if(rows)body+=`<tbody><tr class="grp"><td colspan="5">${esc(teamName(t))}${t===mine?" (you)":""}</td></tr>${rows}</tbody>`;});}
  // projected category ranks from ESPN per-game projections of each team's picks
  const tot={};L.draft.order.forEach(id=>{const a=new Array(12).fill(0);draftPlayers(id).forEach(p=>p.pg.forEach((v,i)=>{if(i<11)a[i]+=v;}));tot[tnum(id)]=a;});
  const ids=L.draft.order.map(tnum),rk={};
  CATS.forEach(c=>{const s=ids.slice().sort((a,b)=>val(tot[b],c)-val(tot[a],c));s.forEach((t,i)=>{(rk[t]=rk[t]||{})[c[0]]=i+1;});});
  const avgRk=t=>{const l=draftPlayers(tkey(t));return l.length?l.reduce((s,p)=>s+p.rk,0)/l.length:0;};
  const steals=t=>ps.filter(pk=>tnum(pk.team)===t&&PDB[pk.player]&&PDB[pk.player].rk-pk.n>=12).length;
  const order=ids.slice().sort((a,b)=>CATS.reduce((s,c)=>s+rk[a][c[0]],0)-CATS.reduce((s,c)=>s+rk[b][c[0]],0));
  const cls=v=>v<=3?"good":v>ids.length-3?"bad":"";
  const sum=`<div class="scroll"><table class="lg drsum"><thead><tr><th class="nm">Team</th><th>Avg ESPN rk</th><th>Value picks</th>${CATS.map(c=>`<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${order.map(t=>`<tr class="${t===mine?"mine":""}"><td class="nm">${esc(teamName(t))}</td><td class="num">${avgRk(t).toFixed(1)}</td><td class="num">${steals(t)}</td>${CATS.map(c=>`<td class="num ${cls(rk[t][c[0]])}">${rk[t][c[0]]}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const ctl=`<div class="row" style="padding:10px 14px;border-bottom:1px solid var(--line)"><div class="tabs sm" role="group" aria-label="Group by"><button data-drv="board" aria-selected="${DRV==="board"}">Board</button><button data-drv="round" aria-selected="${DRV==="round"}">By round</button><button data-drv="team" aria-selected="${DRV==="team"}">By team</button></div>
    <select id="drt" aria-label="Team"><option value="0">All teams</option>${ids.map(t=>`<option value="${t}"${t===DRT?" selected":""}>${esc(teamName(t))}</option>`).join("")}</select>${isCommish()?`<span style="flex:1"></span><button class="btn ghost sm" data-nav="draft">Draft room</button>`:""}</div>`;
  return (done?"":`<div class="note info">The draft is still going: ${PICKS.length} of ${totalPicks(L)} picks made.</div>`)+
    (DRV==="board"?sec("Draft board",`${PICKS.length} picks · tap a player for his card · Value = picked 12+ spots after ESPN rank, Reach = 12+ before`,ctl+body)+sec("Projected category ranks",`From ESPN per-game projections of each team's picks · 1 = best`,sum)
    :sec("Projected category ranks",`From ESPN per-game projections of each team's picks · 1 = best`,sum)+
    sec("Draft results",`${PICKS.length} picks · Value = picked 12+ spots after ESPN rank, Reach = 12+ before`,ctl+`<div class="scroll"><table class="txt drres">${head}${body}</table></div>`));
}

/* ============================================================================
   CHAT: league chat plus direct messages between teams (and the
   commissioner), from the button at the bottom right.
   chat/<id> {ch:"league"|"dm:<a>:<b>", members:["all"]|[a,b], from, text, at}
   ============================================================================ */
let CHAT_L=[],CHAT_D=[],CHAT_OPEN=false,CHAT_CH=null,CHAT_UNSUB=[],CHAT_SEEN={};
try{CHAT_SEEN=JSON.parse(localStorage.getItem("dfChatSeen")||"{}");}catch(e){}
const chatMe=()=>SESSION?(SESSION.role==="commish"?"cm":SESSION.team):null;
const chatName=k=>k==="sys"?"League office":k==="cm"?"Commissioner":k==="league"?"League chat":teamName(k);
const dmKey=(a,b)=>"dm:"+[a,b].sort().join(":");
const dmOther=ch=>ch.split(":").slice(1).find(x=>x!==chatMe());
const chatMsgs=ch=>(ch==="league"?CHAT_L:CHAT_D.filter(m=>m.ch===ch)).slice().sort((a,b)=>a.at-b.at);
const chatUnread=ch=>chatMsgs(ch).filter(m=>m.at>(CHAT_SEEN[ch]||0)&&m.from!==chatMe()).length;
function chatWatch(){
  CHAT_UNSUB.forEach(u=>u&&u());CHAT_UNSUB=[];CHAT_L=[];CHAT_D=[];const me=chatMe();
  if(!me||!Store.db&&!Store.local){renderChat();return;}
  CHAT_UNSUB.push(Store.watchQ("chat",[["members","array-contains","all"]],200,d=>{CHAT_L=d;renderChat();}));
  CHAT_UNSUB.push(Store.watchQ("chat",[["members","array-contains",me]],400,d=>{const before=CHAT_D.length;CHAT_D=d;
    const nw=d.filter(m=>m.from!==me&&m.at>Date.now()-15000&&!(CHAT_OPEN&&CHAT_CH===m.ch));if(before&&nw.length)toast("New message from "+chatName(nw[0].from));renderChat();}));
}
function chatSync(){const k=(Store.db||Store.local)?chatMe():null;if(k!==chatSync.k){chatSync.k=k;if(!k){CHAT_OPEN=false;CHAT_CH=null;}chatWatch();}else renderChat();}
function chatSeen(ch){const last=chatMsgs(ch).reduce((m,x)=>Math.max(m,x.at),0);if(last>(CHAT_SEEN[ch]||0)){CHAT_SEEN[ch]=last;try{localStorage.setItem("dfChatSeen",JSON.stringify(CHAT_SEEN));}catch(e){}}}
function chatList(){
  const me=chatMe(),others=["cm",...(L?L.teams.map(t=>t.id):[])].filter(k=>k!==me);
  const row=(ch,label,sub)=>{const ms=chatMsgs(ch),last=ms[ms.length-1],u=chatUnread(ch);
    return `<button class="chrow" data-chat="${esc(ch)}"><span class="chav${ch==="league"?" lg":dmOther(ch)==="cm"?" cm":""}">${ch==="league"?"#":esc(initials(label))}</span><span class="chmid"><b>${esc(label)}</b><span>${last?esc((ch==="league"?chatName(last.from)+": ":last.from===me?"You: ":"")+last.text):esc(sub)}</span></span>${u?`<span class="chbadge">${u}</span>`:last?`<span class="chtime">${chatTime(last.at,true)}</span>`:""}</button>`;};
  return row("league","League chat","Everyone in the league")+`<div class="chsec">Direct messages</div>`+others.map(k=>row(dmKey(me,k),chatName(k),"Start a conversation")).join("");
}
function chatTime(ms,short){const d=new Date(ms),now=new Date(),same=d.toDateString()===now.toDateString();
  return same?d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):d.toLocaleDateString("en-US",short?{month:"short",day:"numeric"}:{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
function chatThread(ch){
  const me=chatMe(),ms=chatMsgs(ch);let day="",h="";
  ms.forEach((m,i)=>{const d=new Date(m.at).toDateString();if(d!==day){day=d;h+=`<div class="chday">${new Date(m.at).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div>`;}
    if(m.from==="sys"&&m.kind==="trade"&&m.tx){const th=tradeMsgHtml(m,ms);if(th){h+=th;return;}}
    if(m.from==="sys"){const [hd,...rest]=m.text.split("\n");h+=`<div class="msg sys"><span class="mtext"><b>${esc(hd)}</b>${rest.length?"\n"+esc(rest.join("\n")):""}</span><span class="mtime">${new Date(m.at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})} · <button class="chlink" data-chgo="trades">Open Trades</button></span></div>`;return;}
    const mine=m.from===me,prev=ms[i-1],grouped=prev&&prev.from===m.from&&m.at-prev.at<300000&&new Date(prev.at).toDateString()===d;
    h+=`<div class="msg${mine?" me":""}${grouped?" grp":""}">${!mine&&ch==="league"&&!grouped?`<span class="mfrom">${esc(chatName(m.from))}</span>`:""}<span class="mtext">${esc(m.text)}</span><span class="mtime">${new Date(m.at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span></div>`;});
  return h||`<p class="chempty">${ch==="league"?"Say something to the whole league.":`No messages yet. Only you and ${esc(chatName(dmOther(ch)))} see this conversation.`}</p>`;
}
function renderChat(){
  const fab=$("#chatFab"),pane=$("#chatPane");if(!fab)return;
  const me=chatMe();fab.hidden=!me;if(!me){pane.hidden=true;CHAT_OPEN=false;return;}
  const total=["league",...new Set(CHAT_D.map(m=>m.ch))].reduce((s,ch)=>s+chatUnread(ch),0);
  const b=$("#chatCount");b.hidden=!total;b.textContent=total>9?"9+":total;fab.setAttribute("aria-label",total?`Chat, ${total} unread`:"Chat");
  pane.hidden=!CHAT_OPEN;fab.setAttribute("aria-expanded",CHAT_OPEN);if(!CHAT_OPEN)return;
  $("#chatBack").hidden=!CHAT_CH;$("#chatForm").hidden=!CHAT_CH;
  $("#chatTitle").textContent=CHAT_CH?(CHAT_CH==="league"?"League chat":chatName(dmOther(CHAT_CH))):"Chat";
  $("#chatSub").textContent=CHAT_CH?(CHAT_CH==="league"?`Everyone in ${L?.name||"the league"}`:"Direct message"):`You're ${chatName(me)}`;
  const body=$("#chatBody"),atEnd=body.scrollHeight-body.scrollTop-body.clientHeight<40;
  body.innerHTML=CHAT_CH?chatThread(CHAT_CH):chatList();body.classList.toggle("thread",!!CHAT_CH);
  if(CHAT_CH){chatSeen(CHAT_CH);if(atEnd||renderChat.jump){body.scrollTop=body.scrollHeight;renderChat.jump=false;}const u=["league",...new Set(CHAT_D.map(m=>m.ch))].reduce((s,ch)=>s+chatUnread(ch),0);b.hidden=!u;b.textContent=u>9?"9+":u;}
}
function chatOpen(ch){CHAT_CH=ch;renderChat.jump=true;renderChat();if(ch)setTimeout(()=>$("#chatInput")?.focus(),30);}
async function chatSend(){
  const i=$("#chatInput"),text=i.value.trim().slice(0,1000),me=chatMe();if(!text||!CHAT_CH||!me)return;
  const ch=CHAT_CH,members=ch==="league"?["all"]:ch.split(":").slice(1);
  i.value="";chatGrow();
  try{await Store.set("chat",`${Date.now()}_${Math.random().toString(36).slice(2,7)}`,{ch,members,from:me,text,at:Date.now(),by:Store.uid||null});renderChat.jump=true;renderChat();}
  catch(e){i.value=text;showErr(e);}
}
function chatGrow(){const i=$("#chatInput");if(!i)return;i.style.height="auto";i.style.height=Math.min(120,i.scrollHeight)+"px";}

/* ============================================================================
   TRADES: offer → the other team accepts → 48-hour league vote → done.
   Every team votes Pass or Veto (the two teams in the trade count as Pass).
   A majority of the league either way settles it early; with no veto
   majority it goes through when the 48 hours are up. The commissioner can
   approve or veto at any stage and reverse a finished trade.
   votes/<tradeId>_t<N> {season, tx, team, v:"pass"|"veto", at}
   ============================================================================ */
const REVIEW_MS=48*3600e3;
let VOTES=[];
const isTrade=t=>t.type==="trade";
const voteMajority=()=>Math.floor(L.teams.length/2)+1;
function tally(t){
  const parties=[tnum(t.from),tnum(t.to)],vs={};
  VOTES.filter(v=>v.tx===t.id&&!parties.includes(tnum(v.team))&&L.teams.some(x=>x.id===v.team)).forEach(v=>vs[tnum(v.team)]=v.v);
  const veto=Object.values(vs).filter(v=>v==="veto").length,pass=Object.values(vs).filter(v=>v==="pass").length+2;
  return {pass,veto,need:voteMajority(),left:L.teams.length-pass-veto,mine:vs[myTeamNum()]||null,parties};
}
function tradesNeedingMe(){
  if(!L||!SESSION)return 0;const me=myTeamNum();
  return TXS.filter(t=>isTrade(t)&&((t.status==="proposed"&&(isCommish()||tnum(t.to)===me))||(t.status==="review"&&(isCommish()||(me&&!tally(t).parties.includes(me)&&!tally(t).mine))))).length;
}
const tradeSides=t=>`<div class="sides"><div><b>${esc(teamName(t.from))}</b> sends</div><div><b>${esc(teamName(t.to))}</b> sends</div><div>${t.give.map(n=>esc(n)+cups(n)).join("<br>")||'<span class="muted">Nothing</span>'}</div><div>${t.get.map(n=>esc(n)+cups(n)).join("<br>")||'<span class="muted">Nothing</span>'}</div></div>`;
function tradesView(){
  const me=myTeamNum(),cm=isCommish(),tr=TXS.filter(isTrade);
  const btn=(cls,act,t,label)=>`<button class="btn ${cls} sm" data-trv="${act}:${esc(t.id)}">${label}</button>`;
  // waiting on the receiving team
  const prop=tr.filter(t=>t.status==="proposed").sort((a,b)=>b.at-a.at);
  const incoming=prop.filter(t=>tnum(t.to)===me),sent=prop.filter(t=>tnum(t.from)===me),others=prop.filter(t=>tnum(t.to)!==me&&tnum(t.from)!==me);
  const cmpB=t=>`<button class="mini-b" data-tcmp="${esc(t.id)}">Compare players</button>`;
  const offerCard=(t,acts,note)=>`<div class="offer">${tradeSides(t)}<div class="tacts">${note?`<span class="muted">${note}</span>`:""}${cmpB(t)}${acts}</div></div>`;
  const cmActs=t=>cm?btn("good","approve",t,"Approve now")+btn("danger","veto",t,"Veto"):"";
  let h="";
  if(incoming.length)h+=sec("Offers to you",`${incoming.length} waiting · accepting sends it to a 48-hour league vote`,incoming.map(t=>offerCard(t,btn("good","accept",t,"Accept")+`<button class="btn sm" data-tcounter="${esc(t.id)}">Counter</button>`+btn("danger","reject",t,"Reject")+(cm?btn("ghost","approve",t,"Approve now"):""))).join(""));
  // league vote
  const rev=tr.filter(t=>t.status==="review").sort((a,b)=>a.reviewEnds-b.reviewEnds);
  h+=sec("League vote",rev.length?`Majority of ${L.teams.length} teams (${voteMajority()}) passes or vetoes early · otherwise it goes through after 48 hours`:"Trades both teams agreed to wait here for 48 hours",
    rev.length?rev.map(t=>{const y=tally(t),pct=k=>Math.round(y[k]/L.teams.length*100),party=y.parties.includes(me);
      const vote=me&&!party?`<span class="vote" role="group" aria-label="Your vote"><button class="vbtn pass${y.mine==="pass"?" on":""}" data-trv="pass:${esc(t.id)}" aria-pressed="${y.mine==="pass"}">Pass</button><button class="vbtn veto${y.mine==="veto"?" on":""}" data-trv="vote-veto:${esc(t.id)}" aria-pressed="${y.mine==="veto"}">Veto</button></span>`:party?`<span class="muted">Your trade · you count as Pass</span>`:"";
      return `<div class="offer review">${tradeSides(t)}
        <div class="tally"><div class="tbar" aria-hidden="true"><i class="p" style="width:${pct("pass")}%"></i><i class="v" style="width:${pct("veto")}%"></i></div>
        <div class="tnums"><span><b class="okc">${y.pass}</b> pass</span><span><b class="badc">${y.veto}</b> veto</span><span>${y.left} not voted</span><span class="muted">${y.need} needed</span></div>
        <div class="tdead">Goes through in <b>${untilTxt(t.reviewEnds)}</b> unless ${y.need} teams veto</div></div>
        <div class="tacts">${cmpB(t)}${vote}${cmActs(t)}</div></div>`;}).join(""):`<p class="empty">No trades up for a vote.</p>`);
  if(sent.length)h+=sec("Your offers",`${sent.length} waiting on the other team`,sent.map(t=>offerCard(t,btn("ghost","cancel",t,"Cancel offer")+(cm?btn("good","approve",t,"Approve now"):""),"Waiting on "+esc(teamName(t.to)))).join(""));
  if(others.length&&(cm||!me))h+=sec("Other open offers",`${others.length} between other teams`,others.map(t=>offerCard(t,cmActs(t),"Waiting on "+esc(teamName(t.to)))).join(""));
  // history
  const fmtD=ms=>new Date(ms).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  const lab=t=>t.reverses?"Reversed by the commissioner":t.status==="accepted"?(t.resolved==="commish"||t.decidedRole==="commish"?"Approved by the commissioner":t.resolved==="vote"?"Passed by league vote":"Went through after 48 hours"):
    t.status==="vetoed"?(t.resolved==="commish"?"Vetoed by the commissioner":"Vetoed by league vote"):t.status==="rejected"?"Rejected":t.status==="countered"?"Countered":t.status==="cancelled"?"Cancelled":t.status==="failed"?"Didn't go through":t.status;
  const hist=tr.filter(t=>!["proposed","review"].includes(t.status)).sort((a,b)=>(b.eff||b.at)-(a.eff||a.at)).slice(0,25).map(t=>{
    const canRev=cm&&t.status==="accepted"&&!t.reverses&&!TXS.some(x=>x.reverses===t.id);
    const r=canRev?(CONFIRM==="rev:"+t.id?`<span class="confirm">Send the players back, starting tomorrow? ${btn("danger","reverse",t,"Reverse trade")}<button class="btn ghost sm" data-trv="keep:">Keep</button></span>`:btn("ghost","confirmrev",t,"Reverse")):"";
    return `<tr><td class="num muted">${fmtD(t.eff||t.at)}</td><td><span class="tstat ${t.status}">${esc(lab(t))}</span>${t.why?`<br><span class="muted">${esc(t.why)}</span>`:""}</td><td>${esc(teamName(t.from))} sends ${t.give.map(esc).join(", ")||"nothing"}<br>${esc(teamName(t.to))} sends ${t.get.map(esc).join(", ")||"nothing"} <button class="mini-b" data-tcmp="${esc(t.id)}">Compare</button>${r?`<div style="margin-top:6px">${r}</div>`:""}</td></tr>`;}).join("");
  const propose=(me||cm)&&!WRITE_BLOCKED?`<div class="row" style="justify-content:space-between;margin-bottom:2px"><span class="hint">${me?`Trading as <b>${esc(teamName(me))}</b>.`:"As commissioner you trade for the team picked at the top."} Players move the day after a trade goes through.</span><button class="btn" data-tradewith="0">Propose a trade</button></div>`:"";
  return propose+h+sec("Trade history","Last 25",hist?`<div class="scroll"><table class="txt"><tbody>${hist}</tbody></table></div>`:`<p class="empty">No finished trades yet.</p>`);
}
function sheetTradeWith(O,n){
  const T=actTeam();if(!T)return toast("Log in with your team code to trade.");
  if(O===T)O=0;
  const teams=L.teams.map(t=>tnum(t.id)).filter(x=>x!==T&&TEAMS[x]);
  if(!O)O=0;
  const cols=O?`<div class="tradecols"><div><p class="flabel">${esc(TEAMS[O].name)} sends</p>${rosterPick(O,"get","checkbox",n?[n]:[])}</div><div><p class="flabel">${esc(TEAMS[T].name)} sends</p>${rosterPick(T,"give","checkbox",[])}</div></div>`:`<p class="empty">Pick a team to see its roster.</p>`;
  openSheet(`Propose a trade`,`<div class="field" style="margin-bottom:10px"><label for="trWith">Trade with</label><select id="trWith"><option value="">Choose a team</option>${teams.map(x=>`<option value="${x}"${x===O?" selected":""}>${esc(TEAMS[x].name)}</option>`).join("")}</select></div>
    <p class="hint">Pick what each team sends. ${esc(O?TEAMS[O].name:"The other team")} accepts or rejects it, then the league has 48 hours to veto. Players move the day after it goes through.</p>${cols}
    <div id="trImpact" class="trbox"></div><div class="sheetacts"><button class="btn ghost" data-sheet="close">Cancel</button><button class="btn" data-sheet="trade" data-o="${O}" ${O?"":"disabled"}>Send offer</button></div>`);
  tradeImpact();
}
const sheetTrade=n=>sheetTradeWith(ownerNow(n),n);
// post trade news to chat: offers and replies as a direct message between the two teams, votes and results to the league
const tradeLine=t=>`${teamName(t.from)} sends ${t.give.join(", ")||"nothing"}\n${teamName(t.to)} sends ${t.get.join(", ")||"nothing"}`;
function tradeChat(t,ev){
  const dm=["offer","counter","rejected","cancelled"].includes(ev),members=dm?[t.from,t.to]:["all"];
  const when=t.reviewEnds?new Date(t.reviewEnds).toLocaleString("en-US",{weekday:"short",hour:"numeric",minute:"2-digit"}):"";
  const head={offer:`Trade offer from ${teamName(t.from)}`,counter:`Counter offer from ${teamName(t.from)}`,rejected:`${teamName(t.to)} rejected the trade offer`,cancelled:`${teamName(t.from)} cancelled the trade offer`,
    vote:`Trade up for a vote. Pass or veto by ${when}`,passed:"Trade passed by league vote. Players move tomorrow",time:"No veto majority in 48 hours, so the trade went through. Players move tomorrow",
    vetoed:"Trade vetoed by league vote",approved:"The commissioner approved this trade. Players move tomorrow",cmveto:"The commissioner vetoed this trade",reversed:"The commissioner reversed this trade. Players go back tomorrow",failed:"Trade didn't go through: a player had already moved"}[ev];
  Store.set("chat",`sys_${t.id}_${ev}`,{ch:dm?dmKey(t.from,t.to):"league",members,from:"sys",kind:"trade",tx:t.id,text:`${head}\n${tradeLine(t)}`,at:Date.now()}).catch(()=>{});
}
async function tradeAct(v){
  const i=v.indexOf(":"),a=v.slice(0,i),id=v.slice(i+1);
  if(a==="confirmrev"){CONFIRM="rev:"+id;return renderRosters();}
  if(a==="keep"){CONFIRM=null;return renderRosters();}
  const t=TXS.find(x=>x.id===id);if(!t)return;
  const me=myTeamNum(),cm=isCommish(),who={decidedBy:Store.uid||null,decidedRole:SESSION?.role||null};
  const stillOwned=()=>t.give.every(n=>ownerNow(n)===tnum(t.from))&&t.get.every(n=>ownerNow(n)===tnum(t.to));
  try{
    if(a==="accept"&&tnum(t.to)===me&&t.status==="proposed"){if(!stillOwned())return toast("A player in this offer has already moved. Reject it instead.");
      const now=Date.now();await Store.update("tx",id,{status:"review",acceptedAt:now,reviewEnds:now+REVIEW_MS,...who});toast("Accepted. The league has 48 hours to vote.");tradeChat({...t,reviewEnds:now+REVIEW_MS},"vote");}
    else if(a==="reject"&&tnum(t.to)===me){await Store.update("tx",id,{status:"rejected",...who});tradeChat(t,"rejected");}
    else if(a==="cancel"&&(tnum(t.from)===me||cm)){await Store.update("tx",id,{status:"cancelled",...who});tradeChat(t,"cancelled");}
    else if(a==="approve"&&cm){if(!stillOwned())return toast("A player in this trade has already moved.");
      await Store.update("tx",id,{status:"accepted",eff:Date.now(),day:TODAY+1,resolved:"commish",...who});toast("Trade approved. Players move tomorrow.");tradeChat(t,"approved");}
    else if(a==="veto"&&cm){await Store.update("tx",id,{status:"vetoed",resolved:"commish",closedAt:Date.now(),...who});toast("Trade vetoed");tradeChat(t,"cmveto");}
    else if((a==="pass"||a==="vote-veto")&&me&&t.status==="review"){const vv=a==="pass"?"pass":"veto",vid=`${id}_t${me}`,cur=tally(t).mine;
      if(cur===vv)await Store.del("votes",vid);else await Store.set("votes",vid,{season:SEASON,tx:id,team:tkey(me),v:vv,at:Date.now()});}
    else if(a==="reverse"&&cm){CONFIRM=null;if(t.give.some(n=>ownerNow(n)!==tnum(t.to))||t.get.some(n=>ownerNow(n)!==tnum(t.from)))return toast("Some of these players have moved since. Use adds and drops to fix the rosters instead.");
      await Store.set("tx",newId(),{season:SEASON,type:"trade",status:"accepted",from:t.to,to:t.from,give:t.give,get:t.get,at:Date.now(),eff:Date.now(),day:TODAY+1,reverses:t.id,resolved:"commish",...actor(),...who});toast("Trade reversed. Players go back tomorrow.");tradeChat(t,"reversed");}
  }catch(e){showErr(e);}
}
// settle trades whose vote or 48 hours are done; any logged-in app does it, and repeats are harmless
let settling=false;
// the day the players move: the day after the vote ended, even when nobody had the app open right then,
// but never onto a day where one of them has already played
function tradeDay(t,byVote){if(byVote)return TODAY+1;const d=Math.max(TODAY,todaySp(t.reviewEnds)+1);
  return d===TODAY&&[...t.give,...t.get].some(n=>lockedName(n,TODAY))?TODAY+1:d;}
async function settleTrades(){
  if(settling||!L||!SESSION||WRITE_BLOCKED)return;settling=true;
  try{for(const t of TXS.filter(x=>isTrade(x)&&x.status==="review")){
    const y=tally(t),now=Date.now();let patch=null;
    if(y.veto>=y.need)patch={status:"vetoed",resolved:"vote",closedAt:now};
    else if(y.pass>=y.need||now>=t.reviewEnds){const ok=t.give.every(n=>ownerNow(n)===tnum(t.from))&&t.get.every(n=>ownerNow(n)===tnum(t.to));
      patch=ok?{status:"accepted",eff:now,day:tradeDay(t,y.pass>=y.need),resolved:y.pass>=y.need?"vote":"time"}:{status:"failed",why:"A player had already moved",closedAt:now};}
    if(patch){await Store.update("tx",t.id,patch);tradeChat(t,patch.status==="vetoed"?"vetoed":patch.status==="failed"?"failed":patch.resolved==="vote"?"passed":"time");}}}
  catch(e){}finally{settling=false;}
}
setInterval(settleTrades,30000);

/* ============================================================================
   ANALYTICS: matchup forecast, category heat map, strengths and punts,
   games left, hot and cold players, streaming pickups. Projections are
   ESPN preseason per-game numbers; "actual" is box scores so far.
   ============================================================================ */
let ANMODE="proj";try{ANMODE=localStorage.getItem("dfAnMode")||"proj";}catch(e){}
// per-game line from a season array [PTS..MIN,GP]
const pgLine=a=>a&&a[11]?a.slice(0,11).map(v=>v/a[11]):null;
// league baseline for z-scores: the top 150 projected players
let _zb=null,_zbKey="";
function zBase(){
  const key=CATS.map(c=>c[0]).join();if(_zb&&_zbKey===key)return _zb;
  const ps=POOLD.slice().sort((a,b)=>a.rk-b.rk).slice(0,150).map(p=>pgLine(p.tot)).filter(Boolean),out={};
  CATS.forEach(c=>{let xs;
    if(c[1]==="pct"){const lg=ps.reduce((s,p)=>s+p[c[2]],0)/Math.max(1,ps.reduce((s,p)=>s+p[c[3]],0));xs=ps.map(p=>p[c[2]]-lg*p[c[3]]);out[c[0]]={lg};}
    else xs=ps.map(p=>p[c[2]]);
    const m=xs.reduce((a,b)=>a+b,0)/xs.length,sd=Math.sqrt(xs.reduce((a,b)=>a+(b-m)**2,0)/xs.length)||1;out[c[0]]={...out[c[0]],m,sd};});
  _zbKey=key;return _zb=out;
}
function zOf(pg){if(!pg)return null;const B=zBase();return CATS.reduce((s,c)=>{const b=B[c[0]],x=c[1]==="pct"?pg[c[2]]-b.lg*pg[c[3]]:pg[c[2]];return s+(x-b.m)/b.sd;},0);}
const lineSum=(lines)=>{const t=new Array(11).fill(0);lines.forEach(l=>l&&l.forEach((v,i)=>{if(i<11)t[i]+=v;}));return t;};
// team strength per game: healthy rostered players' projections (proj) or started box scores so far (act)
function teamStrength(T){
  const P=TEAMS[T]?.P||[];
  if(ANMODE==="act"){const t=new Array(11).fill(0);let g=0;P.forEach(p=>Object.entries(p.d).forEach(([sp,l])=>{sp=+sp;if(sp<TODAY&&startedOn(p,sp)){g++;l.forEach((v,i)=>{if(i<11)t[i]+=v;});}}));return g?{t,g}:null;}
  const ls=P.filter(p=>p.s!=null&&p.s!==13&&p.st!=="OUT").map(p=>pgLine(p.pj)).filter(Boolean);
  return ls.length?{t:lineSum(ls),g:ls.length}:null;
}
const heat=(rank,n)=>`background:color-mix(in srgb,var(--accent) ${Math.round(6+40*(n-rank)/Math.max(1,n-1))}%,var(--surface))`;
function analyticsView(){
  if(!L||!Object.keys(TEAMS).length)return `<section class="panel emptyst"><h2>No data yet</h2><p>Analytics fill in once rosters exist.</p></section>`;
  const ids=L.teams.map(t=>tnum(t.id)).filter(T=>TEAMS[T]),me=TEAMS[cur]?cur:ids[0],N=ids.length;
  const modeBar=`<div class="tabs sm" role="group" aria-label="Data"><button data-anmode="proj" aria-selected="${ANMODE==="proj"}">ESPN projections</button><button data-anmode="act" aria-selected="${ANMODE==="act"}">Actual so far</button></div>`;
  // ---- 1. matchup forecast
  let fc="";const opp=M.opp;
  if(opp&&TEAMS[opp]){
    const proj=T=>{const now=score(T),rem=new Array(11).fill(0);
      TEAMS[T].P.filter(healthy).forEach(p=>{const pg=pgLine(p.pj);if(!pg)return;DAYS.forEach(sp=>{if(upcoming(p.t,sp)&&gameOn(p.t,sp)&&startedOn(p,sp))pg.forEach((v,i)=>rem[i]+=v);});});
      return {now,fin:now.map((v,i)=>v+rem[i])};};
    const a=proj(me),b=proj(opp);let w=0,l=0,t=0;
    const rows=CATS.map(c=>{const va=val(a.fin,c),vb=val(b.fin,c),na=val(a.now,c),nb=val(b.now,c),diff=va-vb,rel=Math.abs(diff)/Math.max(Math.abs(va),Math.abs(vb),1e-9);
      const call=rel<.03?"toss":diff>0?"win":"loss";if(call==="win")w++;else if(call==="loss")l++;else t++;
      const f=v=>c[1]==="pct"?pct(v):v.toFixed(0);
      return `<tr><td class="nm">${c[0]}</td><td class="num muted">${f(na)}</td><td class="num"><b>${f(va)}</b></td><td class="num"><b>${f(vb)}</b></td><td class="num muted">${f(nb)}</td><td><span class="call ${call}">${call==="win"?"Likely win":call==="loss"?"Likely loss":"Toss-up"}</span></td></tr>`;}).join("");
    fc=sec(`Matchup forecast · ${esc(TEAMS[me].name)} vs ${esc(TEAMS[opp].name)}`,`Box scores so far plus ESPN per-game projections for each starter's remaining games this matchup`,
      `<div class="anhero"><span class="big num">${w}-${l}${t?`-${t}`:""}</span><span class="muted">projected category record${t?` (${t} too close to call)`:""}</span></div>
      <div class="scroll"><table class="lg antable"><thead><tr><th class="nm">Cat</th><th>You now</th><th>You proj.</th><th>Opp proj.</th><th>Opp now</th><th class="nm">Outlook</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }
  // ---- 2. category heat map + 3. strengths and punts
  const S={};ids.forEach(T=>S[T]=teamStrength(T));
  const vals={};CATS.forEach(c=>{vals[c[0]]={};ids.forEach(T=>{const s=S[T];vals[c[0]][T]=s?(c[1]==="pct"?val(s.t,c):val(s.t,c)/(ANMODE==="act"?s.g:1)):null;});});
  const ranks={};CATS.forEach(c=>{const l=ids.filter(T=>vals[c[0]][T]!=null).sort((x,y)=>vals[c[0]][y]-vals[c[0]][x]);ranks[c[0]]={};l.forEach((T,i)=>ranks[c[0]][T]=i+1);});
  const has=T=>!!S[T],tot=T=>CATS.reduce((s,c)=>s+(ranks[c[0]][T]||N),0),order=ids.slice().sort((x,y)=>(has(y)-has(x))||tot(x)-tot(y)),NR=ids.filter(has).length;
  const fmtV=(v,c)=>v==null?"–":c[1]==="pct"?pct(v):ANMODE==="act"?v.toFixed(1):v.toFixed(0);
  const hm=`<div class="scroll"><table class="lg antable heat"><thead><tr><th class="nm">Team</th>${CATS.map(c=>`<th>${c[0]}</th>`).join("")}<th title="Average category rank">Avg rk</th></tr></thead><tbody>${order.map(T=>`<tr class="${T===me?"mine":""}"><td class="nm">${esc(TEAMS[T].name)}</td>${CATS.map(c=>{const r=ranks[c[0]][T],v=vals[c[0]][T];return `<td class="num" style="${r?heat(r,NR):""}" title="${esc(TEAMS[T].name)} · ${c[0]}: ${fmtV(v,c)} (rank ${r||"–"} of ${NR})">${r||"–"}</td>`;}).join("")}<td class="num"><b>${has(T)?(tot(T)/CATS.length).toFixed(1):"–"}</b></td></tr>`).join("")}</tbody></table></div>
    <p class="anote">Each cell is the team's rank in that category (1 = best, darker = better). Hover a cell for the value. ${ANMODE==="act"?"Actual: per started player-game so far.":"Projected: sum of healthy rostered players' ESPN per-game projections."}</p>`;
  // strengths: z vs league mean of team values
  const zs=CATS.map(c=>{const xs=ids.map(T=>vals[c[0]][T]).filter(v=>v!=null),m=xs.reduce((a,b)=>a+b,0)/(xs.length||1),sd=Math.sqrt(xs.reduce((a,b)=>a+(b-m)**2,0)/(xs.length||1))||1,v=vals[c[0]][me];return {c,z:v==null?0:(v-m)/sd,r:ranks[c[0]][me]};});
  const zmax=Math.max(2,...zs.map(z=>Math.abs(z.z)));
  const bars=NR<2||!has(me)?`<p class="empty">Needs at least two teams with ${ANMODE==="act"?"games played":"players"} to compare against.</p>`:`<div class="divbars" role="img" aria-label="Category strengths for ${esc(TEAMS[me].name)}">${zs.map(({c,z,r})=>{const w=Math.abs(z)/zmax*50;
    return `<div class="dbrow" title="${c[0]}: ${z>=0?"+":""}${z.toFixed(2)} standard deviations vs the league, rank ${r||"–"} of ${NR}"><span class="dbl">${c[0]}</span><span class="dbtrack"><span class="dbmid"></span><span class="dbbar ${z>=0?"pos":"neg"}" style="${z>=0?`left:50%;width:${w}%`:`right:50%;width:${w}%`}"></span></span><span class="dbv num">${z>=0?"+":""}${z.toFixed(1)} · ${r?ord(r):"–"}</span></div>`;}).join("")}</div>
    <div class="dblegend"><span><i class="neg"></i>Below league average (punt candidates)</span><span><i class="pos"></i>Above average (strengths)</span></div>`;
  // ---- 4. games left this matchup
  const gl=ids.map(T=>({T,n:gamesLeft(T),p:gamesPlayed(T)})).sort((a,b)=>b.n-a.n),gmax=Math.max(1,...gl.map(g=>g.n));
  const glh=`<div class="hbars">${gl.map(g=>`<div class="hbrow${g.T===me?" mine":""}" title="${esc(TEAMS[g.T].name)}: ${g.n} starter games left, ${g.p} played"><span class="hbl">${esc(TEAMS[g.T].name)}</span><span class="hbtrack"><span class="hbbar" style="width:${g.n/gmax*100}%"></span></span><span class="hbv num">${g.n}</span></div>`).join("")}</div>
    <p class="anote">Starter games left in ${esc(weekLabel(wk))}, counting only players in starting slots with a game and not OUT. ${gl.length>1?`${esc(TEAMS[gl[0].T].name)} has the most.`:""}</p>`;
  // ---- 6. streaming: free agents by games left this matchup × projected value
  const stream=Object.values(DIR).filter(D=>!ownerNow(D.n)&&D.pj).map(D=>{const g=DAYS.filter(sp=>upcoming(D.t,sp)&&gameOn(D.t,sp)&&INJ[D.n]!=="OUT").length,z=zOf(pgLine(D.pj));return {D,g,z,s:g*Math.max(0,z+2)};}).filter(x=>x.g>0).sort((a,b)=>b.s-a.s).slice(0,10);
  const st=stream.length?`<div class="scroll"><table class="lg antable"><thead><tr><th class="nm">Free agent</th><th>Games left</th><th title="ESPN projected value per game, z-score sum across your categories">Value/game</th><th class="nm">Next games</th></tr></thead><tbody>${stream.map(x=>`<tr><td class="nm"><b>${esc(x.D.n)}</b> <span class="muted">${esc(x.D.t)} · ${(x.D.el||[]).filter(e=>e<5).map(e=>SLOT[e]).join("/")}</span></td><td class="num">${x.g}</td><td class="num">${x.z>=0?"+":""}${x.z.toFixed(1)}</td><td class="nm muted">${DAYS.filter(sp=>upcoming(x.D.t,sp)&&gameOn(x.D.t,sp)).map(sp=>dow(sp)).join(" ")}</td></tr>`).join("")}</tbody></table></div>`:`<p class="empty">No free agents with games left this matchup.</p>`;
  const zNote=`Value is a z-score: how many standard deviations a player is above an average top-150 player, summed across the league's ${CATS.length} categories (FG% and FT% weighted by attempts).`;
  return `<div class="row anbar"><span class="hint">Analytics for <b>${esc(TEAMS[me].name)}</b> · pick another team at the top</span>${modeBar}</div>
  ${fc}
  ${sec("Category heat map",`${ANMODE==="act"?"Actual box scores so far":"ESPN projections for current rosters"} · teams sorted by average rank`,hm)}
  <div class="angrid">${sec(`Strengths and punts · ${esc(TEAMS[me].name)}`,"Standard deviations from the league average, with rank",bars)}${sec("Games left this matchup","Starter games remaining",glh)}</div>
  ${streamPlanner(me)}
  <p class="foot-note">${zNote} Heating up, cooling off and hot free agents are in <button class="tlink inl" data-apvgo="market">Players › Market</button>.</p>`;
}


/* ============================================================================
   NEWS AND HEALTH: ESPN's injuries feed (status, note, return date) and news
   feed, both pulled by Refresh into nba/<season> as injd and news.
   ============================================================================ */
let NEWSF="all";
const newsAll=()=>(NBA&&NBA.news)||[],injOf=n=>(NBA&&NBA.injd||{})[n]||null;
const newsFor=n=>newsAll().filter(a=>(a.p||[]).includes(n));
const hasNews=n=>newsAll().some(a=>(a.p||[]).includes(n)&&Date.now()-a.at<48*3600e3);
const ago=ms=>{const m=Math.max(0,Math.round((Date.now()-ms)/60000));return m<1?"just now":m<60?m+"m ago":m<1440?Math.round(m/60)+"h ago":Math.round(m/1440)+"d ago";};
const stPill=st=>st==="OUT"?'<span class="st out">OUT</span>':st==="DAY_TO_DAY"?'<span class="st dtd">DTD</span>':'<span class="st ok">Healthy</span>';
const retTxt=r=>{if(!r)return "";const d=new Date(r+"T12:00:00");return isNaN(d)?esc(r):d.toLocaleDateString("en-US",{month:"short",day:"numeric"});};
const newsItem=(a,showP=true)=>`<li class="nwi"><a href="${esc(a.u||"#")}" target="_blank" rel="noopener noreferrer"><b>${esc(a.h)}</b></a>${a.d?`<p>${esc(a.d)}</p>`:""}<div class="nwmeta"><span>${ago(a.at)}</span>${showP?(a.p||[]).slice(0,4).map(n=>{const o=ownerNow(n);return `<button class="nwp${o&&o===myTeamNum()?" mine":""}" data-pcard="${esc(n)}">${esc(n)}${o?` · ${esc(teamName(o))}`:DIR[n]?" · FA":""}</button>`;}).join(""):""}</div></li>`;
// per-game line from box scores on days in [a,b)
function lineRange(n,a,b){const d=DAYLINES[n]||{},ls=Object.entries(d).filter(([sp])=>+sp>=a&&+sp<b).map(([,l])=>l);if(!ls.length)return null;const t=lineSum(ls);return {t,g:ls.length};}
function playerCard(n){
  const D=DIR[n]||{},P=mkP(n),o=ownerNow(n),ij=injOf(n),st=INJ[n]||"ACTIVE";
  const pos=(D.el||[]).filter(e=>e<5).map(e=>SLOT[e]).join("/")||POS[D.p]||"";
  const pj=pgLine(D.pj),ss=lineRange(n,1,TODAY+1),l7=lineRange(n,Math.max(1,TODAY-7),TODAY+1);
  const cell=(x,c,per)=>{if(!x)return "–";if(c[1]==="pct")return pct(val(x,c));return (val(x,c)/(per||1)).toFixed(1);};
  const rows=[["ESPN projection",pj,1],[`Season (${ss?ss.g:0} gp)`,ss&&ss.t,ss&&ss.g],[`Last 7 days (${l7?l7.g:0} gp)`,l7&&l7.t,l7&&l7.g]];
  const stats=`<div class="scroll"><table class="lg pcstats"><thead><tr><th class="nm">Per game</th>${CATS.map(c=>`<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${rows.map(([lab,x,per])=>`<tr><td class="nm">${lab}</td>${CATS.map(c=>`<td class="num">${cell(x,c,per)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const health=`<div class="pchealth ${st==="OUT"?"out":st==="DAY_TO_DAY"?"dtd":""}">${stPill(st)}<div>${ij?`<b>${esc(ij.s||"")}${ij.t?` · ${esc(ij.t)}`:""}</b>${ij.r?` <span class="muted">· expected back ${retTxt(ij.r)}</span>`:""}${ij.c?`<p>${esc(ij.c)}</p>`:""}${ij.at?`<span class="muted">Updated ${ago(ij.at)}</span>`:""}`:`<span class="muted">${NBA&&NBA.injd?"Not on ESPN's injury report.":"Injury details load with Refresh."}</span>`}</div></div>`;
  const nw=newsFor(n);
  const T=actTeam(),act=T&&!WRITE_BLOCKED&&!mirror()?(o===0&&DIR[n]?`<button class="btn" data-add="${esc(n)}">Add to ${esc(TEAMS[T].name)}</button>`:o===T?`<button class="btn ghost" data-drop="${esc(n)}">Drop</button>`:o?`<button class="btn ghost" data-trade="${esc(n)}">Offer a trade</button>`:""):"";
  const sg=ss||pj&&{t:pj,g:1},rk=D.srk||D.rk,key=(v,l)=>`<div><b class="num">${v}</b><span>${l}</span></div>`;
  const keys=key(rk?"#"+rk:"–",D.srk?"Season rank":"ESPN rank")+[[K.PTS,"PTS"],[K.REB,"REB"],[K.AST,"AST"]].map(([i,l])=>key(sg?(sg.t[i]/sg.g).toFixed(1):"–",l)).join("")+key(sg&&sg.t[K.MIN]!=null?(sg.t[K.MIN]/sg.g).toFixed(1):"–","MIN");
  const tabs=[["ov","Overview"],["nw",`News${nw.length?` (${nw.length})`:""}`],["gl","Game log"]];
  openSheet(n,`<div class="pcard"><div class="pchead"><span class="hav ${o?"me":"fa"}">${esc(initials(n))}</span><div><p class="pcmeta">${esc(D.t||P.t||"")} · ${esc(pos)} · ${o?`<b>${esc(teamName(o))}</b>`:"Free agent"} ${rostPct(n)!=null?`<span class="pown"><b>${rostTxt(n)}</b> rostered on ESPN</span> `:""}${stPill(st)}</p><div class="pckeys">${keys}</div><span class="muted pcsrc">${ss?`Season per game (${ss.g} gp)`:pj?"ESPN projection per game":""}</span></div></div>
    <div class="pctabs" role="tablist">${tabs.map(([k,l],i)=>`<button role="tab" data-pctab="${k}" aria-selected="${!i}">${l}</button>`).join("")}</div>
    <div data-pane="ov"><h3>Health</h3>${health}
    <h3>Stats</h3>${stats}</div>
    <div data-pane="nw" hidden><h3>News</h3>${nw.length?`<ol class="nwl">${nw.slice(0,6).map(a=>newsItem(a,false)).join("")}</ol>`:`<p class="muted">${newsAll().length?"No recent ESPN stories mention this player.":"News loads with Refresh in the Claude desktop app."}</p>`}</div>
    <div data-pane="gl" hidden><h3>Game log</h3>${pcGameLog(n,D.t||P.t)}</div>
    <div class="sheetacts">${act}<button class="btn ghost" data-sheet="close">Close</button></div></div>`);
}
function newsView(){
  const mine=myTeamNum()||(TEAMS[cur]?cur:0),all=newsAll();
  // injury report: every rostered player ESPN lists, grouped by fantasy team (mine first)
  const inj=Object.keys(OWN).filter(n=>ownerNow(n)&&INJ[n]&&INJ[n]!=="ACTIVE").map(n=>({n,o:ownerNow(n),st:INJ[n],ij:injOf(n)}))
    .sort((a,b)=>(b.o===mine)-(a.o===mine)||a.o-b.o||(a.st==="OUT"?0:1)-(b.st==="OUT"?0:1));
  const ir=inj.length?`<ol class="nwl injl">${inj.map(x=>`<li class="nwi${x.o===mine?" mine":""}"><div class="injh"><button class="nmb" data-pcard="${esc(x.n)}"><b>${esc(x.n)}</b></button><span class="muted">${esc(DIR[x.n]?.t||"")} · ${esc(teamName(x.o))}</span></div>
      <div class="injs">${stPill(x.st)}${x.ij?.t?`<b>${esc(x.ij.t)}</b>`:""}${x.ij?.r?`<span class="muted">Back ${retTxt(x.ij.r)}</span>`:""}</div>${x.ij?.c?`<p>${esc(x.ij.c)}</p>`:""}</li>`).join("")}</ol>`
    :`<p class="empty">${NBA?"No rostered players are on ESPN's injury report.":"Press Refresh in the Claude desktop app to load the injury report."}</p>`;
  const f=NEWSF,list=all.filter(a=>f==="all"||(a.p||[]).some(n=>f==="mine"?ownerNow(n)===mine:ownerNow(n)));
  const chips=`<div class="tabs sm" role="group" aria-label="Filter news">${[["all","All NBA"],["rost","Rostered players"],["mine",mine?"My team":"This team"]].map(([k,l])=>`<button data-newsf="${k}" aria-selected="${f===k}">${l}</button>`).join("")}</div>`;
  const nl=list.length?`<ol class="nwl">${list.slice(0,40).map(a=>newsItem(a)).join("")}</ol>`:`<p class="empty">${all.length?"No stories match this filter right now.":"Press Refresh in the Claude desktop app to load ESPN news."}</p>`;
  return sec("Injury report · rostered players",`From ESPN${NBA?.at?`, pulled ${ago(NBA.at)}`:""}${mine&&TEAMS[mine]?` · ${esc(TEAMS[mine].name)} first`:""}`,ir)
    +`<div class="row anbar"><span class="hint">Tap a player name to open the player card</span>${chips}</div>`
    +sec("Latest news",`ESPN NBA stories, newest first${all.length?` · ${all.length} stories`:""}`,nl);
}

// hot and cold players (last 7 days vs projection): shown in Players › Market
function marketHot(){
  // ---- 5. hot and cold: last 7 days vs projection
  const from=Math.max(1,TODAY-7),recent=n=>{const d=DAYLINES[n]||{},ls=Object.entries(d).filter(([sp])=>+sp>=from&&+sp<TODAY).map(([,l])=>l);if(!ls.length)return null;const t=lineSum(ls);return {pg:t.map(v=>v/ls.length),g:ls.length};};
  const ppl=Object.values(DIR).map(D=>{const r=recent(D.n);if(!r)return null;const pj=pgLine(D.pj),za=zOf(r.pg),zp=pj?zOf(pj):null;const o=ownerNow(D.n);
    return {n:D.n,t:D.t,o,g:r.g,za,d:zp==null?null:za-zp,pg:r.pg};}).filter(Boolean);
  const pline=x=>`${x.pg[K.PTS].toFixed(1)} pts · ${x.pg[K.REB].toFixed(1)} reb · ${x.pg[K.AST].toFixed(1)} ast`;
  const plist=(arr,fmt)=>arr.length?`<ol class="plist">${arr.map(x=>`<li><div><span class="pnm"><b>${esc(x.n)}</b>${cups(x.n)}</span><span class="pmeta">${esc(x.t)} · ${x.o?esc(teamName(x.o)):"Free agent"} · ${x.g} ${x.g===1?"game":"games"} · ${pline(x)}</span></div><span class="num ${fmt(x)>=0?"okc":"badc"}">${fmt(x)>=0?"+":""}${fmt(x).toFixed(1)}</span></li>`).join("")}</ol>`:`<p class="empty">Not enough box scores yet.</p>`;
  const withD=ppl.filter(x=>x.d!=null&&x.o);
  const hot=withD.slice().sort((a,b)=>b.d-a.d).slice(0,8).filter(x=>x.d>0),cold=withD.slice().sort((a,b)=>a.d-b.d).slice(0,8).filter(x=>x.d<0);
  const faHot=ppl.filter(x=>!x.o).sort((a,b)=>b.za-a.za).slice(0,8);
  return `<div class="angrid">${sec("Heating up","Rostered players beating their ESPN projection, last 7 days",plist(hot,x=>x.d))}${sec("Cooling off","Rostered players below their ESPN projection, last 7 days",plist(cold,x=>x.d))}</div>
  <div class="angrid">${sec("Hot free agents","Best value per game over the last 7 days",plist(faHot,x=>x.za))}</div>`;
}
