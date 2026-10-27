
/* ============================================================================
   BOARD: the Week Board's matchup views, now fed by the league engine.
   ============================================================================ */
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const md=sp=>{const d=dateOf(sp);return MON[d.getMonth()]+" "+d.getDate();};
const dow=sp=>DOW[dateOf(sp).getDay()];
const weekName=n=>isPlayoff(n)?(n===CAL.length?"Championship":`Playoffs round ${n-regWeeks()}`):`Matchup ${n}`;
const weekLabel=([w,a,b])=>`${weekName(w)} · ${md(a)} – ${dateOf(a).getMonth()===dateOf(b).getMonth()?dateOf(b).getDate():md(b)}`;
const fmtTime=m=>m==null?"TBD":`${((Math.floor(m/60)+11)%12)+1}${m%60?":"+String(m%60).padStart(2,"0"):""}${m>=720?"p":"a"}`;
const healthy=p=>p.s!=null&&p.s!==13&&p.st!=="OUT";
const slotOn=(p,sp)=>p.sl&&sp in p.sl?p.sl[sp]:p.s;
const startedOn=(p,sp)=>{const s=slotOn(p,sp);return s!=null&&s<12;};
const viewDay=()=>selDay??(TODAY<wk[1]?wk[1]:TODAY>wk[2]?wk[2]:TODAY);
const val=(a,c)=>c[1]==="pct"?(a[c[3]]?a[c[2]]/a[c[3]]:0):a[c[2]];
const pct=v=>v?v.toFixed(3).replace(/^0/,""):"–";
const show=(v,c)=>c[1]==="pct"?pct(v):v;
const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

let cur=0,wk=CAL[0],tab="sched",selDay=null,DAYS=[],M={opp:null};
let nav="team";const SUB={team:"sched",matchup:"sched",league:"score"};
const open={},expanded=new Set();
let smode="week",pjMode="pg",apMode="season",apSort="rank",apPos="all",apOwn="fa";const CMP=[];
try{pjMode=localStorage.getItem("dfPjMode")||"pg";apMode=localStorage.getItem("dfApMode")||"season";smode=localStorage.getItem("dfSmode")||"week";}catch(e){}
const seasonLeft=p=>{if(!healthy(p))return null;let n=0;for(let sp=TODAY;sp<=SEASON_END;sp++)if(gameOn(p.t,sp))n++;return n;};
const weekOf=sp=>WEEKS.find(([,a,b])=>sp>=a&&sp<=b)||(sp<1?WEEKS[0]:WEEKS[WEEKS.length-1]);
const started=()=>wk[1]<=TODAY;
function opponentOf(id){for(const [h,a] of W[wk[0]]||[]){if(h===id)return a;if(a===id)return h;}return null;}
// My Team Stats: "day" shows only the picked day (the highlighted one), "week" the whole matchup
let tday=true;try{tday=localStorage.getItem("dfTeamDay")!=="0";}catch(e){}
// Matchup (1.23): ESPN-style switch under the scoreboard. "both" = Matchup (categories + both rosters);
// "me"/"op" = just that team, with stats for one day like My Team
let mfocus="both";try{mfocus=localStorage.getItem("dfMFocus")||"both";}catch(e){}
// Matchup screen (1.25): "simple" = scoreboard only in the middle, one day picker, one line per category.
// "hershy" is a placeholder layout Arp will set up later (shows Simple for now). The 1.24 "classic" code
// paths are kept but can't be picked (Arp: keep only Simple); add ["classic","Classic"] to MLAYS to bring it back.
const MLAYS=[["simple","Simple"],["hershy","Advanced"]];
let MLAY="simple";try{MLAY=localStorage.getItem("dfMLay")||"simple";}catch(e){}
if(!MLAYS.some(([k])=>k===MLAY))MLAY="simple";
const simpleM=()=>nav==="matchup"&&MLAY!=="classic";
const CBX=new Set();
const mFocus=()=>nav==="matchup"&&mfocus!=="both"&&M.opp&&TEAMS[M.opp]?mfocus:"";
const teamDay=()=>nav==="team"||!!mFocus();
let mday=true;try{mday=localStorage.getItem("dfMDay")!=="0";}catch(e){}
const dayOn=()=>nav==="team"?tday:mday;
const dayStats=()=>teamDay()&&dayOn();
const statDays=()=>dayStats()?[viewDay()]:DAYS;
const dayLabel=()=>{const v=viewDay();return `${v===TODAY?"Today":dow(v)} ${dateOf(v).getDate()}`;};
function totals(players,days=DAYS){const t=new Array(11).fill(0);let gp=0;players.forEach(p=>days.forEach(sp=>{const d=p.d[sp];if(d&&startedOn(p,sp)){gp++;d.forEach((v,i)=>t[i]+=v);}}));return {t,gp};}
function score(id){return TEAMS[id]?totals(TEAMS[id].P).t:new Array(11).fill(0);}
const finalToday=t=>!!(LIVE&&LIVE.day===TODAY&&LIVE.g[t]&&LIVE.g[t].s==="post");
const upcoming=(t,sp)=>sp>TODAY||(sp===TODAY&&!finalToday(t));
const playedOn=(p,sp)=>!!p.d[sp]&&(sp<TODAY||(sp===TODAY&&finalToday(p.t)));
const gamesLeft=id=>TEAMS[id].P.filter(healthy).reduce((s,p)=>s+DAYS.filter(sp=>upcoming(p.t,sp)&&gameOn(p.t,sp)&&startedOn(p,sp)).length,0);
const onDay=(id,sp)=>sp<TODAY?TEAMS[id].P.filter(p=>p.d[sp]&&startedOn(p,sp)).length:TEAMS[id].P.filter(p=>healthy(p)&&gameOn(p.t,sp)&&startedOn(p,sp)).length;
const gamesPlayed=id=>TEAMS[id].P.reduce((s,p)=>s+DAYS.filter(sp=>playedOn(p,sp)&&startedOn(p,sp)).length,0);
// bench games that could start: max lineup that fits the league's starting slots by position eligibility
const DEF_EL={1:[0,5,11],2:[1,5,11],3:[2,6,11],4:[3,6,11],5:[4,11]};
const canPlay=(p,slot)=>(p.el&&p.el.length?p.el:DEF_EL[p.p]||[11]).includes(slot);
const _bp={};let _bpKey="";
function benchPlan(id,sp){
  const key=REV+"|"+TODAY;if(key!==_bpKey){for(const k in _bp)delete _bp[k];_bpKey=key;}
  const ck=id+"|"+sp;if(_bp[ck])return _bp[ck];
  const P=TEAMS[id].P.filter(p=>{const s=slotOn(p,sp);return s!=null&&s!==13&&p.st!=="OUT"&&gameOn(p.t,sp);});
  const starters=P.filter(p=>slotOn(p,sp)<12),bench=P.filter(p=>slotOn(p,sp)===12&&upcoming(p.t,sp));
  const tryAssign=(owner,p,seen)=>{for(let j=0;j<LINEUP.length;j++){if(seen[j]||!canPlay(p,LINEUP[j]))continue;seen[j]=1;if(owner[j]==null||tryAssign(owner,owner[j],seen)){owner[j]=p;return true;}}return false;};
  const base=new Array(LINEUP.length).fill(null);starters.forEach(p=>tryAssign(base,p,[]));
  const can=new Set();bench.forEach(b=>{const o=base.slice();if(tryAssign(o,b,[]))can.add(b.n);});
  const all=base.slice();let extra=0;bench.forEach(b=>{if(tryAssign(all,b,[]))extra++;});
  return _bp[ck]={extra,can};
}
const benchExtra=id=>selDay?(selDay>=TODAY?benchPlan(id,selDay).extra:0):DAYS.filter(sp=>sp>=TODAY).reduce((s,sp)=>s+benchPlan(id,sp).extra,0);
const counts=id=>selDay?(selDay<TODAY?[onDay(id,selDay),0,0]:selDay===TODAY?[TEAMS[id].P.filter(p=>playedOn(p,TODAY)&&startedOn(p,TODAY)).length,TEAMS[id].P.filter(p=>healthy(p)&&gameOn(p.t,TODAY)&&upcoming(p.t,TODAY)&&startedOn(p,TODAY)).length,benchExtra(id)]:[0,onDay(id,selDay),benchExtra(id)]):[gamesPlayed(id),gamesLeft(id),benchExtra(id)];
const scope=()=>selDay?`${dow(selDay)} ${dateOf(selDay).getDate()}`:"This week";
const playing=(id,sp)=>id&&TEAMS[id]?onDay(id,sp):"–";
const noOppText=()=>{const n=wk[0];if(L&&n<(+L.startWeek||1))return "The season starts in week "+(+L.startWeek||1)+".";if(BYES[n]===cur)return "Bye week: no opponent this week.";if(isPlayoff(n))return PO?"Not in this playoff round.":"Playoff matchups are set when the regular season ends.";return "No opponent this week.";};

