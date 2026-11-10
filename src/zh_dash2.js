
/* ============================================================================
   DASHBOARD 2 (2.30, Arp 2026-11-04: "I need more animations and more useful
   graphs ... give me 20 widgets" + "update the UI to match the New Era flow").
   A small SVG chart kit (line, step, bars, sparkline, ring, radar, heat strip,
   gauge) that draws itself in the first time a tile shows, count-up numbers,
   and 20 more widgets built only from data the app already has. In New Era the
   dashboard gets glass tiles, a dark scoreboard tile, player photos, rise-in
   tiles and a wiggle while editing. Everything respects Reduce Motion.
   ============================================================================ */
const DSEEN=new Set(),DCNT={};       // tiles already drawn this visit (charts animate once), last counted numbers
const dReduce=()=>matchMedia("(prefers-reduced-motion:reduce)").matches;
const dArp=()=>document.documentElement.classList.contains("arp");
const dOpp=T=>{const o=opponentOf(T);return o&&TEAMS[o]?o:0;};
const dDays=()=>DAYS.slice();
const dRound=v=>Math.round(v*10)/10;
const dCount=(v,dec,key)=>`<span class="num" data-dcount="${v}" data-dec="${dec||0}"${key?` data-dk="${esc(key)}"`:""}>${(+v).toFixed(dec||0)}</span>`;
const dFace=(n,t,cls)=>`<span class="dface ${cls||""}" data-fn="${esc(n)}" data-ft="${esc(t||"")}"><i>${esc(n.split(/\s+/).map(w=>w[0]).join("").slice(0,2))}</i></span>`;
const gscore=l=>l[K.PTS]+l[K.REB]+1.4*l[K.AST]+2.2*l[K.STL]+2.2*l[K.BLK]+l[K.TPM];
const fmtC=(c,v)=>c[1]==="pct"?pct(v):Math.round(v);
// season (or projected, before any games) totals per team, for ranks
function dSeason(){const ids=Object.keys(TEAMS).map(Number).filter(x=>TEAMS[x].P.length);
  const any=ids.some(x=>STAND[x]&&STAND[x].vbs&&STAND[x].vbs.some(v=>v));
  const S=Object.fromEntries(ids.map(x=>[x,any?STAND[x].vbs:projSum(activeNames(x))]));return {ids,S,proj:!any};}
const dRanks=(T,{ids,S})=>CATS.map(c=>({c,r:1+ids.filter(y=>val(S[y],c)>val(S[T],c)+1e-9).length,v:val(S[T],c)}));
// the matchup day by day: running totals for both teams, projected finish and win chance after each day
function dMatchDays(T,opp){const days=dDays().filter(sp=>sp<TODAY||(sp===TODAY&&hasDayData(sp)));
  const rem=(id,after)=>{const r=new Array(11).fill(0);TEAMS[id].P.filter(healthy).forEach(p=>{const pg=pgLine(p.pj);if(!pg)return;DAYS.forEach(d=>{if(d>after&&gameOn(p.t,d)&&startedOn(p,d))pg.forEach((v,i)=>r[i]+=v);});});return r;};
  const pts=[{sp:null,a:ZERO(),b:ZERO()}].concat(days.map(sp=>{const ds=DAYS.filter(d=>d<=sp);return {sp,a:dayTotals(T,ds)||ZERO(),b:dayTotals(opp,ds)||ZERO()};}));
  return pts.map(x=>{const after=x.sp==null?DAYS[0]-1:x.sp,ra=rem(T,after),rb=rem(opp,after),A={now:x.a,fin:x.a.map((v,i)=>v+ra[i]),done:false},B={now:x.b,fin:x.b.map((v,i)=>v+rb[i]),done:false};
    return {...x,p:winProb(A,B),w:h2h(x.a,x.b)};});}

