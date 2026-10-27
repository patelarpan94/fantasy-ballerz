
/* ============================================================================
   FEATURES (2026-10-22): lineup alert, streaming planner, trade check,
   ESPN trending, weekly awards, power rankings and rivalries.
   ============================================================================ */
const catZ=(pg,c)=>{const b=zBase()[c[0]];return c[1]==="pct"?(pg[c[2]]-b.lg*pg[c[3]])/b.sd:(pg[c[2]]-b.m)/b.sd;};
const fmtD=v=>Math.abs(v)<.05?"0.0":(v>0?"+":"")+v.toFixed(1);

// ---- 1. lineup alert: the next day with games left, starters who won't play and bench players who could
function alertDay(T){return DAYS.filter(sp=>sp>=TODAY&&sp<=TODAY+1).find(sp=>TEAMS[T].P.some(p=>gameOn(p.t,sp)&&upcoming(p.t,sp))&&benchPlan(T,sp).extra>0);}
function lineupAlert(){
  const T=cur;if(nav!=="team"||!TEAMS[T])return "";
  const sp=alertDay(T);if(sp==null)return "";
  const idle=TEAMS[T].P.filter(p=>startedOn(p,sp)&&!locked(p,sp)&&(!gameOn(p.t,sp)||p.st==="OUT")),can=benchPlan(T,sp).extra;
  if(!can)return "";
  const day=sp===TODAY?"Today":"Tomorrow",edit=canEditTeam(T);
  const what=`${idle.length?`${idle.length} starter${idle.length>1?"s":""} won't play`:"You have open starting spots"} and ${can} bench player${can>1?"s":""} could start.`;
  return `<section class="lalert" role="status"><span class="laic" aria-hidden="true">!</span><div class="lat"><b>${day}: ${what}</b><span>${idle.length?esc(idle.map(p=>p.n.split(" ").slice(-1)[0]+(p.st==="OUT"?" (OUT)":" (no game)")).join(", ")):"Fill them before tip-off."}</span></div>${edit?`<button class="btn sm" data-fixday="${sp}">Fix lineup</button>`:`<span class="hint">${mirror()?"Set it on ESPN":""}</span>`}</section>`;
}