function renderBox(){
  const box=document.getElementById("box");if(!TEAMS[cur]){box.innerHTML="";return;}
  const opp=M.opp,live=started()&&!!opp,a=score(cur),b=opp?score(opp):new Array(11).fill(0);let w=0,l=0,t=0;
  const cells=CATS.map(c=>{const x=val(a,c),y=val(b,c);if(live){x===y?t++:x>y?w++:l++;}return [x,y];});
  const sub=(arr,c)=>c[1]==="pct"?`<small>${arr[c[2]]}/${arr[c[3]]}</small>`:"";
  const gl=[counts(cur),opp?counts(opp):["–","–",0]];
  const row=(cls,name,arr,mine,rec)=>`<tr class="${cls}"><td>${esc(name)}</td>${CATS.map((c,i)=>{const [x,y]=cells[i];const v=mine?x:y,o=mine?y:x;const lead=live&&v>o;return `<td class="${lead?"lead":""}">${started()?show(v,c):"–"}${started()?sub(arr,c):""}</td>`;}).join("")}${(mine?gl[0]:gl[1]).map((v,i)=>`<td class="${i===0?"gl":i===2?"bx":""}">${i===2?(v?"+"+v:"0"):v}</td>`).join("")}<td class="rec">${rec}</td></tr>`;
  box.style.minWidth=(330+CATS.length*62)+"px";
  box.innerHTML=`<colgroup><col class="name">${"<col>".repeat(CATS.length+3)}<col class="rec"></colgroup><thead><tr><th>Team</th>${CATS.map(c=>`<th>${c[0]}</th>`).join("")}<th class="gl">Played<small>${scope()}</small></th><th>Left<small>${scope()}</small></th><th title="Extra games available by moving bench players into open lineup spots (positions checked)">Bench<small>could start</small></th><th class="rec">W-L-T</th></tr></thead><tbody>`+
    row("me",TEAMS[cur].name,a,true,live?`${w}-${l}-${t}`:"–")+(opp?row("op",TEAMS[opp].name,b,false,live?`${l}-${w}-${t}`:"–"):`<tr class="op"><td colspan="${CATS.length+5}" style="font-family:var(--f-body);font-size:.85rem;color:var(--muted)">${esc(noOppText())}</td></tr>`)+"</tbody>";
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-dayh]");if(!b)return;selDay=+b.dataset.dayh;MOVING=null;try{renderBox();renderDays();if(typeof renderHero==="function")renderHero();}catch(x){}renderRosters();});
// My Team › Stats: the same day buttons as the Schedule table's day columns, in one row
function dayChips(id){const vd=viewDay();return `<div class="dchips" style="--n:${DAYS.length}" role="group" aria-label="Pick a day">${DAYS.map(sp=>`<span class="dayh${sp===TODAY?" todayh":""}${vd===sp?" dsel":""}"><button class="dayhb" data-dayh="${sp}" aria-pressed="${vd===sp}" title="See or set the lineup for ${dow(sp)} ${md(sp)}"><span class="dhn">${sp===TODAY?"Today":dow(sp)+" "+dateOf(sp).getDate()}</span><span class="dhs">Starts <b>${playing(id,sp)}</b></span></button></span>`).join("")}</div>`;}
function renderDays(){
  const el=document.getElementById("days");el.style.setProperty("--cols",Math.min(DAYS.length,7));
  el.innerHTML=DAYS.map(sp=>{
    const cls=["day",sp<TODAY?"past":"",sp===TODAY?"today":"",selDay===sp?"sel":""].join(" "),tb=sp===TODAY?'<span class="tbadge">Today</span>':"";
    return `<button class="${cls}" data-sp="${sp}" aria-pressed="${selDay===sp}">
      <span class="dname">${dow(sp)}<span><span class="mo">${MON[dateOf(sp).getMonth()]} </span>${dateOf(sp).getDate()}</span>${tb}</span>
      <span class="dcount"><span class="me">${nav==="team"?"Starts":"You"} <span class="num">${playing(cur,sp)}</span></span>${nav==="team"?"":`<span class="op">Opp <span class="num">${playing(M.opp,sp)}</span></span>`}</span>
      ${anyGame(sp)?"":'<span class="dnote">No NBA games</span>'}</button>`;}).join("");
  el.querySelectorAll(".day").forEach(b=>b.onclick=()=>{const sp=+b.dataset.sp;selDay=selDay===sp?null:sp;MOVING=null;renderBox();renderDays();if(typeof renderHero==="function")renderHero();renderRosters();});
}
function schedCell(p,sp,id){
  const g=gameOn(p.t,sp),cls=`g${sp<TODAY?" past":""}${sp===TODAY?" tod":""}${selDay===sp?" sel":""}`;
  if(!g)return `<td class="${cls}"><span class="none">·</span></td>`;
  if(sp===TODAY&&LIVE&&LIVE.day===TODAY&&LIVE.g[p.t]){const Lg=LIVE.g[p.t],d=p.d[sp];
    const ln=d?`<span class="line${startedOn(p,sp)?"":" benched"}" title="${esc(p.n)} tonight so far: ${d[0]} PTS, ${d[4]} REB, ${d[3]} AST">${d[0]}/${d[4]}/${d[3]}</span>${startedOn(p,sp)?"":' <span class="bn">BE</span>'}`:"";
    return `<td class="${cls}">${ln}<span class="gm"><span class="at">${g[1]?"vs":"@"}</span><span>${g[0]}</span><span class="t ${Lg.s==="in"?"live":""}">${liveTxt(Lg)}</span></span></td>`;}
  if(sp<TODAY){const d=p.d[sp];const ln=d?`${d[0]}/${d[4]}/${d[3]}`:"",tip=d?`${esc(p.n)}, ${dow(sp)} ${dateOf(sp).getDate()}: ${d[0]} PTS, ${d[4]} REB, ${d[3]} AST`:"";
    if(slotOn(p,sp)==null)return `<td class="${cls}"><span class="none">–</span></td>`;
    if(d&&!startedOn(p,sp))return `<td class="${cls}" title="${tip} (on the bench, not counted)"><span class="line benched">${ln}</span> <span class="bn">BE</span></td>`;
    return d?`<td class="${cls}" title="${tip}"><span class="line">${ln}</span></td>`:`<td class="${cls}" title="${STATS[sp]?"Did not play":"No box score saved yet. Press Refresh."}">${STATS[sp]?'<span class="dnp">DNP</span>':'<span class="none">?</span>'}</td>`;}
  const cs=id!=null&&slotOn(p,sp)===12&&benchPlan(id,sp).can.has(p.n);
  return `<td class="${cls}${cs?" csd":""}"${cs?' title="A starting spot he can fill is open this day (positions checked)"':""}><span class="gm"><span class="at">${g[1]?"vs":"@"}</span><span>${g[0]}</span>${sp===TODAY?`<span class="t">${fmtTime(g[2])}</span>`:""}${cs?`<span class="canst">can start</span>`:""}</span></td>`;
}
const GROUPS=[["start","Starters",s=>s!=null&&s<12,false],["bench","Bench",s=>s===12,false],["ir","Injured reserve",s=>s===13,true],["off","Not on roster that day",s=>s==null,true]];
const initials=n=>{const w=n.replace(/[.,]/g,"").split(/\s+/).filter(x=>!/^(jr|sr|ii|iii|iv)$/i.test(x));return ((w[0]||"")[0]+((w.length>1?w[w.length-1]:"")[0]||"")).toUpperCase();};
let Q="";
const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const matches=n=>!Q||norm(n).includes(Q);
// last season's honors
const CHAMP26=new Set(["Jalen Brunson","OG Anunoby","Karl-Anthony Towns","Mikal Bridges","Josh Hart","Landry Shamet","Jose Alvarado","Mitchell Robinson","Jordan Clarkson","Miles McBride","Ariel Hukporti","Jeremy Sochan"]);
const CUP25=new Set(["Jalen Brunson","Mikal Bridges","Josh Hart","OG Anunoby","Karl-Anthony Towns","Jordan Clarkson","Mitchell Robinson","Tyler Kolek","Ariel Hukporti","Pacôme Dadiet","Mohamed Diawara","Tosan Evbuomwan","Trey Jemison","Kevin McCullar Jr.","Guerschon Yabusele"]);
const AWARDS={
  "Shai Gilgeous-Alexander":[["aMvp","2025-26 NBA MVP"],["aClutch","2025-26 Clutch Player of the Year"]],
  "Victor Wembanyama":[["aDpoy","2025-26 Defensive Player of the Year"],["aMedal","2026 West Finals MVP"],["aCrown","2025-26 league leader: blocks (3.1 a game)"]],
  "Cooper Flagg":[["aRoy","2025-26 Rookie of the Year"]],
  "Keldon Johnson":[["a6moy","2025-26 Sixth Man of the Year"]],
  "Nickeil Alexander-Walker":[["aMip","2025-26 Most Improved Player"]],
  "Jalen Brunson":[["aMedal","2026 Finals MVP · East Finals MVP · NBA Cup MVP"]],
  "Anthony Edwards":[["aAsg","2026 All-Star Game MVP"]],
  "Luka Doncic":[["aCrown","2025-26 league leader: points (33.5 a game)"]],
  "Nikola Jokic":[["aCrown","2025-26 league leader: rebounds (12.9) and assists (10.7 a game)"]],
  "Ausar Thompson":[["aCrown","2025-26 league leader: steals (2.0 a game)"]],
  "Moussa Diabate":[["aHustle","2025-26 Hustle Award"]],
  "Derrick White":[["aSport","2025-26 Sportsmanship Award"]]};
