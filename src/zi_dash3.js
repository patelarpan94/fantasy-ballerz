/* ============================================================================
   DASHBOARD 3 (2.31, Arp 2026-11-04: "what other widgets can we make and
   graphics?" then "do those plus 7,8,9"). Seven more widgets, each with a new
   kind of graphic: Swing categories (diverging bars), Projected final score
   (range bands), Power rankings climb (bump chart), Season heatmap (calendar),
   Who carries your team (treemap), Draft value (scatter), Pickup report card
   (flip-in grades). All built from data the app already has.
   ============================================================================ */
const dLogit=(x,y,c)=>{const rel=(x-y)/Math.max(Math.abs(x),Math.abs(y),1e-9);return 1/(1+Math.exp(-rel*(c[1]==="pct"?60:12)));};
const dPctTxt=v=>v.toFixed(3).replace(/^0/,"");
const dWho=p=>p>=.8?["Safe","me"]:p>=.6?["Leaning you","me"]:p>.4?["Toss-up","mid"]:p>.2?["Leaning them","op"]:["Likely lost","op"];
// a player's production while on team T, through today: per-game line, games, total game score
function dOnTeam(n,T,from){const d=DAYLINES[n]||{},ls=Object.entries(d).filter(([sp])=>+sp<=TODAY&&+sp>=(from||0)&&(T==null||ownerOn(n,+sp)===T)).map(([,l])=>l);
  if(!ls.length)return null;const t=lineSum(ls);return {pg:t.map(v=>v/ls.length),g:ls.length,gs:ls.reduce((s,l)=>s+gscore(l),0)};}

/* ---- 1. swing categories ---- */
DW.sw={name:"Swing categories",desc:"The closest categories this matchup and exactly what it takes to flip each one.",s:"s",
  view(w,T,big){const opp=dOpp(T);if(!opp)return dashEmpty("No matchup this week.");const a=fcProj(T),b=fcProj(opp);
    const rows=CATS.map(c=>{const x=val(a.fin,c),y=val(b.fin,c);return {c,x,y,p:dLogit(x,y,c)};}).sort((u,v)=>Math.abs(u.p-.5)-Math.abs(v.p-.5)).slice(0,big?CATS.length:5);
    const need=r=>{const d=Math.abs(r.x-r.y),pc=r.c[1]==="pct";if(d<1e-9)return "dead even";const amt=pc?dPctTxt(d+.0005):Math.floor(d)+1;
      return r.x>r.y?`up ${pc?dPctTxt(d):Math.round(d)}, they need ${pc?"+"+amt:"+"+amt+" "+r.c[0]}`:`you need ${pc?"+"+amt:"+"+amt+" "+r.c[0]}`;};
    return `<ol class="dswl">${rows.map((r,i)=>{const [lab,cls]=dWho(r.p),m=Math.abs(r.p-.5)*100;
      return `<li><b class="dswc">${esc(r.c[0])}</b><span class="dswb"><i class="dg2 ${r.p>=.5?"me":"op"}" style="--w:${m.toFixed(0)}%;--d:${i*60}ms"></i></span><span class="dswt"><b class="${cls}">${lab}</b><small class="muted">${need(r)}</small></span></li>`;}).join("")}</ol>
      <p class="dsm muted">Bars lean toward whoever is projected to win it. Projected finish, from today's lineups.</p>`;}};