// ---- 2. streaming planner: free agents who play on days you have a starting spot they can fill
function openFit(T,sp,el){
  const P=TEAMS[T].P.filter(p=>{const s=slotOn(p,sp);return s!=null&&s!==13&&p.st!=="OUT"&&gameOn(p.t,sp);});
  const fits=(x,slot)=>(x.el&&x.el.length?x.el:[11]).includes(slot);
  const tryA=(o,x,seen)=>{for(let j=0;j<LINEUP.length;j++){if(seen[j]||!fits(x,LINEUP[j]))continue;seen[j]=1;if(o[j]==null||tryA(o,o[j],seen)){o[j]=x;return true;}}return false;};
  const base=new Array(LINEUP.length).fill(null);P.forEach(p=>tryA(base,p,[]));
  return tryA(base.slice(),{el},[]);
}
function catNeeds(T){
  const opp=opponentOf(T),w={};CATS.forEach(c=>w[c[0]]=1);if(!opp||!TEAMS[opp])return {w,why:{}};
  const proj=id=>{const now=score(id),rem=new Array(11).fill(0);TEAMS[id].P.filter(healthy).forEach(p=>{const pg=pgLine(p.pj);if(!pg)return;DAYS.forEach(sp=>{if(upcoming(p.t,sp)&&gameOn(p.t,sp)&&startedOn(p,sp))pg.forEach((v,i)=>rem[i]+=v);});});return now.map((v,i)=>v+rem[i]);};
  const a=proj(T),b=proj(opp),why={};
  CATS.forEach(c=>{const va=val(a,c),vb=val(b,c),rel=Math.abs(va-vb)/Math.max(Math.abs(va),Math.abs(vb),1e-9);
    w[c[0]]=rel<.04?1.6:rel<.12?1.25:.5;why[c[0]]=rel<.12?(va>=vb?"close lead":"close deficit"):(va>vb?"safe":"out of reach");});
  return {w,why};
}
function streamPlanner(T){
  if(!TEAMS[T])return "";
  const days=DAYS.filter(sp=>sp>=TODAY),{w,why}=catNeeds(T),full=rosterNow(T).length>=ROSTER_MAX;
  const rows=Object.values(DIR).filter(D=>!ownerNow(D.n)&&D.pj&&INJ[D.n]!=="OUT").map(D=>{
    const use=days.filter(sp=>gameOn(D.t,sp)&&upcoming(D.t,sp)&&openFit(T,sp,D.el));if(!use.length)return null;
    const pg=pgLine(D.pj);if(!pg)return null;const zc=CATS.map(c=>({k:c[0],z:catZ(pg,c)*w[c[0]]}));const v=zc.reduce((s,x)=>s+x.z,0);
    return {D,use,v,s:use.length*Math.max(0,v+2),helps:zc.filter(x=>x.z>.25).sort((a,b)=>b.z-a.z).slice(0,3).map(x=>x.k)};}).filter(Boolean).sort((a,b)=>b.s-a.s).slice(0,10);
  const close=CATS.filter(c=>/close/.test(why[c[0]]||"")).map(c=>c[0]);
  const body=rows.length?`<ol class="plist splan">${rows.map(x=>`<li><div><span class="pnm"><span class="nm nmb" role="button" tabindex="0" data-pcard="${esc(x.D.n)}"><b>${esc(x.D.n)}</b></span></span><span class="pmeta">${esc(x.D.t)} · ${(x.D.el||[]).filter(e=>e<5).map(e=>SLOT[e]).join("/")} · fills a spot on ${x.use.map(sp=>dow(sp)).join(", ")}${x.helps.length?` · helps ${x.helps.join(", ")}`:""}</span></div><span class="spr"><span class="num sg" title="Games he can start for you">${x.use.length} ${x.use.length===1?"game":"games"}</span>${actionBtn({n:x.D.n,oid:0})}</span></li>`).join("")}</ol>`
    :`<p class="empty">No free agent fills an open starting spot for the rest of this matchup.</p>`;
  return sec("Streaming planner",`Free agents who play on days ${esc(TEAMS[T].name)} has a starting spot they can fill${close.length?` · weighted toward close categories: ${close.join(", ")}`:""}${full?" · your roster is full, so adding means a drop":""}`,body);
}

