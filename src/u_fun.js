
/* ============================================================================
   HERSH'S FEEDBACK (1.35, 2026-10-25): a Fun tab (Pick'em, Records, Wrapped,
   Trivia, Who had more?) with new superlatives, a taco for last place, win %
   and games played in the Matchup tracker, season charts on My Team, and an
   "Advanced matchup" switch on the scoreboard (the old Hershy view).
   ============================================================================ */
// ---- taco for whoever is last (once a matchup has been played)
function tacoId(){if(!L||typeof standOrder!=="function")return 0;const o=standOrder();if(!o.length||!o.some(id=>STAND[id]?.rec.some(v=>v)))return 0;return o[o.length-1];}
const taco=id=>(id&&id===tacoId()?` <span class="taco" title="Last place" aria-label="Last place">🌮</span>`:"")+(typeof legalMark==="function"?legalMark(id):"");

// ---- Fun tab
function funView(){const s=SUB.pickem||"pick";
  if(s==="records")return recordsView();
  if(s==="wrapped"){const R=recordsData();return wrappedView(R)||sec("Wrapped","",`<p class="empty">Wrapped fills in once games are played. Pick a team at the top to see theirs.</p>`);}
  if(s==="trivia"||s==="wham")return sec(s==="trivia"?"Trivia of the day":"Who had more?",s==="trivia"?"One question a day from five seasons of NBA box scores · same question for the whole league":"Pick the player with the higher average · build a streak",`<div class="funbody">${HFUN[s]()}</div>`);
  return pickemView();}

// ---- superlatives for Records: moves, category blowouts, bench points, starts
function superView(R){const nm=x=>esc(teamName(x)),ids=R.ids;if(!ids.length)return "";
  const rows=[];const row=(lab,big,who,sub)=>rows.push(`<tr><td class="nm"><b>${lab}</b></td><td class="num big">${big}</td><td class="nm">${who}${sub?`<small>${sub}</small>`:""}</td></tr>`);
  // pickups: players who joined a roster after the draft / first ESPN snapshot; drops: players who left
  const mv={};ids.forEach(T=>mv[T]={a:0,d:0});Object.values(OWN).forEach(ivs=>ivs.forEach(iv=>{if(!mv[iv.team])return;if(iv.from>0)mv[iv.team].a++;if(iv.to!==Infinity)mv[iv.team].d++;}));
  const byMv=ids.slice().sort((a,b)=>(mv[b].a+mv[b].d)-(mv[a].a+mv[a].d));
  if(mv[byMv[0]].a+mv[byMv[0]].d){row("Most moves",mv[byMv[0]].a+mv[byMv[0]].d,nm(byMv[0]),`${mv[byMv[0]].a} added · ${mv[byMv[0]].d} dropped`);
    const lo=byMv[byMv.length-1];row("Fewest moves",mv[lo].a+mv[lo].d,nm(lo),"set it and forget it");}
  // biggest single-category margin in one matchup
  if(R.weeks.length){let big=null,pc=null,close=null;
    R.weeks.forEach(w=>{const o=R.weeks.find(v=>v.n===w.n&&v.T===w.o);if(!o)return;CATS.forEach(c=>{const d=val(w.t,c)-val(o.t,c);if(d<=0)return;
      if(c[1]==="pct"){if(!pc||d>pc.d)pc={w,c,d};}else{const rel=d/Math.max(1,val(o.t,c));if(!big||rel>big.rel)big={w,c,d,rel};if(!close||d<close.d)close={w,c,d};}});});
    if(big)row("Biggest category blowout",`+${Math.round(big.d)} ${big.c[0]}`,nm(big.w.T),`${weekName(big.w.n)} vs ${nm(big.w.o)} · ${Math.round(val(big.w.t,big.c))} to ${Math.round(val(big.w.t,big.c)-big.d)}`);
    if(pc)row(`Biggest ${pc.c[0]} gap`,`+${(pc.d*100).toFixed(1)}`,nm(pc.w.T),`${weekName(pc.w.n)} vs ${nm(pc.w.o)} · ${pct(val(pc.w.t,pc.c))} vs ${pct(val(pc.w.t,pc.c)-pc.d)}`);
    if(close)row("Closest category win",`by ${Math.round(close.d)} ${close.c[0]}`,nm(close.w.T),`${weekName(close.w.n)} vs ${nm(close.w.o)}`);}
  // bench points and starts
  const bench={},starts={};ids.forEach(T=>{bench[T]=0;starts[T]=0;TEAMS[T].P.forEach(p=>Object.entries(p.d||{}).forEach(([sp,l])=>{sp=+sp;if(!l||sp>=TODAY)return;if(slotOn(p,sp)===12)bench[T]+=l[K.PTS];else if(startedOn(p,sp))starts[T]++;}));});
  const bb=ids.slice().sort((a,b)=>bench[b]-bench[a])[0];if(bench[bb])row("Most points left on the bench",bench[bb],nm(bb),"from players who played while benched");
  const sb=ids.slice().sort((a,b)=>starts[b]-starts[a]);if(starts[sb[0]])row("Most games started",starts[sb[0]],nm(sb[0]),`fewest: ${nm(sb[sb.length-1])} (${starts[sb[sb.length-1]]})`);
  const t=tacoId();if(t)row("Taco holder",`🌮`,nm(t),"last in the standings right now");
  return sec("Superlatives","Fun league awards for this season",rows.length?`<div class="scroll"><table class="lg antable rbt"><tbody>${rows.join("")}</tbody></table></div>`:`<p class="empty">Superlatives fill in as the season goes.</p>`);}