const badge=(id,tip)=>`<span class="awd" data-tip="${esc(tip)}" aria-label="${esc(tip)}" role="img"><svg class="cupi" aria-hidden="true"><use href="#${id}"/></svg></span>`;
const cups=n=>{const k=norm(n);const list=[];if(CHAMP26.has(n))list.push(["sChamp","2026 NBA Champion (Knicks)"]);if(CUP25.has(n))list.push(["sCup","2025 NBA Cup Champion (Knicks)"]);
  for(const [nm,a] of Object.entries(AWARDS))if(norm(nm)===k)list.push(...a);return list.map(([id,t])=>badge(id,t)).join("");};
function hlName(n){if(!Q)return esc(n);let ns="",map=[];for(let i=0;i<n.length;i++){const c=norm(n[i]);for(let k=0;k<c.length;k++)map.push(i);ns+=c;}
  const at=ns.indexOf(Q);if(at<0)return esc(n);const s=map[at],e=map[at+Q.length-1]+1;return esc(n.slice(0,s))+"<mark>"+esc(n.slice(s,e))+"</mark>"+esc(n.slice(e));}
const noMatch=()=>`<p class="empty">No players match “${esc(Q)}”.</p>`;
function playerCell(p,card=true){
  const st=p.st==="DAY_TO_DAY"?'<span class="st dtd">DTD</span>':p.st==="OUT"?'<span class="st out">OUT</span>':"";
  const av=`<span class="av ${p.p<=2?"g":p.p<=4?"f":"c"}${p.st==="OUT"?" out":p.st==="DAY_TO_DAY"?" dtd":""}" aria-hidden="true">${initials(p.n)}</span>`;
  const pos=(p.el||[]).filter(e=>e<5).map(e=>SLOT[e]).join("/")||POS[p.p];
  return `<div class="pwho">${av}<div><div class="pname">${card?`<span class="nm nmb" role="button" tabindex="0" data-pcard="${esc(p.n)}" title="Player card: health, stats and news">${hlName(p.n)}</span>`:`<span class="nm">${hlName(p.n)}</span>`}${cups(p.n)}${st}${card&&hasNews(p.n)?'<span class="nwdot" title="News in the last 2 days" aria-label="Recent news"></span>':""}</div><div class="pmeta">${esc(p.t)} · ${pos}</div></div></div>`;
}
const slotTag=(p,id,editable)=>{const vd=viewDay(),s=slotOn(p,vd);if(s==null)return "";
  if(editable&&vd>=TODAY){const lk=locked(p,vd),on=MOVING&&MOVING.n===p.n;
    return `<button class="mvb s${s}${on?" on":""}${lk?" lk":""}" data-move="${esc(p.n)}" ${lk?"disabled":""} aria-haspopup="dialog" aria-expanded="${on}" title="${lk?"Locked: his game has started":"Change slot for "+esc(p.n)}">${SLOT[s]}<span class="mvi" aria-hidden="true">${lk?"🔒":"▾"}</span></button>`;}
  return `<span class="slot s${s}${s===12?" bench":s===13?" ir":""}">${SLOT[s]}</span>`;};