// ---- 3. trade check: projected per-game categories and league ranks before and after
function projSum(names){const ls=names.map(n=>{const D=DIR[n];if(!D||INJ[n]==="OUT")return null;return pgLine(D.pj);}).filter(Boolean);return lineSum(ls);}
const activeNames=T=>rosterNow(T).filter(n=>TEAMS[T].P.find(p=>p.n===n)?.s!==13);
function tradeImpactHtml(T,O,give,get){
  if(!O||(!give.length&&!get.length))return `<p class="hint">Pick players to see how the trade changes both teams.</p>`;
  const ids=L.teams.map(t=>tnum(t.id)).filter(x=>TEAMS[x]);
  const after={...Object.fromEntries(ids.map(x=>[x,activeNames(x)]))};
  after[T]=after[T].filter(n=>!give.includes(n)).concat(get);after[O]=after[O].filter(n=>!get.includes(n)).concat(give);
  const bS=Object.fromEntries(ids.map(x=>[x,projSum(activeNames(x))])),aS={...bS,[T]:projSum(after[T]),[O]:projSum(after[O])};
  const rank=(S,x,c)=>1+ids.filter(y=>val(S[y],c)>val(S[x],c)+1e-9).length;
  const left=ns=>ns.reduce((s,n)=>s+(DIR[n]&&INJ[n]!=="OUT"?DAYS.filter(sp=>upcoming(DIR[n].t,sp)&&gameOn(DIR[n].t,sp)).length:0),0);
  const cell=(x,c)=>{const b=val(bS[x],c),a=val(aS[x],c),rb=rank(bS,x,c),ra=rank(aS,x,c),d=a-b,good=c[1]==="pct"?d>1e-4:d>.05,bad=c[1]==="pct"?d<-1e-4:d<-.05;
    return `<td class="num ${good?"okc":bad?"badc":""}">${c[1]==="pct"?pct(a):fmtD(d)}<small>${ord(rb)}${rb!==ra?`→${ord(ra)}`:""}</small></td>`;};
  const gT=left(get)-left(give);
  return `<table class="lg antable trimp"><thead><tr><th class="nm">Per game</th><th>${esc(TEAMS[T].name)}</th><th>${esc(TEAMS[O].name)}</th></tr></thead><tbody>
    ${CATS.map(c=>`<tr><td class="nm"><b>${c[0]}</b></td>${cell(T,c)}${cell(O,c)}</tr>`).join("")}</tbody></table>
    <p class="anote">Change in projected per-game totals (ESPN projections, healthy players, IR left out). Small text is the league rank before → after. Games left this matchup: ${esc(TEAMS[T].name)} ${gT>=0?"+":""}${gT}, ${esc(TEAMS[O].name)} ${-gT>=0?"+":""}${-gT}.</p>`;
}
function tradeImpact(){
  const box=document.getElementById("trImpact");if(!box)return;const body=box.closest("#sheetBody")||document;
  const T=actTeam(),O=+(body.querySelector("#trWith")?.value||0);
  const get=[...body.querySelectorAll('input[name="get"]:checked')].map(i=>i.value),give=[...body.querySelectorAll('input[name="give"]:checked')].map(i=>i.value);
  box.innerHTML=`<p class="flabel">Trade check</p>`+tradeImpactHtml(T,O,give,get);
}
document.addEventListener("change",e=>{if(e.target.matches('input[name="give"],input[name="get"]'))tradeImpact();});

// ---- 4. trending across ESPN: % rostered and its change, pulled by Refresh into nba.own {name:[owned, change, started]}
const ownOf=n=>NBA?.own?.[n]||null;
function espnTrend(){
  const own=NBA?.own;if(!own)return "";
  const all=Object.entries(own).map(([n,o])=>({n,po:o[0],ch:o[1],ps:o[2],o:ownerNow(n),t:DIR[n]?.t||""}));
  const up=all.filter(x=>x.ch>0).sort((a,b)=>b.ch-a.ch).slice(0,8),dn=all.filter(x=>x.ch<0).sort((a,b)=>a.ch-b.ch).slice(0,8);
  const li=x=>`<li><div><span class="pnm"><span class="nm nmb" role="button" tabindex="0" data-pcard="${esc(x.n)}"><b>${esc(x.n)}</b></span></span><span class="pmeta">${esc(x.t)} · ${x.o?esc(teamName(x.o)):"Free agent"} · ${x.po.toFixed(1)}% rostered</span></div><span class="spr"><span class="num ${x.ch>=0?"okc":"badc"}">${x.ch>=0?"▲":"▼"}${Math.abs(x.ch).toFixed(1)}</span>${actionBtn({n:x.n,oid:x.o})}</span></li>`;
  const when=NBA.ownAt?` · as of ${fmtStamp(NBA.ownAt)} ET`:"";
  return `<div class="angrid">${sec("Rising on ESPN",`Biggest jump in % rostered across all ESPN leagues${when}`,up.length?`<ol class="plist">${up.map(li).join("")}</ol>`:`<p class="empty">No risers yet.</p>`)}${sec("Falling on ESPN","Biggest drop in % rostered",dn.length?`<ol class="plist">${dn.map(li).join("")}</ol>`:`<p class="empty">No fallers yet.</p>`)}</div>`;
}

