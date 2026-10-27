
/* ============================================================================
   HISTORY FUN TOOLS (1.34, Arp 2026-10-25): a second row of views on
   Analytics › History built from the same box scores and shots:
   Vs team (player vs a team, team vs team, revenge games), Duel, Splits,
   Streaks, On this date, Milestones, Fantasy (defense vs position, best weeks,
   draft hindsight, your roster vs this week), Assists + quarters, Trivia of
   the day (answers in db "trivia") and Who had more?. My Team gets a
   "Matchup history" sheet and the player card a line vs his next opponent.
   ============================================================================ */
const HFV=[["vs","Vs team"],["duel","Duel"],["splits","Splits"],["streak","Streaks"],["otd","On this date"],["miles","Milestones"],["fan","Fantasy"],["ast","Assists + quarters"]];
if(HF.view==="trivia"||HF.view==="wham")HF.view="logs";
const HFD={q2:"",sk:"PTS",sn:"30",otdm:"",otdd:"",fsub:"dvp",pos:"G",mown:"1"};
Object.keys(HFD).forEach(k=>{if(HF[k]==null)HF[k]=HFD[k];});
const HFUN={},HFUNF={};
const HFC=[["MIN",4],["PTS",5],["REB",14],["AST",15],["STL",16],["BLK",17],["3PM",8],["FG%",-1],["FT%",-2],["TO",18]];
const HFILE=HSEASONS.filter(s=>s!==HNOW);
const hNorm=n=>String(n||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[.'’]/g,"").replace(/\s+(jr|sr|ii|iii|iv)$/,"").replace(/\s+/g," ").trim();
const hRedraw=()=>{if(nav==="analytics"&&SUB.analytics==="hist")renderHist();else if(nav==="pickem"&&(SUB.pickem==="trivia"||SUB.pickem==="wham"))renderRosters();};
const HNEEDP=new Set();
// extra seasons a view needs beyond the Season filter; "" once they're all in
function hNeed(ss){const m=ss.filter(s=>!HDATA[s]);if(!m.length)return "";
  m.forEach(s=>{if(HNEEDP.has(s))return;HNEEDP.add(s);histLoad(s).then(()=>{HNEEDP.delete(s);hRedraw();},e=>{HNEEDP.delete(s);HLOAD.err=e.message;hRedraw();});});
  return `<p class="empty">${HLOAD.err?esc(HLOAD.err):`Loading ${m.join(", ")}… (about 1.5 MB a season)`}</p>`;}
// run fn with some filters swapped out
function hWith(over,fn){const o={};for(const k in over){o[k]=HF[k];HF[k]=over[k];}try{return fn();}finally{Object.assign(HF,o);}}
function hAgg(rows){const s=new Array(21).fill(0);rows.forEach(r=>{for(let i=4;i<21;i++)s[i]+=r.L[i];});const n=rows.length,a={gp:n,sum:s};
  HFC.concat([["FGM",6],["FGA",7],["FTM",10],["FTA",11],["+/-",20]]).forEach(([k,i])=>a[k]=!n?null:i===-1?hPct(s[6],s[7]):i===-2?hPct(s[10],s[11]):s[i]/n);return a;}
const gsc=L=>L[5]+.4*L[6]-.7*L[7]-.4*(L[11]-L[10])+.7*L[12]+.3*L[13]+L[16]+.7*L[15]+.7*L[17]-.4*L[19]-L[18];
const hFmtD=(d,y=true)=>new Date(d+"T12:00:00").toLocaleDateString("en-US",y?{month:"short",day:"numeric",year:"numeric"}:{month:"short",day:"numeric"});
const hLine=L=>`${L[5]} pts, ${L[14]} reb, ${L[15]} ast${L[8]?`, ${L[8]} 3pm`:""}${L[16]?`, ${L[16]} stl`:""}${L[17]?`, ${L[17]} blk`:""} <span class="muted">(${L[6]}-${L[7]} FG)</span>`;
const hWon=r=>r.home?r.G.hs>r.G.as:r.G.as>r.G.hs;
const hRes=r=>`<small class="${hWon(r)?"okc":"badc"}">${hWon(r)?"W":"L"} ${r.home?r.G.hs+"-"+r.G.as:r.G.as+"-"+r.G.hs}</small>`;
const hGame=r=>`<button class="hgame" data-hgame="${r.s}:${r.G.id}" title="Box score">${hFmtD(r.G.d)}</button> ${r.home?"vs":"@"} ${esc(r.opp)} ${hRes(r)}${r.G.ty!==2?` <small class="htype">${HTYPE[r.G.ty]}</small>`:""}`;
const hDiff=(v,b,k)=>{if(v==null||b==null)return "–";const d=v-b,p=k&&k.endsWith("%");if(Math.abs(d)<(p?.0005:.05))return `<span class="muted">0</span>`;const neg=k==="TO"?d>0:d<0;
  return `<span class="${neg?"badc":"okc"}">${d>0?"+":"−"}${p?(Math.abs(d)*100).toFixed(1):Math.abs(d).toFixed(1)}</span>`;};
const hTbl=(head,body,cls="")=>`<div class="scroll hscroll"><table class="lg antable htbl ${cls}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
const hTh=(l,c="num")=>`<th class="${c}">${l}</th>`;
const hAggTds=(a,cols=HFC)=>cols.map(([k])=>`<td class="num">${hAvg(k,a[k])}</td>`).join("");
const hAggHead=(cols=HFC)=>cols.map(([k])=>hTh(k)).join("");
const hEmpty=t=>`<p class="empty">${t}</p>`;
const hBtn=(obj,label,cls="btn ghost sm")=>`<button class="${cls}" data-hfgo='${esc(JSON.stringify(obj))}'>${label}</button>`;
const hName=n=>`<button class="hname" data-hq="${esc(n)}">${esc(n)}</button>`;
// the player a search means: an exact name, else the one with the most games; the rest as chips
function hPick(rows,q=HF.q){const c={};rows.forEach(r=>c[r.name]=(c[r.name]||0)+1);const ns=Object.keys(c).sort((a,b)=>c[b]-c[a]);
  const ql=hNorm(q),name=ns.find(n=>hNorm(n)===ql)||ns[0];
  const others=ns.filter(n=>n!==name).slice(0,8);
  return {name,chips:others.length?`<p class="hchips"><span class="muted">Also matches:</span> ${others.map(n=>`<button class="hchip" data-hq="${esc(n)}">${esc(n)}</button>`).join("")}</p>`:""};}
// per season: name -> player indexes, player -> line indexes, team -> game dates
function hIx(s){const D=HDATA[s];if(!D)return null;if(!D._ix){const ix=new Map();D.p.forEach((p,i)=>{const k=hNorm(p[1]);if(!ix.has(k))ix.set(k,[]);ix.get(k).push(i);});D._ix=ix;
  D._pl=D.p.map(()=>[]);D.l.forEach((l,j)=>D._pl[l[1]].push(j));
  const td={};D.G.forEach(g=>{(td[g.h]=td[g.h]||[]).push(g.d);(td[g.a]=td[g.a]||[]).push(g.d);});Object.values(td).forEach(a=>a.sort());D._td=td;}return D;}
// every line of one player (by name), oldest first
function hLines(name,ss=HSEASONS,ty=2){const k=hNorm(name),out=[];ss.forEach(s=>{const D=hIx(s);if(!D)return;(D._ix.get(k)||[]).forEach(pi=>D._pl[pi].forEach(j=>{const l=D.l[j],G=D.G[l[0]];if(ty&&G.ty!==ty)return;const team=D.t[l[2]];
  out.push({s,G,name:D.p[pi][1],team,opp:team===G.h?G.a:G.h,home:team===G.h,L:l});}));});return out.sort((a,b)=>a.G.d<b.G.d?-1:a.G.d>b.G.d?1:0);}
// teams he played for before each game: a game against one of them is a revenge game
function hFormer(name){const ls=hLines(name,HSEASONS.filter(s=>HDATA[s]),0),seen=new Set(),rev=new Set();let last=null;
  ls.forEach(r=>{if(seen.has(r.opp)&&r.opp!==r.team)rev.add(r.s+r.G.id);seen.add(r.team);last=r.team;});
  const former=new Set([...seen].filter(t=>t!==last));return {rev,former,last};}
// app names (rostered players) by normalized name
let HNMAP=null;const hApp=n=>{if(!HNMAP){HNMAP=new Map();Object.keys(DIR).forEach(k=>HNMAP.set(hNorm(k),k));}return HNMAP.get(hNorm(n))||null;};
const hOwner=n=>{const a=hApp(n);return a?ownerNow(a):0;};
const hPosOf=n=>{const a=hApp(n),p=a&&DIR[a]?.p;return !p?"":p<=2?"G":p<=4?"F":"C";};
// 8-category value of one line (z-scores vs rotation players that season; FG%/FT% weighted by attempts)
const ZC=[5,14,15,16,17,8];
function hZ(s){const D=HDATA[s];if(!D)return null;if(D._z)return D._z;
  const rot=D.l.filter(l=>l[4]>=15),n=rot.length||1,m=ZC.map(i=>rot.reduce((a,l)=>a+l[i],0)/n),sd=ZC.map((i,k)=>Math.sqrt(rot.reduce((a,l)=>a+(l[i]-m[k])**2,0)/n)||1);
  const fg=rot.reduce((a,l)=>a+l[6],0)/Math.max(1,rot.reduce((a,l)=>a+l[7],0)),ft=rot.reduce((a,l)=>a+l[10],0)/Math.max(1,rot.reduce((a,l)=>a+l[11],0));
  const fi=rot.map(l=>l[6]-fg*l[7]),ti=rot.map(l=>l[10]-ft*l[11]),sf=Math.sqrt(fi.reduce((a,v)=>a+v*v,0)/n)||1,st=Math.sqrt(ti.reduce((a,v)=>a+v*v,0)/n)||1;
  D._zf=L=>ZC.reduce((a,i,k)=>a+(L[i]-m[k])/sd[k],0)+(L[6]-fg*L[7])/sf+(L[10]-ft*L[11])/st;
  D._z=D.l.map(D._zf);return D._z;}
// season averages by player (regular season), cached
function hSA(s){const D=HDATA[s];if(!D)return null;if(D._sa)return D._sa;const z=hZ(s),m=new Map();
  D.l.forEach((l,j)=>{if(D.G[l[0]].ty!==2)return;const n=D.p[l[1]][1];let a=m.get(n);if(!a){a={name:n,s,team:D.t[l[2]],gp:0,sum:new Array(21).fill(0),z:0};m.set(n,a);}a.gp++;a.team=D.t[l[2]];a.z+=z[j];for(let i=4;i<21;i++)a.sum[i]+=l[i];});
  m.forEach(a=>{const s_=a.sum;HFC.forEach(([k,i])=>a[k]=i===-1?hPct(s_[6],s_[7]):i===-2?hPct(s_[10],s_[11]):s_[i]/a.gp);a.zpg=a.z/a.gp;});D._sa=m;return m;}

/* ---------------------------------------------------------------- Vs team */
HFUN.vs=()=>{
  const rows=histRows();
  if(HF.q.trim()){const {name,chips}=hPick(rows);if(!name)return hEmpty(`No games for “${esc(HF.q)}” with these filters.`);
    const mine=rows.filter(r=>r.name===name),fr=hFormer(name);
    return chips+(HF.opp?vsDetail(name,mine,fr):vsAllOpps(name,mine,fr));}
  if(HF.team&&HF.opp)return teamVsTeam();
  if(HF.opp)return bestVs(rows);
  return hEmpty(`Type a player to see how he does against every team, or pick a Team and an Opponent for their head-to-head history. Pick just an Opponent to see who plays best against them.`);};
function vsDetail(name,mine,fr){
  const opp=HF.opp,all=hWith({opp:""},()=>histRows()).filter(r=>r.name===name),rest=all.filter(r=>r.opp!==opp);
  if(!mine.length)return hEmpty(`${esc(name)} hasn't played ${esc(opp)} with these filters.${HF.season!=="all"?" "+hBtn({season:"all"},"Use all seasons"):""}`);
  const a=hAgg(mine),b=hAgg(rest),last=mine.reduce((m,r)=>r.G.d>m.G.d?r:m),best=mine.reduce((m,r)=>gsc(r.L)>gsc(m.L)?r:m),worst=mine.reduce((m,r)=>gsc(r.L)<gsc(m.L)?r:m);
  const isRev=fr.former.has(opp)&&fr.last!==opp;
  const card=(t,body)=>`<div class="hfcard"><span class="muted">${t}</span>${body}</div>`;
  const cards=`<div class="hfcards">${card("Last time",`<b>${hLine(last.L)}</b><span>${hGame(last)}${last.team!==fr.last?` <small class="muted">with ${esc(last.team)}</small>`:""}</span>`)}
    ${card(`Vs ${esc(opp)}`,`<b class="big">${hAvg("PTS",a.PTS)}</b><span>pts a game in ${a.gp} ${a.gp===1?"game":"games"} · ${hDiff(a.PTS,b.PTS)} vs everyone else</span>`)}
    ${card("Best game",`<b>${hLine(best.L)}</b><span>${hGame(best)}</span>`)}${mine.length>1?card("Worst game",`<b>${hLine(worst.L)}</b><span>${hGame(worst)}</span>`):""}</div>`;
  const cmp=hTbl(hTh("","nm")+hTh("GP")+hAggHead(),`<tr><td class="nm"><b>Vs ${esc(opp)}</b></td><td class="num">${a.gp}</td>${hAggTds(a)}</tr><tr><td class="nm">Everyone else</td><td class="num">${b.gp}</td>${hAggTds(b)}</tr><tr class="hdiff"><td class="nm">Difference</td><td></td>${HFC.map(([k])=>`<td class="num">${hDiff(a[k],b[k],k)}</td>`).join("")}</tr>`);
  const bys=[...new Set(mine.map(r=>r.s))].sort().reverse().map(s=>{const x=hAgg(mine.filter(r=>r.s===s)),y=hAgg(all.filter(r=>r.s===s));return `<tr><td class="nm">${s}</td><td class="num">${x.gp}</td>${hAggTds(x)}<td class="num">${hDiff(x.PTS,y.PTS)}</td></tr>`;}).join("");
  const logs=hWith({sort:"date",dir:-1,view:"logs",limit:50},()=>histTable(histSort(mine.slice(),"date")));
  return `<p class="hsum"><b>${esc(name)}</b> vs ${esc(opp)} · ${a.gp} ${a.gp===1?"game":"games"} · ${HF.season==="all"?"all seasons":HF.season}${isRev?` <span class="hrev">Revenge game: he used to play for ${esc(opp)}</span>`:""}</p>${cards}
    <h4 class="hfh">Averages vs ${esc(opp)} and everyone else</h4>${cmp}
    ${HF.season==="all"?`<h4 class="hfh">By season vs ${esc(opp)}</h4>${hTbl(hTh("Season","nm")+hTh("GP")+hAggHead()+hTh("PTS vs his avg"),bys)}`:""}
    <div class="hfacts">${HF.season!=="all"?hBtn({season:"all"},"Use all seasons"):""}${hBtn({view:"shots"},`Shot chart vs ${esc(opp)}`)}${hBtn({view:"ast"},`Hot zones vs ${esc(opp)}`)}${hBtn({opp:""},"Every opponent")}</div>
    <h4 class="hfh">Every game vs ${esc(opp)}</h4>${logs}`;}
function vsAllOpps(name,mine,fr){
  const all=hAgg(mine),by={};mine.forEach(r=>(by[r.opp]=by[r.opp]||[]).push(r));
  const rows=Object.entries(by).map(([o,rs])=>({o,a:hAgg(rs),last:rs.reduce((m,r)=>r.G.d>m.G.d?r:m)})).sort((x,y)=>y.a.PTS-x.a.PTS);
  const cols=[["PTS",5],["REB",14],["AST",15],["3PM",8],["FG%",-1]];
  const body=rows.map(({o,a,last})=>`<tr><td class="nm">${hBtn({opp:o},esc(o),"hname")}${fr.former.has(o)?` <span class="hrev sm" title="He used to play for ${esc(o)}">former team</span>`:""}</td><td class="num">${a.gp}</td>${hAggTds(a,cols)}<td class="num">${hDiff(a.PTS,all.PTS)}</td><td class="nm"><small>${hFmtD(last.G.d)} · ${last.L[5]} pts</small></td></tr>`).join("");
  const rv=mine.filter(r=>fr.rev.has(r.s+r.G.id)),nr=mine.filter(r=>!fr.rev.has(r.s+r.G.id));
  const rev=rv.length?`<h4 class="hfh">Revenge games (vs teams he used to play for)</h4><p class="hsum">${rv.length} ${rv.length===1?"game":"games"}: <b>${hAvg("PTS",hAgg(rv).PTS)}</b> pts a game vs ${hAvg("PTS",hAgg(nr).PTS)} in his other games (${hDiff(hAgg(rv).PTS,hAgg(nr).PTS)}).</p>
    ${hTbl(hTh("Game","nm")+hTh("Team","nm")+hTh("Line","nm"),rv.slice().reverse().slice(0,10).map(r=>`<tr><td class="nm">${hGame(r)}</td><td class="nm">${esc(r.team)}</td><td class="nm">${hLine(r.L)}</td></tr>`).join(""))}`:"";
  return `<p class="hsum"><b>${esc(name)}</b> against every team · ${all.gp} games · ${hAvg("PTS",all.PTS)} pts a game overall · tap a team for the full history${HF.season!=="all"?` · ${hBtn({season:"all"},"Use all seasons","hlink")}`:""}</p>
    ${hTbl(hTh("Opponent","nm")+hTh("GP")+hAggHead(cols)+hTh("PTS vs his avg")+hTh("Last game","nm"),body)}${rev}`;}
function teamVsTeam(){
  const A=HF.team,B=HF.opp,gs=[];hSeasons().forEach(s=>{const D=HDATA[s];if(!D)return;D.G.forEach((G,gi)=>{if(!((G.h===A&&G.a===B)||(G.h===B&&G.a===A)))return;
    if(HF.type&&(HF.type==="post"?G.ty===2:G.ty!==+HF.type))return;gs.push({s,G,gi});});});
  if(!gs.length)return hEmpty(`${esc(A)} and ${esc(B)} haven't played with these filters.${HF.season!=="all"?" "+hBtn({season:"all"},"Use all seasons"):""}`);
  gs.sort((x,y)=>x.G.d<y.G.d?1:-1);
  const sc=g=>g.G.h===A?[g.G.hs,g.G.as]:[g.G.as,g.G.hs],wA=gs.filter(g=>{const [a,b]=sc(g);return a>b;}).length;
  const avA=gs.reduce((t,g)=>t+sc(g)[0],0)/gs.length,avB=gs.reduce((t,g)=>t+sc(g)[1],0)/gs.length;
  const big=w=>gs.reduce((m,g)=>{const [a,b]=sc(g),d=w?a-b:b-a;return d>(m?m.d:0)?{g,d}:m;},null);
  const bA=big(true),bB=big(false);
  // best players in this matchup (2+ games)
  const P=new Map();gs.forEach(({s,gi})=>{const D=HDATA[s];D.l.forEach(l=>{if(l[0]!==gi)return;const n=D.p[l[1]][1],t=D.t[l[2]];const k=n+"|"+t;let a=P.get(k);if(!a)P.set(k,a={n,t,rs:[]});a.rs.push({L:l});});});
  const top=[...P.values()].filter(x=>x.rs.length>=Math.min(2,gs.length)).map(x=>({...x,a:hAgg(x.rs)})).sort((x,y)=>y.a.PTS-x.a.PTS).slice(0,10);
  const cols=[["PTS",5],["REB",14],["AST",15],["3PM",8],["FG%",-1]];
  const gl=gs.slice(0,40).map(g=>{const [a,b]=sc(g);return `<tr><td class="nm"><button class="hgame" data-hgame="${g.s}:${g.G.id}">${hFmtD(g.G.d)}</button>${g.G.ty!==2?` <small class="htype">${HTYPE[g.G.ty]}</small>`:""}</td><td class="nm">${g.G.a} @ ${g.G.h}</td><td class="num"><b class="${a>b?"okc":"badc"}">${a}-${b}</b></td><td class="nm">${a>b?esc(A):esc(B)} by ${Math.abs(a-b)}</td></tr>`;}).join("");
  return `<div class="hfcards"><div class="hfcard"><span class="muted">Record</span><b class="big">${esc(A)} ${wA}-${gs.length-wA}</b><span>in ${gs.length} ${gs.length===1?"game":"games"} vs ${esc(B)}</span></div>
    <div class="hfcard"><span class="muted">Average score</span><b class="big">${avA.toFixed(1)}-${avB.toFixed(1)}</b><span>${esc(A)} first</span></div>
    ${bA?`<div class="hfcard"><span class="muted">${esc(A)}'s biggest win</span><b>by ${bA.d}</b><span>${hFmtD(bA.g.G.d)} · ${sc(bA.g).join("-")}</span></div>`:""}
    ${bB?`<div class="hfcard"><span class="muted">${esc(B)}'s biggest win</span><b>by ${bB.d}</b><span>${hFmtD(bB.g.G.d)} · ${sc(bB.g).reverse().join("-")}</span></div>`:""}</div>
    <h4 class="hfh">Who plays best in this matchup</h4>${hTbl(hTh("Player","nm")+hTh("Team","nm")+hTh("GP")+hAggHead(cols),top.map(x=>`<tr><td class="nm">${hName(x.n)}</td><td class="nm">${esc(x.t)}</td><td class="num">${x.a.gp}</td>${hAggTds(x.a,cols)}</tr>`).join(""))}
    <h4 class="hfh">Games</h4>${hTbl(hTh("Date","nm")+hTh("Game","nm")+hTh(esc(A)+"-"+esc(B))+hTh("Winner","nm"),gl)}`;}
function bestVs(rows){const opp=HF.opp,mg=HF.season==="all"?4:2;
  const by=new Map();rows.forEach(r=>{(by.get(r.name)||by.set(r.name,[]).get(r.name)).push(r);});
  const allBy=new Map();hWith({opp:""},()=>histRows()).forEach(r=>{if(!by.has(r.name))return;(allBy.get(r.name)||allBy.set(r.name,[]).get(r.name)).push(r);});
  const list=[...by.entries()].filter(([,rs])=>rs.length>=mg).map(([n,rs])=>{const a=hAgg(rs),o=hAgg(allBy.get(n).filter(r=>r.opp!==opp));return {n,a,o,d:a.PTS-(o.PTS||0)};}).filter(x=>x.o.gp>=5).sort((x,y)=>y.d-x.d).slice(0,20);
  return `<p class="hsum">Players who score the most <b>above their usual</b> against ${esc(opp)} (${mg}+ games vs them). Tap a name for the full history.</p>
    ${hTbl(hTh("Player","nm")+hTh("GP vs")+hTh("PTS vs")+hTh("PTS others")+hTh("±")+hTh("REB vs")+hTh("AST vs"),list.map(x=>`<tr><td class="nm">${hName(x.n)}</td><td class="num">${x.a.gp}</td><td class="num"><b>${hAvg("PTS",x.a.PTS)}</b></td><td class="num">${hAvg("PTS",x.o.PTS)}</td><td class="num">${hDiff(x.a.PTS,x.o.PTS)}</td><td class="num">${hAvg("REB",x.a.REB)}</td><td class="num">${hAvg("AST",x.a.AST)}</td></tr>`).join("")||`<tr><td class="nm muted" colspan="7">Not enough games.</td></tr>`)}`;}

/* ---------------------------------------------------------------- Duel */
HFUNF.duel=()=>`<label class="hf hfq"><span>Player 2</span><input type="search" data-hf="q2" value="${esc(HF.q2)}" placeholder="Second player, like LeBron" autocomplete="off"></label>`;
HFUN.duel=()=>{
  if(!HF.q.trim()||!HF.q2.trim())return hEmpty("Type a player in Player and another in Player 2 to see every game they played against each other.");
  const ra=histRows(),rb=hWith({q:HF.q2},()=>histRows());const A=hPick(ra),B=hPick(rb,HF.q2);
  if(!A.name||!B.name)return hEmpty(`No games for ${!A.name?`“${esc(HF.q)}”`:`“${esc(HF.q2)}”`} with these filters.`);
  if(A.name===B.name)return hEmpty("Pick two different players.");
  const ma=ra.filter(r=>r.name===A.name),mb=rb.filter(r=>r.name===B.name),ib=new Map(mb.map(r=>[r.s+r.G.id,r]));
  const pairs=ma.filter(r=>ib.has(r.s+r.G.id)).map(r=>[r,ib.get(r.s+r.G.id)]).sort((x,y)=>x[0].G.d<y[0].G.d?1:-1);
  const vs=pairs.filter(([a,b])=>a.team!==b.team),mates=pairs.length-vs.length;
  const SK=[["PTS",5],["REB",14],["AST",15],["3PM",8],["STL",16],["BLK",17]];
  const tal=SK.map(([k,i])=>{let x=0,y=0;vs.forEach(([a,b])=>{if(a.L[i]>b.L[i])x++;else if(b.L[i]>a.L[i])y++;});return [k,x,y];});
  const tw=vs.filter(([a])=>hWon(a)).length,gw=vs.filter(([a,b])=>gsc(a.L)>gsc(b.L)).length;
  const aa=hAgg(vs.map(p=>p[0])),bb=hAgg(vs.map(p=>p[1])),oa=hAgg(ma),ob=hAgg(mb);
  const cols=HFC.filter(c=>c[0]!=="TO");
  const sum=hTbl(hTh("","nm")+hTh("GP")+hAggHead(cols),`<tr><td class="nm"><b>${esc(A.name)}</b> in duels</td><td class="num">${aa.gp}</td>${hAggTds(aa,cols)}</tr><tr><td class="nm"><b>${esc(B.name)}</b> in duels</td><td class="num">${bb.gp}</td>${hAggTds(bb,cols)}</tr><tr class="hdiff"><td class="nm muted">${esc(A.name)} all games</td><td class="num">${oa.gp}</td>${hAggTds(oa,cols)}</tr><tr class="hdiff"><td class="nm muted">${esc(B.name)} all games</td><td class="num">${ob.gp}</td>${hAggTds(ob,cols)}</tr>`);
  const head=`${A.chips}${B.chips}`;
  if(!vs.length)return head+`<p class="hsum">${esc(A.name)} and ${esc(B.name)} never played against each other with these filters${mates?` (they were teammates in ${mates} ${mates===1?"game":"games"})`:""}. Here's how their games compare.</p>${sum}${HF.season!=="all"?hBtn({season:"all"},"Use all seasons"):""}`;
  const gl=vs.slice(0,60).map(([a,b])=>{const ga=gsc(a.L),gb=gsc(b.L);return `<tr><td class="nm">${hGame(a)}</td><td class="nm${ga>gb?" hwin":""}">${hLine(a.L)}</td><td class="nm${gb>ga?" hwin":""}">${hLine(b.L)}</td></tr>`;}).join("");
  return head+`<div class="hfcards"><div class="hfcard"><span class="muted">Team record</span><b class="big">${tw}-${vs.length-tw}</b><span>${esc(A.name)}'s team in ${vs.length} ${vs.length===1?"meeting":"meetings"}</span></div>
    <div class="hfcard"><span class="muted">Better game (game score)</span><b class="big">${gw}-${vs.length-gw}</b><span>${esc(A.name)} first</span></div>
    <div class="hfcard"><span class="muted">Won the stat</span><span class="hduel">${tal.map(([k,x,y])=>`<i><b class="${x>y?"okc":x<y?"badc":""}">${x}-${y}</b> ${k}</i>`).join("")}</span></div></div>
    ${sum}<h4 class="hfh">Every meeting (better game highlighted)</h4>${hTbl(hTh("Game","nm")+hTh(esc(A.name),"nm")+hTh(esc(B.name),"nm"),gl)}${mates?`<p class="anote">They were also teammates in ${mates} ${mates===1?"game":"games"}, left out above.</p>`:""}`;};

/* ---------------------------------------------------------------- Splits */
const HMON=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function hRest(r){const D=hIx(r.s),ds=D._td[r.team],i=ds.indexOf(r.G.d);if(i<=0)return null;return Math.round((new Date(r.G.d)-new Date(ds[i-1]))/864e5)-1;}
HFUN.splits=()=>{
  if(!HF.q.trim())return hEmpty("Type a player to see his splits: home and away, back-to-backs and rest, wins and losses, close games and blowouts, by month, starter or bench, and regular season vs playoffs.");
  const rows=histRows(),{name,chips}=hPick(rows);if(!name)return hEmpty(`No games for “${esc(HF.q)}” with these filters.`);
  const mine=rows.filter(r=>r.name===name),every=hWith({type:""},()=>histRows()).filter(r=>r.name===name);
  const all=hAgg(mine),mar=r=>Math.abs(r.G.hs-r.G.as);
  const S=[["Overall",mine,1],["Home",mine.filter(r=>r.home)],["Away",mine.filter(r=>!r.home)],["Wins",mine.filter(hWon)],["Losses",mine.filter(r=>!hWon(r))],
    ["Started",mine.filter(r=>r.L[3])],["Off the bench",mine.filter(r=>!r.L[3])],
    ["2nd night of a back-to-back",mine.filter(r=>hRest(r)===0)],["1 day of rest",mine.filter(r=>hRest(r)===1)],["2+ days of rest",mine.filter(r=>hRest(r)>=2)],
    ["Close games (5 or less)",mine.filter(r=>mar(r)<=5)],["Blowouts (15+)",mine.filter(r=>mar(r)>=15)]];
  const months=[10,11,12,1,2,3,4,5,6].map(m=>[HMON[m],mine.filter(r=>+r.G.d.slice(5,7)===m)]);
  const types=[2,5,3].map(t=>[HTYPE[t],every.filter(r=>r.G.ty===t)]);
  const tr=([lab,rs,b])=>{if(!rs.length)return "";const a=hAgg(rs);return `<tr class="${b?"hbold":""}"><td class="nm">${lab}</td><td class="num">${a.gp}</td>${hAggTds(a)}<td class="num">${b?"":hDiff(a.PTS,all.PTS)}</td></tr>`;};
  const head=hTh("Split","nm")+hTh("GP")+hAggHead()+hTh("PTS ±");
  return chips+`<p class="hsum"><b>${esc(name)}</b> · ${all.gp} games · ${HF.season==="all"?"all seasons":HF.season} · ± is points against his overall average</p>
    ${hTbl(head,S.map(tr).join(""))}<h4 class="hfh">By month</h4>${hTbl(head,months.map(tr).join(""))}
    <h4 class="hfh">Regular season vs playoffs</h4>${hTbl(head,types.map(tr).join("")||`<tr><td class="nm muted" colspan="13">No games.</td></tr>`)}`;};

/* ---------------------------------------------------------------- Streaks */
const HSK=[["PTS","Points",5],["REB","Rebounds",14],["AST","Assists",15],["3PM","3-pointers",8],["STL","Steals",16],["BLK","Blocks",17],["DD","Double-doubles"],["TD","Triple-doubles"],["FG50","50% shooting (10+ FGA)"]];
const hDbl=L=>[5,14,15,16,17].filter(i=>L[i]>=10).length;
const hCond=()=>{const k=HF.sk,n=+HF.sn||0,c=HSK.find(x=>x[0]===k)||HSK[0];
  if(k==="DD")return [L=>hDbl(L)>=2,"double-doubles in a row"];if(k==="TD")return [L=>hDbl(L)>=3,"triple-doubles in a row"];
  if(k==="FG50")return [L=>L[7]>=10&&L[6]/L[7]>=.5,"games in a row shooting 50%+ on 10+ shots"];return [L=>L[c[2]]>=n,`games in a row with ${n}+ ${c[1].toLowerCase()}`];};
HFUNF.streak=()=>`<label class="hf"><span>Streak of</span><select data-hf="sk">${HSK.map(([k,l])=>`<option value="${k}"${HF.sk===k?" selected":""}>${l}</option>`).join("")}</select></label>${["DD","TD","FG50"].includes(HF.sk)?"":`<label class="hf hfn"><span>At least</span><input type="number" min="1" step="1" data-hf="sn" value="${esc(HF.sn)}"></label>`}`;
HFUN.streak=()=>{
  const [ok,lab]=hCond(),rows=histRows(),by=new Map();rows.forEach(r=>(by.get(r.name)||by.set(r.name,[]).get(r.name)).push(r));
  const runs=[];by.forEach((rs,n)=>{rs.sort((a,b)=>a.G.d<b.G.d?-1:1);let st=-1;
    rs.forEach((r,i)=>{if(ok(r.L)){if(st<0)st=i;}else{if(st>=0&&i-st>=2)runs.push({n,rs:rs.slice(st,i),act:false});st=-1;}});
    if(st>=0&&rs.length-st>=(HF.q.trim()?1:2))runs.push({n,rs:rs.slice(st),act:rs[rs.length-1].s===HNOW});});
  runs.sort((a,b)=>b.rs.length-a.rs.length||(a.rs[0].G.d<b.rs[0].G.d?1:-1));
  const top=runs.slice(0,30),c=HSK.find(x=>x[0]===HF.sk);
  const avg=(rs)=>c&&c[2]!=null?(rs.reduce((t,r)=>t+r.L[c[2]],0)/rs.length).toFixed(1):(rs.reduce((t,r)=>t+r.L[5],0)/rs.length).toFixed(1)+" pts";
  const act=runs.filter(r=>r.act).slice(0,10);
  const tbl=list=>hTbl(hTh("Player","nm")+hTh("Games")+hTh("From","nm")+hTh("To","nm")+hTh(c&&c[2]!=null?c[0]+" avg":"Avg")+hTh("Team","nm"),
    list.map(r=>`<tr><td class="nm">${hName(r.n)}${r.act?` <span class="hrev sm">active</span>`:""}</td><td class="num"><b>${r.rs.length}</b></td><td class="nm"><button class="hgame" data-hgame="${r.rs[0].s}:${r.rs[0].G.id}">${hFmtD(r.rs[0].G.d)}</button></td><td class="nm"><button class="hgame" data-hgame="${r.rs.at(-1).s}:${r.rs.at(-1).G.id}">${hFmtD(r.rs.at(-1).G.d)}</button></td><td class="num">${avg(r.rs)}</td><td class="nm">${esc([...new Set(r.rs.map(x=>x.team))].join(", "))}</td></tr>`).join("")||`<tr><td class="nm muted" colspan="6">No streaks with these filters.</td></tr>`);
  return `<p class="hsum">Longest runs of <b>${lab}</b>${HF.q.trim()?` for players matching “${esc(HF.q)}”`:""} · ${HF.season==="all"?"all seasons, runs carry over between seasons":HF.season} · games he played, in order (other filters apply)</p>
    ${act.length?`<h4 class="hfh">Active now</h4>${tbl(act)}`:""}<h4 class="hfh">Longest</h4>${tbl(top)}`;};

/* ---------------------------------------------------------------- On this date */
const hYmd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const etToday=()=>{try{return new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York"}).format(new Date());}catch(e){return new Date().toISOString().slice(0,10);}};
HFUNF.otd=()=>{const t=etToday(),m=HF.otdm||String(+t.slice(5,7)),d=HF.otdd||String(+t.slice(8,10));
  return `<label class="hf"><span>Month</span><select data-hf="otdm">${[10,11,12,1,2,3,4,5,6].map(x=>`<option value="${x}"${+m===x?" selected":""}>${HMON[x]}</option>`).join("")}</select></label><label class="hf"><span>Day</span><select data-hf="otdd">${Array.from({length:31},(_,i)=>i+1).map(x=>`<option value="${x}"${+d===x?" selected":""}>${x}</option>`).join("")}</select></label>`;};
HFUN.otd=()=>{const w=hNeed(HSEASONS);if(w)return w;const t=etToday(),m=+(HF.otdm||t.slice(5,7)),d=+(HF.otdd||t.slice(8,10)),md=String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");
  const lines=[],games=[];HSEASONS.forEach(s=>{const D=HDATA[s];D.G.forEach((G,gi)=>{if(G.d.slice(5)===md)games.push({s,G,gi});});
    if(games.some(g=>g.s===s)){const gis=new Set(games.filter(g=>g.s===s).map(g=>g.gi));D.l.forEach(l=>{if(!gis.has(l[0]))return;const G=D.G[l[0]],team=D.t[l[2]];lines.push({s,G,name:D.p[l[1]][1],team,opp:team===G.h?G.a:G.h,home:team===G.h,L:l});});}});
  const lab=`${HMON[m]} ${d}`;if(!games.length)return hEmpty(`No NBA games were played on ${lab} in these seasons.`);
  const top=lines.slice().sort((a,b)=>gsc(b.L)-gsc(a.L)).slice(0,15);
  const ours=lines.filter(r=>hOwner(r.name)).sort((a,b)=>gsc(b.L)-gsc(a.L)).slice(0,15);
  const yrs=[...new Set(games.map(g=>g.G.d.slice(0,4)))].sort().reverse();
  const gl=yrs.map(y=>`<p class="otdy"><b>${y}</b> ${games.filter(g=>g.G.d.startsWith(y)).map(g=>`<button class="hgame hchip" data-hgame="${g.s}:${g.G.id}">${g.G.a} ${g.G.as} @ ${g.G.h} ${g.G.hs}</button>`).join(" ")}</p>`).join("");
  const tr=r=>`<tr><td class="nm">${hName(r.name)}${hOwner(r.name)?` <small class="muted">${esc(teamName(hOwner(r.name)))}</small>`:""}</td><td class="nm">${hGame(r)}</td><td class="nm">${hLine(r.L)}</td></tr>`;
  return `<p class="hsum">${games.length} games on <b>${lab}</b> since 2021 · biggest games by game score</p>${hTbl(hTh("Player","nm")+hTh("Game","nm")+hTh("Line","nm"),top.map(tr).join(""))}
    ${ours.length?`<h4 class="hfh">Players on your league's rosters, on ${lab}</h4>${hTbl(hTh("Player","nm")+hTh("Game","nm")+hTh("Line","nm"),ours.map(tr).join(""))}`:""}
    <h4 class="hfh">Every game on ${lab}</h4>${gl}`;};

/* ---------------------------------------------------------------- Milestones */
const HMS=[["PTS",5,1000,"points"],["REB",14,500,"rebounds"],["AST",15,500,"assists"],["3PM",8,250,"3-pointers"],["STL",16,100,"steals"],["BLK",17,100,"blocks"],["GP",-1,100,"games"]];
HFUNF.miles=()=>`<label class="hf"><span>Players</span><select data-hf="mown"><option value="1"${HF.mown==="1"?" selected":""}>On our league's rosters</option><option value=""${HF.mown!=="1"?" selected":""}>Everyone</option></select></label>`;
HFUN.miles=()=>{const w=hNeed(HSEASONS);if(w)return w;
  const T=new Map();HSEASONS.forEach(s=>{const D=HDATA[s];D.l.forEach(l=>{if(D.G[l[0]].ty!==2)return;const k=hNorm(D.p[l[1]][1]);let a=T.get(k);if(!a)T.set(k,a={n:D.p[l[1]][1],gp:0,t:new Array(21).fill(0),now:0,nowt:new Array(21).fill(0),last:0,lastt:new Array(21).fill(0)});
    a.n=D.p[l[1]][1];a.gp++;for(let i=4;i<21;i++)a.t[i]+=l[i];if(s===HNOW){a.now++;for(let i=4;i<21;i++)a.nowt[i]+=l[i];}if(s===HFILE[0]){a.last++;for(let i=4;i<21;i++)a.lastt[i]+=l[i];}});});
  let ps=[...T.values()].filter(a=>a.now||a.last);if(HF.mown==="1")ps=ps.filter(a=>hOwner(a.n));
  const near=[];ps.forEach(a=>HMS.forEach(([k,i,step,word])=>{const tot=i<0?a.gp:a.t[i],nx=Math.floor(tot/step+1)*step,left=nx-tot;
    const pg=i<0?1:a.now>=3?a.nowt[i]/a.now:a.last?a.lastt[i]/a.last:0;if(!pg)return;const g=Math.ceil(left/pg);if(g<=12)near.push({a,k,word,tot,nx,left,g,pg});}));
  near.sort((x,y)=>x.g-y.g||y.nx-x.nx);
  const own=n=>hOwner(n)?` <small class="muted">${esc(teamName(hOwner(n)))}</small>`:"";
  const tbl=hTbl(hTh("Player","nm")+hTh("Milestone","nm")+hTh("Now")+hTh("To go")+hTh("Games away"),near.slice(0,40).map(x=>`<tr><td class="nm">${hName(x.a.n)}${own(x.a.n)}</td><td class="nm">${x.nx.toLocaleString()} ${x.word}</td><td class="num">${x.tot.toLocaleString()}</td><td class="num">${x.left}</td><td class="num"><b>${x.g<=1?"next game":"~"+x.g}</b></td></tr>`).join("")||`<tr><td class="nm muted" colspan="5">Nobody is close right now.</td></tr>`);
  const PACE=[["PTS",5,2000],["REB",14,1000],["AST",15,600],["3PM",8,250],["STL",16,130],["BLK",17,150]];
  const pace=[];ps.filter(a=>a.now>=3).forEach(a=>PACE.forEach(([k,i,th])=>{const p=a.nowt[i]/a.now*82;if(p>=th)pace.push({a,k,p,th});}));pace.sort((x,y)=>y.p/y.th-x.p/x.th);
  return `<p class="hsum">Round numbers coming up, counting regular-season games in this database (2021-22 to now, so not full careers) · games away at his per-game rate this season (last season until he has 3 games)</p>${tbl}
    <h4 class="hfh">Season paces (82 games at this season's rate)</h4>${pace.length?hTbl(hTh("Player","nm")+hTh("Stat","nm")+hTh("Pace")+hTh("Mark"),pace.slice(0,20).map(x=>`<tr><td class="nm">${hName(x.a.n)}${own(x.a.n)}</td><td class="nm">${x.k}</td><td class="num"><b>${Math.round(x.p)}</b></td><td class="num">${x.th}</td></tr>`).join("")):`<p class="empty">Paces show once this season has 3+ games a player.</p>`}`;};

/* ---------------------------------------------------------------- Fantasy */
const HFS=[["dvp","Defense vs position"],["weeks","Best fantasy weeks"],["draft","Draft hindsight"],["roster","Your roster this week"]];
HFUNF.fan=()=>HF.fsub==="dvp"||HF.fsub==="roster"?`<label class="hf"><span>Position</span><select data-hf="pos">${[["G","Guards"],["F","Forwards"],["C","Centers"]].map(([k,l])=>`<option value="${k}"${HF.pos===k?" selected":""}>${l}</option>`).join("")}</select></label>`:"";
const hFanSeason=()=>HF.season==="all"?HFILE[0]:HF.season;
// what each team gives up per game to one position, this season's box scores
function hDvp(s,pos){const D=HDATA[s];if(!D)return null;const key=s+pos;D._dvp=D._dvp||{};if(D._dvp[key])return D._dvp[key];
  const by={};D.l.forEach(l=>{const G=D.G[l[0]];if(G.ty!==2||l[4]<10)return;const n=D.p[l[1]][1];if(hPosOf(n)!==pos)return;const team=D.t[l[2]],opp=team===G.h?G.a:G.h;(by[opp]=by[opp]||[]).push({L:l});});
  const rows=Object.entries(by).map(([t,rs])=>({t,a:hAgg(rs)}));const cats=[["PTS"],["REB"],["AST"],["3PM"],["STL"],["BLK"],["FG%"],["FT%"]];
  const rk={};cats.forEach(([k])=>{rows.slice().sort((x,y)=>(y.a[k]||0)-(x.a[k]||0)).forEach((r,i)=>(rk[r.t]=rk[r.t]||{})[k]=i+1);});
  rows.forEach(r=>{r.rk=rk[r.t];r.avg=cats.reduce((t,[k])=>t+r.rk[k],0)/cats.length;});rows.sort((x,y)=>x.avg-y.avg);rows.forEach((r,i)=>r.ov=i+1);
  return D._dvp[key]={rows,by:Object.fromEntries(rows.map(r=>[r.t,r])),cats,n:rows.length};}
HFUN.fan=()=>{const tabs=`<div class="tabs sm hfsub" role="group">${HFS.map(([k,l])=>`<button data-hfgo='${esc(JSON.stringify({fsub:k}))}' aria-selected="${HF.fsub===k}">${l}</button>`).join("")}</div>`;
  return tabs+(({dvp:fanDvp,weeks:fanWeeks,draft:fanDraft,roster:fanRoster})[HF.fsub]||fanDvp)();};
function fanDvp(){const s=hFanSeason(),w=hNeed([s]);if(w)return w;const X=hDvp(s,HF.pos);if(!X||!X.rows.length)return hEmpty(`No ${s} games yet.`);
  const lab={G:"guards",F:"forwards",C:"centers"}[HF.pos];
  return `<p class="hsum">What each team gives up per game to <b>${lab}</b> (10+ minutes) in ${s} · rank 1 = gives up the most, the best matchup for your ${lab} · positions from ESPN's current player list, so retired players are left out</p>
    ${hTbl(hTh("#")+hTh("Opponent","nm")+hTh("Lines")+X.cats.map(([k])=>hTh(k)).join(""),X.rows.map(r=>`<tr><td class="num"><b>${r.ov}</b></td><td class="nm">${esc(r.t)}</td><td class="num">${r.a.gp}</td>${X.cats.map(([k])=>`<td class="num" style="${heat(r.rk[k],X.n)}" title="Rank ${r.rk[k]} of ${X.n}">${hAvg(k,r.a[k])}</td>`).join("")}</tr>`).join(""))}`;}
function fanWeeks(){const w=hNeed(HSEASONS);if(w)return w;const q=hNorm(HF.q),wk=d=>{const x=new Date(d+"T12:00:00"),k=(x.getDay()+6)%7;x.setDate(x.getDate()-k);return hYmd(x);};
  const m=new Map();HSEASONS.forEach(s=>{const D=HDATA[s],z=hZ(s);D.l.forEach((l,j)=>{const G=D.G[l[0]];if(G.ty!==2)return;const n=D.p[l[1]][1];if(q&&!hNorm(n).includes(q))return;if(HF.team&&D.t[l[2]]!==HF.team)return;
    const k=n+"|"+wk(G.d);let a=m.get(k);if(!a)m.set(k,a={n,wk:wk(G.d),t:D.t[l[2]],rs:[],z:0});a.rs.push({L:l});a.z+=z[j];});});
  const top=[...m.values()].sort((a,b)=>b.z-a.z).slice(0,30),cols=[["PTS",5],["REB",14],["AST",15],["3PM",8],["STL",16],["BLK",17],["FG%",-1],["FT%",-2]];
  const tot=(rs,k,i)=>i<0?hAvg(k,i===-1?hPct(rs.reduce((t,r)=>t+r.L[6],0),rs.reduce((t,r)=>t+r.L[7],0)):hPct(rs.reduce((t,r)=>t+r.L[10],0),rs.reduce((t,r)=>t+r.L[11],0))):rs.reduce((t,r)=>t+r.L[i],0);
  return `<p class="hsum">Best Monday-to-Sunday weeks since 2021-22 for our 8 categories (each game's value vs a typical rotation player that season, added up)${HF.q?` · players matching “${esc(HF.q)}”`:""}${HF.team?` · ${esc(HF.team)} only`:""} · totals for the week</p>
    ${hTbl(hTh("#")+hTh("Player","nm")+hTh("Week of","nm")+hTh("GP")+cols.map(([k])=>hTh(k)).join("")+hTh("Value"),top.map((a,i)=>`<tr><td class="num">${i+1}</td><td class="nm">${hName(a.n)} <small class="muted">${esc(a.t)}</small></td><td class="nm">${hFmtD(a.wk)}</td><td class="num">${a.rs.length}</td>${cols.map(([k,ix])=>`<td class="num">${tot(a.rs,k,ix)}</td>`).join("")}<td class="num"><b>${a.z.toFixed(1)}</b></td></tr>`).join(""))}`;}
function fanDraft(){const w=hNeed([HFILE[0],HNOW]);if(w)return w;if(!PICKS.length)return hEmpty("No draft picks in this league yet.");
  const rank=(s,min)=>{const sa=hSA(s),l=[...sa.values()].filter(a=>a.gp>=min).sort((a,b)=>b.zpg-a.zpg),r=new Map();l.forEach((a,i)=>r.set(hNorm(a.name),i+1));return r;};
  const rl=rank(HFILE[0],20),rn=rank(HNOW,3),N=L?.teams?.length||10,hasNow=rn.size>0;
  const ps=PICKS.slice().sort((a,b)=>a.n-b.n).map(p=>{const k=hNorm(p.player),last=rl.get(k)||null,now=rn.get(k)||null,ref=hasNow?now:last;
    const v=ref==null?"":ref<=p.n-20?"steal":ref>=p.n+30?"reach":"";return {p,last,now,v,d:ref==null?null:p.n-ref};});
  const verdict=x=>x.v==="steal"?`<span class="call win">Steal</span>`:x.v==="reach"?`<span class="call loss">Reach</span>`:"";
  const best=ps.filter(x=>x.d!=null).sort((a,b)=>b.d-a.d).slice(0,5),worst=ps.filter(x=>x.d!=null).sort((a,b)=>a.d-b.d).slice(0,5);
  const li=xs=>xs.map(x=>`<li><b>${esc(x.p.player)}</b> <span class="muted">pick ${x.p.n}, ${esc(teamName(tnum(x.p.team)))}</span> → value rank ${hasNow?x.now:x.last}</li>`).join("");
  return `<p class="hsum">Every pick vs where the player ranks for our 8 categories (value per game): last season (20+ games) and ${hasNow?"this season so far (3+ games)":"this season once games are in"}. Steal = ranks 20+ spots better than his pick, reach = 30+ worse.</p>
    <div class="hfcards"><div class="hfcard"><span class="muted">Best picks</span><ol class="hfol">${li(best)}</ol></div><div class="hfcard"><span class="muted">Biggest reaches</span><ol class="hfol">${li(worst)}</ol></div></div>
    ${hTbl(hTh("Pick")+hTh("Rd")+hTh("Team","nm")+hTh("Player","nm")+hTh("ESPN rk")+hTh(HFILE[0]+" rk")+hTh(HNOW+" rk")+hTh("","nm"),ps.map(x=>`<tr><td class="num">${x.p.n}</td><td class="num">${Math.ceil(x.p.n/N)}</td><td class="nm">${esc(teamName(tnum(x.p.team)))}</td><td class="nm">${hName(x.p.player)}</td><td class="num">${DIR[x.p.player]?.rk||"–"}</td><td class="num">${x.last||"–"}</td><td class="num">${x.now||"–"}</td><td class="nm">${verdict(x)}</td></tr>`).join(""))}`;}
function fanRoster(){const T=TEAMS[cur]?cur:myTeamNum();if(!TEAMS[T])return hEmpty("Pick a team at the top to see its players' history against this week's opponents.");
  const w=hNeed(HSEASONS);if(w)return w;const dv=HDATA[HNOW].G.length>200?HNOW:HFILE[0];
  const out=[];TEAMS[T].P.forEach(p=>{if(p.st==="OUT")return;DAYS.forEach(sp=>{const g=gameOn(p.t,sp);if(!g||!upcoming(p.t,sp))return;out.push({p,sp,opp:g[0],home:g[1]});});});out.sort((a,b)=>a.sp-b.sp||startedOn(b.p,b.sp)-startedOn(a.p,a.sp));
  if(!out.length)return hEmpty(`${esc(TEAMS[T].name)} has no games left this matchup.`);
  const memo=new Map(),hist=n=>memo.get(n)||memo.set(n,hLines(n)).get(n);
  const rows=out.map(o=>{const ls=hist(o.p.n),vs=ls.filter(r=>r.opp===o.opp),a=hAgg(vs),b=hAgg(ls),pos=hPosOf(o.p.n),X=pos?hDvp(dv,pos):null,rk=X?.by[o.opp]?.ov;return {...o,a,b,rk,n:X?.n,last:vs.at(-1)};});
  const best=rows.filter(r=>r.a.gp>=2).sort((x,y)=>(y.a.PTS-y.b.PTS)-(x.a.PTS-x.b.PTS))[0];
  return `<p class="hsum"><b>${esc(TEAMS[T].name)}</b>: every game left this matchup, with each player's history vs that opponent (regular season since 2021-22) and how that team ranks vs his position (${dv}, 1 = gives up the most)${best?` · best history: <b>${esc(best.p.n)}</b> vs ${esc(best.opp)} (${hAvg("PTS",best.a.PTS)} pts vs ${hAvg("PTS",best.b.PTS)})`:""}</p>
    ${hTbl(hTh("Day","nm")+hTh("Player","nm")+hTh("Opp","nm")+hTh("GP vs")+hTh("PTS vs")+hTh("±")+hTh("REB vs")+hTh("AST vs")+hTh("3PM vs")+hTh("Opp rk vs pos")+hTh("Last time","nm"),rows.map(r=>`<tr><td class="nm">${dow(r.sp)} ${dateOf(r.sp).getDate()}</td><td class="nm"><button class="hname" data-hfvs="${esc(r.p.n)}|${esc(r.opp)}">${esc(r.p.n)}</button></td><td class="nm">${r.home?"vs":"@"} ${esc(r.opp)}</td><td class="num">${r.a.gp}</td><td class="num"><b>${hAvg("PTS",r.a.PTS)}</b></td><td class="num">${hDiff(r.a.PTS,r.b.PTS)}</td><td class="num">${hAvg("REB",r.a.REB)}</td><td class="num">${hAvg("AST",r.a.AST)}</td><td class="num">${hAvg("3PM",r.a["3PM"])}</td><td class="num"${r.rk?` style="${heat(r.rk,r.n)}"`:""}>${r.rk||"–"}</td><td class="nm"><small>${r.last?`${hFmtD(r.last.G.d)} · ${r.last.L[5]} pts`:"–"}</small></td></tr>`).join(""))}`;}

/* ---------------------------------------------------------------- Assists + quarters */
HFUN.ast=()=>{
  if(!HF.q.trim())return hEmpty("Type a player to see who sets him up, who he sets up, how he shoots by quarter (4th and OT included) and his hot zones (pick an Opponent to compare zones vs that team).");
  const rows=histRows(),{name,chips}=hPick(rows);if(!name)return hEmpty(`No games for “${esc(HF.q)}” with these filters.`);
  const mine=rows.filter(r=>r.name===name),base=HF.opp?hWith({opp:""},()=>histRows()).filter(r=>r.name===name):mine;
  const {need}=shotsFor(base);if(need.length>40)return hEmpty(`That's ${need.length} team-seasons of shots. Pick a season.`);
  const miss=need.filter(([s,t])=>!HSHOT[s+"/"+t]);
  if(miss.length){if(!HSHOT.err)Promise.all(miss.map(([s,t])=>shotFile(s,t))).then(hRedraw,hRedraw);return hEmpty(HSHOT.err?esc(HSHOT.err):`Loading shots (${miss.length} ${miss.length===1?"file":"files"})…`);}
  const take=rs=>{const S=[],to=[],gk=new Set(rs.map(r=>r.s+"|"+r.L[0]));const me=new Map(rs.map(r=>[r.s+"|"+r.L[0],r.L[1]]));
    need.forEach(([s,t])=>HSHOT[s+"/"+t].r.forEach(r=>{const k=s+"|"+r[0];if(!gk.has(k))return;const pi=me.get(k);if(r[1]===pi)S.push([s,r]);else if(r[8]===pi&&shMade(r))to.push([s,r]);}));return {S,to};};
  const {S,to}=take(mine);if(!S.length)return chips+hEmpty("No shots logged for these games.");
  const pn=(s,i)=>HDATA[s]?.p[i]?.[1]||"?",cnt=a=>{const m={};a.forEach(([s,i])=>{const n=pn(s,i);m[n]=(m[n]||0)+1;});return Object.entries(m).sort((x,y)=>y[1]-x[1]);};
  const made=S.filter(([,r])=>shMade(r)),by=cnt(made.filter(([,r])=>r[8]>=0).map(([s,r])=>[s,r[8]])),tw=cnt(to.map(([s,r])=>[s,r[1]]));
  const una=made.filter(([,r])=>r[8]<0).length;
  const list=(a,tot,w)=>a.slice(0,10).map(([n,c])=>`<tr><td class="nm">${hName(n)}</td><td class="num">${c}</td><td class="num"><span class="hbar" style="--w:${Math.round(c/a[0][1]*100)}%"></span>${tot?Math.round(c/tot*100)+"%":""}</td></tr>`).join("")||`<tr><td class="nm muted" colspan="3">${w}</td></tr>`;
  const Q=[[1,"Q1"],[2,"Q2"],[3,"Q3"],[4,"Q4"],[5,"OT"]].map(([q,l])=>{const x=S.filter(([,r])=>q===5?r[2]>=5:r[2]===q).map(p=>p[1]),m=x.filter(shMade).length,a3=x.filter(sh3),m3=a3.filter(shMade).length;return {l,a:x.length,m,a3:a3.length,m3,pts:2*m+m3};});
  const g=mine.length;
  const qt=hTbl(hTh("Quarter","nm")+hTh("FGA/g")+hTh("FG")+hTh("FG%")+hTh("3PT")+hTh("3P%")+hTh("eFG%"),Q.filter(x=>x.a).map(x=>`<tr class="${x.l==="Q4"||x.l==="OT"?"hbold":""}"><td class="nm">${x.l}</td><td class="num">${(x.a/g).toFixed(1)}</td><td class="num">${x.m}-${x.a}</td><td class="num">${shPct(x.m,x.a)}</td><td class="num">${x.m3}-${x.a3}</td><td class="num">${shPct(x.m3,x.a3)}</td><td class="num">${shPct(x.m+.5*x.m3,x.a)}</td></tr>`).join(""));
  const zone=a=>{const z={};SHZ.forEach(([k])=>z[k]=[0,0]);a.forEach(([,r])=>{const k=shZone(r);z[k][0]++;if(shMade(r))z[k][1]++;});return z;};
  let zt="";if(HF.opp){const zo=zone(S),zb=zone(take(base.filter(r=>r.opp!==HF.opp)).S);
    zt=`<h4 class="hfh">Hot zones vs ${esc(HF.opp)} and everyone else</h4>${hTbl(hTh("Zone","nm")+hTh(`Vs ${esc(HF.opp)}`)+hTh("FG%")+hTh("Others")+hTh("FG%")+hTh("±"),SHZ.map(([k,l])=>{const a=zo[k],b=zb[k],pa=a[0]?a[1]/a[0]:null,pb=b[0]?b[1]/b[0]:null;return `<tr><td class="nm">${l}</td><td class="num">${a[1]}-${a[0]}</td><td class="num">${shPct(a[1],a[0])}</td><td class="num">${b[1]}-${b[0]}</td><td class="num">${shPct(b[1],b[0])}</td><td class="num">${a[0]>=3?hDiff(pa,pb,"FG%"):"–"}</td></tr>`;}).join(""))}`;}
  else{const z=zone(S);zt=`<h4 class="hfh">Zones</h4>${hTbl(hTh("Zone","nm")+hTh("FG")+hTh("FG%")+hTh("League avg"),SHZ.map(([k,l,avg])=>`<tr><td class="nm">${l}</td><td class="num">${z[k][1]}-${z[k][0]}</td><td class="num">${shPct(z[k][1],z[k][0])}</td><td class="num muted">${Math.round(avg*1000)/10}%</td></tr>`).join(""))}<p class="anote">Pick an Opponent above to compare his zones against one team.</p>`;}
  return chips+`<p class="hsum"><b>${esc(name)}</b> · ${g} games${HF.opp?` vs ${esc(HF.opp)}`:""} · ${S.length} shots · ${made.length} made, ${made.length-una} assisted (${shPct(made.length-una,made.length)})</p>
    <div class="hfcols"><div><h4 class="hfh">Who sets him up</h4>${hTbl(hTh("Passer","nm")+hTh("Assists")+hTh("Share"),list(by,made.length-una,"No assisted makes."))}</div>
    <div><h4 class="hfh">Who he sets up</h4>${hTbl(hTh("Scorer","nm")+hTh("Assists")+hTh("Share"),list(tw,to.length,"No assists on logged shots."))}</div></div>
    <h4 class="hfh">By quarter</h4>${qt}${zt}<p class="anote">Shots come from ESPN play-by-play, which has no game clock here, so "clutch" means the 4th quarter and overtime.</p>`;};

/* ---------------------------------------------------------------- Trivia of the day */
let TRIV=[],TRIVW=null;
function hRng(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
  return ()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return ((h^=h>>>16)>>>0)/4294967296;};}
const hShuf=(a,r)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
// one question per day, the same for everyone (built from the finished seasons only)
function triviaQ(date){const r=hRng("trivia"+date),SK=[["PTS",5,"points"],["REB",14,"rebounds"],["AST",15,"assists"],["3PM",8,"3-pointers"],["BLK",17,"blocks"],["STL",16,"steals"]];
  for(let tries=0;tries<30;tries++){const s=HFILE[Math.floor(r()*HFILE.length)],D=HDATA[s],kind=Math.floor(r()*4),[k,i,word]=SK[Math.floor(r()*(kind===0?3:SK.length))];
    if(kind===0){// who led a team in scoring in a big game
      const G=D.G[Math.floor(r()*D.G.length)],gi=D.G.indexOf(G),side=r()<.5?G.h:G.a,ls=D.l.filter(l=>l[0]===gi&&D.t[l[2]]===side).sort((a,b)=>b[5]-a[5]);
      if(ls.length<4||ls[0][5]===ls[1][5])continue;const opts=hShuf(ls.slice(0,4).map(l=>D.p[l[1]][1]),r);
      return {q:`Who led ${side} in scoring on ${hFmtD(G.d)} ${side===G.h?"vs":"@"} ${side===G.h?G.a:G.h}? (${side} ${side===G.h?G.hs:G.as}-${side===G.h?G.as:G.hs})`,opts,ans:opts.indexOf(D.p[ls[0][1]][1]),why:`${D.p[ls[0][1]][1]} had ${hLine(ls[0])}.`,s,gid:G.id};}
    const sa=[...hSA(s).values()].filter(a=>a.gp>=50);
    if(kind===1){const l=sa.sort((a,b)=>b[k]-a[k]);if(l.length<8||l[0][k]-l[1][k]<.05)continue;const opts=hShuf([l[0],...hShuf(l.slice(1,8),r).slice(0,3)].map(a=>a.name),r);
      return {q:`Who averaged the most ${word} per game in the ${s} regular season (50+ games)?`,opts,ans:opts.indexOf(l[0].name),why:`${l[0].name} averaged ${l[0][k].toFixed(1)}. Next: ${l.slice(1,4).map(a=>`${a.name} ${a[k].toFixed(1)}`).join(", ")}.`};}
    if(kind===2){const ls=D.l.filter(l=>D.G[l[0]].ty===2).sort((a,b)=>b[i]-a[i]);if(ls[0][i]===ls[1][i])continue;const names=[];ls.forEach(l=>{const n=D.p[l[1]][1];if(!names.includes(n)&&names.length<12)names.push(n);});
      const top=D.p[ls[0][1]][1],opts=hShuf([top,...hShuf(names.slice(1),r).slice(0,3)],r),G=D.G[ls[0][0]];
      return {q:`Who had the most ${word} in a single game in the ${s} regular season?`,opts,ans:opts.indexOf(top),why:`${top}: ${ls[0][i]} ${word} on ${hFmtD(G.d)} (${G.a} @ ${G.h}).`,s,gid:G.id};}
    // how many points in a big game
    const big=D.l.filter(l=>l[5]>=40);if(!big.length)continue;const l=big[Math.floor(r()*big.length)],G=D.G[l[0]],n=D.p[l[1]][1],me=D.t[l[2]];
    const set=new Set([l[5]]);while(set.size<4){const d=Math.round((r()*2-1)*9);if(d)set.add(l[5]+d);}const opts=hShuf([...set].map(String),r);
    return {q:`How many points did ${n} score on ${hFmtD(G.d)} ${me===G.h?"vs":"@"} ${me===G.h?G.a:G.h}?`,opts,ans:opts.indexOf(String(l[5])),why:`${n} had ${hLine(l)}.`,s,gid:G.id};}
  return null;}
const trivDoc=(d,T)=>TRIV.find(x=>x.date===d&&tnum(x.team)===T);
function trivStreak(T,today){let n=0,d=new Date(today+"T12:00:00");for(;;){const k=hYmd(d),x=trivDoc(k,T);if(!x||!x.ok)break;n++;d.setDate(d.getDate()-1);}return n;}
HFUN.trivia=()=>{const w=hNeed(HFILE);if(w)return w;if(!TRIVW&&SEASON){TRIVW=SEASON;Store.watch("trivia",SEASON,d=>{TRIV=d;hRedraw();});}
  const today=etToday(),Q=triviaQ(today),me=myTeamNum(),mine=me?trivDoc(today,me):null;if(!Q)return hEmpty("No question today.");
  const y=new Date(today+"T12:00:00");y.setDate(y.getDate()-1);const yk=hYmd(y),YQ=triviaQ(yk);
  const opts=Q.opts.map((o,i)=>{const cls=mine?(i===Q.ans?" right":i===mine.pick?" wrong":""):"";return `<button class="hfopt${cls}" data-triv="${i}" ${mine||!me||WRITE_BLOCKED?"disabled":""}>${esc(o)}</button>`;}).join("");
  const teams=(L?.teams||[]).map(t=>tnum(t.id)).filter(T=>TEAMS[T]);
  const board=teams.map(T=>{const ds=TRIV.filter(x=>tnum(x.team)===T);return {T,ok:ds.filter(x=>x.ok).length,n:ds.length,st:trivStreak(T,trivDoc(today,T)?today:yk),td:trivDoc(today,T)};}).sort((a,b)=>b.ok-a.ok||b.st-a.st||a.n-b.n);
  return `<section class="hftriv"><p class="muted">Trivia of the day · ${hFmtD(today)} · one try, everyone in the league gets the same question</p><h3>${esc(Q.q)}</h3><div class="hfopts">${opts}</div>
    ${mine?`<p class="hfans ${mine.ok?"okc":"badc"}"><b>${mine.ok?"Right!":"Not quite."}</b> ${Q.why}${Q.gid?` <button class="hlink" data-hgame="${Q.s}:${Q.gid}">Box score</button>`:""}</p><div class="hfacts">${!WRITE_BLOCKED?`<button class="btn sm" data-trivshare>Share to league chat</button>`:""}</div>`:!me?`<p class="muted">Sign in as a team to answer. ${isCommish()?"Commissioners can watch the scores.":""}</p>`:`<p class="muted">Tap an answer. You get one try.</p>`}</section>
    <h4 class="hfh">Leaderboard</h4>${hTbl(hTh("Team","nm")+hTh("Right")+hTh("Played")+hTh("Streak")+hTh("Today","nm"),board.map(b=>`<tr class="${b.T===me?"mine":""}"><td class="nm">${esc(teamName(b.T))}</td><td class="num"><b>${b.ok}</b></td><td class="num">${b.n}</td><td class="num">${b.st?b.st+"🔥":"–"}</td><td class="nm">${b.td?(mine||!me?(b.td.ok?"✓ right":"✗ wrong"):"answered"):"<span class='muted'>not yet</span>"}</td></tr>`).join(""))}
    ${YQ?`<h4 class="hfh">Yesterday</h4><p class="hsum">${esc(YQ.q)} <b>${esc(YQ.opts[YQ.ans])}</b>. ${YQ.why}</p>`:""}`;};
document.addEventListener("click",async e=>{const b=e.target.closest("[data-triv]");if(b&&!b.disabled){const me=myTeamNum(),d=etToday(),Q=triviaQ(d);if(!me||!Q||trivDoc(d,me))return;
    const pick=+b.dataset.triv,doc={season:SEASON,date:d,team:tkey(me),pick,ok:pick===Q.ans,at:Date.now()},id=`${SEASON}_${d}_t${me}`;TRIV.push({id,...doc});hRedraw();
    try{await Store.set("trivia",id,doc);}catch(x){TRIV=TRIV.filter(t=>t.id!==id);showErr(x);hRedraw();}return;}
  if(e.target.closest("[data-trivshare]")){const me=myTeamNum(),d=etToday(),x=trivDoc(d,me),Q=triviaQ(d),from=chatMe();if(!x||!Q||!from)return;const st=trivStreak(me,d);
    const text=`🧠 Trivia of the day (${hFmtD(d,false)}): ${x.ok?"got it right":"missed it"}${st>1?`, ${st} days in a row`:""}. Your turn: Fun › Trivia.`;
    try{await Store.set("chat",`${Date.now()}_${Math.random().toString(36).slice(2,7)}`,{ch:"league",members:["all"],from,text,at:Date.now(),by:Store.uid||null});toast("Shared to league chat");}catch(err){showErr(err);}}});

/* ---------------------------------------------------------------- Who had more? */
let WH=null;const WHS=[["PTS","points"],["REB","rebounds"],["AST","assists"],["3PM","3-pointers"],["STL","steals"],["BLK","blocks"],["FG%","FG%"],["FT%","FT%"]];
const whStore=()=>{try{return JSON.parse(localStorage.getItem("dfWham")||"{}");}catch(e){return {};}};
function whNew(){for(let t=0;t<50;t++){const s=HFILE[Math.floor(Math.random()*HFILE.length)],[k,word]=WHS[Math.floor(Math.random()*WHS.length)];
  const pool=[...hSA(s).values()].filter(a=>a.gp>=40&&a.MIN>=24&&(k!=="FT%"||a.sum[11]/a.gp>=2)&&(k!=="3PM"||a["3PM"]>=.8)&&(k!=="BLK"||a.BLK>=.4));if(pool.length<20)continue;
  const a=pool[Math.floor(Math.random()*pool.length)],near=pool.filter(b=>b!==a&&Math.abs(b[k]-a[k])>(k.endsWith("%")?.004:.15)&&Math.abs(b[k]-a[k])/Math.max(a[k],.01)<.3);if(!near.length)continue;
  const b=near[Math.floor(Math.random()*near.length)];return {s,k,word,p:Math.random()<.5?[a,b]:[b,a],pick:null};}return null;}
HFUN.wham=()=>{const w=hNeed(HFILE);if(w)return w;if(!WH)WH=whNew();if(!WH)return hEmpty("Couldn't build a question.");
  const st=whStore(),{s,k,word,p,pick}=WH,win=p[0][k]>p[1][k]?0:1;
  const card=(a,i)=>`<button class="hfopt big${pick!=null?(i===win?" right":i===pick?" wrong":""):""}" data-wham="${i}" ${pick!=null?"disabled":""}><b>${esc(a.name)}</b><small>${esc(a.team)} · ${a.gp} games</small>${pick!=null?`<span class="hfv">${hAvg(k,a[k])} ${k.endsWith("%")?"":word}</span>`:""}</button>`;
  return `<section class="hftriv"><p class="muted">Who had more? · streak <b>${st.cur||0}</b> · best <b>${st.best||0}</b></p><h3>Who averaged more ${word}${k.endsWith("%")?"":" per game"} in ${s}?</h3>
    <div class="hfopts two">${p.map(card).join("")}</div>${pick!=null?`<p class="hfans ${pick===win?"okc":"badc"}"><b>${pick===win?"Yes!":"Nope."}</b> ${esc(p[win].name)} ${hAvg(k,p[win][k])} vs ${esc(p[1-win].name)} ${hAvg(k,p[1-win][k])}.</p><div class="hfacts"><button class="btn sm" data-whnext>Next one</button></div>`:""}</section>
    <p class="anote">Regular-season averages, players with 40+ games and 24+ minutes. Your streak stays on this device.</p>`;};
document.addEventListener("click",e=>{const b=e.target.closest("[data-wham]");if(b&&WH&&WH.pick==null){WH.pick=+b.dataset.wham;const win=WH.p[0][WH.k]>WH.p[1][WH.k]?0:1,st=whStore();st.cur=WH.pick===win?(st.cur||0)+1:0;st.best=Math.max(st.best||0,st.cur);try{localStorage.setItem("dfWham",JSON.stringify(st));}catch(x){}hRedraw();return;}
  if(e.target.closest("[data-whnext]")){WH=whNew();hRedraw();}});

/* ---------------------------------------------------------------- wiring */
// jump inside History: set some filters and redraw (the filter row too)
document.addEventListener("click",e=>{const b=e.target.closest("[data-hfgo]");if(!b)return;let o;try{o=JSON.parse(b.dataset.hfgo);}catch(x){return;}
  Object.assign(HF,o,{limit:100});histSave();const box=document.getElementById("histBox");if(box)box.querySelector(".hfilters").replaceWith(Object.assign(document.createElement("div"),{className:"hfilters"}));renderHist();});
// open History › Vs team for one player and one opponent (from My Team, the player card, Fantasy)
function hOpenVs(n,opp){Object.assign(HF,{q:n,opp:opp||"",team:"",game:"",season:"all",type:"2",minPts:"",view:"vs",limit:100});histSave();
  const d=sheet();if(d.open)d.close();setNav("analytics","hist");}
document.addEventListener("click",e=>{const b=e.target.closest("[data-hfvs]");if(!b)return;e.stopPropagation();const [n,o]=b.dataset.hfvs.split("|");hOpenVs(n,o);},true);

/* ---------------------------------------------------------------- My Team: matchup history */
// next game for an NBA team from a day on: [sp, opp, home]
const hNext=(t,from)=>{for(let sp=from;sp<=SEASON_END;sp++){const g=gameOn(t,sp);if(g)return [sp,g[0],g[1]];}return null;};
let MHOPEN=0;
function mhHtml(T,vd){const P=TEAMS[T].P.filter(p=>gameOn(p.t,vd));
  if(!P.length)return `<p class="empty">Nobody on ${esc(TEAMS[T].name)} plays ${dow(vd)}.</p>`;
  const miss=HSEASONS.filter(s=>!HDATA[s]);
  if(miss.length){Promise.all(miss.map(histLoad)).then(()=>{const d=sheet();if(d.open&&MHOPEN===T*1000+vd)mhSheet(T,vd);}).catch(e=>toast(e.message));
    return `<p class="empty">Loading 5 seasons of box scores (about 8 MB, once per visit)…</p>`;}
  const rows=P.map(p=>{const g=gameOn(p.t,vd),ls=hLines(p.n),vs=ls.filter(r=>r.opp===g[0]),a=hAgg(vs),b=hAgg(ls),fr=hFormer(p.n);return {p,g,a,b,last:vs.at(-1),rev:fr.former.has(g[0])};}).sort((x,y)=>startedOn(y.p,vd)-startedOn(x.p,vd)||(y.a.PTS||0)-(x.a.PTS||0));
  return `<p class="muted">Every regular-season game since 2021-22 against the team each player faces ${dow(vd)} ${dateOf(vd).getDate()}. ± is points vs his usual. Tap a name for the full history.</p>
    <div class="scroll"><table class="lg antable htbl mht"><thead><tr><th class="nm">Player</th><th class="nm">Opp</th><th class="num">GP</th><th class="num">PTS</th><th class="num">±</th><th class="num">REB</th><th class="num">AST</th><th class="num">3PM</th><th class="nm">Last time</th></tr></thead><tbody>
    ${rows.map(r=>`<tr class="${startedOn(r.p,vd)?"":"ptbn"}"><td class="nm"><button class="hname" data-hfvs="${esc(r.p.n)}|${esc(r.g[0])}">${esc(r.p.n)}</button>${r.rev?` <span class="hrev sm" title="He used to play for ${esc(r.g[0])}">revenge</span>`:""}</td><td class="nm">${r.g[1]?"vs":"@"} ${esc(r.g[0])}</td><td class="num">${r.a.gp}</td><td class="num"><b>${hAvg("PTS",r.a.PTS)}</b></td><td class="num">${hDiff(r.a.PTS,r.b.PTS)}</td><td class="num">${hAvg("REB",r.a.REB)}</td><td class="num">${hAvg("AST",r.a.AST)}</td><td class="num">${hAvg("3PM",r.a["3PM"])}</td><td class="nm"><small>${r.last?`${hFmtD(r.last.G.d)} · ${r.last.L[5]}/${r.last.L[14]}/${r.last.L[15]}`:"never"}</small></td></tr>`).join("")}</tbody></table></div>`;}
function mhSheet(T,vd){MHOPEN=T*1000+vd;openSheet(`Matchup history · ${dow(vd)} ${md(vd)}`,mhHtml(T,vd)+`<div class="sheetacts"><button class="btn ghost" data-hfgo2="roster">Whole matchup</button><button class="btn" data-sheet="close">Done</button></div>`);}
document.addEventListener("click",e=>{if(e.target.closest("[data-mhist]")){mhSheet(cur,viewDay());return;}
  if(e.target.closest("[data-hfgo2]")){Object.assign(HF,{view:"fan",fsub:"roster",limit:100});histSave();const d=sheet();if(d.open)d.close();setNav("analytics","hist");}});
// the button: phone table's status line, and the desktop lineup bar
{const _rr=renderRosters;renderRosters=function(){_rr.apply(this,arguments);if(nav!=="team"||!TEAMS[cur])return;const R=$("#rosters");if(!R||R.querySelector("[data-mhist]"))return;
  const vd=viewDay(),n=TEAMS[cur].P.filter(p=>gameOn(p.t,vd)).length;if(!n)return;
  const pl=R.querySelector(".ptline");if(pl){pl.insertAdjacentHTML("beforeend",`<button class="ptlink" data-mhist>Matchup history</button>`);return;}
  const ab=R.querySelector(".dpa")||R.querySelector(".autobar");const html=`<button class="btn ghost sm mhbtn" data-mhist title="Each player's history vs ${dow(vd)}'s opponent">Matchup history · ${vd===TODAY?"today":dow(vd)}</button>`;
  if(ab)ab.insertAdjacentHTML("beforeend",html);else R.insertAdjacentHTML("afterbegin",`<div class="mhbar">${html}</div>`);};}
// player card: his history vs the next team he plays
{const _pc=playerCard;playerCard=function(n){_pc(n);const D=DIR[n];if(!D||!D.t||D.t==="FA")return;const nx=hNext(D.t,TODAY);if(!nx)return;const ov=$("#sheetBody [data-pane=\"ov\"]");if(!ov)return;
  const [sp,opp,home]=nx,when=sp===TODAY?"tonight":dow(sp)+" "+dateOf(sp).getDate();let line="";
  if(HSEASONS.every(s=>HDATA[s])){const ls=hLines(n),vs=ls.filter(r=>r.opp===opp),a=hAgg(vs),b=hAgg(ls),fr=hFormer(n);
    line=vs.length?`In ${a.gp} ${a.gp===1?"game":"games"} vs ${esc(opp)} since 2021-22: <b>${hAvg("PTS",a.PTS)} pts, ${hAvg("REB",a.REB)} reb, ${hAvg("AST",a.AST)} ast</b> (${hDiff(a.PTS,b.PTS)} pts vs his usual). Last time: ${hLine(vs.at(-1).L)} on ${hFmtD(vs.at(-1).G.d)}.${fr.former.has(opp)?` <span class="hrev sm">revenge game</span>`:""}`:`No games vs ${esc(opp)} in the database.`;}
  ov.insertAdjacentHTML("beforeend",`<h3>Vs ${esc(opp)} · ${when}</h3><p class="pcvs">${line?line+" ":""}<button class="hlink" data-hfvs="${esc(n)}|${esc(opp)}">${line?"Full history":"See his history vs "+esc(opp)}</button></p>`);};}