const perGameOf=s=>{if(!s||!s[11])return null;const g=s[11];const t=s.slice(0,11).map((v,i)=>i===6||i===7||i===8||i===9?v:v/g);return {t,gp:g,tot:s};};
const perGame=p=>perGameOf(smode==="proj"?p.pj:p.ss);
const projTag='<span class="projtag">ESPN projection</span>';
const schedLegend=()=>`<details class="keybox"><summary>Key</summary><div class="legendbar"><span><b>Played days</b> = points/rebounds/assists (the phone week strip shows points)</span><span><span class="bn">BE</span> played on the bench (not counted)</span><span><span class="dnp">DNP</span> didn't play</span><span><b>vs</b> home · <b>@</b> away</span><span><span class="canst">can start</span> bench player with an open lineup spot that day</span><span>Tap a player for the full line</span></div></details>`;
const statModeBar=()=>`<div class="smode"><div class="tabs sm">${teamDay()?`<button data-smode="day" aria-selected="${smode==="week"&&dayOn()}">${dayLabel()}</button><button data-smode="week" aria-selected="${smode==="week"&&!dayOn()}">This week</button>`:`<button data-smode="week" aria-selected="${smode==="week"}">This week</button>`}<button data-smode="season" aria-selected="${smode==="season"}">Season per game</button><button data-smode="proj" aria-selected="${smode==="proj"}">Projected</button></div>${smode==="proj"?pjBar():""}</div>`;
const pjBar=()=>`<div class="tabs sm"><button data-pjmode="pg" aria-selected="${pjMode==="pg"}">Per game</button><button data-pjmode="tot" aria-selected="${pjMode==="tot"}">Season totals</button></div>`;
const statOf=(s,c,tot)=>{if(!s||!s[11])return null;if(c==="gp")return s[11];if(c==="min")return tot?s[K.MIN]:s[K.MIN]/s[11];if(c[1]==="pct")return s[c[3]]?s[c[2]]/s[c[3]]:0;return tot?s[c[2]]:s[c[2]]/s[11];};
const fmtStat=(v,c,tot)=>v==null?"–":c==="gp"?Math.round(v):c!=="min"&&c[1]==="pct"?pct(v):tot?String(Math.round(v)):v.toFixed(1);
const pvPair=(p,c)=>{const tot=pjMode==="tot";return `<span class="pv"><b>${fmtStat(statOf(p.pj,c,tot),c,tot)}</b><i>${fmtStat(statOf(p.ss,c,tot),c,tot)}</i></span>`;};
function statCells(p){
  if(smode==="proj")return ["gp","min",...CATS].map(c=>`<td class="r num">${pvPair(p,c)}</td>`).join("");
  if(smode==="season"){const g=perGame(p);if(!g)return `<td class="r num zero">0</td><td class="r num zero">–</td>`+CATS.map(()=>`<td class="r num zero">–</td>`).join("");
    const f=(v,c)=>c[1]==="pct"?pct(v):v.toFixed(1),tot=v=>Math.round(v);
    return `<td class="r num">${tot(g.gp)}</td><td class="r num">${g.t[K.MIN].toFixed(1)}</td>`+CATS.map(c=>`<td class="r num">${f(val(g.t,c),c)}${c[1]==="pct"?`<span class="sub">${tot(g.tot[c[2]])}/${tot(g.tot[c[3]])}</span>`:""}</td>`).join("");}
  const {t,gp}=totals([p],statDays());
  return `<td class="r num">${gp}</td><td class="r num${gp?"":" zero"}">${gp?t[K.MIN]:"–"}</td>`+CATS.map(c=>`<td class="r num${gp?"":" zero"}">${gp?show(val(t,c),c):"–"}${gp&&c[1]==="pct"?`<span class="sub">${t[c[2]]}/${t[c[3]]}</span>`:""}</td>`).join("");
}
let hideOpp=false;try{hideOpp=localStorage.getItem("dfHideOpp")==="1";}catch(e){}
// open starting slots for a team on a day (shown as empty rows so a player can be moved into them)
function openSlots(id,sp){const used={};TEAMS[id].P.forEach(p=>{const s=slotOn(p,sp);if(s!=null)used[s]=(used[s]||0)+1;});
  const out=[];FILL_ORDER.forEach(s=>{for(let i=used[s]||0;i<(CAP[s]||0);i++)out.push(s);});return out;}