// ---- 5. weekly awards (shown on the scoreboard, posted to league chat once the matchup ends)
function weekAwards(n){
  if(!weekDone(n)||!(W[n]||[]).length)return null;
  const ids=Object.keys(TEAMS).map(Number),tot=Object.fromEntries(ids.map(x=>[x,wt(x,n)])),days=weekDaysAll(n);
  if(!ids.some(x=>tot[x][K.PTS]))return null;
  const top=ids.slice().sort((a,b)=>tot[b][K.PTS]-tot[a][K.PTS])[0];
  let pow=null,bench={};ids.forEach(x=>{bench[x]=0;TEAMS[x].P.forEach(p=>{let z=0,g=0;days.forEach(sp=>{const l=p.d[sp];if(!l)return;const s=slotOn(p,sp);if(s===12)bench[x]+=l[K.PTS];if(s!=null&&s<12){z+=zOf(l);g++;}});if(g&&(!pow||z>pow.z))pow={n:p.n,T:x,z,g};});});
  const waste=ids.slice().sort((a,b)=>bench[b]-bench[a])[0];
  const ms=(W[n]||[]).map(([a,b])=>{const r=h2h(tot[a],tot[b]);return {a,b,r,m:Math.abs(r[0]-r[1])};});
  const close=ms.slice().sort((x,y)=>x.m-y.m)[0],blow=ms.slice().sort((x,y)=>y.m-x.m)[0];
  const rec={};ids.forEach(x=>rec[x]=[0,0,0]);for(let k=1;k<n;k++)(W[k]||[]).forEach(([a,b])=>{const r=weekRec(h2h(wt(a,k),wt(b,k)));[0,1,2].forEach(i=>{rec[a][i]+=r[i];rec[b][i]+=r[i===2?2:1-i];});});
  let upset=null;if(n>1)ms.forEach(m=>{if(m.r[0]===m.r[1])return;const wn=m.r[0]>m.r[1]?m.a:m.b,ls=wn===m.a?m.b:m.a,gap=pctW(rec[ls])-pctW(rec[wn]);if(gap>0&&(!upset||gap>upset.gap))upset={wn,ls,gap};});
  const line=m=>`${teamName(m.a)} ${m.r[0]}-${m.r[1]}${m.r[2]?`-${m.r[2]}`:""} ${teamName(m.b)}`;
  const out=[["🏆","Top scorer",`${teamName(top)} (${tot[top][K.PTS]} pts)`]];
  if(pow)out.push(["⭐","Player of the week",`${pow.n} (${teamName(pow.T)}, ${pow.g} ${pow.g===1?"game":"games"})`]);
  if(bench[waste])out.push(["🪑","Most bench points wasted",`${teamName(waste)} (${bench[waste]} pts on the bench)`]);
  out.push(["🤏","Closest matchup",line(close)]);if(blow!==close)out.push(["💥","Biggest blowout",line(blow)]);
  if(upset)out.push(["😱","Upset of the week",`${teamName(upset.wn)} beat ${teamName(upset.ls)}`]);
  return out;
}
function awardsCard(n){
  const a=weekAwards(n);
  if(!a)return sec(`${weekName(n)} awards`,"Handed out when the matchup ends, and posted to league chat",`<p class="empty">${weekDone(n)?"No box scores for this matchup.":"Check back after the matchup ends."}</p>`);
  return sec(`${weekName(n)} awards`,"Also posted to league chat",`<ul class="awards">${a.map(([i,t,v])=>`<li><span class="awi" aria-hidden="true">${i}</span><span><b>${t}</b><span>${esc(v)}</span></span></li>`).join("")}</ul>`);
}
const awardsTried=new Set();
function postAwards(){
  if(!L||!chatMe()||WRITE_BLOCKED||!(Store.db||Store.local))return;
  let n=0;for(let k=1;k<=regWeeks();k++)if(weekDone(k))n=k;if(!n||awardsTried.has(n))return;
  if(TODAY-CAL[n-1][2]>7)return;awardsTried.add(n);
  const a=weekAwards(n);if(!a)return;
  Store.claimSet("chat",`sys_awards_${SEASON}_w${n}`,{ch:"league",members:["all"],from:"sys",kind:"awards",text:`${weekName(n)} awards\n`+a.map(([i,t,v])=>`${i} ${t}: ${v}`).join("\n"),at:Date.now()},d=>!d.text).catch(()=>{});
}