// ---- Matchup tracker: win % and games played through the week
function trkLine(title,labels,A,B,nameA,nameB,o){
  const W=300,H=140,Lm=36,R=44,T=12,Bm=22,n=labels.length,x=i=>Lm+(n===1?(W-Lm-R)/2:(i*(W-Lm-R))/(n-1));
  const all=[...A,...B].filter(v=>v!=null);if(!all.length)return "";const lo=o.lo??0,hi=o.hi??Math.max(1,Math.ceil(Math.max(...all)*1.1));
  const y=v=>T+(H-T-Bm)*(1-(v-lo)/((hi-lo)||1)),fmt=o.fmt||(v=>Math.round(v));
  const line=(vals,cls,who)=>{const pts=vals.map((v,i)=>v==null?null:[x(i),y(v),i]).filter(Boolean),pf=o.projFrom??n;
    const seg=(a)=>a.length>1?`<polyline class="ln ${cls}${cls==="op"?" dash":""}" points="${a.map(p=>p[0]+","+p[1]).join(" ")}"/>`:"";
    const solid=pts.filter(p=>p[2]<=Math.max(0,pf-1)),proj=pts.filter(p=>p[2]>=Math.max(0,pf-1));
    return seg(solid)+(proj.length>1?`<g class="proj">${seg(proj)}</g>`:"")+pts.map(p=>`<circle class="pt ${cls}${p[2]>=pf?" proj":""}" cx="${p[0]}" cy="${p[1]}" r="3.5"><title>${labels[p[2]][1]}: ${esc(who)} ${fmt(vals[p[2]])}${p[2]>=pf?" (projected)":""}</title></circle>`).join("");};
  const ticks=(o.ticks||[lo,(lo+hi)/2,hi]).map(v=>`<line class="gridl" x1="${Lm}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${Lm-6}" y="${y(v)+3}" text-anchor="end">${fmt(v)}</text>`).join("");
  const xl=labels.map((l,i)=>`<text class="ax" x="${x(i)}" y="${H-6}" text-anchor="middle">${l[0]}</text>`).join("");
  const last=v=>{for(let i=v.length-1;i>=0;i--)if(v[i]!=null)return [i,v[i]];return null;},ea=last(A),eb=last(B);
  let yA=ea?y(ea[1]):0,yB=eb?y(eb[1]):0;if(ea&&eb&&Math.abs(yA-yB)<11){const m=(yA+yB)/2,up=yA<=yB;yA=m+(up?-6:6);yB=m+(up?6:-6);}
  const endl=(e,yy,cls)=>e?`<text class="endv ${cls}" x="${x(e[0])+8}" y="${yy+3.5}">${fmt(e[1])}</text>`:"";
  return `<figure class="mini trkx"><figcaption><b>${title}</b><span class="vals num"><span class="vk me"></span><span class="me-t">${ea?fmt(ea[1]):"–"}</span><span class="vk op"></span><span class="op-t">${eb?fmt(eb[1]):"–"}</span></span></figcaption>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${o.mid!=null?`<line class="midl" x1="${Lm}" x2="${W-R}" y1="${y(o.mid)}" y2="${y(o.mid)}"/>`:""}${ticks}${xl}${line(B,"op",nameB)}${line(A,"me",nameA)}${endl(eb,yB,"op")}${endl(ea,yA,"me")}</svg>${o.note?`<p class="trkn">${o.note}</p>`:""}</figure>`;}