/* ---- 2. projected final score ---- */
DW.pf={name:"Projected final score",desc:"Where every category is headed by the end of the matchup, with a range for what's still to play.",s:"w",
  view(w,T){const opp=dOpp(T);if(!opp)return dashEmpty("No matchup this week.");const a=fcProj(T),b=fcProj(opp),r=h2h(a.fin,b.fin);
    let sure=0,lost=0,toss=0;
    const band=(F,c)=>{const v=val(F.fin,c),n=val(F.now,c);if(c[1]!=="pct"){const rem=Math.max(0,v-n)*.35;return [v-rem,v,v+rem,n];}
      const att=F.fin[c[3]]||1,f=Math.max(0,(att-(F.now[c[3]]||0))/att),s=.03*f;return [v-s,v,v+s,n];};
    const rows=CATS.map(c=>{const A=band(a,c),B=band(b,c),p=dLogit(A[1],B[1],c);if(p>=.7)sure++;else if(p<=.3)lost++;else toss++;
      const pc=c[1]==="pct",lo=pc?Math.min(A[0],B[0],A[3]||A[0],B[3]||B[0])-.01:0,hi=Math.max(A[2],B[2])*(pc?1:1.05)+(pc?.01:0)||1,pos=v=>((v-lo)/((hi-lo)||1)*100).toFixed(1)+"%";
      const tr=(X,cls,j)=>`<i class="dpb ${cls}" style="left:${pos(X[0])};width:calc(${pos(X[2])} - ${pos(X[0])})"></i><i class="dpd ${cls}" style="--n:${pos(X[3])};--f:${pos(X[1])};--d:${j}ms"></i>`;
      return `<div class="dpfr"><b>${esc(c[0])}</b><span class="dpft">${tr(A,"me",0)}${tr(B,"op",80)}</span><span class="num dpfv"><b class="${A[1]>=B[1]?"me":""}">${fmtC(c,A[1])}</b> <small class="muted">${fmtC(c,B[1])}</small></span></div>`;}).join("");
    return `<div class="dkpi"><b class="dbig num">${r.join("-")}</b><span class="muted">projected · could end anywhere from ${sure}-${lost+toss} to ${sure+toss}-${lost}</span></div>
      <div class="dpfk"><span><i class="dkey me"></i>${esc(tmInit(T))}</span><span><i class="dkey op"></i>${esc(tmInit(opp))}</span><span class="muted">dot = projected finish, band = possible range</span></div>${rows}`;}};

/* ---- 3. power rankings climb (bump chart) ---- */
function dWeekRanks(){const ids=Object.keys(TEAMS).map(Number),rec=Object.fromEntries(ids.map(x=>[x,[0,0,0]])),out=[];
  for(let n=1;n<=regWeeks();n++){if(!weekDone(n))break;(W[n]||[]).forEach(([a,b])=>{const r=weekRec(h2h(wt(a,n),wt(b,n)));[0,1,2].forEach(i=>{rec[a][i]+=r[i];rec[b][i]+=r[i===2?2:1-i];});});
    const o=ids.slice().sort((x,y)=>pctW(rec[y])-pctW(rec[x])||rec[y][0]-rec[x][0]);out.push({l:"W"+n,r:Object.fromEntries(o.map((x,i)=>[x,i+1]))});}
  return out;}