// ---- 6. power rankings (record + projected roster strength) and rivalries (head-to-head this season)
function powerRows(){
  const ids=Object.keys(TEAMS).map(Number).filter(x=>TEAMS[x].P.length);if(!ids.length)return [];
  const S=Object.fromEntries(ids.map(x=>[x,projSum(activeNames(x))]));
  const crank=x=>CATS.reduce((s,c)=>s+1+ids.filter(y=>val(S[y],c)>val(S[x],c)+1e-9).length,0)/CATS.length;
  const anyGames=ids.some(x=>STAND[x].rec.some(v=>v));
  const rows=ids.map(x=>{const cr=crank(x),pw=pctW(STAND[x].rec),best=CATS.map(c=>({k:c[0],r:1+ids.filter(y=>val(S[y],c)>val(S[x],c)+1e-9).length})).sort((a,b)=>a.r-b.r);
    return {x,cr,pw,score:(anyGames?pw*.5:0)+(1-(cr-1)/Math.max(1,ids.length-1))*(anyGames?.5:1),best:best.slice(0,2).map(b=>b.k),worst:best.slice(-1)[0].k};});
  return rows.sort((a,b)=>b.score-a.score);
}
function powerView(){
  const rows=powerRows();if(!rows.length)return "";
  const anyGames=rows.some(r=>STAND[r.x].rec.some(v=>v));
  return sec("Power rankings",anyGames?"Half record, half roster strength (ESPN projections for current rosters)":"Roster strength only until the first matchup ends (ESPN projections)",
    `<div class="scroll"><table class="lg antable"><thead><tr><th>#</th><th class="nm">Team</th><th>W-L-T</th><th title="Average category rank, projected">Cat rank</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${r.x===cur?"mine":""}"><td class="num">${i+1}</td><td class="nm">${tlink(r.x)}${taco(r.x)}<small class="pwn">Best at ${r.best.join(", ")} · weakest ${r.worst}</small></td><td class="num">${STAND[r.x].rec.join("-")}</td><td class="num">${r.cr.toFixed(1)}</td></tr>`).join("")}</tbody></table></div>`);
}
function rivalView(){
  const ids=Object.keys(TEAMS).map(Number),H={};let any=false;
  for(let n=1;n<=regWeeks();n++){if(!weekDone(n))break;(W[n]||[]).forEach(([a,b])=>{const r=h2h(wt(a,n),wt(b,n)),k=a<b?a+"_"+b:b+"_"+a,o=a<b?r:[r[1],r[0],r[2]];const h=H[k]=H[k]||{c:[0,0,0],m:[0,0,0],g:0};any=true;h.g++;[0,1,2].forEach(i=>h.c[i]+=o[i]);h.m[o[0]>o[1]?0:o[0]<o[1]?1:2]++;});}
  if(!any)return sec("Rivalries","Head-to-head this season",`<p class="empty">Rivalries start after the first matchup ends.</p>`);
  const me=cur,mine=ids.filter(x=>x!==me).map(x=>{const k=me<x?me+"_"+x:x+"_"+me,h=H[k];if(!h)return null;const flip=me>x;const c=flip?[h.c[1],h.c[0],h.c[2]]:h.c,m=flip?[h.m[1],h.m[0],h.m[2]]:h.m;return {x,c,m,g:h.g};}).filter(Boolean);
  const hot=Object.entries(H).sort((a,b)=>b[1].g-a[1].g||Math.abs(a[1].c[0]-a[1].c[1])-Math.abs(b[1].c[0]-b[1].c[1]))[0];
  const [ha,hb]=hot[0].split("_").map(Number);
  return sec("Rivalries",`Head-to-head this season · ${esc(TEAMS[me]?.name||"")}`,`${mine.length?`<div class="scroll"><table class="lg antable"><thead><tr><th class="nm">Opponent</th><th>Matchups</th><th>Categories</th></tr></thead><tbody>${mine.map(r=>`<tr><td class="nm">${tlink(r.x)}</td><td class="num">${r.m.join("-")}</td><td class="num">${r.c.join("-")}</td></tr>`).join("")}</tbody></table></div>`:`<p class="empty">${esc(TEAMS[me]?.name||"This team")} hasn't played anyone yet.</p>`}
    <p class="anote">League's closest rivalry so far: ${esc(teamName(ha))} vs ${esc(teamName(hb))}, ${hot[1].c.join("-")} in categories over ${hot[1].g} ${hot[1].g===1?"matchup":"matchups"}.</p>`);
}