// phone row: what the player does on the viewed day, and a slim week strip under the name
function dayInfo(p,sp,id){const g=gameOn(p.t,sp);if(!g)return slotOn(p,sp)!=null&&slotOn(p,sp)<12&&sp>=TODAY?`<span class="cdn nw">No game</span><small>move to bench</small>`:`<span class="cdn">No game</span>`;
  const d=p.d[sp],at=`${g[1]?"vs":"@"} ${g[0]}`,bench=slotOn(p,sp)===12;
  if(sp===TODAY&&LIVE&&LIVE.day===TODAY&&LIVE.g[p.t]){const Lg=LIVE.g[p.t];return `${d?`<b class="${startedOn(p,sp)?"":"benched"}" data-tk="ln:${esc(p.n)}">${d[0]}/${d[4]}/${d[3]}</b>`:`<b>${at}</b>`}<small class="${Lg.s==="in"?"live":""}">${d?at+" · ":""}${liveTxt(Lg)}</small>`;}
  if(sp<TODAY||(sp===TODAY&&d)){if(!d)return STATS[sp]?`<b class="dnp">DNP</b><small>${at}</small>`:`<b class="cdn">?</b><small>${at}</small>`;
    return `<b class="${startedOn(p,sp)?"":"benched"}" data-tk="ln:${esc(p.n)}">${d[0]}/${d[4]}/${d[3]}</b><small>${startedOn(p,sp)?"PTS/REB/AST":"on bench"}</small>`;}
  const cs=id!=null&&bench&&benchPlan(id,sp).can.has(p.n);
  return `<b>${at}</b><small>${sp===TODAY?fmtTime(g[2]):dow(sp)}</small>${cs?`<span class="canst">can start</span>`:""}`;}