function trkExtra(){const me=cur,op=M.opp;if(!TEAMS[me]||!op||!TEAMS[op])return "";
  const rem=(T,after)=>{const r=new Array(11).fill(0);TEAMS[T].P.filter(healthy).forEach(p=>{const pg=pgLine(p.pj);if(!pg)return;DAYS.forEach(sp=>{if(sp>after&&gameOn(p.t,sp)&&startedOn(p,sp))pg.forEach((v,i)=>r[i]+=v);});});return r;};
  const run={me:new Array(11).fill(0),op:new Array(11).fill(0)},lab=[["Start","Before the matchup"]],wa=[],wb=[];
  const p0=winProb({fin:rem(me,DAYS[0]-1)},{fin:rem(op,DAYS[0]-1)});wa.push(p0);wb.push(1-p0);
  DAYS.filter(sp=>sp<TODAY).forEach(sp=>{[["me",me],["op",op]].forEach(([k,T])=>{const d=dayTotals(T,[sp]);if(d)d.forEach((v,i)=>run[k][i]+=v);});
    const end=sp===DAYS[DAYS.length-1],p=winProb({fin:rem(me,sp).map((v,i)=>v+(run.me[i]||0)),done:end},{fin:rem(op,sp).map((v,i)=>v+(run.op[i]||0)),done:end});lab.push([`${dow(sp)[0]}${dateOf(sp).getDate()}`,`After ${dow(sp)} ${dateOf(sp).getDate()}`]);wa.push(p);wb.push(1-p);});
  if(DAYS.some(sp=>sp>=TODAY)){const p=winProb(fcProj(me),fcProj(op));lab.push(["Now","Now (live)"]);wa.push(p);wb.push(1-p);}
  const win=trkLine("Win %",lab,wa,wb,TEAMS[me].name,TEAMS[op].name,{lo:0,hi:1,mid:.5,ticks:[0,.5,1],fmt:v=>Math.round(v*100)+"%",note:"Chance to win the matchup after each day, from the scores so far plus projections for the games left."});
  // starter games: played so far (solid), then projected for the days left (faint)
  const gl=DAYS.map(sp=>[`${dow(sp)[0]}${dateOf(sp).getDate()}`,`${dow(sp)} ${dateOf(sp).getDate()}`]),ga=[],gb=[];let ca=0,cb=0;
  const g=(T,sp)=>sp<TODAY?TEAMS[T].P.filter(p=>startedOn(p,sp)&&p.d?.[sp]).length:TEAMS[T].P.filter(p=>healthy(p)&&gameOn(p.t,sp)&&startedOn(p,sp)&&(sp>TODAY||upcoming(p.t,sp)||p.d?.[sp])).length;
  DAYS.forEach(sp=>{ca+=g(me,sp);cb+=g(op,sp);ga.push(ca);gb.push(cb);});
  const pf=DAYS.findIndex(sp=>sp>=TODAY);
  const gp=trkLine("Games played",gl,ga,gb,TEAMS[me].name,TEAMS[op].name,{projFrom:pf<0?DAYS.length:pf,note:"Starter games so far; the faint part is projected from today's lineups."});
  return win+gp;}
{const _tv=trackerView;trackerView=function(){const h=_tv.apply(this,arguments);const wk=simpleM()||TRK.mode==="week";if(!wk||!h.includes('<div class="minis">'))return h;
  return h.replace('<div class="minis">','<div class="minis">'+trkExtra());};}