document.addEventListener("click",async e=>{const b=e.target.closest("[data-fixday]");if(!b)return;const sp=+b.dataset.fixday;if(!(typeof NOMO==="function"&&NOMO()))await new Promise(r=>setTimeout(r,260));selDay=sp;await autoSet("day");});
// awards post after any render once data is in
{const _render=render;render=function(){_render();try{postAwards();}catch(x){}};}

// ---- phone chat: slides up to open, slides down to close, swipe down on the header to close
{const phone=()=>PHONE()&&!matchMedia("(prefers-reduced-motion: reduce)").matches;
 const pane=$("#chatPane");let closing=false;
 const _rc=renderChat;renderChat=function(){const was=!pane.hidden;_rc();const now=!pane.hidden;
   if(closing){if(CHAT_OPEN){closing=false;pane.classList.remove("cpout");pane.style.transform="";}else{pane.hidden=false;return;}}
   if(!phone())return;
   if(!was&&now){pane.style.transform="";pane.classList.remove("cpout");pane.classList.remove("cpin");void pane.offsetWidth;pane.classList.add("cpin");}
   else if(was&&!now){closing=true;pane.hidden=false;pane.classList.remove("cpin");pane.classList.add("cpout");
     setTimeout(()=>{if(!closing)return;closing=false;pane.classList.remove("cpout");pane.style.transform="";pane.hidden=!CHAT_OPEN;},240);}};
 let y0=null,dy=0,t0=0;
 const start=e=>{if(!phone())return;const body=$("#chatBody");if(!e.target.closest(".chathead,.chgrab")&&body.scrollTop>0)return;if(e.target.closest("textarea,input,button:not(.chgrab)"))return;y0=e.touches[0].clientY;dy=0;t0=Date.now();pane.style.transition="none";};
 const move=e=>{if(y0==null)return;dy=Math.max(0,e.touches[0].clientY-y0);if(dy>4){pane.style.transform=`translateY(${dy}px)`;if(e.cancelable)e.preventDefault();}};
 const end=()=>{if(y0==null)return;y0=null;pane.style.transition="";const fast=dy>40&&dy/(Date.now()-t0)>.5;
   if(dy>110||fast){pane.style.transform=`translateY(${dy}px)`;CHAT_OPEN=false;renderChat();}else{pane.style.transition="transform .2s ease";pane.style.transform="";setTimeout(()=>pane.style.transition="",220);}};
 pane.addEventListener("touchstart",start,{passive:true});pane.addEventListener("touchmove",move,{passive:false});pane.addEventListener("touchend",end);pane.addEventListener("touchcancel",end);
 pane.querySelector(".chathead").insertAdjacentHTML("afterbegin",'<span class="chgrab" aria-hidden="true"></span>');}
