/* ============================================================================
   OPPONENT WATCH IN MIRROR MODE + PAST MATCHUPS (2.63, 2026-11-09, Arp: "for
   week 3, i know AK made matchup changes but its not showing in opponent watch").
   - While the league mirrors ESPN the move log is empty (rosters come from the
     ESPN snapshots), so Opponent watch found nothing. Their moves are now read
     from the roster changes in the snapshots: a player joining their roster that
     matchup is an add, one leaving is a drop (paired with an add a day either
     side), a swap with another team is a trade.
   - Opponent watch now also shows on past matchups, as "without their moves" vs
     the final result, so you can see whether their moves decided the week.
   ============================================================================ */
function owMirrorTx(opp,d0,d1){const ivs=[],out=[],end=i=>i.to==null||i.to===Infinity?Infinity:i.to;
  Object.entries(OWN).forEach(([n,a])=>a.forEach((i,k)=>ivs.push({n,i,prev:a[k-1],next:a[k+1]})));
  const adds=ivs.filter(x=>x.i.team===opp&&x.i.from>0&&x.i.from>=d0&&x.i.from<=d1);
  const drops=ivs.filter(x=>x.i.team===opp&&end(x.i)!==Infinity&&end(x.i)>=d0&&end(x.i)<=d1);
  const used=new Set();
  // trades: players swapped with one other team on the same day
  const tradeKey=x=>x.prev&&x.prev.team!==opp&&x.prev.to===x.i.from?x.prev.team+"@"+x.i.from:null;
  const tr={};adds.forEach(x=>{const k=tradeKey(x);if(k)(tr[k]=tr[k]||{get:[],give:[]}).get.push(x);});
  drops.forEach(x=>{if(x.next&&x.next.team!==opp&&x.next.from===end(x.i)){const k=x.next.team+"@"+end(x.i);if(tr[k])tr[k].give.push(x);}});
  Object.entries(tr).forEach(([k,v])=>{if(!v.give.length)return;const [B,day]=k.split("@").map(Number);
    [...v.get,...v.give].forEach(x=>used.add(x));
    out.push({id:"m:"+opp+":tr:"+k,type:"trade",ok:true,from:"t"+opp,to:"t"+B,give:v.give.map(x=>x.n),get:v.get.map(x=>x.n),day,at:day*10});});
  adds.filter(x=>!used.has(x)).sort((a,b)=>a.i.from-b.i.from).forEach(x=>{used.add(x);const f=x.i.from;
    const dr=drops.filter(y=>!used.has(y)&&Math.abs(end(y.i)-f)<=1).sort((a,b)=>Math.abs(end(a.i)-f)-Math.abs(end(b.i)-f))[0];if(dr)used.add(dr);
    out.push({id:"m:"+opp+":"+x.n+":"+f,type:"add",ok:true,team:"t"+opp,add:x.n,addDay:f,drop:dr?dr.n:null,dropDay:dr?end(dr.i):null,day:f,at:f*10+1});});
  drops.filter(y=>!used.has(y)).forEach(y=>out.push({id:"m:"+opp+":-"+y.n+":"+end(y.i),type:"drop",ok:true,team:"t"+opp,drop:y.n,dropDay:end(y.i),day:end(y.i),at:end(y.i)*10}));
  return out;}
{const _w=dOppWatch;dOppWatch=function(T){const opp=dOpp(T);
  if(!opp||!DAYS.length||!mirror())return _w.apply(this,arguments);
  const keep=TXLOG;TXLOG=keep.concat(owMirrorTx(opp,DAYS[0],DAYS[DAYS.length-1]));try{return _w.apply(this,arguments);}finally{TXLOG=keep;}};}
// past matchups: the real result with their moves vs without them (category record), no planner buttons
const owRec=r=>r.slice(0,r[2]?3:2).join("-");
{const _v=DW.ow.view;DW.ow.view=function(w,T){if(typeof dwkMode!=="function"||dwkMode()!=="past")return _v.apply(this,arguments);
  const r=dOppWatch(T);if(!r)return dashEmpty("No matchup this week.");const on=dShort(r.opp);
  if(!r.moves.length)return `<p class="dempty okc">✓ ${esc(on)} made no moves this matchup.</p>`;
  const days=dwkDays(wk),a=dayTotals(T,days),b=dayTotals(r.opp,days);if(!a||!b)return _v.apply(this,arguments);
  const less=(x,d)=>x.map((v,i)=>v-(+d[i]||0)),sum=r.moves.reduce((s,m)=>s.map((v,i)=>v+(+m.d[i]||0)),new Array(11).fill(0));
  const now=h2h(a,b),wo=h2h(a,less(b,sum)),res=x=>x[0]>x[1]?"won":x[0]<x[1]?"lost":"tied";
  const catOf=x=>CATS.map(c=>{const A=val(a,c),B=val(x,c);return Math.abs(A-B)<1e-9?0:A>B?1:-1;});
  const cNow=catOf(b),cWo=catOf(less(b,sum)),swung=CATS.filter((c,i)=>cNow[i]<cWo[i]).map(c=>c[0]);
  const head=`<div class="ow-h"><span><small>Without their moves</small><b class="num">${owRec(wo)}</b></span><span class="pl-arr" aria-hidden="true">→</span><span class="${now[0]<wo[0]?"dn":"ok"}"><small>Final</small><b class="num">${owRec(now)}</b></span>
    <p>${esc(on)} made <b>${r.moves.length} move${r.moves.length>1?"s":""}</b> this matchup. ${swung.length?`They swung <b>${swung.map(esc).join(", ")}</b>${res(now)!==res(wo)?` and turned your ${res(wo)} week into a ${res(now)} one`:""}.`:"They didn't swing a category."}</p></div>`;
  const list=`<ol class="ow-l">${r.moves.map(m=>{const n=m.t.add||(m.t.get||[])[0]||m.t.drop,c1=catOf(less(b,m.d)),sw=CATS.filter((c,i)=>cNow[i]<c1[i]).map(c=>c[0]);
    return `<li>${n?dFace(n,(DIR[n]||{}).t,"sm"):""}<span><b>${esc(owLine(m.t))}</b><small class="muted">${esc(dow(m.t.day))}${sw.length?` · cost you ${sw.map(esc).join(", ")}`:" · no category flipped on its own"}</small></span><b class="num ${sw.length?"dn":"ok"}">${owRec(h2h(a,less(b,m.d)))}</b></li>`;}).join("")}</ol>`;
  return head+list+`<p class="dsm muted">Records are your category score in the matchup without that move vs the real final ${owRec(now)}, from the real box scores (a dropped player counts the games he would have started).</p>`;};}