function weekStrip(p,id){return DAYS.map(sp=>{const g=gameOn(p.t,sp),d=p.d[sp];let v="·",c="";
  if(g){if(sp<TODAY||(sp===TODAY&&d)){if(d){v=d[0];if(!startedOn(p,sp))c=" be";}else{v="DNP";c=" dnp";}}else v=(g[1]?"":"@")+g[0];}
  const cs=sp>=TODAY&&g&&slotOn(p,sp)===12&&benchPlan(id,sp).can.has(p.n);
  return `<span class="wd${g?" has":""}${sp<TODAY?" past":""}${sp===TODAY?" tod":""}${viewDay()===sp?" sel":""}${cs?" csd":""}${c}" title="${dow(sp)} ${dateOf(sp).getDate()}"><b>${dow(sp)[0]}</b>${v}</span>`;}).join("");}
function teamSection(id,side,editable){
  if(!TEAMS[id])return "";
  if(side==="op"&&hideOpp)return `<section class="panel team op"><div class="teamhead"><span class="tn">${esc(TEAMS[id].name)}</span><button class="mini-b" data-opp="show">Show roster</button></div></section>`;
  const P=TEAMS[id].P,nC=tab==="sched"?DAYS.length:CATS.length+2,cols=nC+2+(tab==="sched"?2:0);
  const vd=viewDay();
  const head=tab==="sched"
    ?`<tr><th class="pl">Player</th><th>Slot</th>${DAYS.map(sp=>`<th class="${sp===TODAY?"todayh":""}${nav==="team"&&vd===sp?" dselh":""}">${dow(sp)} ${dateOf(sp).getDate()}</th>`).join("")}<th class="c">Left</th><th class="c">Season</th></tr>`
    :`<tr><th class="pl">Player</th><th>Slot</th>${smode==="proj"?["GP","MIN",...CATS.map(c=>c[0])].map(l=>`<th class="r">${l}<span class="pvh"><b>Proj</b><i>Act</i></span></th>`).join(""):`<th class="r">GP</th><th class="r">MIN</th>${CATS.map(c=>`<th class="r">${c[0]}</th>`).join("")}`}</tr>`;
  let rows="",cards="";
  const mgr=managerOf(id);
  GROUPS.forEach(([key,lab,f,collapsible])=>{
    let list=P.filter(p=>f(slotOn(p,vd))&&matches(p.n));
    if(key==="off")list=list.filter(p=>DAYS.some(sp=>p.sl[sp]!=null));
    const empties=key==="start"&&!Q?openSlots(id,vd):[];
    if(!list.length&&!empties.length)return;
    const k=side+key,isOpen=!collapsible||open[k]||!!Q;
    const btn=collapsible?`<button class="grpbtn" data-k="${k}" aria-expanded="${!!isOpen}"><span class="chev">›</span>${lab} · ${list.length}</button>`:`<div class="grplabel">${lab}</div>`;
    rows+=`<tr class="grp"><td class="pl">${btn}</td><td colspan="${cols-1}"></td></tr>`;
    cards+=`<div class="card-grp">${btn}</div>`;
    if(!isOpen)return;
    if(key==="start")list.sort((a,b)=>LINEUP.indexOf(slotOn(a,vd))-LINEUP.indexOf(slotOn(b,vd)));
    list.forEach(p=>{
      const dim=selDay&&!gameOn(p.t,selDay),nog=nav==="team"&&!gameOn(p.t,vd),warn=nog&&key==="start"&&vd>=TODAY;
      const leftP=healthy(p)?DAYS.filter(sp=>upcoming(p.t,sp)&&gameOn(p.t,sp)).length:"–";
      const lk=id+"|"+p.n,isExp=expanded.has(lk),mv=MOVING&&MOVING.n===p.n&&MOVING.team===id;
      rows+=`<tr class="${dim?"dim":""}${mv?" mving":""}"><td class="pl"><button class="who" data-log="${esc(lk)}" aria-expanded="${isExp}">${playerCell(p)}</button></td><td>${slotTag(p,id,editable)}</td>`+(tab==="sched"?DAYS.map(sp=>schedCell(p,sp,id)).join("")+`<td class="c"><span class="left">${leftP}</span></td><td class="c num sl">${seasonLeft(p)??"–"}</td>`:statCells(p))+"</tr>";
      if(isExp)rows+=`<tr class="logrow"><td colspan="${cols}"><div class="logwrap">${gameLog(p)}</div></td></tr>`;
      let body;
      if(tab==="sched"){body=`<div class="chips" style="--n:${Math.min(DAYS.length,7)}">${DAYS.map(sp=>{const g=gameOn(p.t,sp),d=p.d[sp];let v='<span class="none">·</span>';if(g)v=sp<TODAY||(sp===TODAY&&d)?(d?(startedOn(p,sp)?`${d[0]}p`:`<span class="benched">${d[0]}p BE</span>`):'<span class="dnp">DNP</span>'):`${g[1]?"":"@"}${g[0]}`;const cs=sp>=TODAY&&g&&slotOn(p,sp)===12&&benchPlan(id,sp).can.has(p.n);return `<div class="chip${sp<TODAY?" past":""}${selDay===sp?" sel":""}${g?" has":""}${cs?" csd":""}"><b>${dow(sp)[0]}${dateOf(sp).getDate()}</b>${v}</div>`;}).join("")}</div>`;}
      else if(smode==="proj"){body=p.pj||p.ss?`<div class="cstats num pvc">${["gp",...CATS,"min"].map(c=>`<div><span>${c==="gp"?"GP":c==="min"?"MIN":c[0]}</span>${pvPair(p,c)}</div>`).join("")}</div>`:`<div class="muted">No ESPN projection</div>`;}
      else if(smode==="season"){const g=perGame(p);body=g?`<div class="cstats num"><div><span>GP</span>${g.gp}</div>${CATS.map(c=>`<div><span>${c[0]}</span>${c[1]==="pct"?pct(val(g.t,c)):val(g.t,c).toFixed(1)}</div>`).join("")}<div><span>MIN</span>${g.t[K.MIN].toFixed(1)}</div></div>`:`<div class="muted">No games played this season</div>`;}
      else{const {t,gp}=totals([p],statDays());body=`<div class="cstats num"><div><span>GP</span>${gp}</div>${CATS.map(c=>`<div><span>${c[0]}</span>${gp?show(val(t,c),c):"–"}</div>`).join("")}<div><span>MIN</span>${gp?t[K.MIN]:"–"}</div></div>`;}
      if(tab==="sched"){const left=healthy(p)?DAYS.filter(sp=>upcoming(p.t,sp)&&gameOn(p.t,sp)).length:null;
        cards+=`<div class="card cr${dim&&nav!=="team"?" dim":""}${nog?" nog":""}${warn?" warn":""}${mv?" mving":""}"><div class="crtop"><div class="crslot">${slotTag(p,id,editable)}</div><button class="who" data-log="${esc(lk)}" aria-expanded="${isExp}">${playerCell(p)}</button><div class="crday">${dayInfo(p,vd,id)}</div></div><div class="wk" style="--n:${Math.min(DAYS.length,7)}">${weekStrip(p,id)}<span class="wkl" title="Games left this week">${left==null?"–":left}<i>left</i></span></div>${isExp?`<div class="logwrap"><p class="muted crsl">${seasonLeft(p)??"–"} games left this season</p>${gameLog(p)}</div>`:""}</div>`;return;}
      cards+=`<div class="card${dim?" dim":""}${mv?" mving":""}"><div class="top"><button class="who" data-log="${esc(lk)}" aria-expanded="${isExp}">${playerCell(p)}</button><div>${slotTag(p,id,editable)}</div></div>${body}${isExp?`<div class="logwrap">${gameLog(p)}</div>`:""}</div>`;
    });
    empties.forEach(s=>{rows+=`<tr class="emptyrow"><td class="pl">Empty</td><td><span class="slot">${SLOT[s]}</span></td><td colspan="${cols-2}"></td></tr>`;cards+=`<div class="card"><div class="top"><span class="muted">Empty</span><span class="slot">${SLOT[s]}</span></div></div>`;});
  });
  if(tab==="stats"&&smode==="week"){const {t,gp}=totals(P,statDays());
    rows+=`<tr class="tot"><td class="pl">${dayStats()?`Team total · ${dayLabel()}`:"Team total"}</td><td></td><td class="r num">${gp}</td><td class="r num">${gp?t[K.MIN]:"–"}</td>${CATS.map(c=>`<td class="r num">${gp?show(val(t,c),c):"–"}</td>`).join("")}</tr>`;}
  const [cp,cl,cb]=counts(id);const played=totals(P).gp;
  const dayLine=`${scope()}: ${cp} played · ${cl} left${cb?` · <span class="bxs">+${cb} could start from bench</span>`:""}${nav==="team"?` · <span class="dhint">click a day to see or set its lineup</span>`:""}`;
  const statNote=tab==="stats"&&nav==="team"&&side==="me"?(smode==="season"?"Season per-game averages; FG%/FT% from season makes/attempts":smode==="proj"?`${projTag} <b class="pvk">Proj</b> full season ${pjMode==="tot"?"totals":"per game"} · <i class="pvk">Act</i> season so far`:dayStats()?`${totals(P,statDays()).gp} player games played ${dayLabel()} · pick another day above, or This week for the whole matchup`:`${played} player games played this week`):"";
  // My Team: one bar at the top of the card, identical on Schedule and Stats, so switching tabs only changes the table
  const band=nav==="team"&&side==="me"?`<div class="dband">${dayChips(id)}<div class="dbtools">${schedLegend()}${tab==="stats"?statModeBar():""}${statNote?`<span class="dbnote">${statNote}</span>`:""}</div></div>`:"";
  const sum=nav==="team"&&side==="me"?dayLine:tab==="sched"?`${scope()}: ${cp} played · ${cl} left${cb?` · <span class="bxs">+${cb} could start from bench</span>`:""}${nav==="team"?` · <span class="dhint">click a day to see or set its lineup</span>`:""}`:smode==="season"?"Season per-game averages; FG%/FT% from season makes/attempts":smode==="proj"?`${projTag} <b class="pvk">Proj</b> full season ${pjMode==="tot"?"totals":"per game"} · <i class="pvk">Act</i> season so far`:dayStats()?`${totals(P,statDays()).gp} player games played ${dayLabel()} · tap another day above, or This week for the whole matchup`:`${played} player games played this week`;
  const tools="";
  const trb=nav!=="league"&&!editable&&(myTeamNum()||isCommish())&&id!==myTeamNum()&&!WRITE_BLOCKED&&!mirror()?`<button class="btn ghost sm trb" data-tradewith="${id}">⇄ Propose trade</button>`:"";
  const headName=`<span class="tn">${esc(TEAMS[id].name)}<span class="mgr">${esc(mgr)}</span>${trb}</span>`;
  if(!P.length)return `<section class="panel team ${side}"><div class="teamhead">${headName}</div><p class="empty">No players yet. Rosters fill from the draft.</p></section>`;
  if(Q&&!P.some(p=>matches(p.n)))return `<section class="panel team ${side}"><div class="teamhead">${headName}</div>${noMatch()}</section>`;
  return `<section class="panel team ${side}"><div class="teamhead">${headName}<span class="sum">${sum}${side==="op"?' <button class="mini-b" data-opp="hide">Hide</button>':""}</span>${tools}</div>${band}
    <div class="scroll grid-wrap"><table class="grid${tab==="stats"&&smode==="proj"?" pjt":""}" style="min-width:${tab==="sched"?420+DAYS.length*84:(smode==="proj"&&tab==="stats"?256+(CATS.length+2)*88:344+(CATS.length+2)*66)}px"><colgroup><col class="pl"><col class="slot">${tab==="sched"?DAYS.map(()=>"<col>").join("")+'<col class="left"><col class="seas">':"<col>".repeat(CATS.length+2)}</colgroup><thead>${head}</thead><tbody>${rows}</tbody></table></div><div class="cards">${cards}</div></section>`;
}

