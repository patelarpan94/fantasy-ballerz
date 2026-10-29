
/* ============================================================================
   ANALYTICS › COMPARE (2026-10-23): the full tracker. Any team against any
   other team or the league average, over a preset or custom date range, day
   by day or week by week, as running totals or per period. Uses the same box
   scores as the Matchup tracker (starters only, finished days).
   ============================================================================ */
const TC={a:null,b:"avg",per:"season",from:"",to:"",gran:"week",cum:false};
try{Object.assign(TC,JSON.parse(localStorage.getItem("dfCmp")||"{}"));}catch(e){}
const saveTC=()=>{try{localStorage.setItem("dfCmp",JSON.stringify(TC));}catch(e){}};
const isoOf=sp=>{const d=dateOf(sp);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
function spOf(iso){for(let sp=1;sp<=SEASON_END;sp++)if(isoOf(sp)===iso)return sp;return null;}
// the finished days in the picked period
function tcRange(){
  const last=Math.min(TODAY-1,SEASON_END),wkNow=weekOf(Math.min(TODAY,SEASON_END));let a=1,b=last;
  if(TC.per==="week"){a=wkNow[1];}
  else if(TC.per==="last"){const w=WEEKS[Math.max(0,wkNow[0]-2)];a=w[1];b=Math.min(last,w[2]);}
  else if(TC.per==="l14"){a=Math.max(1,last-13);}
  else if(TC.per==="custom"){a=spOf(TC.from)||1;b=Math.min(last,spOf(TC.to)||last);if(a>b)[a,b]=[b,a];}
  const days=[];for(let sp=Math.max(1,a);sp<=b;sp++)days.push(sp);return {a,b,days};}
function teamCompareView(){
  if(!L||!Object.keys(TEAMS).length)return `<section class="panel emptyst"><h2>No data yet</h2><p>Compare fills in once rosters exist.</p></section>`;
  const ids=L.teams.map(t=>tnum(t.id)).filter(T=>TEAMS[T]);
  if(TC.a==null||!TEAMS[TC.a])TC.a=TEAMS[cur]?cur:ids[0];
  // the Against list leaves out the picked team, so a stale "same team" pick falls back to the league average (BUG-162)
  if(TC.b!=="avg"&&TC.b!=="opp"&&(!TEAMS[TC.b]||+TC.b===+TC.a))TC.b="avg";
  const A0=TC.a,nameA=TEAMS[A0].name,nameB=TC.b==="avg"?"League average":TC.b==="opp"?"Their opponent each week":TEAMS[TC.b].name;
  const tsel=(k,extra)=>`<label class="hf"><span>${k==="a"?"Team":"Against"}</span><select data-tc="${k}">${extra.map(([v,l])=>`<option value="${v}"${String(TC[k])===String(v)?" selected":""}>${esc(l)}</option>`).join("")}${ids.filter(i=>k==="a"||i!==A0).map(i=>`<option value="${i}"${String(TC[k])===String(i)?" selected":""}>${esc(TEAMS[i].name)}</option>`).join("")}</select></label>`;
  const seg=(k,opts)=>`<div class="tabs sm" role="group">${opts.map(([v,l])=>`<button data-tcb="${k}:${v}" aria-selected="${String(TC[k])===String(v)}">${l}</button>`).join("")}</div>`;
  const R=tcRange();
  if(TC.per!=="custom"||!TC.from){TC.from=R.days.length?isoOf(R.a):isoOf(1);TC.to=R.days.length?isoOf(R.b):isoOf(1);}
  const maxD=isoOf(Math.max(1,Math.min(TODAY-1,SEASON_END)));
  const controls=`<div class="hfilters tcf">${tsel("a",[])}${tsel("b",[["avg","League average"],["opp","Their opponent each week"]])}
    <label class="hf"><span>From</span><input type="date" data-tcd="from" value="${TC.from}" min="${isoOf(1)}" max="${maxD}"></label>
    <label class="hf"><span>To</span><input type="date" data-tcd="to" value="${TC.to}" min="${isoOf(1)}" max="${maxD}"></label></div>
    <div class="tcbar">${seg("per",[["week","This week"],["last","Last week"],["l14","Last 14 days"],["season","Season"],["custom","Custom"]])}${seg("gran",[["day","By day"],["week","By week"]])}${seg("cum",[["false","Per period"],["true","Running total"]])}</div>`;
  const body=compareBody(A0,R,nameA,nameB);
  return sec("Compare teams",`${esc(nameA)} vs ${esc(nameB)} · ${R.days.length?`${esc(md(R.a))} – ${esc(md(R.b))}`:"no finished days"} · starters' box scores`,controls+body);
}
function compareBody(A0,R,nameA,nameB){
  if(!R.days.length)return `<p class="empty">No finished days in this period yet. Today's games count once they're final.</p>`;
  const oppDays=(days,fn)=>{ // "their opponent each week": split days by matchup week
    const by={};days.forEach(sp=>{const n=weekOf(sp)[0];(by[n]=by[n]||[]).push(sp);});
    return sumArr(Object.entries(by).map(([n,ds])=>{const o=opponentIn(A0,+n);return o!=null?fn(o,ds):null;}));};
  const bTot=days=>TC.b==="avg"?leagueAvg(id=>dayTotals(id,days)):TC.b==="opp"?(oppDays(days,(o,ds)=>dayTotals(o,ds))||{}).t||null:dayTotals(+TC.b,days);
  // periods
  let groups=[];
  if(TC.gran==="day")groups=R.days.filter(hasDayData).map(sp=>[[`${dateOf(sp).getMonth()+1}/${dateOf(sp).getDate()}`,`${dow(sp)} ${md(sp)}`],[sp]]);
  else{const by=new Map();R.days.forEach(sp=>{const n=weekOf(sp)[0];if(!by.has(n))by.set(n,[]);by.get(n).push(sp);});groups=[...by.entries()].map(([n,ds])=>[[`W${n}`,`Week ${n}${WEEKS[n-1][2]>=TODAY?" (in progress)":""}`],ds]);}
  if(!groups.length)return `<p class="empty">No saved box scores in this period. Refresh loads them.</p>`;
  const cum=TC.cum===true||TC.cum==="true",labels=groups.map(g=>g[0]);let A=groups.map(g=>dayTotals(A0,g[1])),B=groups.map(g=>bTot(g[1]));
  if(cum){const run=arr=>{let r=null;return arr.map(t=>{if(t)r=r?r.map((v,i)=>v+t[i]):t.slice();return r;});};A=run(A);B=run(B);}
  // totals table for the whole period
  const ta=dayTotals(A0,R.days)||new Array(10).fill(0),tb=bTot(R.days)||new Array(10).fill(0);
  const gpA=totals(TEAMS[A0].P,R.days).gp,gpB=TC.b==="avg"?Math.round(Object.keys(TEAMS).reduce((s,i)=>s+totals(TEAMS[i].P,R.days).gp,0)/Object.keys(TEAMS).length):TC.b==="opp"?(()=>{let g=0;const by={};R.days.forEach(sp=>{const n=weekOf(sp)[0];(by[n]=by[n]||[]).push(sp);});Object.entries(by).forEach(([n,ds])=>{const o=opponentIn(A0,+n);if(o!=null)g+=totals(TEAMS[o].P,ds).gp;});return g;})():totals(TEAMS[+TC.b].P,R.days).gp;
  let wa=0,wb=0;
  const rows=CATS.map(c=>{const x=val(ta,c),y=val(tb,c),pg=(v,gp)=>c[1]==="pct"?"":gp?(v/gp).toFixed(2):"–",lead=Math.abs(x-y)<1e-9?"":x>y?"a":"b";if(lead==="a")wa++;else if(lead==="b")wb++;
    const f=v=>c[1]==="pct"?pct(v):Number.isInteger(v)?v:v.toFixed(1);
    return `<tr><td class="nm">${c[0]}</td><td class="num${lead==="a"?" okc":""}">${f(x)}</td><td class="num muted">${pg(x,gpA)}</td><td class="num${lead==="b"?" okc":""}">${f(y)}</td><td class="num muted">${pg(y,gpB)}</td></tr>`;}).join("");
  const table=`<div class="scroll"><table class="lg antable tcsum"><thead><tr><th class="nm">Cat</th><th class="num">${esc(nameA)}</th><th class="num">/G</th><th class="num">${esc(nameB)}</th><th class="num">/G</th></tr></thead><tbody>${rows}<tr class="tot"><td class="nm">Starter games</td><td class="num">${gpA}</td><td></td><td class="num">${gpB}</td><td></td></tr></tbody></table></div>`;
  const head=`<p class="hsum"><b>${esc(nameA)}</b> ${wa}-${wb}${CATS.length-wa-wb?`-${CATS.length-wa-wb}`:""} in categories over ${R.days.length} ${R.days.length===1?"day":"days"} · ${groups.length} ${TC.gran==="day"?(groups.length===1?"day":"days"):(groups.length===1?"week":"weeks")} charted</p>`;
  const legend=`<div class="teamhead tchead"><span class="legend"><span class="key me"></span>${esc(nameA)}<span class="key op"></span>${esc(nameB)}</span></div>`;
  return head+table+legend+`<div class="minis">${miniCharts(labels,A,B,nameA,nameB,cum)}</div><p class="foot-note">${cum?"Running totals":"Each point is one "+(TC.gran==="day"?"day":"matchup week")}, from players' box scores on days they were in the starting lineup.${TC.b==="avg"?" League average counts every team.":""} Hover a point for its value.</p>`;
}
{const _av=analyticsView;analyticsView=function(){return SUB.analytics==="cmp"?teamCompareView():_av();};}
document.addEventListener("change",e=>{const s=e.target.closest("[data-tc],[data-tcd]");if(!s)return;
  if(s.dataset.tc){const v=s.value;TC[s.dataset.tc]=v==="avg"||v==="opp"?v:+v;}
  else{TC[s.dataset.tcd]=s.value;TC.per="custom";}
  saveTC();renderRosters();});
document.addEventListener("click",e=>{const b=e.target.closest("[data-tcb]");if(!b)return;const [k,v]=b.dataset.tcb.split(":");
  TC[k]=k==="cum"?v==="true":v;if(k==="per"&&v!=="custom"){TC.from="";TC.to="";}saveTC();renderRosters();});