DW.bp={name:"Power rankings climb",desc:"Every team's standings rank after each week, ending with this week's power ranking. Your line is highlighted.",s:"w",
  view(w,T){const cols=dWeekRanks();let pr=[];try{pr=powerRows();}catch(e){}
    if(pr.length)cols.push({l:"Power",r:Object.fromEntries(pr.map((x,i)=>[x.x,i+1]))});
    if(cols.length<2)return dashEmpty("The climb starts after the first matchup ends.");
    const ids=Object.keys(TEAMS).map(Number).filter(x=>cols[0].r[x]),n=ids.length,Wd=window.DCH_W||300,h=Math.max(140,n*18+30),P=26,R=34;
    const x=i=>P+i*(Wd-P-R)/(cols.length-1),y=r=>12+(r-1)*(h-30)/Math.max(1,n-1);
    const line=id=>cols.map((c,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${y(c.r[id]||n).toFixed(1)}`).join("");
    const order=ids.slice().sort((a,b)=>(a===T)-(b===T));
    return `<svg class="dch dbump" viewBox="0 0 ${Wd} ${h}" role="img" aria-label="Rank by week">
      ${cols.map((c,i)=>`<text class="dax" x="${x(i)}" y="${h-4}" text-anchor="middle">${esc(c.l)}</text>`).join("")}
      ${order.map(id=>{const me=id===T,last=cols[cols.length-1].r[id];return `<g class="dbl${me?" me":""}"><title>${esc(TEAMS[id].name)}</title><path class="dln dd ${me?"me":"oth"}" pathLength="1" d="${line(id)}"/>${cols.map((c,i)=>`<circle class="ddot ${me?"me":"oth"}" cx="${x(i)}" cy="${y(c.r[id]||n)}" r="${me?4:2.6}"/>`).join("")}<text class="dbt" x="${Wd-R+8}" y="${y(last)+3}">${last} ${esc(tmInit(id))}</text></g>`;}).join("")}</svg>`;}};

/* ---- 4. season heatmap ---- */
DW.hm={name:"Season heatmap",desc:"One square per day of the season, darker for bigger days from your started players.",s:"w",
  view(w,T){const end=CAL[CAL.length-1][2],days=[];for(let sp=1;sp<=end;sp++)days.push(sp);
    const v=Object.fromEntries(days.filter(sp=>sp<=TODAY).map(sp=>{const t=dayTotals(T,[sp]);return [sp,t?gscore(t):0];}));
    const played=Object.values(v).filter(x=>x>0).sort((a,b)=>a-b);if(!played.length)return dashEmpty("Fills in once your players have played.");
    const q=k=>played[Math.min(played.length-1,Math.floor(played.length*k))],cuts=[q(.25),q(.5),q(.75)],lvl=x=>!x?0:x<cuts[0]?1:x<cuts[1]?2:x<cuts[2]?3:4;
    const best=Object.entries(v).sort((a,b)=>b[1]-a[1])[0],fd=d=>dateOf(d).toLocaleDateString("en-US",{month:"short",day:"numeric"});
    const lead=(dateOf(1).getDay()+6)%7;   // Monday-first rows
    return `<div class="dkpi"><b class="dbig num">${dCount(played.length)}</b><span class="muted">days with games · best day ${fd(+best[0])} (${Math.round(best[1])})</span></div>
      <div class="dhm" role="img" aria-label="Season calendar">${"<i class='pad'></i>".repeat(lead)}${days.map((sp,i)=>{const fut=sp>TODAY,x=v[sp]||0;
        return `<i class="l${fut?"f":lvl(x)}${sp===TODAY?" today":""}" style="--d:${Math.floor((i+lead)/7)*22}ms" title="${dow(sp)} ${fd(sp)}${fut?"":`: ${Math.round(x)}`}"></i>`;}).join("")}</div>
      <div class="dhmk muted"><span>Less</span>${[0,1,2,3,4].map(l=>`<i class="l${l}"></i>`).join("")}<span>More</span><span class="dhmn">game score: points, boards, assists, stocks, threes</span></div>`;}};

/* ---- 5. who carries your team (treemap) ---- */
function dTree(items,x,y,w,h,out){if(!items.length)return out;if(items.length===1){out.push({...items[0],x,y,w,h});return out;}
  const tot=items.reduce((s,i)=>s+i.v,0);let acc=items[0].v,k=1;while(k<items.length-1&&acc+items[k].v<=tot/2){acc+=items[k].v;k++;}
  const f=acc/tot,A=items.slice(0,k),B=items.slice(k);
  if(w>=h){dTree(A,x,y,w*f,h,out);dTree(B,x+w*f,y,w*(1-f),h,out);}else{dTree(A,x,y,w,h*f,out);dTree(B,x,y+h*f,w,h*(1-f),out);}return out;}
const DWC=[["all","All"],["PTS","PTS"],["REB","REB"],["AST","AST"],["STL","STL"],["BLK","BLK"],["3PM","3PM"]];
DW.wc={name:"Who carries your team",desc:"Blocks sized by how much each player has given your team this season. ⚙ to pick a category.",s:"w",
  view(w,T,big){const k=w.o.k||"all",i=k==="3PM"?K.TPM:K[k];
    const xs=TEAMS[T].P.map(p=>{let v=0,g=0;Object.keys(p.d||{}).map(Number).forEach(sp=>{const d=p.d[sp];if(sp<=TODAY&&d&&startedOn(p,sp)&&ownerOn(p.n,sp)===T){g++;v+=k==="all"?gscore(d):d[i];}});return {n:p.n,t:p.t,v,g};}).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
    if(!xs.length)return dashEmpty("Fills in once your starters have played.");
    const tot=xs.reduce((s,x)=>s+x.v,0),Hh=(window.DCH_W||300)>300?36:PHONE()?110:70,R=dTree(xs,0,0,100,Hh,[]);
    return `<div class="dkpi"><span class="muted">${k==="all"?"Game score":esc(k)} from your started players, ${xs.length} players</span></div>
      <div class="dtm" style="aspect-ratio:100/${Hh}">${R.map((r,j)=>{const sh=r.v/tot,big2=r.w*r.h>260;return `<span class="dtmc" data-pcard="${esc(r.n)}" role="button" tabindex="0" style="left:${r.x}%;top:${r.y/Hh*100}%;width:${r.w}%;height:${r.h/Hh*100}%;--o:${(.38+.62*(xs.length>1?1-j/(xs.length-1):1)).toFixed(2)};--d:${j*45}ms" title="${esc(r.n)}: ${Math.round(r.v)} (${Math.round(sh*100)}%) in ${r.g} games"><b>${esc(big2?r.n:dashLast(r.n))}</b>${r.w*r.h>110&&r.h>16?`<small>${Math.round(sh*100)}%</small>`:""}</span>`;}).join("")}</div>`;},
  opts(w){return `<p class="muted dsnote">Size the blocks by</p><div class="tabs sm dsrow" role="group" style="flex-wrap:wrap">${DWC.map(([k,l])=>`<button data-dopto="k:${k}" aria-selected="${(w.o.k||"all")===k}">${l}</button>`).join("")}</div>`;}};

/* ---- 6. draft value (scatter) ---- */
let DDV_K="",DDV=null;
function dSeasonRanks(){const k=TODAY+":"+Object.keys(DAYLINES).length;if(k===DDV_K)return DDV;DDV_K=k;
  const xs=Object.keys(DAYLINES).map(n=>{const r=dOnTeam(n,null);return r?{n,z:zOf(r.pg)*Math.min(1,r.g/Math.max(1,DDV_GP()))}:null;}).filter(Boolean).sort((a,b)=>b.z-a.z);
  return DDV=Object.fromEntries(xs.map((x,i)=>[x.n,i+1]));}
// games the busiest players have played, so a player who missed most games ranks lower
const DDV_GP=()=>{let m=1;for(const n in DAYLINES){const c=Object.keys(DAYLINES[n]).filter(sp=>+sp<=TODAY).length;if(c>m)m=c;}return m;};
DW.dv={name:"Draft value",desc:"Where each player was drafted against how he ranks now. Above the line = a steal. Your picks are highlighted.",s:"w",
  view(w,T){if(!PICKS.length)return dashEmpty("Shows once the draft is done.");const rk=dSeasonRanks(),ps=PICKS.slice().sort((a,b)=>a.n-b.n).filter(p=>rk[p.player]);
    if(!ps.length)return dashEmpty("Fills in once players have played.");
    const N=ps[ps.length-1].n,M=N,cr=p=>Math.min(M,rk[p.player]),Wd=window.DCH_W||300,h=170,P=24,x=n=>P+(n-1)/(M-1||1)*(Wd-P-8),y=r=>8+(r-1)/(M-1||1)*(h-30);
    const mine=ps.filter(p=>tnum(p.team)===T).map(p=>({...p,d:p.n-rk[p.player]})).sort((a,b)=>b.d-a.d);
    const dot=(p,me,j)=>`<circle class="dsc ${me?"me":"oth"}" cx="${x(p.n).toFixed(1)}" cy="${y(cr(p)).toFixed(1)}" r="${me?4.5:2.6}" style="--d:${j*12}ms"><title>${esc(p.player)}: pick ${p.n}, now #${rk[p.player]}</title></circle>`;
    return `<svg class="dch dscat" viewBox="0 0 ${Wd} ${h}" role="img" aria-label="Draft pick against current rank">
      <path class="dref" d="M${x(1)},${y(1)}L${x(M)},${y(M)}"/><text class="dax" x="${x(1)}" y="${h-4}">pick 1</text><text class="dax" x="${x(M)}" y="${h-4}" text-anchor="end">pick ${M}</text>
      <text class="dax" x="${P-4}" y="${y(1)+3}" text-anchor="end">#1</text><text class="dax" x="${P-4}" y="${y(M)+3}" text-anchor="end">#${M}+</text><text class="dax" x="${x(M*.3)}" y="${y(M*.12)}">↖ steals</text>
      ${ps.filter(p=>tnum(p.team)!==T).map((p,j)=>dot(p,false,j)).join("")}${ps.filter(p=>tnum(p.team)===T).map((p,j)=>dot(p,true,j)).join("")}</svg>
      ${mine.length?`<p class="dsm"><span class="okc">Best steal:</span> ${dashNm(mine[0].player)} <small class="muted">pick ${mine[0].n} → #${rk[mine[0].player]}</small>${mine.length>1&&mine[mine.length-1].d<0?` · <span class="badc">Biggest miss:</span> ${dashNm(mine[mine.length-1].player)} <small class="muted">pick ${mine[mine.length-1].n} → #${rk[mine[mine.length-1].player]}</small>`:""}</p>`:""}`;}};

/* ---- 7. pickup report card ---- */
const dGrade=z=>z==null?["–","na"]:z>=2?["A","a"]:z>=.5?["B","b"]:z>=-1?["C","c"]:["D","d"];
DW.pk={name:"Pickup report card",desc:"Every player you've added and what he has done for you since, graded A to D.",s:"s",
  view(w,T,big){const adds=TXLOG.filter(t=>t.ok!==false&&t.add&&tnum(t.team)===T).slice().reverse().slice(0,big?8:5);
    if(!adds.length)return dashEmpty("You haven't added anyone yet this season.");
    const rows=adds.map(t=>{const r=dOnTeam(t.add,T,t.day||0);return {t,r,z:r?zOf(r.pg):null,still:ownerNow(t.add)===T};});
    const tot=rows.reduce((s,x)=>s+(x.r?x.r.gs:0),0);
    return `<div class="dkpi"><b class="dbig num">${dCount(Math.round(tot))}</b><span class="muted">game score from your pickups</span></div>
      <ol class="dpkl">${rows.map((x,j)=>{const [g,c]=dGrade(x.z);return `<li><span class="dgr ${c}" style="--d:${j*90}ms">${g}</span><span>${dashNm(x.t.add)}${x.still?"":' <small class="muted">· dropped</small>'}<br><small class="muted">${x.r?`${x.r.g} game${x.r.g>1?"s":""} · ${pra(x.r.pg)}`:"no games yet for you"}${x.t.drop?` · for ${esc(x.t.drop)}`:""}</small></span></li>`;}).join("")}</ol>
      <p class="dsm muted">Grade = value per game vs the league (A is a top add).</p>`;}};

{const s=document.createElement("style");s.textContent=`
.dswl,.dpkl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.dswl li{display:grid;grid-template-columns:44px 1fr 1.3fr;gap:8px;align-items:center}
.dswc{font-size:.8rem}
.dswb{position:relative;height:10px;border-radius:5px;background:var(--chip,#eef)}
.dswb::after{content:"";position:absolute;left:50%;top:-3px;bottom:-3px;width:2px;background:var(--muted);opacity:.5}
.dswb i{position:absolute;top:0;bottom:0;border-radius:5px;max-width:50%}
.dswb i.me{left:50%;background:var(--accent)}.dswb i.op{right:50%;background:var(--s-op,#e2701f)}
.dswt{display:flex;flex-direction:column;line-height:1.2;font-size:.8rem}.dswt b.me{color:var(--accent)}.dswt b.op{color:var(--s-op,#e2701f)}.dswt b.mid{color:var(--ink)}
.dpfk{display:flex;gap:12px;flex-wrap:wrap;font-size:.72rem;margin:6px 0 4px}
.dpfr{display:grid;grid-template-columns:40px 1fr 92px;gap:8px;align-items:center;font-size:.8rem;padding:3px 0}
.dpft{position:relative;height:18px;border-radius:9px;background:var(--chip,#eef)}
.dpb{position:absolute;top:5px;height:8px;border-radius:4px;opacity:.35}.dpb.me{background:var(--accent)}.dpb.op{background:var(--s-op,#e2701f);top:5px}
.dpd{position:absolute;top:3px;left:var(--f);width:12px;height:12px;margin-left:-6px;border-radius:50%;border:2px solid var(--surface);box-shadow:0 1px 3px rgba(0,0,0,.25)}
.dpd.me{background:var(--accent)}.dpd.op{background:var(--s-op,#e2701f)}
.dfirst .dpd{animation:dslide2 1s cubic-bezier(.3,.7,.2,1) both;animation-delay:calc(var(--d) + 200ms)}
@keyframes dslide2{from{left:var(--n)}}
.dpfv{text-align:right}.dpfv b.me{color:var(--accent)}
.dbump .dln.oth{stroke:var(--muted);stroke-width:1.4;opacity:.45}.dbump .ddot.oth{fill:var(--muted);opacity:.5}
.dbump .dln.me{stroke-width:3.2}.dbump .dbt{font-size:9px;fill:var(--muted);font-weight:700}.dbump .dbl.me .dbt{fill:var(--accent);font-size:10px}
.dbump .dbl:hover .dln.oth{opacity:1;stroke:var(--ink)}.dbump .dbl:hover .dbt{fill:var(--ink)}
.dhm{display:grid;grid-template-rows:repeat(7,auto);grid-auto-flow:column;grid-auto-columns:minmax(0,15px);justify-content:start;gap:3px;margin:8px 0 6px}
.dhm i{aspect-ratio:1;border-radius:3px;background:var(--chip,#eef);min-width:0}
.dhm i.pad{background:none}.dhm i.lf{background:transparent;outline:1px dashed color-mix(in srgb,var(--line) 70%,transparent);outline-offset:-1px}
.dhm i.l1,.dhmk i.l1{background:color-mix(in srgb,var(--accent) 28%,var(--chip,#eef))}
.dhm i.l2,.dhmk i.l2{background:color-mix(in srgb,var(--accent) 52%,var(--chip,#eef))}
.dhm i.l3,.dhmk i.l3{background:color-mix(in srgb,var(--accent) 76%,var(--chip,#eef))}
.dhm i.l4,.dhmk i.l4{background:var(--accent)}
.dhm i.today{outline:2px solid var(--ink);outline-offset:-1px}
.dfirst .dhm i{animation:dpop .45s cubic-bezier(.3,1.4,.4,1) both;animation-delay:var(--d)}
.dhmk{display:flex;align-items:center;gap:4px;font-size:.68rem;flex-wrap:wrap}.dhmk i{width:10px;height:10px;border-radius:2px;background:var(--chip,#eef)}.dhmk .dhmn{margin-left:auto}
.dtm{position:relative;width:100%;border-radius:12px;overflow:hidden;margin-top:6px}
.dtmc{position:absolute;box-sizing:border-box;border:2px solid var(--surface);border-radius:8px;padding:5px 6px;overflow:hidden;cursor:pointer;
  background:color-mix(in srgb,var(--accent) calc(var(--o)*100%),var(--chip,#eef));color:#fff;display:flex;flex-direction:column;justify-content:space-between;transition:filter .15s}
.dtmc:hover{filter:brightness(1.12)}.dtmc b{font-size:.72rem;line-height:1.1;text-shadow:0 1px 2px rgba(0,0,0,.3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dtmc small{font-size:.7rem;font-weight:800;opacity:.9}
.dfirst .dtmc{animation:dpop .55s cubic-bezier(.3,1.3,.4,1) both;animation-delay:var(--d)}
.dscat .dsc.me{fill:var(--accent);stroke:var(--surface);stroke-width:1.5}.dscat .dsc.oth{fill:var(--muted);opacity:.45}
.dscat .dsc:hover{opacity:1;r:6}
.dfirst .dscat .dsc{transform-box:fill-box;transform-origin:center;animation:dpop .5s cubic-bezier(.3,1.4,.4,1) both;animation-delay:var(--d)}
.dpkl li{display:flex;gap:10px;align-items:center;font-size:.85rem}
.dgr{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-weight:900;font-size:1.05rem;color:#fff;background:var(--muted)}
.dgr.a{background:var(--win,#1a7f37)}.dgr.b{background:var(--accent)}.dgr.c{background:#b08800}.dgr.d{background:var(--loss,#c62828)}
.dfirst .dgr{animation:dflip .7s cubic-bezier(.3,1.2,.4,1) both;animation-delay:var(--d)}
html.arp .dtmc{border-radius:12px}html.arp .dgr{border-radius:50%;box-shadow:0 6px 14px -8px currentColor}
@media (prefers-reduced-motion:reduce){.dfirst .dpd,.dfirst .dhm i,.dfirst .dtmc,.dfirst .dscat .dsc,.dfirst .dgr{animation:none}}
`;document.head.appendChild(s);}