// ---- player game log: every day of the week this player's NBA team plays
function gameLog(p){
  const rows=DAYS.filter(sp=>gameOn(p.t,sp)).map(sp=>{
    const g=gameOn(p.t,sp),d=p.d[sp],s=slotOn(p,sp),opp=`${g[1]?"vs":"@"} ${g[0]}`,day=`${dow(sp)} ${dateOf(sp).getDate()}`;
    const slot=s==null?"—":SLOT[s];
    if(sp>=TODAY&&!d)return `<tr class="up"><td>${day}</td><td>${opp}</td><td>${slot}</td><td colspan="9" class="muted">${sp===TODAY?`Tonight ${fmtTime(g[2])}`:`Scheduled ${fmtTime(g[2])}`}</td></tr>`;
    if(!d)return `<tr><td>${day}</td><td>${opp}</td><td>${slot}</td><td colspan="9"><span class="dnp">${STATS[sp]?"Did not play":"No box score saved yet"}</span></td></tr>`;
    const bench=!startedOn(p,sp);
    return `<tr${bench?' class="bn-row"':""}><td>${day}</td><td>${opp}</td><td>${slot}${bench?' <span class="bn">not counted</span>':""}</td><td>${d[K.MIN]}</td><td>${d[K.FGM]}-${d[K.FGA]}</td><td>${d[K.FTM]}-${d[K.FTA]}</td><td>${d[K.TPM]}</td><td>${d[K.REB]}</td><td>${d[K.AST]}</td><td>${d[K.STL]}</td><td>${d[K.BLK]}</td><td><b>${d[K.PTS]}</b></td></tr>`;
  }).join("");
  return rows?`<table class="logt num"><thead><tr><th>Day</th><th>Opp</th><th>Slot</th><th>MIN</th><th>FG</th><th>FT</th><th>3PM</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>PTS</th></tr></thead><tbody>${rows}</tbody></table>`:`<p class="muted">${esc(p.t)} has no games this week.</p>`;
}