// ---- My Team › Season charts
function seasonCharts(){const T=cur;if(!TEAMS[T])return "";const curW=weekOf(Math.min(TODAY,SEASON_END))[0],start=+L.startWeek||1,ns=[];
  for(let n=start;n<=curW;n++)if(WEEKS[n-1][1]<TODAY)ns.push(n);const me=TEAMS[T].name;
  if(!ns.length)return sec("Season charts",esc(me),`<p class="empty">Charts fill in once the first matchup starts.</p>`);
  const ids=Object.keys(TEAMS).map(Number);
  // record each matchup: stacked W/L/T bars
  const recs=ns.map(n=>{const o=opponentIn(T,n),r=o?h2h(wt(T,n),wt(o,n)):[0,0,0];return {n,o,r};}),N=CATS.length;
  const W=300,H=150,Lm=26,Rm=10,Tm=10,Bm=24,bw=Math.min(34,(W-Lm-Rm)/ns.length*.6),x=i=>Lm+(i+.5)*(W-Lm-Rm)/ns.length,y=v=>Tm+(H-Tm-Bm)*(1-v/N);
  const bars=recs.map((r,i)=>{let y0=y(0);const seg=(v,cls,lab)=>{if(!v)return "";const h=y0-y(v)+Tm-Tm;const yy=y0-(y(0)-y(v));const s=`<rect class="rb ${cls}" x="${x(i)-bw/2}" y="${yy}" width="${bw}" height="${y(0)-y(v)}"><title>${weekName(r.n)}: ${v} ${lab}</title></rect>`;y0=yy;return s;};
    return seg(r.r[0],"w","won")+seg(r.r[2],"t","tied")+seg(r.r[1],"l","lost")+`<text class="ax" x="${x(i)}" y="${H-8}" text-anchor="middle">W${r.n}</text>`;}).join("");
  const grid=[0,N/2,N].map(v=>`<line class="gridl" x1="${Lm}" x2="${W-Rm}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${Lm-5}" y="${y(v)+3}" text-anchor="end">${v}</text>`).join("");
  const tot=recs.reduce((s,r)=>s.map((v,i)=>v+r.r[i]),[0,0,0]);
  const recFig=`<figure class="mini screc"><figcaption><b>Categories won each matchup</b><span class="vals num">${tot.join("-")}</span></figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Category record by matchup">${grid}${bars}</svg><p class="trkn"><span class="sk w"></span>won <span class="sk t"></span>tied <span class="sk l"></span>lost</p></figure>`;
  // league rank in each category each matchup (1 = best)
  const rk=ns.map(n=>{const tt=Object.fromEntries(ids.map(id=>[id,wt(id,n)]));return CATS.map(c=>1+ids.filter(id=>val(tt[id],c)>val(tt[T],c)+1e-9).length);});
  const rkTbl=`<div class="scroll"><table class="lg antable heat"><thead><tr><th class="nm">Cat</th>${ns.map(n=>`<th>W${n}</th>`).join("")}</tr></thead><tbody>${CATS.map((c,ci)=>`<tr><td class="nm">${c[0]}</td>${rk.map(r=>`<td class="num" style="${heat(r[ci],ids.length)}">${r[ci]}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const labels=ns.map(n=>[`W${n}`,`Week ${n}${WEEKS[n-1][2]>=TODAY?" (in progress)":""}`]),A=ns.map(n=>weekTotals(T,n)),B=ns.map(n=>leagueAvg(id=>weekTotals(id,n)));
  return sec(`Season charts · ${esc(me)}`,`${ns.length} ${ns.length===1?"matchup":"matchups"} so far · pick another team at the top`,
    `<div class="minis">${recFig}</div><p class="flabel" style="margin:12px 14px 4px">League rank in each category, by matchup (1 = best)</p>${rkTbl}
    <p class="flabel" style="margin:12px 14px 4px">Each category vs the league average, by matchup</p><div class="minis">${miniCharts(labels,A,B,me,"League average",false)}</div>
    <p class="foot-note">From starting-lineup box scores. ${ns.length<3?"Charts get more interesting as the season goes.":""}</p>`);}
function ptChartsTop(){const vd=viewDay(),opp=M.opp&&TEAMS[M.opp]?M.opp:null;
  return (duoOn()?"":ptScore(cur,opp,true))+ptViews([["day",vd===TODAY?"Today":dow(vd)+" "+dateOf(vd).getDate()],["week","Week"],["season","Season"],["proj","Proj"],["sched","Sched"],["charts","Charts"]],"charts","data-ptv");}

// ---- Advanced matchup switch on the scoreboard (was Display › Matchup screen › Hershy)
{const _cb=catBoard;catBoard=function(){const h=_cb.apply(this,arguments);if(!h)return h;const on=MLAY==="hershy";
  return `<div class="advt"><span>Advanced matchup<small>${on?"day columns on each side":"ESPN's board with each day on the edges"}</small></span><button class="advsw" data-advm role="switch" aria-checked="${on}" aria-label="Advanced matchup"><i></i></button></div>`+h;};}
document.addEventListener("click",e=>{if(!e.target.closest("[data-advm]"))return;MLAY=MLAY==="hershy"?"simple":"hershy";try{localStorage.setItem("dfMLay",MLAY);}catch(x){}savePrefs();render();});

// ---- a clear note when this login can't save (view-only sharing)
{const _rb=renderBanner;renderBanner=function(){_rb.apply(this,arguments);if(!WRITE_BLOCKED||!SESSION)return;const b=$("#banner");if(!b||b.querySelector(".wbnote"))return;
  b.insertAdjacentHTML("afterbegin",`<div class="note warn banner wbnote">Your changes aren't saving: this league is shared with you as view-only. Ask the commissioner to share it so you can use it (Share › can use), then reload.</div>`);b.hidden=false;};}
if(SUB.league==="records")SUB.league="score";if(!SUB.pickem)SUB.pickem="pick";
// set the phone-table classes before the chrome un-hides anything: a wide hidden block (the matchup box) shown for a
// moment without them used to widen the page on phones, so the app briefly thought it was on a desktop and kept that layout
{const _rc=renderChrome;renderChrome=function(){if(typeof ptOn==="function"){const on=ptOn();document.body.classList.toggle("ptab",on);document.body.classList.toggle("ptpg",on&&(nav==="team"||nav==="matchup"));}return _rc.apply(this,arguments);};}
