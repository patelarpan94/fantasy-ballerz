function miniCharts(labels,A,B,nameA,nameB,cum){
  const W=300,H=140,L=36,R=44,T=12,Bm=22,n=labels.length;
  const x=i=>L+(n===1?(W-L-R)/2:(i*(W-L-R))/(n-1));
  const every=Math.max(1,Math.ceil(n/7));
  return CATS.map(c=>{
    const va=A.map(t=>t?val(t,c):null),vb=B.map(t=>t?val(t,c):null);
    const all=[...va,...vb].filter(v=>v!=null);if(!all.length)return "";
    let lo=0,hi=Math.max(...all,c[1]==="pct"?0.6:1);
    if(c[1]==="pct"){lo=Math.max(0,Math.floor((Math.min(...all)-0.05)*10)/10);hi=Math.min(1,Math.ceil((hi+0.05)*10)/10);if(hi-lo<0.2)hi=Math.min(1,lo+0.2);}else hi=Math.ceil(hi*1.1);
    const y=v=>T+(H-T-Bm)*(1-(v-lo)/((hi-lo)||1));
    const fmt=v=>c[1]==="pct"?pct(v):(Number.isInteger(v)?v:v.toFixed(1));
    const line=(vals,cls,who)=>{let segs=[],cur=[];vals.forEach((v,i)=>{if(v==null){if(cur.length)segs.push(cur);cur=[];}else cur.push(`${x(i)},${y(v)}`);});if(cur.length)segs.push(cur);
      return segs.map(s=>`<polyline class="ln ${cls}${cls==="op"?" dash":""}" points="${s.join(" ")}"/>`).join("")+vals.map((v,i)=>v==null?"":`<circle class="pt ${cls}" cx="${x(i)}" cy="${y(v)}" r="${n>20?3:4}"><title>${labels[i][1]}: ${esc(who)} ${fmt(v)}</title></circle>`).join("");};
    const ticks=[lo,(lo+hi)/2,hi].map(v=>`<line class="gridl" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L-6}" y="${y(v)+3}" text-anchor="end">${c[1]==="pct"?pct(v):Math.round(v)}</text>`).join("");
    const xl=labels.map((l,i)=>i%every&&i!==n-1?"":`<text class="ax" x="${x(i)}" y="${H-6}" text-anchor="middle">${l[0]}</text>`).join("");
    const pick=vals=>{const v=vals.filter(z=>z!=null);if(!v.length)return null;return cum?v[v.length-1]:(c[1]==="pct"?null:v.reduce((s,z)=>s+z,0)/v.length);};
    let sa,sb;
    if(c[1]==="pct"&&!cum){const agg=arr=>{const s=sumArr(arr);return s?val(s.t,c):null;};sa=agg(A);sb=agg(B);}else{sa=pick(va);sb=pick(vb);}
    const cap=cum?"":`<span class="avgl">${c[1]==="pct"?"range":"avg"}</span>`;
    const lastOf=vals=>{for(let i=vals.length-1;i>=0;i--)if(vals[i]!=null)return [i,vals[i]];return null;};
    const ea=lastOf(va),eb=lastOf(vb);let yA=ea?y(ea[1]):0,yB=eb?y(eb[1]):0;
    if(ea&&eb&&Math.abs(yA-yB)<11){const mid=(yA+yB)/2,up=yA<=yB;yA=mid+(up?-6:6);yB=mid+(up?6:-6);}
    const endl=(e,yy,cls)=>e?`<text class="endv ${cls}" x="${x(e[0])+8}" y="${yy+3.5}">${fmt(e[1])}</text>`:"";
    return `<figure class="mini"><figcaption><b>${c[0]}</b><span class="vals num">${cap}<span class="vk me"></span><span class="me-t">${sa==null?"–":fmt(sa)}</span><span class="vk op"></span><span class="op-t">${sb==null?"–":fmt(sb)}</span></span></figcaption>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${c[0]}: ${esc(nameA)} ${sa==null?"no data":fmt(sa)}, ${esc(nameB)} ${sb==null?"no data":fmt(sb)}">${ticks}${xl}${line(vb,"op",nameB)}${line(va,"me",nameA)}${endl(eb,yB,"op")}${endl(ea,yA,"me")}</svg></figure>`;
  }).join("");
}
function trackerView(){
  const curW=weekOf(Math.min(TODAY,SEASON_END))[0];
  if(TRK.toLatest!==false||!TRK.to||TRK.to>curW)TRK.to=curW;if(TRK.from>TRK.to)TRK.from=TRK.to;
  const seg=(k,opts)=>`<div class="tabs sm">${opts.map(([v,l])=>`<button data-trk="${k}:${v}" aria-selected="${TRK[k]===v}">${l}</button>`).join("")}</div>`;
  const wsel=(k)=>`<select data-trksel="${k}" aria-label="${k==="from"?"From week":"To week"}">${WEEKS.filter(w=>w[0]<=curW).map(w=>`<option value="${w[0]}"${TRK[k]===w[0]?" selected":""}>Week ${w[0]} · ${md(w[1])}</option>`).join("")}</select>`;
  // simple Matchup: this week only; longer periods and any two teams live in Analytics › Compare
  const wkOnly=simpleM(),mode=wkOnly?"week":TRK.mode;
  let controls=wkOnly?`<div class="trkbar"><span class="muted">This week, day by day.</span><button class="tlink" data-sub-go="analytics:cmp">Compare other teams and dates in Analytics ›</button>`:`<div class="trkbar">${seg("mode",[["week","This week"],["season","Over the season"]])}`;
  if(mode==="season")controls+=`${seg("gran",[["week","Week by week"],["day","Day by day"]])}<span class="rng">${wsel("from")}<span class="muted">to</span>${wsel("to")}</span>${seg("cmp",[["avg","vs league avg"],["opp","vs opponent"]])}`;
  controls+=`</div>`;
  const me=TEAMS[cur].name;
  let labels=[],A=[],B=[],nameB,cum=false,note="";
  if(mode==="week"){
    if(!M.opp)return `<section class="panel team">${controls}<p class="empty">${esc(noOppText())} ${wkOnly?"Analytics › Compare can":"Switch to “Over the season” to"} compare with the league average.</p></section>`;
    cum=true;nameB=TEAMS[M.opp].name;const days=DAYS.filter(sp=>sp<TODAY);
    labels=DAYS.map(sp=>[`${dow(sp)[0]}${dateOf(sp).getDate()}`,`${dow(sp)} ${dateOf(sp).getDate()}`]);
    let ra=null,rb=null;DAYS.forEach(sp=>{if(sp>=TODAY){A.push(null);B.push(null);return;}
      const a=dayTotals(cur,[sp])||new Array(10).fill(0),b=dayTotals(M.opp,[sp])||new Array(10).fill(0);ra=ra?ra.map((v,i)=>v+a[i]):a.slice();rb=rb?rb.map((v,i)=>v+b[i]):b.slice();A.push(ra);B.push(rb);});
    if(!days.length)return `<section class="panel team">${controls}<p class="empty">This week's games haven't started yet.</p></section>`;
    note="Running totals through the week from players' box scores on days they were in the starting lineup.";
  }else{
    nameB=TRK.cmp==="avg"?"League average":"Opponent that week";
    if(TRK.gran==="week"){
      for(let n=TRK.from;n<=TRK.to;n++){labels.push([`W${n}`,`Week ${n}${WEEKS[n-1][2]>=TODAY?" (in progress)":""}`]);A.push(weekTotals(cur,n));
        B.push(TRK.cmp==="avg"?leagueAvg(id=>weekTotals(id,n)):(()=>{const o=opponentIn(cur,n);return o?weekTotals(o,n):null;})());}
      note="Each point is one matchup week's category total. FG%/FT% use that week's makes and attempts.";
    }else{
      for(let n=TRK.from;n<=TRK.to;n++){const w=WEEKS[n-1];for(let sp=w[1];sp<=Math.min(w[2],TODAY-1);sp++){if(!hasDayData(sp))continue;
        labels.push([`${dateOf(sp).getMonth()+1}/${dateOf(sp).getDate()}`,`${dow(sp)} ${md(sp)}`]);A.push(dayTotals(cur,[sp]));
        B.push(TRK.cmp==="avg"?leagueAvg(id=>dayTotals(id,[sp])):(()=>{const o=opponentIn(cur,n);return o?dayTotals(o,[sp]):null;})());}}
      note="Each point is one day's totals from players in the starting lineup. Days without saved box scores are skipped.";
    }
    const missing=[];for(let n=TRK.from;n<=TRK.to;n++)if(WEEKS[n-1][1]<TODAY&&!SCORES[n]&&!weekDays(WEEKS[n-1]).some(hasDayData))missing.push(n);
    if(missing.length)note+=` No saved data yet for week ${missing.join(", ")}; press Refresh to load box scores.`;
    if(!A.some(Boolean))return `<section class="panel team">${controls}<p class="empty">No played games in this range yet.</p></section>`;
  }
  const head=`<div class="teamhead"><span class="tn">Tracker</span><span class="legend"><span class="key me"></span>${esc(me)}<span class="key op"></span>${esc(nameB)}</span></div>`;
  return `<section class="panel team">${head}${controls}<div class="minis">${miniCharts(labels,A,B,me,nameB,cum)}</div><p class="foot-note">${note} Hover a point for its value.</p></section>`;
}