// ---- tracker: this week (running totals by day) or over the season
let TRK={mode:"week",gran:"week",from:1,to:0,toLatest:true,cmp:"avg"};try{Object.assign(TRK,JSON.parse(localStorage.getItem("dfTrk")||"{}"));}catch(e){}
const saveTrk=()=>{try{localStorage.setItem("dfTrk",JSON.stringify(TRK));}catch(e){}};
const opponentIn=(id,n)=>{for(const [h,a] of W[n]||[]){if(h===id)return a;if(a===id)return h;}return null;};
function dayTotals(id,days){const t=new Array(10).fill(0);let any=false;(TEAMS[id]?.P||[]).forEach(p=>days.forEach(sp=>{const d=p.d[sp];if(d&&startedOn(p,sp)){any=true;for(let i=0;i<10;i++)t[i]+=d[i];}}));return any?t:null;}
const weekDays=w=>{const out=[];for(let sp=w[1];sp<=Math.min(w[2],TODAY-1);sp++)out.push(sp);return out;};
const hasDayData=sp=>Object.values(TEAMS).some(T=>T.P.some(p=>p.d[sp]));
function weekTotals(id,n){const w=WEEKS[n-1];if(w[1]>=TODAY)return null;return SCORES[n]?.[id]||dayTotals(id,weekDays(w));}
const sumArr=list=>{const ok=list.filter(Boolean);if(!ok.length)return null;const t=new Array(10).fill(0);ok.forEach(a=>a.forEach((v,i)=>t[i]+=v));return {t,n:ok.length};};
function leagueAvg(getter){const r=sumArr(Object.keys(TEAMS).map(id=>getter(+id)));if(!r)return null;return r.t.map((v,i)=>i>=6?v:v/r.n);}
