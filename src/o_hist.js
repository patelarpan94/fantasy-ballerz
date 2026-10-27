
/* ============================================================================
   HISTORY DATABASE (2026-10-22): Analytics › History. Every NBA box score line
   from the last 5 seasons (regular season, play-in, playoffs), from ESPN's
   public box scores, packed one file per season next to the page
   (hist/<season>.json) and loaded only when that season is picked.
   File: {s, t:[team], p:[[espnId,name]], g:[[gameId,date,home,away,hs,as,type]],
          l:[[game,player,team,starter,MIN,PTS,FGM,FGA,3PM,3PA,FTM,FTA,OREB,DREB,REB,AST,STL,BLK,TO,PF,+/-]]}
   ============================================================================ */
// this season (1.22): the Refresh pull saves each finished day as hist/<season>_d<day> in the app's
// database (same rows, with team names, plus every shot); it's read live instead of from a file.
const HNOW="2026-27";
const HSEASONS=[HNOW,"2025-26","2024-25","2023-24","2022-23","2021-22"];
const HCOLS=[["MIN",4],["PTS",5],["REB",14],["AST",15],["STL",16],["BLK",17],["3PM",8],["FGM",6],["FGA",7],["FG%",-1],["FTM",10],["FTA",11],["FT%",-2],["TO",18],["PF",19],["+/-",20]];
const HTYPE={2:"Regular",3:"Playoffs",5:"Play-in"};
const HDATA={},HLOAD={};
const HF={season:HSEASONS[0],game:"",q:"",team:"",opp:"",type:"2",minPts:"",view:"logs",sort:"date",dir:-1,limit:100};
try{Object.assign(HF,JSON.parse(localStorage.getItem("dfHist")||"{}"),{limit:100});}catch(e){}
if(!SUB.analytics)SUB.analytics="main";
let HNOWW=null;
function histNow(){
  if(!HNOWW)HLOAD[HNOW]=new Promise(res=>{HNOWW=Store.watch("hist",HNOW,docs=>{HDATA[HNOW]=histMerge(docs);res(HDATA[HNOW]);
    if(nav==="analytics"&&SUB.analytics==="hist"&&(HF.season===HNOW||HF.season==="all"))renderHist();});});
  return HLOAD[HNOW];
}
// day docs -> the season file shape; shots go straight into the Shots cache, one entry per team
function histMerge(docs){
  const D={s:HNOW,t:[],p:[],g:[],l:[]},ti={},pi={},sh={},tix=t=>ti[t]??(ti[t]=D.t.push(t)-1);
  docs.slice().sort((a,b)=>a.sp-b.sp).forEach(d=>{const go=D.g.length,pm=(d.p||[]).map(([i,n])=>pi[i]??(pi[i]=D.p.push([i,n])-1));
    (d.g||[]).forEach(g=>D.g.push([g[0],g[1],tix(g[2]),tix(g[3]),g[4],g[5],g[6]]));
    (d.l||[]).forEach(l=>D.l.push([go+l[0],pm[l[1]],tix(l[2]),...l.slice(3)]));
    (d.s||[]).forEach(r=>{const F=sh[r[2]]||(sh[r[2]]={s:HNOW,team:r[2],ty:[],r:[]});let k=F.ty.indexOf(r[7]);if(k<0)k=F.ty.push(r[7])-1;
      F.r.push([go+r[0],pm[r[1]],r[3],r[4],r[5],r[6],k,r[8],r[9]<0?-1:pm[r[9]]]);});});
  Object.keys(HSHOT).forEach(k=>{if(k.startsWith(HNOW+"/"))delete HSHOT[k];});
  D.t.forEach(t=>HSHOT[HNOW+"/"+t]=sh[t]||{s:HNOW,team:t,ty:[],r:[]});
  D.G=D.g.map(g=>({id:g[0],d:g[1],h:D.t[g[2]],a:D.t[g[3]],hs:g[4],as:g[5],ty:g[6]}));
  return D;
}
function histLoad(s){
  if(s===HNOW)return histNow();
  if(HDATA[s])return Promise.resolve(HDATA[s]);
  if(!HLOAD[s])HLOAD[s]=fetch(`hist/${s}.json`).then(r=>{if(!r.ok)throw new Error(`Couldn't load ${s} (${r.status})`);return r.json();})
    .then(d=>{d.G=d.g.map(g=>({id:g[0],d:g[1],h:d.t[g[2]],a:d.t[g[3]],hs:g[4],as:g[5],ty:g[6]}));HDATA[s]=d;return d;})
    .catch(e=>{delete HLOAD[s];throw e;});
  return HLOAD[s];
}
const hSeasons=()=>HF.season==="all"?HSEASONS:[HF.season];
const hPct=(m,a)=>a?m/a:null,hFmtPct=v=>v==null?"–":pct(v);
// every line that passes the filters, as {s,d,G,p,name,team,opp,home,L}
function histRows(anyGame){
  const gf=anyGame?"":HF.game,q=HF.q.trim().toLowerCase(),out=[],mp=+HF.minPts||0;
  hSeasons().forEach(s=>{const D=HDATA[s];if(!D)return;
    const names=D.p.map(p=>p[1]),hit=q?names.map(n=>n.toLowerCase().includes(q)):null;
    for(const l of D.l){
      if(hit&&!hit[l[1]])continue;const G=D.G[l[0]],team=D.t[l[2]],opp=team===G.h?G.a:G.h;
      if(HF.team&&team!==HF.team)continue;if(HF.opp&&opp!==HF.opp)continue;
      if(HF.type&&(HF.type==="post"?G.ty===2:G.ty!==+HF.type))continue;if(mp&&l[5]<mp)continue;
      if(gf&&gf!==s+":"+G.id)continue;
      out.push({s,G,name:names[l[1]],team,opp,home:team===G.h,L:l});}});
  return out;
}
const hVal=(L,i)=>i===-1?hPct(L[6],L[7]):i===-2?hPct(L[10],L[11]):L[i];
function histSort(rows,key){
  const c=HCOLS.find(x=>x[0]===key),dir=HF.dir;
  const f=key==="date"?r=>r.G.d:key==="name"?r=>r.name:key==="team"?r=>r.team:key==="gp"?r=>r.gp:c?r=>(r.L?hVal(r.L,c[1]):r.avg[c[0]]):r=>0;
  return rows.sort((a,b)=>{const x=f(a),y=f(b);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (x<y?-1:x>y?1:0)*dir;});
}
// per player per season: games, per-game averages, teams in order played
function histAverages(rows){
  const m=new Map();
  rows.forEach(r=>{const k=r.s+"|"+r.name;let a=m.get(k);if(!a){a={s:r.s,name:r.name,teams:[],gp:0,gs:0,sum:new Array(21).fill(0),first:r.G.d};m.set(k,a);}
    if(!a.teams.includes(r.team))a.teams.push(r.team);a.gp++;a.gs+=r.L[3];for(let i=4;i<21;i++)a.sum[i]+=r.L[i];});
  return [...m.values()].map(a=>{const avg={};HCOLS.forEach(([k,i])=>{avg[k]=i===-1?hPct(a.sum[6],a.sum[7]):i===-2?hPct(a.sum[10],a.sum[11]):a.sum[i]/a.gp;});
    return {...a,team:a.teams.join(", "),avg,G:{d:a.s}};});
}
const hCell=(k,v)=>v==null?"–":k.endsWith("%")?hFmtPct(v):k==="+/-"?(v>0?"+":"")+v:v;
const hAvg=(k,v)=>v==null?"–":k.endsWith("%")?hFmtPct(v):v.toFixed(1);
function histTable(rows){
  const th=(k,l,cls="num")=>`<th class="${cls} hsort${HF.sort===k?" on":""}" data-hsort="${k}" aria-sort="${HF.sort===k?(HF.dir>0?"ascending":"descending"):"none"}">${l}${HF.sort===k?(HF.dir>0?" ▲":" ▼"):""}</th>`;
  const show=rows.slice(0,HF.limit),more=rows.length-show.length;
  let head,body;
  if(HF.view==="avg"){
    head=`<tr>${th("name","Player","nm")}${HF.season==="all"?th("date","Season","nm"):""}${th("team","Team","nm")}${th("gp","GP")}${HCOLS.map(([k])=>th(k,k)).join("")}</tr>`;
    body=show.map(r=>`<tr><td class="nm"><button class="hname" data-hq="${esc(r.name)}">${esc(r.name)}</button></td>${HF.season==="all"?`<td class="nm">${r.s}</td>`:""}<td class="nm">${esc(r.team)}</td><td class="num">${r.gp}</td>${HCOLS.map(([k])=>`<td class="num">${hAvg(k,r.avg[k])}</td>`).join("")}</tr>`).join("");
  }else{
    head=`<tr>${th("date","Date","nm")}${th("name","Player","nm")}${th("team","Team","nm")}<th class="nm">Opp</th>${HCOLS.map(([k])=>th(k,k)).join("")}</tr>`;
    body=show.map(r=>{const G=r.G,L=r.L,won=(r.home?G.hs>G.as:G.as>G.hs);
      return `<tr><td class="nm"><button class="hgame" data-hgame="${r.s}:${G.id}" title="Box score">${G.d.slice(5).replace("-","/")}${HF.season==="all"?`<small>${G.d.slice(0,4)}</small>`:""}</button></td><td class="nm"><button class="hname" data-hq="${esc(r.name)}">${esc(r.name)}</button>${L[3]?"":`<small class="muted"> bench</small>`}</td><td class="nm">${esc(r.team)}</td><td class="nm">${r.home?"vs":"@"} ${esc(r.opp)} <small class="${won?"okc":"badc"}">${won?"W":"L"} ${r.home?G.hs+"-"+G.as:G.as+"-"+G.hs}</small>${G.ty!==2?` <small class="htype">${HTYPE[G.ty]}</small>`:""}</td>${HCOLS.map(([k,i])=>`<td class="num">${hCell(k,hVal(L,i))}</td>`).join("")}</tr>`;}).join("");
  }
  return `<div class="scroll hscroll"><table class="lg antable htbl"><thead>${head}</thead><tbody>${body||`<tr><td class="nm muted" colspan="20">No games match these filters.</td></tr>`}</tbody></table></div>
    ${more>0?`<div class="hmore"><button class="btn ghost sm" data-hmore>Show ${Math.min(more,200)} more</button><span class="muted">${more.toLocaleString()} more rows</span></div>`:""}`;
}
function histView(){
  const ss=hSeasons(),missing=ss.filter(s=>!HDATA[s]);
  if(!HLOAD.err)missing.forEach(s=>histLoad(s).then(()=>{if(nav==="analytics"&&SUB.analytics==="hist")renderHist();}).catch(e=>{HLOAD.err=e.message;renderHist();}));
  const teams=[...new Set(ss.flatMap(s=>HDATA[s]?.t||[]))].sort();
  const sel=(k,opts,lab)=>`<label class="hf"><span>${lab}</span><select data-hf="${k}">${opts.map(([v,l])=>`<option value="${esc(v)}"${String(HF[k])===String(v)?" selected":""}>${esc(l)}</option>`).join("")}</select></label>`;
  const filters=`<div class="hfilters">
    <label class="hf hfq"><span>Player</span><input type="search" data-hf="q" value="${esc(HF.q)}" placeholder="Search a name, like Curry" autocomplete="off"></label>
    ${sel("season",[...HSEASONS.map(s=>[s,s===HNOW?s+" (now)":s]),["all","All seasons"]],"Season")}
    ${sel("team",[["","All teams"],...teams.map(t=>[t,t])],"Team")}
    ${sel("opp",[["","Any opponent"],...teams.map(t=>[t,t])],"Opponent")}
    ${sel("type",[["","All games"],["2","Regular season"],["post","Play-in + playoffs"],["3","Playoffs only"]],"Games")}
    ${missing.length?"":sel("game",[["",`Any game`],...histGames()],"Game")}
    <label class="hf hfn"><span>Min PTS</span><input type="number" min="0" step="5" data-hf="minPts" value="${esc(HF.minPts)}" placeholder="0"></label>
    ${HFUNF[HF.view]?HFUNF[HF.view]():""}
    ${HF.q||HF.team||HF.opp||HF.game||HF.type!=="2"||HF.minPts||HF.q2?`<button class="btn ghost sm hclear" data-hclear>Clear filters</button>`:""}
  </div>
  <div class="hview"><div class="tabs sm" role="group" aria-label="Show"><button data-hview="logs" aria-selected="${HF.view==="logs"}">Game logs</button><button data-hview="avg" aria-selected="${HF.view==="avg"}">Season averages</button><button data-hview="shots" aria-selected="${HF.view==="shots"}">Shots</button></div>
    <div class="hfunrow" role="group" aria-label="Fun tools">${HFV.map(([k,l])=>`<button class="hfchip" data-hview="${k}" aria-pressed="${HF.view===k}">${l}</button>`).join("")}</div></div>`;
  let body;
  if(missing.length)body=`<p class="empty">${HLOAD.err?esc(HLOAD.err):`Loading ${missing.join(", ")}…`}</p>`;
  else if(HF.view==="shots")body=histShotsHtml(histRows());
  else if(HFUN[HF.view])body=HFUN[HF.view]();
  else{let rows=histRows();const games=new Set(rows.map(r=>r.s+r.G.id)).size,players=new Set(rows.map(r=>r.name)).size;
    if(HF.view==="avg"){rows=histAverages(rows);}
    if(HF.view==="avg"&&HF.sort==="date"&&HF.season!=="all"){HF.sort="PTS";HF.dir=-1;}
    histSort(rows,HF.sort);
    body=`<p class="hsum"><b>${rows.length.toLocaleString()}</b> ${HF.view==="avg"?(rows.length===1?"player season":"player seasons"):(rows.length===1?"stat line":"stat lines")} · ${games.toLocaleString()} ${games===1?"game":"games"} · ${players.toLocaleString()} ${players===1?"player":"players"}${HF.q?` matching “${esc(HF.q)}”`:""}</p>`+histTable(rows);}
  return sec("History database",`Every NBA box score from ${HSEASONS[HSEASONS.length-1]} to now · this season adds each day once its games are final · regular season, play-in and playoffs · tap a name to see only that player, a date for the full box score, Shots for shot charts and shot selection`,
    `<div id="histBox">${filters}<div id="histBody">${body}</div></div><p class="anote">Source: ESPN box scores and play-by-play, saved into the app (no live calls). This season's days are added by Refresh after every game that day is final, so tonight's games show up tomorrow.</p>`);
}
// every game the other filters allow, newest first; the picked game stays listed
function histGames(){
  const seen=new Map();histRows(true).forEach(r=>{const k=r.s+":"+r.G.id;if(!seen.has(k))seen.set(k,r);});
  let gs=[...seen.entries()].sort((a,b)=>a[1].G.d<b[1].G.d?1:-1);
  if(HF.game&&!seen.has(HF.game)){const [s,id]=HF.game.split(":"),G=HDATA[s]?.G.find(g=>g.id===id);if(G)gs.unshift([HF.game,{s,G}]);}
  return gs.map(([k,{G}])=>{const d=new Date(G.d+"T12:00:00");return [k,`${d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · ${G.a} @ ${G.h} ${G.as}-${G.hs}${G.ty!==2?" · "+HTYPE[G.ty]:""}`];});
}
// redraw only the results so typing in the search box keeps focus
function renderHist(){const box=document.getElementById("histBox");if(!box){renderRosters();return;}
  const tmp=document.createElement("div");tmp.innerHTML=histView();const nb=tmp.querySelector("#histBody");document.getElementById("histBody").replaceWith(nb);
  const f=tmp.querySelector(".hfilters"),old=box.querySelector(".hfilters");
  if(!old.contains(document.activeElement))old.replaceWith(f);
  else{const c=box.querySelector("[data-hclear]"),nc=f.querySelector("[data-hclear]");if(!!c!==!!nc)(c?c.remove():old.appendChild(nc));
    // team lists can change with the season
    ["team","opp","game"].forEach(k=>{const o=old.querySelector(`[data-hf="${k}"]`),n=f.querySelector(`[data-hf="${k}"]`);if(o&&n&&o!==document.activeElement)o.innerHTML=n.innerHTML;});}
  box.querySelector(".hview").replaceWith(tmp.querySelector(".hview"));}