/* ---- the chart kit: every chart is an inline SVG; .dd paths draw in, .dg bars grow ---- */
const DCH={
  // lines: series [{v:[...], cls}], ymin..ymax, x labels, an optional dashed reference value
  line(series,{ymin=0,ymax,labels=[],ref,h=120,step=false,fmt=v=>v,dots=true}={}){const W=window.DCH_W||300,P=22,n=Math.max(...series.map(s=>s.v.length)),mx=ymax??Math.max(1,...series.flatMap(s=>s.v));
    const x=i=>P+(n<2?0:i*(W-2*P)/(n-1)),y=v=>h-18-(v-ymin)/((mx-ymin)||1)*(h-30);
    const path=s=>s.v.map((v,i)=>step&&i?`H${x(i).toFixed(1)}V${y(v).toFixed(1)}`:`${i?"L":"M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    return `<svg class="dch" viewBox="0 0 ${W} ${h}" role="img">
      ${ref!=null?`<line class="dref" x1="${P}" x2="${W-P}" y1="${y(ref)}" y2="${y(ref)}"/><text class="dax" x="${W-P}" y="${y(ref)-4}" text-anchor="end">${fmt(ref)}</text>`:""}
      ${series.map(s=>`${s.area?`<path class="dar ${s.cls}" d="${path(s)}L${x(s.v.length-1)},${h-18}L${x(0)},${h-18}Z"/>`:""}<path class="dln dd ${s.cls}" pathLength="1" d="${path(s)}"/>${dots?s.v.map((v,i)=>`<circle class="ddot ${s.cls}${i===s.v.length-1?" last":""}" cx="${x(i)}" cy="${y(v)}" r="${i===s.v.length-1?4:2.4}"/>`).join(""):""}`).join("")}
      ${labels.map((l,i)=>l?`<text class="dax" x="${x(i)}" y="${h-4}" text-anchor="middle">${esc(l)}</text>`:"").join("")}</svg>`;},
  // grouped bars: groups [{l, v:[a,b]}], classes per bar in the group
  bars(groups,{cls=["me","op"],h=120,fmt=v=>Math.round(v)}={}){const W=window.DCH_W||300,P=6,mx=Math.max(1,...groups.flatMap(g=>g.v)),gw=(W-2*P)/Math.max(1,groups.length),bw=Math.min(22,(gw-8)/cls.length);
    return `<svg class="dch" viewBox="0 0 ${W} ${h}" role="img">${groups.map((g,i)=>{const x0=P+i*gw+(gw-bw*cls.length)/2;
      return g.v.map((v,j)=>{const bh=v/mx*(h-34);return `<rect class="dbr dg ${cls[j]}" style="--d:${(i*cls.length+j)*40}ms" x="${x0+j*bw}" y="${h-18-bh}" width="${bw-2}" height="${Math.max(0,bh)}" rx="3"><title>${esc(g.l)}: ${fmt(v)}</title></rect>${v?`<text class="dbv" x="${x0+j*bw+(bw-2)/2}" y="${h-21-bh}" text-anchor="middle">${fmt(v)}</text>`:""}`;}).join("")+`<text class="dax" x="${P+i*gw+gw/2}" y="${h-4}" text-anchor="middle">${esc(g.l)}</text>`;}).join("")}</svg>`;},
  spark(v,{w=90,h=26,cls=""}={}){if(v.length<2)return `<svg class="dsp" viewBox="0 0 ${w} ${h}"></svg>`;const mx=Math.max(...v),mn=Math.min(...v),x=i=>i*(w-4)/(v.length-1)+2,y=a=>h-3-(a-mn)/((mx-mn)||1)*(h-6);
    return `<svg class="dsp" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="dln dd ${cls}" pathLength="1" d="${v.map((a,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${y(a).toFixed(1)}`).join("")}"/><circle class="ddot last ${cls}" cx="${x(v.length-1)}" cy="${y(v[v.length-1])}" r="2.6"/></svg>`;},
  ring(p,{size=84,label=""}={}){const r=36,C=2*Math.PI*r;return `<svg class="dring" viewBox="0 0 84 84" width="${size}" height="${size}" role="img" aria-label="${Math.round(p*100)}%"><circle class="drt" cx="42" cy="42" r="${r}"/><circle class="drv dd ${p>=.5?"up":"down"}" cx="42" cy="42" r="${r}" pathLength="1" style="--p:${p}" transform="rotate(-90 42 42)"/><text x="42" y="45" text-anchor="middle" class="drn">${Math.round(p*100)}%</text>${label?`<text x="42" y="60" text-anchor="middle" class="dax">${esc(label)}</text>`:""}</svg>`;},
  // radar: axes [{l, v 0..1}], a dashed league-average ring at .5
  radar(ax,{size=220}={}){const c=110,R=82,n=ax.length,pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [c+Math.cos(a)*R*v,c+Math.sin(a)*R*v];};
    const poly=vs=>vs.map((v,i)=>pt(i,v).map(z=>z.toFixed(1)).join(",")).join(" ");
    return `<svg class="drad" viewBox="0 0 220 220" width="100%" style="max-width:${size}px" role="img">${[.25,.5,.75,1].map(k=>`<polygon class="drg${k===.5?" avg":""}" points="${poly(ax.map(()=>k))}"/>`).join("")}
      ${ax.map((a,i)=>{const [x,y]=pt(i,1.18);return `<line class="drg" x1="${c}" y1="${c}" x2="${pt(i,1)[0]}" y2="${pt(i,1)[1]}"/><text class="dax" x="${x}" y="${y+3}" text-anchor="middle">${esc(a.l)}</text>`;}).join("")}
      <polygon class="drp me dgrow" points="${poly(ax.map(a=>Math.max(.04,a.v)))}"/>${ax.map((a,i)=>{const [x,y]=pt(i,Math.max(.04,a.v));return `<circle class="ddot me" cx="${x}" cy="${y}" r="3"/>`;}).join("")}</svg>`;},
  gauge(p){const a=Math.PI*(1-p),x=60+Math.cos(a)*44,y=62-Math.sin(a)*44;return `<svg class="dgauge" viewBox="0 0 120 72" role="img" aria-label="Fairness ${Math.round(p*100)}%"><path class="drt" d="M16,62 A44,44 0 0 1 104,62"/><path class="drv dd up" pathLength="1" style="--p:${p}" d="M16,62 A44,44 0 0 1 104,62"/><line class="dndl" x1="60" y1="62" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" style="--r:${(p*180-90).toFixed(1)}deg"/><circle cx="60" cy="62" r="4" class="dhub"/></svg>`;}};

/* ---- 1. win % tracker ---- */
DW.wp={name:"Win % tracker",desc:"Your chance to win this matchup after each day, drawn as a line.",s:"w",
  view(w,T){const opp=dOpp(T);if(!opp)return dashEmpty("No matchup this week.");const D=dMatchDays(T,opp),now=D[D.length-1];
    return `<div class="dkpi"><b class="dbig ${now.p>=.5?"okc":"badc"}">${dCount(Math.round(now.p*100),0,"wp"+T)}%</b><span class="muted">chance to beat ${esc(TEAMS[opp].name)}${D.length>1?`, ${now.p>=D[D.length-2].p?"up":"down"} ${Math.abs(Math.round((now.p-D[D.length-2].p)*100))} since yesterday`:""}</span></div>
      ${DCH.line([{v:D.map(x=>x.p*100),cls:"me",area:true}],{ymin:0,ymax:100,ref:50,labels:D.map(x=>x.sp==null?"Start":dow(x.sp)),fmt:v=>v+"%"})}`;}};
/* ---- 2. category tug-of-war ---- */
DW.tw={name:"Category tug-of-war",desc:"Each category as a rope: the bar leans toward whoever leads it.",s:"s",
  view(w,T){const opp=dOpp(T);if(!opp)return dashEmpty("No matchup this week.");const a=score(T),b=score(opp);
    return `<div class="dtug"><div class="dtugh"><span class="me">${esc(tmInit(T))}</span><span class="op">${esc(tmInit(opp))}</span></div>${CATS.map(c=>{const x=val(a,c),y=val(b,c),s=x+y>0?x/(x+y):.5;
      return `<div class="dtr"><span class="num${x>y?" lead":""}">${fmtC(c,x)}</span><span class="dtb2"><i class="me dg2" style="--w:${(s*100).toFixed(1)}%"></i><i class="op"></i><em>${esc(c[0])}</em></span><span class="num${y>x?" lead":""}">${fmtC(c,y)}</span></div>`;}).join("")}</div>`;}};
/* ---- 3. race chart ---- */
DW.rc={name:"Race chart",desc:"Categories each team is winning after every day of the matchup.",s:"s",
  view(w,T){const opp=dOpp(T);if(!opp)return dashEmpty("No matchup this week.");const D=dMatchDays(T,opp);if(D.length<2)return dashEmpty("The race starts after the first day's games.");
    const l=D[D.length-1].w;return `<div class="dkpi"><b class="dbig num">${l[0]}-${l[1]}-${l[2]}</b><span class="muted">categories now · <i class="dkey me"></i>${esc(tmInit(T))} <i class="dkey op"></i>${esc(tmInit(opp))}</span></div>
      ${DCH.line([{v:D.map(x=>x.w[1]),cls:"op"},{v:D.map(x=>x.w[0]),cls:"me"}],{ymin:0,ymax:CATS.length,step:true,labels:D.map(x=>x.sp==null?"":dow(x.sp).slice(0,2))})}`;}};
/* ---- 4. daily production ---- */
DW.dp={name:"Daily production",desc:"One stat each day, you against your opponent. Pick the stat with ⚙.",s:"w",
  view(w,T){const opp=dOpp(T),k=w.o.k||"PTS",i=K[k==="3PM"?"TPM":k]??K.PTS,days=dDays().filter(sp=>sp<=TODAY);if(!opp)return dashEmpty("No matchup this week.");
    const g=days.map(sp=>({l:dow(sp),v:[(dayTotals(T,[sp])||ZERO())[i],(dayTotals(opp,[sp])||ZERO())[i]]}));
    return `<div class="dkpi"><span class="muted">${esc(k)} by day · <i class="dkey me"></i>${esc(tmInit(T))} <i class="dkey op"></i>${esc(tmInit(opp))}</span></div>${g.some(x=>x.v[0]||x.v[1])?DCH.bars(g):dashEmpty("No games played yet this matchup.")}`;},
  opts(w){return `<p class="muted dsnote">Which stat?</p><div class="tabs sm dsrow" role="group">${["PTS","REB","AST","STL","BLK","3PM"].map(k=>`<button data-dopto="k:${k}" aria-selected="${(w.o.k||"PTS")===k}">${k}</button>`).join("")}</div>`;}};
/* ---- 5. games left ---- */
DW.gl={name:"Games left",desc:"Starter games each day of the matchup for both teams, as a heat strip.",s:"w",
  view(w,T){const opp=dOpp(T);if(!opp)return dashEmpty("No matchup this week.");const days=dDays(),mx=Math.max(1,...days.flatMap(sp=>[onDay(T,sp),onDay(opp,sp)]));
    const row=(id,cls)=>`<div class="dhr"><span class="dhn ${cls}">${esc(tmInit(id))}</span>${days.map((sp,j)=>{const n=onDay(id,sp);return `<span class="dhc ${cls}${sp<TODAY?" past":""}${sp===TODAY?" today":""}" style="--a:${(n/mx).toFixed(2)};--d:${j*45}ms" title="${dow(sp)}: ${n}">${n}</span>`;}).join("")}<b class="num">${gamesLeft(id)}</b></div>`;
    return `<div class="dheat" style="--n:${days.length}"><div class="dhr dhh"><span></span>${days.map(sp=>`<span class="${sp===TODAY?"today":""}">${dow(sp).slice(0,2)}</span>`).join("")}<span>Left</span></div>${row(T,"me")}${row(opp,"op")}</div>
      <p class="dsm muted">${gamesLeft(T)>=gamesLeft(opp)?`You have ${gamesLeft(T)-gamesLeft(opp)} more starter games left.`:`They have ${gamesLeft(opp)-gamesLeft(T)} more starter games left.`}</p>`;}};
/* ---- 6. team radar ---- */
DW.rd={name:"Team radar",desc:"Your team against the league in every category. The dashed ring is league average.",s:"s",
  view(w,T){const S=dSeason(),n=S.ids.length,rk=dRanks(T,S);return `${DCH.radar(rk.map(x=>({l:x.c[0],v:n>1?(n-x.r)/(n-1):.5})))}<p class="dsm muted">${S.proj?"ESPN projections until games are played":"Season so far"} · farther out = better rank</p>`;}};
/* ---- 7. strengths and punts ---- */
DW.sp={name:"Strengths and punts",desc:"Your league rank in each category, best first.",s:"s",
  view(w,T){const S=dSeason(),n=S.ids.length,rk=dRanks(T,S).sort((a,b)=>a.r-b.r);
    return `<div class="drank">${rk.map((x,i)=>`<div class="drk ${x.r<=3?"good":x.r>n-3?"bad":""}"><span>${esc(x.c[0])}</span><span class="drkb"><i class="dg2" style="--w:${((n-x.r+1)/n*100).toFixed(0)}%;--d:${i*50}ms"></i></span><b class="num">${x.r}<small>/${n}</small></b></div>`).join("")}</div>`;}};
/* ---- 8. roster sparklines ---- */
DW.rs={name:"Roster sparklines",desc:"Every player's last 10 games as a sparkline (game score: points, boards, assists, stocks, threes).",s:"w",
  view(w,T,big){const P=dCurP(T).slice().sort((a,b)=>(a.s??20)-(b.s??20)).slice(0,big?16:8);
    return `<ol class="dspk">${P.map(p=>{const d=p.d||{},ks=Object.keys(d).map(Number).filter(sp=>sp<=TODAY).sort((a,b)=>a-b).slice(-10),v=ks.map(sp=>gscore(d[sp])),avg=v.length?v.reduce((s,x)=>s+x,0)/v.length:0,last=v[v.length-1];
      return `<li><span class="dspn">${dashNm(p.n)}<small class="muted">${esc(p.t||"")}</small></span>${DCH.spark(v,{cls:last!=null&&last>=avg?"up":"down"})}<b class="num" title="Last game">${last!=null?Math.round(last):"–"}</b></li>`;}).join("")}</ol>`;}};
/* ---- 9. player of the week ---- */
DW.pw={name:"Player of the week",desc:"Your best player over the last 7 days.",s:"s",
  view(w,T){const best=dCurP(T).map(p=>{const r=recentPG(p.n,7);return r?{p,r,z:zOf(r.pg)}:null;}).filter(Boolean).sort((a,b)=>b.z-a.z)[0];if(!best)return dashEmpty("No games in the last 7 days.");
    const pg=best.r.pg,st=[["PTS",K.PTS],["REB",K.REB],["AST",K.AST],["STL",K.STL],["BLK",K.BLK],["3PM",K.TPM]];
    return `<div class="dpow">${dFace(best.p.n,best.p.t,"xl")}<div><b class="dpown">${dashNm(best.p.n)}</b><small class="muted">${esc(best.p.t)} · ${best.r.g} game${best.r.g>1?"s":""} · last 7 days</small></div></div>
      <div class="dpst">${st.map(([l,i])=>`<span><b>${dCount(dRound(pg[i]),1)}</b><small>${l}</small></span>`).join("")}</div>`;}};
/* ---- 10. hot and cold ---- */
DW.hc={name:"Hot and cold",desc:"Your players beating or missing their ESPN projection over the last 7 days.",s:"s",
  view(w,T){const xs=TEAMS[T].P.filter(p=>ownerNow(p.n)===T).map(p=>{const r=recentPG(p.n,7),pj=pgLine(p.pj);return r&&pj?{p,d:zOf(r.pg)-zOf(pj),r}:null;}).filter(Boolean);if(!xs.length)return dashEmpty("Not enough games yet.");
    const hot=xs.slice().sort((a,b)=>b.d-a.d).filter(x=>x.d>0).slice(0,3),cold=xs.slice().sort((a,b)=>a.d-b.d).filter(x=>x.d<0).slice(0,3);
    const li=(x,up)=>`<li><span class="dhcz ${up?"up":"down"}">${up?"▲":"▼"}</span><span>${dashNm(x.p.n)}<br><small class="muted num">${pra(x.r.pg)}</small></span><b class="num ${up?"okc":"badc"}">${up?"+":""}${x.d.toFixed(1)}</b></li>`;
    return `<ol class="dhcl">${hot.map(x=>li(x,true)).join("")}${cold.map(x=>li(x,false)).join("")}</ol><p class="dsm muted">Value vs projection (z-score), last 7 days</p>`;}};
/* ---- 11. ESPN rising and falling ---- */
DW.et={name:"ESPN rising and falling",desc:"Players being added or dropped most across ESPN leagues. ⚙ for free agents only.",s:"s",
  view(w,T,big){const own=NBA&&NBA.own;if(!own)return dashEmpty("Loads with the next ESPN pull.");const fa=w.o.fa;
    const all=Object.entries(own).map(([n,o])=>({n,ch:o[1],po:o[0],o:ownerNow(n)})).filter(x=>!fa||!x.o),k=big?5:3;
    const up=all.filter(x=>x.ch>0).sort((a,b)=>b.ch-a.ch).slice(0,k),dn=all.filter(x=>x.ch<0).sort((a,b)=>a.ch-b.ch).slice(0,k),mx=Math.max(1,...up.concat(dn).map(x=>Math.abs(x.ch)));
    const li=(x,i)=>`<li><span>${dashNm(x.n)}<small class="muted"> ${x.o?esc(tmInit(x.o)):"FA"} · ${x.po.toFixed(0)}%</small></span><span class="detb ${x.ch>0?"up":"down"}"><i class="dg2" style="--w:${(Math.abs(x.ch)/mx*100).toFixed(0)}%;--d:${i*50}ms"></i></span><b class="num ${x.ch>0?"okc":"badc"}">${x.ch>0?"+":""}${x.ch.toFixed(1)}</b></li>`;
    return `<ol class="detl">${up.map(li).join("")}</ol><ol class="detl">${dn.map(li).join("")}</ol>`;},
  opts(w){return `<p class="muted dsnote">Show</p><div class="tabs sm dsrow" role="group"><button data-dopto="fa:" aria-selected="${!w.o.fa}">All players</button><button data-dopto="fa:1" aria-selected="${!!w.o.fa}">Free agents only</button></div>`;}};
/* ---- 12. streaming calendar ---- */
DW.sm={name:"Streaming calendar",desc:"Free agents who could fill an open starting spot on your remaining days. ● = fits an open spot, ○ = plays but no spot.",s:"w",
  view(w,T,big){const days=dDays().filter(sp=>sp>=TODAY&&upcomingDay(sp));if(!days.length)return dashEmpty("No days left in this matchup.");
    const fa=Object.values(DIR).filter(D=>!ownerNow(D.n)&&INJ[D.n]!=="OUT").map(D=>{const r=recentPG(D.n,14);const fit=days.filter(sp=>gameOn(D.t,sp)&&openFit(T,sp,D.el));return r&&fit.length?{D,z:zOf(r.pg),fit,r}:null;}).filter(Boolean).sort((a,b)=>b.fit.length-a.fit.length||b.z-a.z).slice(0,big?8:5);
    if(!fa.length)return dashEmpty("Your lineup has no open spots the free agents could fill.");
    return `<div class="dcal" style="--n:${days.length}"><span></span>${days.map(sp=>`<span class="dch2${sp===TODAY?" today":""}">${dow(sp).slice(0,2)}</span>`).join("")}
      ${fa.map(x=>`<span class="dcn">${dashNm(x.D.n)}<small class="muted">${esc(x.D.t)}</small></span>${days.map(sp=>`<span class="dcc">${x.fit.includes(sp)?'<i class="on" title="Fits an open spot"></i>':gameOn(x.D.t,sp)?'<i class="off" title="Plays, but no open spot"></i>':""}</span>`).join("")}`).join("")}</div>${dashGo("analytics","main","Streaming planner")}`;}};
const upcomingDay=sp=>sp>TODAY||!hasDayData(sp)||Object.keys(SCHED).some(t=>SCHED[t][sp]&&!finalToday(t));
/* ---- 13. trade idea ---- */
let DTI_K="",DTI=null;
DW.ti={name:"Trade idea",desc:"The fairest 1-for-1 trade that helps both teams, with a fairness gauge.",s:"s",
  view(w,T){const k=T+":"+TODAY+":"+TXLOG.length;if(k!==DTI_K){DTI_K=k;try{DTI=findTrades(T,1)[0]||null;}catch(e){DTI=null;}}const t=DTI;if(!t)return dashEmpty("No fair trades found right now.");
    const fair=Math.max(0,Math.min(1,Math.min(t.a,t.b)/Math.max(t.a,t.b,1e-9)));
    return `<div class="dti"><div class="dtis"><small class="muted">You give</small>${t.give.map(dashNm).join("<br>")}</div><span class="dtix">⇄</span><div class="dtis"><small class="muted">You get</small>${t.get.map(dashNm).join("<br>")}</div></div>
      <div class="dtig">${DCH.gauge(fair)}<span><b>${Math.round(fair*100)}% fair</b><br><small class="muted">with ${esc(teamName(t.O))} · both teams improve</small></span></div>${dashGo("analytics","main","Trade finder")}`;}};
/* ---- 14. playoff race ---- */
DW.pr={name:"Playoff race",desc:"Your standings rank after each week, against the playoff line.",s:"w",
  view(w,T){const ids=Object.keys(TEAMS).map(Number),rec=Object.fromEntries(ids.map(x=>[x,[0,0,0]])),hist=[],P=Math.min(+L.playoffTeams||4,ids.length);
    for(let n=1;n<=regWeeks();n++){if(!weekDone(n))break;(W[n]||[]).forEach(([a,b])=>{const r=weekRec(h2h(wt(a,n),wt(b,n)));[0,1,2].forEach(i=>{rec[a][i]+=r[i];rec[b][i]+=r[i===2?2:1-i];});});
      const o=ids.slice().sort((x,y)=>pctW(rec[y])-pctW(rec[x])||rec[y][0]-rec[x][0]);hist.push(o.indexOf(T)+1);}
    const o=standOrder(),me=o.indexOf(T)+1,cut=o[P-1],gb=me<=P?0:(STAND[cut].rec[0]-STAND[T].rec[0]);
    return `<div class="dkpi"><b class="dbig num">#${me}</b><span class="muted">${me<=P?`in a playoff spot (top ${P})`:`${gb} category win${gb===1?"":"s"} behind #${P}`}</span></div>
      ${hist.length?DCH.line([{v:hist.map(r=>ids.length+1-r),cls:"me"}],{ymin:1,ymax:ids.length,ref:ids.length+1-P,labels:hist.map((x,i)=>"W"+(i+1)),fmt:()=>"playoff line"}):dashEmpty("The chart starts after the first matchup ends.")}`;}};
/* ---- 15. strength of schedule ---- */
DW.ss={name:"Strength of schedule",desc:"Your next 3 opponents and how strong they are (power rank).",s:"s",
  view(w,T){let pr=[];try{pr=powerRows();}catch(e){}const rk=x=>pr.findIndex(r=>r.x===x)+1,n=pr.length||Object.keys(TEAMS).length,out=[];
    for(let k=wk[0];k<=CAL.length&&out.length<3;k++){const m=(W[k]||[]).find(([a,b])=>a===T||b===T);if(!m)continue;const o=m[0]===T?m[1]:m[0];out.push({k,o});}
    if(!out.length)return dashEmpty("No matchups left.");
    return `<ol class="dssl">${out.map((x,i)=>{const r=rk(x.o),lvl=r&&r<=n/3?"hard":r&&r>2*n/3?"easy":"mid";return `<li style="--d:${i*80}ms"><small class="muted">${esc(weekName(x.k))}${x.k===wk[0]?" · now":""}</small><b>${esc(teamName(x.o))}</b><span class="dsch ${lvl}">${r?`#${r} power`:""} · ${lvl==="hard"?"Tough":lvl==="easy"?"Easier":"Even"}</span></li>`;}).join("")}</ol>`;}};
/* ---- 16. rivalry ---- */
DW.rv={name:"Rivalry",desc:"Your head-to-head record against one team. Pick the team with ⚙.",s:"s",
  view(w,T){const x=+w.o.t||dOpp(T)||Object.keys(TEAMS).map(Number).find(y=>y!==T);if(!TEAMS[x]||x===T)return dashEmpty("Pick a team with ⚙.");
    const c=[0,0,0],m=[0,0,0],games=[];for(let n=1;n<=regWeeks();n++){if(!weekDone(n))break;(W[n]||[]).forEach(([a,b])=>{if(!((a===T&&b===x)||(a===x&&b===T)))return;const r=h2h(wt(T,n),wt(x,n));[0,1,2].forEach(i=>c[i]+=r[i]);m[r[0]>r[1]?0:r[0]<r[1]?1:2]++;games.push({n,r});});}
    const tot=c[0]+c[1]||1;return `<div class="drv2"><span class="me"><b class="dbig num">${m[0]}</b><small>${esc(tmInit(T))}</small></span><span class="muted">matchups<br>${m[2]?`${m[2]} tied`:""}</span><span class="op"><b class="dbig num">${m[1]}</b><small>${esc(tmInit(x))}</small></span></div>
      <div class="dsplit"><i class="me dg2" style="--w:${(c[0]/tot*100).toFixed(0)}%"></i><i class="op"></i></div><p class="dsm muted">Categories ${c.join("-")} vs ${esc(teamName(x))}</p>
      ${games.length?`<ol class="dlist">${games.slice(-3).reverse().map(g=>`<li><span>${esc(weekName(g.n))}</span><b class="num ${g.r[0]>g.r[1]?"okc":g.r[0]<g.r[1]?"badc":""}">${g.r.join("-")}</b></li>`).join("")}</ol>`:dashEmpty("You haven't played them yet this season.")}`;},
  opts(w){return `<p class="muted dsnote">Rival team</p><div class="tabs sm dsrow" role="group" style="flex-wrap:wrap">${Object.keys(TEAMS).map(Number).filter(x=>x!==dashT()).map(x=>`<button data-dopto="t:${x}" aria-selected="${+w.o.t===x}">${esc(TEAMS[x].name)}</button>`).join("")}</div>`;}};
/* ---- 17. weekly awards ---- */
DW.aw={name:"Weekly awards",desc:"The awards from the last finished matchup. Confetti if one is yours.",s:"s",
  view(w,T){let n=0;for(let k=1;k<=CAL.length;k++)if(weekDone(k))n=k;const a=n?weekAwards(n):null;if(!a)return dashEmpty("Awards are handed out when the first matchup ends.");
    const me=TEAMS[T].name,mine=a.some(([,,v])=>String(v).includes(me));
    return `<p class="dsm muted">${esc(weekName(n))}</p><ul class="dawl${mine?" mine":""}">${a.map(([i,t,v],j)=>`<li class="${String(v).includes(me)?"you":""}" style="--d:${j*90}ms"><span class="dawi">${i}</span><span><b>${esc(t)}</b><small>${esc(v)}</small></span></li>`).join("")}</ul>${mine?'<span class="dconf" aria-hidden="true">'+Array.from({length:14},(_,i)=>`<i style="--i:${i}"></i>`).join("")+"</span>":""}`;}};
/* ---- 18. injury tracker ---- */
DW.ij={name:"Injury tracker",desc:"Your injured players and when ESPN expects them back, on a 4-week timeline.",s:"s",
  view(w,T){const P=dCurP(T).filter(p=>p.st&&p.st!=="ACTIVE");if(!P.length)return `<p class="dempty okc">✓ Everyone is healthy.</p>`;
    const now=Date.now(),span=28*864e5;
    return `<ol class="dinjl">${P.map(p=>{const ij=injOf(p.n)||{},r=ij.r?new Date(ij.r+"T12:00:00").getTime():null,fr=r?Math.max(.03,Math.min(1,(r-now)/span)):null,k=outKind(p.n);
      return `<li><span>${dashNm(p.n)} ${stTag(p.n,p.st)}<br><small class="muted">${esc(ij.t||outWhy(p.n)||"")}${r?` · back ${retTxt(ij.r)}`:k==="ofs"?" · out for the season":""}</small></span><span class="dinb ${k||"dtd"}"><i class="dg2" style="--w:${fr==null?(k==="ofs"?100:12):(fr*100).toFixed(0)}%"></i></span></li>`;}).join("")}</ol><p class="dsm muted">Bar = time until the expected return (full bar = 4+ weeks)</p>`;}};
/* ---- 19. waiver wire feed ---- */
let DWF_SEEN=0;
DW.wf={name:"Waiver wire feed",desc:"The league's latest adds, drops and trades. New moves slide in.",s:"s",
  view(w,T,big){const xs=TXLOG.filter(t=>t.ok!==false).slice(-(big?8:5)).reverse();if(!xs.length)return dashEmpty("No moves yet this season.");
    const seen=DWF_SEEN;DWF_SEEN=Math.max(DWF_SEEN,...xs.map(t=>t.eff||t.at||0));
    return `<ol class="dwfl">${xs.map(t=>{const at=t.eff||t.at||0,cls=seen&&at>seen?" new":"";
      return t.type==="trade"?`<li class="tr${cls}"><span class="dwft">⇄</span><span><b>${esc(teamName(t.from))}</b> and <b>${esc(teamName(t.to))}</b> traded<br><small class="muted">${t.give.map(esc).join(", ")} for ${t.get.map(esc).join(", ")}${at?` · ${ago(at)}`:""}</small></span></li>`
        :`<li class="${t.add?"ad":"dr"}${cls}"><span class="dwft">${t.add?"+":"−"}</span><span><b>${esc(teamName(t.team))}</b>${t.add?` added ${dashNm(t.add)}`:""}${t.drop?`${t.add?",":""} dropped ${dashNm(t.drop)}`:""}<br><small class="muted">${at?ago(at):""}</small></span></li>`;}).join("")}</ol>${dashGo("league","tx","Transactions")}`;}};
/* ---- 20. tip-off countdown ---- */
function dTip(sp,t){const g=gameOn(t,sp);if(!g||g[2]==null)return null;const d=dateOf(sp);return etMs(d.getFullYear(),d.getMonth(),d.getDate(),0)+g[2]*6e4;}
DW.cd={name:"Tip-off countdown",desc:"A live clock to your next player's tip-off (when that lineup spot locks), with tonight's games.",s:"s",
  view(w,T){const now=Date.now();let next=null;
    for(const sp of [TODAY,TODAY+1,TODAY+2]){TEAMS[T].P.filter(p=>startedOn(p,sp)||sp>TODAY).forEach(p=>{const tip=dTip(sp,p.t);if(tip&&tip>now&&(!next||tip<next.tip))next={tip,p,sp};});if(next)break;}
    const tg=Object.entries(SCHED).filter(([,d])=>d[TODAY]&&d[TODAY][1]).length,live=LIVE?Object.values(LIVE.g).filter(g=>g.s==="in").length/2:0,mine=TEAMS[T].P.filter(p=>gameOn(p.t,TODAY)&&startedOn(p,TODAY)).length;
    return `${next?`<div class="dcd"><small class="muted">${esc(next.p.n)} (${esc(next.p.t)}) tips off ${next.sp===TODAY?"today":dow(next.sp)} in</small><b class="dclock num" data-dtick="${next.tip}">--:--:--</b></div>`:`<p class="dempty">No more tip-offs for your players in the next 2 days.</p>`}
      <ul class="dstat"><li><b class="num">${tg}</b><span>NBA games today</span></li><li class="${live?"hot":""}"><b class="num">${Math.round(live)}</b><span>${live?'<i class="dlive"></i>':""}live now</span></li><li><b class="num">${mine}</b><span>of your starters play</span></li></ul>`;}};
// the ticking clocks
setInterval(()=>{const ts=document.querySelectorAll("[data-dtick]");if(!ts.length)return;const now=Date.now();ts.forEach(e=>{let s=Math.max(0,Math.round((+e.dataset.dtick-now)/1000));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;e.textContent=s?`${h}:${String(m).padStart(2,"0")}:${String(x).padStart(2,"0")}`:"Tip-off!";});},1000);

// the default dashboard for anyone who hasn't arranged theirs: the starters plus the best of the new ones
DASH_DEF.splice(0,DASH_DEF.length,["mu","w"],["wp","w"],["lu","s"],["tw","s"],["gl","w"],["tr","s"],["nw","w"],["rd","s"],["pw","s"],["fa","s"],["st","s"],["gm","w"],["wl","s"],["ch","s"],["cd","s"]);
// a widget's own options: generic key:value buttons
document.addEventListener("click",e=>{const b=e.target.closest("[data-dopto]");if(!b||!prefKey())return;const id=b.closest("[data-doptid]")?.dataset.doptid;if(!id)return;const [k,v]=b.dataset.dopto.split(":");
  const w=dashW().map(x=>x.id===id?{...x,o:{...x.o,[k]:v}}:x);dashSet(w);dashOpts(id);dashDraw();});

/* ---- after each draw: photos (New Era), count-ups, first-time chart animation ---- */
function dashAfter(){const g=$("#dgrid");if(!g)return;const arp=dArp(),red=dReduce();
  g.querySelectorAll(".dtile[data-dw]").forEach((t,i)=>{const id=t.dataset.dw;if(!DSEEN.has(id)){t.classList.add("dfirst");t.style.setProperty("--i",i);DSEEN.add(id);}});
  if(arp&&typeof arpFace==="function")g.querySelectorAll(".dface[data-fn]").forEach(s=>{try{const f=arpFace(s.dataset.fn,s.dataset.ft,s.className.replace("dface","").trim());s.replaceWith(f);}catch(e){}});
  g.querySelectorAll("[data-dcount]").forEach(e=>{const to=+e.dataset.dcount,dec=+e.dataset.dec||0,k=e.dataset.dk||null,from=k&&DCNT[k]!=null?DCNT[k]:(e.closest(".dfirst")?0:to);if(k)DCNT[k]=to;
    if(red||from===to)return;const t0=performance.now(),dur=900;const step=t=>{const p=Math.min(1,(t-t0)/dur),q=1-Math.pow(1-p,3);e.textContent=(from+(to-from)*q).toFixed(dec);if(p<1)requestAnimationFrame(step);};requestAnimationFrame(step);});}
{const _rr=renderRosters;renderRosters=function(){const r=_rr.apply(this,arguments);if(nav==="dash")try{dashAfter();}catch(e){}return r;};}
{const _sn=setNav;setNav=function(n){if(n==="dash"&&nav!=="dash")DSEEN.clear();return _sn.apply(this,arguments);};}

{const s=document.createElement("style");s.textContent=`
/* chart kit */
.dch{width:100%;height:auto;display:block;overflow:visible}
.dch .dax,.drad .dax,.dring .dax{font-size:9px;fill:var(--muted);font-family:var(--f-body,system-ui)}
.dref{stroke:var(--muted);stroke-dasharray:3 3;stroke-width:1;opacity:.6}
.dln{fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;stroke:var(--accent)}
.dln.op{stroke:var(--s-op,#e2701f)}.dln.down{stroke:var(--loss,#c62828)}.dln.up{stroke:var(--win,#1a7f37)}
.dar{fill:color-mix(in srgb,var(--accent) 14%,transparent);stroke:none}
.ddot{fill:var(--accent)}.ddot.op{fill:var(--s-op,#e2701f)}.ddot.down{fill:var(--loss,#c62828)}.ddot.up{fill:var(--win,#1a7f37)}
.ddot.last{stroke:var(--surface);stroke-width:2}
.dtile:not(.dfirst) .ddot.last{animation:dpulse 2.4s ease-in-out infinite}
.dbr{fill:var(--accent)}.dbr.op{fill:var(--s-op,#e2701f)}.dbv{font-size:8.5px;fill:var(--muted);font-weight:700}
.dsp{width:90px;height:26px;flex:none}
.dring .drt,.dgauge .drt{fill:none;stroke:var(--chip,#e8e8ee);stroke-width:8}
.dring .drv,.dgauge .drv{fill:none;stroke-width:8;stroke-linecap:round;stroke:var(--accent);stroke-dasharray:var(--p) 1}
.dring .drv.down{stroke:var(--loss,#c62828)}.drn{font-size:17px;font-weight:800;fill:var(--ink)}
.dgauge{width:120px;height:72px;flex:none}.dgauge .drv{stroke:var(--win,#1a7f37)}.dndl{stroke:var(--ink);stroke-width:2.5;stroke-linecap:round}.dhub{fill:var(--ink)}
.drad{display:block;margin:0 auto}.drg{fill:none;stroke:var(--line);stroke-width:1}.drg.avg{stroke:var(--muted);stroke-dasharray:3 3}
.drp{fill:color-mix(in srgb,var(--accent) 28%,transparent);stroke:var(--accent);stroke-width:2;transform-origin:110px 110px}
/* draw-in, only the first time a tile shows this visit */
.dfirst .dd{stroke-dasharray:1;stroke-dashoffset:1;animation:ddraw 1.1s cubic-bezier(.3,.7,.2,1) .15s forwards}
.dfirst .dring .drv.dd,.dfirst .dgauge .drv.dd{stroke-dasharray:var(--p) 1;stroke-dashoffset:var(--p);animation:dringin 1.1s cubic-bezier(.3,.7,.2,1) .15s forwards}
.dfirst .dg{transform-box:fill-box;transform-origin:bottom;animation:dgrow .7s cubic-bezier(.3,.7,.2,1) both;animation-delay:var(--d,0ms)}
.dfirst .dgrow{animation:dradin .9s cubic-bezier(.3,.7,.2,1) both}
.dg2{width:var(--w);transition:width .6s cubic-bezier(.3,.7,.2,1)}
.dfirst .dg2{animation:dbarin .8s cubic-bezier(.3,.7,.2,1) both;animation-delay:var(--d,0ms)}
.dfirst .dndl{transform-origin:60px 62px;animation:dneedle 1.2s cubic-bezier(.3,1.4,.4,1) both}
@keyframes ddraw{to{stroke-dashoffset:0}}
@keyframes dringin{from{stroke-dasharray:0 1}to{stroke-dasharray:var(--p) 1;stroke-dashoffset:0}}
@keyframes dgrow{from{transform:scaleY(0)}}
@keyframes dradin{from{transform:scale(.2);opacity:0}}
@keyframes dbarin{from{width:0}}
@keyframes dneedle{from{transform:rotate(calc(-90deg - var(--r)))}}
@keyframes dpulse{50%{r:6;opacity:.7}}
/* widgets */
.dkpi{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.dkpi .muted{font-size:.8rem}
.dkey{display:inline-block;width:10px;height:3px;border-radius:2px;background:var(--accent);vertical-align:middle;margin:0 3px 0 6px}.dkey.op{background:var(--s-op,#e2701f)}
.dtug{display:flex;flex-direction:column;gap:5px}.dtugh{display:flex;justify-content:space-between;font-size:.72rem;font-weight:800}.dtugh .me{color:var(--accent)}.dtugh .op{color:var(--s-op,#e2701f)}
.dtr{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:6px;font-size:.78rem}.dtr>span:last-child{text-align:right}.dtr .lead{font-weight:800}
.dtb2{position:relative;display:flex;height:16px;border-radius:8px;overflow:hidden;background:color-mix(in srgb,var(--s-op,#e2701f) 70%,transparent)}
.dtb2 i.me{background:var(--accent);height:100%;border-right:2px solid var(--surface)}.dtb2 i.op{flex:1}
.dtb2 em{position:absolute;inset:0;display:grid;place-items:center;font-style:normal;font-size:.62rem;font-weight:800;color:#fff;letter-spacing:.04em;text-shadow:0 1px 2px rgba(0,0,0,.35)}
.dheat{display:flex;flex-direction:column;gap:4px;font-size:.75rem}
.dhr{display:grid;grid-template-columns:34px repeat(var(--n,7),1fr) 34px;gap:4px;align-items:center}
.dhh span{text-align:center;color:var(--muted);font-weight:700}.dhh span.today{color:var(--accent)}
.dhn{font-weight:800}.dhn.me{color:var(--accent)}.dhn.op{color:var(--s-op,#e2701f)}
.dhc{display:grid;place-items:center;height:28px;border-radius:7px;font-weight:800;background:color-mix(in srgb,var(--accent) calc(var(--a)*80%),var(--chip,#eef))}
.dhc.op{background:color-mix(in srgb,var(--s-op,#e2701f) calc(var(--a)*80%),var(--chip,#eef))}.dhc.past{opacity:.45}.dhc.today{outline:2px solid var(--ink);outline-offset:1px}
.dfirst .dhc{animation:dpop .45s cubic-bezier(.3,1.5,.5,1) both;animation-delay:var(--d)}
@keyframes dpop{from{transform:scale(.4);opacity:0}}
.dhr>b{text-align:center}
.drank{display:flex;flex-direction:column;gap:5px}.drk{display:grid;grid-template-columns:40px 1fr 40px;gap:8px;align-items:center;font-size:.8rem;font-weight:700}
.drkb{height:10px;border-radius:5px;background:var(--chip,#eef);overflow:hidden}.drkb i{display:block;height:100%;background:var(--muted);border-radius:5px}
.drk.good .drkb i{background:var(--win,#1a7f37)}.drk.bad .drkb i{background:var(--loss,#c62828)}.drk b{text-align:right}.drk small{color:var(--muted);font-weight:500}
.dspk{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px 18px}
.dspk li{display:flex;align-items:center;gap:10px;font-size:.84rem}.dspn{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}.dspn .dnm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dspk b{width:26px;text-align:right}
.dpow{display:flex;align-items:center;gap:12px}.dpown{font-size:1.1rem}.dpow>div{display:flex;flex-direction:column}
.dface{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:var(--accent-wash);color:var(--accent);font-weight:800;flex:none}
.dpst{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}.dpst span{display:flex;flex-direction:column;align-items:center;padding:6px 2px;border-radius:9px;background:var(--chip,#f1f1f5)}.dpst b{font-size:1.05rem}.dpst small{font-size:.66rem;color:var(--muted);font-weight:700}
.dhcl,.detl,.dinjl,.dwfl,.dssl,.dawl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.dhcl li{display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:center;font-size:.85rem}
.dhcz{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;font-size:.7rem;color:#fff;background:var(--win,#1a7f37)}.dhcz.down{background:var(--loss,#c62828)}
.dfirst .dhcz{animation:dbounce .7s cubic-bezier(.3,1.6,.5,1) both}
@keyframes dbounce{from{transform:translateY(-10px) scale(.5);opacity:0}}
.detl li{display:grid;grid-template-columns:1fr 60px 44px;gap:8px;align-items:center;font-size:.84rem}.detl+.detl{border-top:1px solid var(--line);padding-top:7px}
.detb{height:8px;border-radius:4px;background:var(--chip,#eef);overflow:hidden}.detb i{display:block;height:100%;border-radius:4px;background:var(--win,#1a7f37)}.detb.down i{background:var(--loss,#c62828)}.detl b{text-align:right}
.dcal{display:grid;grid-template-columns:minmax(110px,1.6fr) repeat(var(--n),1fr);gap:4px 4px;align-items:center;font-size:.8rem}
.dch2{text-align:center;font-weight:700;color:var(--muted);font-size:.72rem}.dch2.today{color:var(--accent)}
.dcn{display:flex;flex-direction:column;min-width:0}.dcn .dnm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dcc{display:grid;place-items:center;height:22px}.dcc i{width:12px;height:12px;border-radius:50%}.dcc i.on{background:var(--win,#1a7f37)}.dcc i.off{border:2px solid var(--muted);opacity:.5}
.dfirst .dcc i{animation:dpop .4s cubic-bezier(.3,1.5,.5,1) both}
.dti{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;font-size:.86rem}.dtis{display:flex;flex-direction:column;gap:2px}.dtis:last-child{text-align:right}.dtix{font-size:1.4rem;color:var(--accent)}
.dtig{display:flex;align-items:center;gap:10px;font-size:.85rem}
.dssl li{display:flex;flex-direction:column;padding:8px 10px;border-radius:10px;background:var(--chip,#f1f1f5)}
.dfirst .dssl li{animation:drise .5s ease both;animation-delay:var(--d)}
.dsch{font-size:.75rem;font-weight:700}.dsch.hard{color:var(--loss,#c62828)}.dsch.easy{color:var(--win,#1a7f37)}.dsch.mid{color:var(--muted)}
.drv2{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;text-align:center;font-size:.78rem}.drv2>span{display:flex;flex-direction:column}.drv2 .me b{color:var(--accent)}.drv2 .op b{color:var(--s-op,#e2701f)}
.dsplit{display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--s-op,#e2701f)}.dsplit i.me{background:var(--accent);border-right:2px solid var(--surface)}
.dawl li{display:flex;gap:10px;align-items:center;font-size:.84rem;padding:5px 8px;border-radius:10px}.dawl li.you{background:var(--accent-wash)}
.dawl li>span:last-child{display:flex;flex-direction:column}.dawi{font-size:1.4rem;width:30px;text-align:center}
.dfirst .dawl li{animation:dflip .6s cubic-bezier(.3,1.3,.5,1) both;animation-delay:var(--d);transform-origin:top}
@keyframes dflip{from{transform:rotateX(-90deg);opacity:0}}
.dconf{position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:inherit}
.dconf i{position:absolute;top:-8px;left:calc(var(--i)*7%);width:7px;height:11px;border-radius:2px;background:hsl(calc(var(--i)*47),85%,58%);animation:dfall 2.4s cubic-bezier(.3,.6,.5,1) calc(var(--i)*70ms) 2 both}
@keyframes dfall{to{transform:translateY(340px) rotate(540deg);opacity:0}}
.dinjl li{display:grid;grid-template-columns:1fr 80px;gap:10px;align-items:center;font-size:.84rem}
.dinb{height:9px;border-radius:5px;background:var(--chip,#eef);overflow:hidden}.dinb i{display:block;height:100%;border-radius:5px;background:var(--loss,#c62828)}.dinb.non i{background:var(--muted)}.dinb.dtd i{background:#e0a100}
.dwfl li{display:grid;grid-template-columns:24px 1fr;gap:8px;font-size:.84rem;align-items:start}
.dwft{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;font-weight:800;color:#fff;background:var(--win,#1a7f37)}.dwfl .dr .dwft{background:var(--loss,#c62828)}.dwfl .tr .dwft{background:var(--accent)}
.dwfl li.new{animation:dslide .6s cubic-bezier(.3,1.2,.5,1) both}@keyframes dslide{from{transform:translateX(-24px);opacity:0}}
.dcd{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center}.dclock{font-size:2.2rem;font-weight:800;letter-spacing:.02em}
.dlive{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--loss,#c62828);margin-right:4px;animation:dblink 1.2s ease-in-out infinite}@keyframes dblink{50%{opacity:.25}}
@keyframes drise{from{transform:translateY(14px);opacity:0}}
/* tiles rise in one after another */
.dtile.dfirst{animation:drise .55s cubic-bezier(.3,.7,.2,1) both;animation-delay:calc(var(--i,0)*45ms)}
@media (max-width:640px){.dpst{grid-template-columns:repeat(3,1fr)}}

/* ---- New Era: glass tiles, dark scoreboard, wiggle while editing ---- */
html.arp .dhead h2{font-family:var(--f-body);font-weight:800;letter-spacing:-.02em;text-transform:none;font-size:1.9rem}
html.arp .dtile{border-color:transparent;border-radius:var(--r3,22px);box-shadow:var(--lift);background:color-mix(in srgb,var(--surface) 88%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4)}
html.arp .dtile::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}
html.arp.nbat .dtile{border-top:3px solid var(--accent)}
html.arp .dth h3{font-family:var(--f-body);text-transform:none;letter-spacing:-.005em;font-size:.95rem;font-weight:750;color:var(--ink)}
html.arp .dtile[data-dw]:hover{box-shadow:var(--lift),0 14px 34px -18px color-mix(in srgb,var(--accent) 60%,transparent)}
html.arp .dtile:has(.dmu){background:linear-gradient(150deg,var(--board,#121a2b),var(--board2,#1b2540));color:#fff}
html.arp .dtile:has(.dmu) h3,html.arp .dtile:has(.dmu) .muted,html.arp .dtile:has(.dmu) small{color:rgba(255,255,255,.72)}
html.arp .dtile:has(.dmu) .dmsc b{font-size:2.2rem;color:#fff}
html.arp .dtile:has(.dmu) .dcat{background:rgba(255,255,255,.08);color:#fff}html.arp .dtile:has(.dmu) .dcat b,html.arp .dtile:has(.dmu) .dcat span:nth-child(3){color:rgba(255,255,255,.6)}
html.arp .dtile:has(.dmu) .dcat.w{background:color-mix(in srgb,#2ecc71 30%,transparent)}html.arp .dtile:has(.dmu) .dcat.l{background:color-mix(in srgb,#ff5a5a 26%,transparent)}
html.arp .dtile:has(.dmu) .dbar{background:rgba(255,255,255,.14)}
html.arp .dtile:has(.dmu) .dmt b{color:#fff}
html.arp .dbig{font-family:var(--f-body);letter-spacing:-.03em}
html.arp .dstat li,html.arp .dpst span,html.arp .dssl li,html.arp .dcat,html.arp .dgames li{border-radius:14px}
html.arp .dface{background:linear-gradient(150deg,var(--accent),color-mix(in srgb,var(--accent) 55%,#000));color:#fff}
html.arp .dpow .arpface{width:64px;height:64px}
html.arp .dash.editing .dtile[data-dw]:not(.drag){animation:dwig .32s ease-in-out infinite alternate;animation-delay:calc(var(--i,0)*-70ms)}
html.arp .dash.editing .dtile[data-dw]:nth-child(odd):not(.drag){animation-direction:alternate-reverse}
@keyframes dwig{from{transform:rotate(-.45deg)}to{transform:rotate(.45deg)}}
html.arp .dtb{border-radius:var(--r3,22px) var(--r3,22px) 0 0;background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 70%,#7a5cff))}
html.arp .dadd{border-radius:var(--r3,22px)}
html.arp .dcatr{border:0;background:var(--chip);border-radius:16px}
@media (prefers-reduced-motion:reduce){.dfirst,.dfirst *,.dash.editing .dtile,.ddot.last,.dlive,.dconf i,.dwfl li.new{animation:none!important;transition:none!important}.dfirst .dd{stroke-dashoffset:0}}
`;document.head.appendChild(s);}