const histSave=()=>{try{const {limit,...k}=HF;localStorage.setItem("dfHist",JSON.stringify(k));}catch(e){}};
{const _av=analyticsView;analyticsView=function(){return SUB.analytics==="hist"?histView():_av();};}
// the rest of the app refreshes on every data change; leave this page alone while it's open
{const _rr=renderRosters;renderRosters=function(){if(nav==="analytics"&&SUB.analytics==="hist"&&document.getElementById("histBox")&&$("#rosters").dataset.view==="analytics:hist")return;_rr();if(nav==="analytics")$("#rosters").dataset.view="analytics:"+SUB.analytics;};}
let hT=null;
document.addEventListener("input",e=>{const i=e.target.closest("[data-hf]");if(!i||i.tagName==="SELECT")return;HF[i.dataset.hf]=i.value;HF.limit=100;clearTimeout(hT);hT=setTimeout(()=>{histSave();renderHist();},220);});
document.addEventListener("change",e=>{const i=e.target.closest("select[data-hf]");if(!i)return;HLOAD.err=null;HF[i.dataset.hf]=i.value;if(i.dataset.hf==="season"&&HF.game&&HF.season!=="all"&&!HF.game.startsWith(HF.season+":"))HF.game="";HF.limit=100;histSave();renderHist();});
document.addEventListener("click",e=>{
  const s=e.target.closest("[data-hsort]");if(s){const k=s.dataset.hsort;if(HF.sort===k)HF.dir=-HF.dir;else{HF.sort=k;HF.dir=["name","team"].includes(k)?1:-1;}histSave();return renderHist();}
  const v=e.target.closest("[data-hview]");if(v){HF.view=v.dataset.hview;HF.limit=100;if(HF.view==="logs"&&HF.sort==="gp")HF.sort="date";histSave();return renderHist();}
  if(e.target.closest("[data-hmore]")){HF.limit+=200;return renderHist();}
  if(e.target.closest("[data-hclear]")){Object.assign(HF,{q:"",q2:"",team:"",opp:"",game:"",type:"2",minPts:"",limit:100});histSave();const b=document.getElementById("histBox");if(b)b.querySelector(".hfilters").replaceWith(Object.assign(document.createElement("div"),{className:"hfilters"}));return renderHist();}
  const n=e.target.closest("[data-hq]");if(n){HF.q=n.dataset.hq;HF.limit=100;histSave();const i=document.querySelector('#histBox [data-hf="q"]');if(i)i.value=HF.q;renderHist();document.getElementById("histBox")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
  const g=e.target.closest("[data-hgame]");if(g){const [s,id]=g.dataset.hgame.split(":");histBox(s,id);}
});
// full box score of one game, both teams
function histBox(s,id){
  const D=HDATA[s];if(!D)return;const gi=D.G.findIndex(g=>g.id===id),G=D.G[gi];if(!G)return;
  const lines=D.l.filter(l=>l[0]===gi),cols=[["MIN",4],["PTS",5],["REB",14],["AST",15],["STL",16],["BLK",17],["3PM",8],["FG",-3],["FT",-4],["TO",18],["+/-",20]];
  const side=t=>{const ls=lines.filter(l=>D.t[l[2]]===t).sort((a,b)=>b[3]-a[3]||b[4]-a[4]);
    return `<p class="flabel">${esc(t)} · ${t===G.h?G.hs:G.as}</p><div class="scroll"><table class="lg antable htbl"><thead><tr><th class="nm">Player</th>${cols.map(c=>`<th class="num">${c[0]}</th>`).join("")}</tr></thead><tbody>${ls.map(l=>`<tr><td class="nm">${esc(D.p[l[1]][1])}${l[3]?"":` <small class="muted">bench</small>`}</td>${cols.map(([k,i])=>`<td class="num">${i===-3?l[6]+"-"+l[7]:i===-4?l[10]+"-"+l[11]:hCell(k,l[i])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;};
  const dt=new Date(G.d+"T12:00:00");
  openSheet(`${G.a} ${G.as} @ ${G.h} ${G.hs}`,`<p class="muted">${dt.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})} · ${s} ${HTYPE[G.ty]}</p>${side(G.a)}${side(G.h)}<div class="sheetacts"><button class="btn ghost" data-hgshots="${s}:${G.id}">Shots in this game</button><button class="btn ghost" data-hglogs="${s}:${G.id}">Filter to this game</button><button class="btn" data-sheet="close">Done</button></div>`);
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-hgshots],[data-hglogs]");if(!b)return;const k=b.dataset.hgshots||b.dataset.hglogs,[s]=k.split(":");
  Object.assign(HF,{game:k,q:"",team:"",opp:"",type:"",minPts:"",limit:100,view:b.dataset.hgshots?"shots":(HF.view==="shots"?"logs":HF.view)});if(HF.season!=="all")HF.season=s;histSave();
  document.querySelector('[data-sheet="close"]')?.click();const box=document.getElementById("histBox");if(box)box.querySelector(".hfilters").replaceWith(Object.assign(document.createElement("div"),{className:"hfilters"}));renderHist();box?.scrollIntoView({behavior:"smooth",block:"start"});});
