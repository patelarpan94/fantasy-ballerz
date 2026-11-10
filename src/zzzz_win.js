/* ============================================================================
   WIN-MORE TOOLS (2.68, 2026-11-09, Arp: "come up with updates to the app ...
   Mainly focus on tools such that would help to win" -> "do all the tools and
   put it into New Era"). Ideas doc: https://claude.ai/artifact/WJEM3APd7nidwsDc2C93Dy
   - nx Next-week head start: next matchup's opponent, games per NBA team, the
     pickups to line up so they play Monday and Tuesday.
   - rg Ratio guard: which starters to sit tonight to protect a close FG% / FT%
     without losing a counting category.
   - of Opponent move forecast: how your opponent streams (pickups a matchup,
     days, positions) and their likely moves left, counted in your win chance
     and the planner (switchable).
   - rc Role change radar: free agents whose minutes or shots jumped lately.
   - is IR stash planner: injured free agents worth an IR slot, and your IR
     players coming back.
   - sb Sell high, buy low: hot and cold players vs their season, with playoff
     week games.
   - Matchup review: on a past matchup, what flipped the close categories you
     lost (bench games, unused pickups), plus a season tally.
   No betting or money anywhere. Rules follow ESPN: 7 pickups per matchup,
   4 C max, moves lock at the day's first tip-off.
   ============================================================================ */
const WN_DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const wnPG=n=>dBestPG(n);
const wnZ=n=>{const pg=wnPG(n);return pg?zOf(pg):null;};
const wnFA=()=>Object.values(DIR).filter(D=>D&&D.n&&!ownerNow(D.n)&&D.t&&D.t!=="FA");
const wnAct=T=>dNowP(T).filter(p=>slotOn(p,Math.min(TODAY,SEASON_END))!==13);
const wnCur=()=>typeof dwkNow==="function"?dwkNow():weekOf(Math.min(TODAY,SEASON_END));
const wnDays=w=>{const o=[];for(let sp=w[1];sp<=w[2];sp++)o.push(sp);return o;};
const wnF=(v,c)=>c[1]==="pct"?v.toFixed(3).replace(/^0/,""):String(Math.round(v));
// roster joins (pickups) per team from the ownership intervals; trades (a direct swap with another team) left out
function wnJoins(T){const out=[];for(const n in OWN){const a=OWN[n];a.forEach((iv,k)=>{if(iv.team!==T||!(iv.from>0))return;const pv=a[k-1];if(pv&&pv.team&&pv.team!==T&&pv.to===iv.from)return;out.push({n,sp:iv.from});});}
  if(!mirror())TXLOG.forEach(t=>{if(t.ok&&t.type!=="trade"&&t.add&&tnum(t.team)===T&&!out.some(x=>x.n===t.add&&Math.abs(x.sp-(t.addDay??t.day))<=1))out.push({n:t.add,sp:t.addDay??t.day});});
  return out;}
const wnTag=(t,cls)=>`<span class="wn-tag ${cls||""}">${t}</span>`;

// ---------- 1 Next-week head start ----------
function wnNext(T){const c=wnCur(),nw=WEEKS[c[0]];if(!nw)return null;const O=opponentIn(T,nw[0]),days=wnDays(nw);
  const teams=Object.keys(SCHED).map(t=>({t,g:days.filter(sp=>gameOn(t,sp)).length,e:days.slice(0,2).filter(sp=>gameOn(t,sp)).length})).filter(x=>x.g).sort((a,b)=>b.g-a.g||b.e-a.e);
  const gOf=n=>{const t=(DIR[n]||{}).t;return t?days.filter(sp=>gameOn(t,sp)).length:0;};
  const teamG=X=>wnAct(X).filter(p=>INJ[p.n]!=="OUT").reduce((s,p)=>s+Math.min(gOf(p.n),4),0);
  const val=n=>{const z=wnZ(n);return z==null?-9:Math.max(z,-3)*gOf(n)/4+z*.5;};
  const mine=wnAct(T).filter(p=>!(DIR[p.n]&&DIR[p.n].rk&&DIR[p.n].rk<=Object.keys(TEAMS).length*9)).map(p=>({n:p.n,v:val(p.n),g:gOf(p.n)})).sort((a,b)=>a.v-b.v);
  const used=new Set();
  const picks=wnFA().filter(D=>INJ[D.n]!=="OUT"&&gOf(D.n)>=3&&wnPG(D.n)).map(D=>({n:D.n,t:D.t,g:gOf(D.n),e:days.slice(0,2).filter(sp=>gameOn(D.t,sp)).length,v:val(D.n)})).sort((a,b)=>b.v-a.v).slice(0,25)
    .map(x=>{const d=mine.find(m=>!used.has(m.n)&&m.v<x.v-.3&&!(typeof posBlock==="function"&&posBlock(T,x.n,m.n)));if(!d)return null;used.add(d.n);return {...x,drop:d.n,dg:d.g,gain:x.v-d.v};}).filter(Boolean)
    .sort((a,b)=>b.e-a.e||b.gain-a.gain).slice(0,3);
  return {nw,O,days,teams,picks,myG:teamG(T),opG:O?teamG(O):null,open:TODAY>=c[2]-2};}
DW.nx={name:"Next-week head start",desc:"Next matchup's opponent, games per NBA team, and the pickups to line up so they play from Monday.",s:"w",
  view(w,T){const r=wnNext(T);if(!r)return dashEmpty("No next matchup: the regular season is ending.");const on=r.O?dShort(r.O):"?";
    const top=`<p class="wn-lead">Matchup ${r.nw[0]} starts <b>${esc(dow(r.nw[1]))} ${esc(md(r.nw[1]))}</b> vs <b>${esc(on)}</b>. Games next week: you <b class="num">${r.myG}</b>${r.opG!=null?` · them <b class="num">${r.opG}</b>`:""}.</p>
      <div class="wn-chips">${r.teams.slice(0,8).map(x=>wnTag(`${esc(x.t)} <b>${x.g}</b>${x.e===2?" ⚡":""}`,x.g>=4?"hi":"")).join("")}</div><p class="dsm muted">Most games next week. ⚡ = plays Monday and Tuesday.</p>`;
    if(!r.open)return top+`<p class="dsm muted">Pickup picks open ${esc(dow(wnCur()[2]-2))}, close enough to the switch that injuries and minutes have settled.</p>`;
    const list=r.picks.length?`<ol class="wn-l">${r.picks.map(x=>`<li>${dFace(x.n,x.t,"sm")}<span><b>${dashNm(x.n)}</b><small class="muted">${esc(x.t)} · ${x.g} games${x.e?` · ${x.e===2?"Mon + Tue":"plays day 1 or 2"}`:""} · for ${esc(dashLast(x.drop))} (${x.dg} games)</small></span></li>`).join("")}</ol>`
      :`<p class="okc">✓ Your roster already has the games next week.</p>`;
    return top+list+`<p class="dsm muted">Add them on ${esc(dow(r.nw[1]-1))} after the first tip-off: they join on ${esc(dow(r.nw[1]))} and count against next matchup's ${addLimitFor(r.nw[1])||7} pickups, not this one's.</p>`;}};

// ---------- 2 Ratio guard ----------
function wnRatio(T){const O=dOpp(T);if(!O||!DAYS.length||TODAY<DAYS[0]||TODAY>DAYS[DAYS.length-1])return null;
  const me=fcProj(T).fin,op=fcProj(O).fin,base=dExpCats(me,op);
  const pcts=CATS.filter(c=>c[1]==="pct").map(c=>({c,p:dLogit(val(me,c),val(op,c),c)}));
  const tonight=dNowP(T).filter(p=>startedOn(p,TODAY)&&gameOn(p.t,TODAY)&&!locked(p,TODAY)&&INJ[p.n]!=="OUT");
  const out=[];tonight.forEach(p=>{const pg=wnPG(p.n);if(!pg)return;const wo=me.map((v,i)=>v-(+pg[i]||0)),g=dExpCats(wo,op)-base;
    if(g<.04)return;const cats=CATS.map(c=>({c,a:dLogit(val(me,c),val(op,c),c),b:dLogit(val(wo,c),val(op,c),c),va:val(me,c),vb:val(wo,c)})).filter(x=>Math.abs(x.b-x.a)>=.03);
    if(cats.some(x=>x.a>=.5&&x.b<.5))return;out.push({n:p.n,t:p.t,g,cats});});
  return {O,pcts,out:out.sort((a,b)=>b.g-a.g).slice(0,3),late:DAYS.indexOf(TODAY)>=DAYS.length-4};}
DW.rg={name:"Ratio guard",desc:"Which starters to sit tonight to protect a close FG% or FT% without losing a counting category.",s:"w",
  view(w,T){const r=wnRatio(T);if(!r)return dashEmpty("Works during a live matchup.");
    const head=`<div class="wn-chips">${r.pcts.map(x=>wnTag(`${esc(x.c[0])} <b>${dPct(x.p)}%</b>`,x.p>=.65?"ok":x.p<=.35?"dn":"mid")).join("")}</div>`;
    if(!r.out.length)return head+`<p class="okc">✓ No one to sit tonight. Every starter helps more than his shooting hurts.</p>`;
    return head+`<ol class="wn-l">${r.out.map(x=>`<li>${dFace(x.n,x.t,"sm")}<span><b>Sit ${dashNm(x.n)}</b><small class="muted">${x.cats.map(c=>`${esc(c.c[0])} ${wnF(c.va,c.c)}→${wnF(c.vb,c.c)} (${dPct(c.a)}→${dPct(c.b)}%)`).join(" · ")}</small></span><b class="num ok">+${x.g.toFixed(2)}</b></li>`).join("")}</ol>
      <p class="dsm muted">+ = expected categories won if he sits tonight. A suggestion only${mirror()?": set it on ESPN before his game.":"."}${r.late?"":" Most useful from Thursday, when the percentages are harder to move."}</p>`;}};

// ---------- 3 Opponent move forecast ----------
let WNO_K="",WNO=null;
function wnHabit(X){const j=wnJoins(X),c=wnCur(),done=CAL.filter(w=>w[0]<c[0]&&w[2]<TODAY);
  const per=done.map(w=>j.filter(x=>x.sp>=w[1]&&x.sp<=w[2]).length),avg=per.length?per.reduce((a,b)=>a+b,0)/per.length:0;
  const dayC={};j.forEach(x=>{const d=dow(x.sp);dayC[d]=(dayC[d]||0)+1;});const posC={};j.forEach(x=>{const p=typeof posMain==="function"?posMain(x.n):"";if(p)posC[p]=(posC[p]||0)+1;});
  return {per,avg,total:j.length,dayC,posC,thisWk:j.filter(x=>x.sp>=c[1]&&x.sp<=c[2]).length};}
function wnOppF(T){const O=dOpp(T);if(!O||!DAYS.length)return null;const k=T+":"+O+":"+TODAY+":"+Object.keys(OWN).length+":"+TXLOG.length;if(k===WNO_K)return WNO;
  const h=wnHabit(O),c=wnCur(),left=DAYS.filter(sp=>sp>=TODAY+1),wkLen=wnDays(c).length,cap=Math.max(0,(addLimitFor(TODAY)||7)-h.thisWk);
  const share=left.length/wkLen,exp=Math.min(cap,Math.max(0,h.avg-h.thisWk*0)*share);
  // a typical stream: one of the 8 best free agents with games left, about half his games started
  const fa=wnFA().filter(D=>INJ[D.n]!=="OUT"&&wnPG(D.n)).map(D=>({n:D.n,g:left.filter(sp=>gameOn(D.t,sp)).length,pg:wnPG(D.n),z:wnZ(D.n)})).filter(x=>x.g).sort((a,b)=>b.z-a.z).slice(0,8);
  const add=new Array(11).fill(0);if(fa.length&&exp>0){fa.forEach(x=>x.pg.forEach((v,i)=>add[i]+=v*Math.min(x.g,3)*.5/fa.length));}
  const boost=add.map(v=>v*exp);
  WNO_K=k;WNO={O,h,exp,cap,boost,left:left.length};return WNO;}
let WNO_IN=false;
// off unless the manager ticks it (BUG-340): the headline win chance is the same for every viewer
const wnOfcOn=()=>!!(UI&&UI.dash&&UI.dash.ofc===true);
{const _f=fcProj;fcProj=function(T){const r=_f.apply(this,arguments);if(WNO_IN||!wnOfcOn())return r;try{const me=myTeamNum();if(!me||T===me||dOpp(me)!==T||wk[0]!==wnCur()[0]||r.done)return r;
  WNO_IN=true;const f=wnOppF(me);WNO_IN=false;if(!f||!(f.exp>0))return r;return {...r,fin:r.fin.map((v,i)=>v+(f.boost[i]||0)),ofc:f.exp};}catch(e){WNO_IN=false;return r;}};}
DW.of={name:"Opponent move forecast",desc:"How your opponent usually streams and the moves they're likely to make before Sunday. Tick the box to count them in your win chance and the planner.",s:"w",
  view(w,T){WNO_IN=true;let f;try{f=wnOppF(T);}finally{WNO_IN=false;}if(!f)return dashEmpty("No matchup this week.");const on=dShort(f.O),h=f.h;
    const me=fcProj(T).fin;WNO_IN=true;let opRaw;try{opRaw=fcProj(f.O).fin;}finally{WNO_IN=false;}const opF=opRaw.map((v,i)=>v+(f.boost[i]||0));
    const wp=X=>{try{return winProb({fin:me},{fin:X});}catch(e){return null;}},a=wp(opRaw),b=wp(opF);
    const days=WN_DAYS.map(d=>({d,c:h.dayC[d]||0})),mx=Math.max(1,...days.map(x=>x.c));
    const pos=Object.entries(h.posC).sort((x,y)=>y[1]-x[1]).slice(0,3).map(([p,c])=>`${p} ${c}`).join(" · ");
    return `<div class="ow-h"><span><small>If they sit still</small><b class="num">${a!=null?dPct(a)+"%":"–"}</b></span><span class="pl-arr" aria-hidden="true">→</span><span class="${b<a-.02?"dn":"ok"}"><small>With their usual moves</small><b class="num">${b!=null?dPct(b)+"%":"–"}</b></span>
      <p>${esc(on)} makes <span class="wn-b">${h.avg.toFixed(1)}</span> pickups a matchup (${h.per.length?h.per.join(", "):"no full matchup yet"}), ${h.thisWk} so far this one. Expect about <span class="wn-b">${f.exp.toFixed(1)}</span> more in the ${f.left} day${f.left===1?"":"s"} left.</p></div>
      <div class="wn-days">${days.map(x=>`<span><i style="height:${Math.round(x.c/mx*100)}%"></i><small>${x.d}</small></span>`).join("")}</div>
      <p class="dsm muted">Their pickups by weekday this season${pos?` · positions: ${esc(pos)}`:""}.</p>
      <label class="wn-sw"><input type="checkbox" data-ofc ${wnOfcOn()?"checked":""}> Count their likely moves in my win chance and the planner</label>`;}};
document.addEventListener("change",e=>{const b=e.target.closest("[data-ofc]");if(!b)return;const v=b.checked;if(prefKey())dashBoardSet({ofc:v});else UI={...UI,dash:{...(UI.dash||{}),ofc:v}};WNO_K="";DPL_K="";dashDraw();},true);

// ---------- 4 Role change radar ----------
function wnRoles(){const out=[];const games=n=>Object.entries(DAYLINES[n]||{}).filter(([sp,l])=>+sp<=TODAY&&l&&l[K.MIN]>0).sort((a,b)=>+a[0]-+b[0]);
  wnFA().forEach(D=>{if(INJ[D.n]==="OUT")return;const g=games(D.n);if(g.length<6)return;const r=g.slice(-3),p=g.slice(0,-3);if(+r[0][0]<TODAY-8)return;
    const avg=(a,i)=>a.reduce((s,[,l])=>s+(+l[i]||0),0)/a.length,m1=avg(r,K.MIN),m0=avg(p,K.MIN),f1=avg(r,K.FGA),f0=avg(p,K.FGA);
    if(m1-m0<6&&f1-f0<4)return;if(m1<20)return;
    const out_=Object.values(DIR).filter(x=>x.t===D.t&&x.n!==D.n&&INJ[x.n]==="OUT"&&x.rk&&x.rk<=200).map(x=>x.n);
    out.push({n:D.n,t:D.t,m0,m1,f0,f1,why:out_.length?`${dashLast(out_[0])} out`:"",z:zOf(lineSum(r.map(x=>x[1])).map(v=>v/3))});});
  return out.sort((a,b)=>(b.m1-b.m0)-(a.m1-a.m0)).slice(0,6);}
DW.rc={name:"Role change radar",desc:"Free agents whose minutes or shots jumped in their last 3 games, before the rankings catch up.",s:"w",
  view(){const r=wnRoles();if(!r.length)return `<p class="dempty okc">✓ No free agent has had a jump in minutes lately.</p>`;
    return `<ol class="wn-l">${r.map(x=>`<li>${dFace(x.n,x.t,"sm")}<span><b>${dashNm(x.n)}</b><small class="muted">${esc(x.t)} · ${Math.round(x.m0)}→<b>${Math.round(x.m1)}</b> min · ${x.f0.toFixed(1)}→${x.f1.toFixed(1)} shots${x.why?` · ${esc(x.why)}`:""}</small></span><b class="num ${x.m1-x.m0>=8?"ok":""}">+${Math.round(x.m1-x.m0)}</b></li>`).join("")}</ol>
      <p class="dsm muted">Last 3 games vs his games before. Shown: free agents up 6+ minutes or 4+ shots, playing 20+ minutes.</p>`;}};

// ---------- 5 IR stash planner ----------
function wnIR(T){const irMax=+((L&&L.slots)||{}).IR||0,P=dNowP(T),sp0=Math.min(TODAY,SEASON_END),onIR=P.filter(p=>slotOn(p,sp0)===13),act=P.length-onIR.length,aMax=typeof activeMax==="function"?activeMax():13;
  const ret=n=>{const r=((NBA&&NBA.injd)||{})[n]?.r;return r?String(r).slice(0,10):"";};
  const back=onIR.map(p=>({n:p.n,t:p.t,r:ret(p.n),st:INJ[p.n]||""})).map(x=>({...x,soon:x.st!=="OUT"||(x.r&&new Date(x.r)<=new Date(Date.now()+3*864e5))}));
  const weak=wnAct(T).map(p=>({n:p.n,z:wnZ(p.n)??-9})).sort((a,b)=>a.z-b.z)[0];
  const stash=wnFA().filter(D=>INJ[D.n]==="OUT"&&D.rk&&D.rk<=150).map(D=>({n:D.n,t:D.t,rk:D.rk,r:ret(D.n),why:typeof outWhy==="function"?outWhy(D.n):""})).sort((a,b)=>a.rk-b.rk).slice(0,5);
  return {irMax,free:Math.max(0,irMax-onIR.length),onIR:back,act,aMax,weak,stash};}
DW.is={name:"IR stash planner",desc:"Injured free agents worth an empty IR slot, and your IR players coming back.",s:"w",
  view(w,T){const r=wnIR(T);if(!r.irMax)return dashEmpty("This league has no IR slots.");
    const mine=r.onIR.length?`<p class="wn-sub">Your IR (${r.onIR.length} of ${r.irMax})</p><ul class="wn-l">${r.onIR.map(x=>`<li>${dFace(x.n,x.t,"sm")}<span><b>${dashNm(x.n)}</b><small class="muted">${x.st!=="OUT"?`<b class="dn">no longer OUT: move him off IR</b>`:x.r?`back around ${esc(x.r.slice(5))}`:"no return date"}</small></span>${x.soon&&r.weak?`<small class="pl-pk">then drop ${esc(dashLast(r.weak.n))}</small>`:""}</li>`).join("")}</ul>`:"";
    const st=r.free?(r.stash.length?`<p class="wn-sub">Stash now: ${r.free} open IR slot${r.free>1?"s":""}</p><ol class="wn-l">${r.stash.map(x=>`<li>${dFace(x.n,x.t,"sm")}<span><b>${dashNm(x.n)}</b><small class="muted">${esc(x.t)} · rank ${x.rk}${x.why?` · ${esc(x.why)}`:""}${x.r?` · back ${esc(x.r.slice(5))}`:""}</small></span></li>`).join("")}</ol>`:`<p class="dempty muted">No injured free agent worth a stash right now.</p>`)
      :`<p class="dsm muted">Your IR slots are full.</p>`;
    return mine+st+`<p class="dsm muted">Only OUT players can go on IR. Adding a stash still uses a pickup${r.act>=r.aMax?", and your active roster is full, so it needs a drop":""}.</p>`;}};

// ---------- 6 Sell high, buy low ----------
function wnSB(T){const rw=regWeeks(),pd=[];for(let n=rw+1;n<=Math.min(rw+3,CAL.length);n++)pd.push(...wnDays(CAL[n-1]));
  const pg=n=>{const t=(DIR[n]||{}).t;return t?pd.filter(sp=>gameOn(t,sp)).length:0;};
  const row=(n,X)=>{const h=recentPG(n,14),s=recentPG(n,400);if(!h||!s||(h.g||0)<4||(s.g||0)<8)return null;const zh=zOf(h.pg),zs=zOf(s.pg);return {n,X,t:(DIR[n]||{}).t,zh,zs,d:zh-zs,pg:pg(n)};};
  const sell=dNowP(T).map(p=>row(p.n,T)).filter(x=>x&&x.d>=2).sort((a,b)=>b.d-a.d).slice(0,3);
  const buy=[];Object.keys(TEAMS).map(Number).filter(X=>X!==T).forEach(X=>dNowP(X).forEach(p=>{const r=row(p.n,X);if(r&&r.d<=-2&&r.zs>=2)buy.push(r);}));
  return {sell,buy:buy.sort((a,b)=>(a.d-b.d)||(b.pg-a.pg)).slice(0,4),pdays:pd.length};}
DW.sb={name:"Sell high, buy low",desc:"Players running hot or cold against their season, with their games in the playoff weeks.",s:"w",
  view(w,T){const r=wnSB(T);const li=(x,kind)=>`<li>${dFace(x.n,x.t,"sm")}<span><b>${dashNm(x.n)}</b><small class="muted">${kind==="b"?esc(dShort(x.X))+" · ":""}last 14 days ${x.zh.toFixed(1)} vs season ${x.zs.toFixed(1)} · ${x.pg} playoff games</small></span><button class="btn sm ghost" data-sbpk="${kind}" data-n="${esc(x.n)}" data-x="${x.X}">Trade package</button></li>`;
    if(!r.sell.length&&!r.buy.length)return `<p class="dempty okc">✓ No big hot or cold streaks right now.</p>`;
    return `${r.sell.length?`<p class="wn-sub">Sell high: yours, running hot</p><ol class="wn-l">${r.sell.map(x=>li(x,"s")).join("")}</ol>`:""}
      ${r.buy.length?`<p class="wn-sub">Buy low: good players in a slump</p><ol class="wn-l">${r.buy.map(x=>li(x,"b")).join("")}</ol>`:""}
      <p class="dsm muted">Numbers are value per game (z-score) over 8 categories. Playoff games = his games in playoff weeks ${regWeeks()+1} to ${regWeeks()+3}.</p>`;}};
document.addEventListener("click",e=>{const b=e.target.closest("[data-sbpk]");if(!b||typeof pkOpen!=="function")return;e.stopPropagation();const T=dashT(),n=b.dataset.n,X=+b.dataset.x;
  if(b.dataset.sbpk==="s")pkOpen(T,[n],0,[]);else pkOpen(T,[],X,[n]);},true);

// ---------- 7 Matchup review (past matchups, under the recap) ----------
function wnReview(T,w){const O=opponentIn(T,w[0]);if(!O||!TEAMS[O])return null;const days=wnDays(w).filter(sp=>sp<TODAY);
  const a=dayTotals(T,days)||new Array(10).fill(0),b=dayTotals(O,days)||new Array(10).fill(0);
  // bench games that could have started: a bench player who played on a day a starting slot he fits held someone with no game
  const miss=[];days.forEach(sp=>{const P=TEAMS[T].P.filter(p=>ownerOn(p.n,sp)===T),idle=P.filter(p=>startedOn(p,sp)&&!(p.d[sp]&&p.d[sp][K.MIN]>0)).map(p=>slotOn(p,sp));
    P.filter(p=>slotOn(p,sp)===12&&p.d[sp]&&p.d[sp][K.MIN]>0).sort((x,y)=>zOf(y.d[sp].slice(0,11))-zOf(x.d[sp].slice(0,11))).forEach(p=>{const el=(DIR[p.n]&&DIR[p.n].el)||[11];const i=idle.findIndex(s=>s===11||el.includes(s));if(i<0)return;idle.splice(i,1);miss.push({n:p.n,sp,l:p.d[sp]});});});
  const mt=lineSum(miss.map(x=>x.l)),plus=a.map((v,i)=>v+(mt[i]||0));
  const lost=CATS.filter(c=>val(a,c)<val(b,c)-1e-9).map(c=>({c,me:val(a,c),op:val(b,c),flip:val(plus,c)>val(b,c)+1e-9}));
  const used=wnJoins(T).filter(x=>x.sp>=w[1]&&x.sp<=w[2]).length,lim=addLimitFor(w[1])||0;
  return {O,miss,mt,lost,used,lim,before:h2h(a,b),after:h2h(plus,b)};}
function wnSeasonMiss(T){let n=0;CAL.forEach(w=>{if(w[2]<TODAY&&w[0]<=wnCur()[0]){const r=wnReview(T,w);if(r)n+=r.miss.length;}});return n;}
{const _r=dwkRecap;dwkRecap=function(T){const h=_r.apply(this,arguments);try{if(!h||typeof dwkMode!=="function"||dwkMode()!=="past")return h;const r=wnReview(T,wk);if(!r)return h;
  const lost=r.lost.length?`<ul class="wn-rv">${r.lost.map(x=>`<li><b>${esc(x.c[0])}</b> lost ${wnF(x.me,x.c)} to ${wnF(x.op,x.c)}${x.flip?` · <b class="ok">your missed bench games would have won it</b>`:""}</li>`).join("")}</ul>`:`<p class="okc">✓ You won or tied every category.</p>`;
  const rec=r.before.slice(0,r.before[2]?3:2).join("-"),rec2=r.after.slice(0,r.after[2]?3:2).join("-");
  const box=`<div class="wn-review"><p class="wn-sub">Matchup review</p>${lost}
    <p class="dsm">${r.miss.length?`<b>${r.miss.length}</b> bench game${r.miss.length>1?"s":""} could have started (${r.miss.slice(0,4).map(x=>`${esc(dashLast(x.n))} ${esc(dow(x.sp))}`).join(", ")}${r.miss.length>4?"…":""})${rec2!==rec?`: starting them makes it <b>${rec2}</b> instead of ${rec}`:""}.`:"✓ No bench game was left out of a slot you could use."} Pickups used: <b>${r.used}</b>${r.lim?` of ${r.lim}`:""}. Season so far: <b>${wnSeasonMiss(T)}</b> bench games left out.</p></div>`;
  const i=h.lastIndexOf("</div>");return i<0?h+box:h.slice(0,i)+box+h.slice(i);}catch(e){return h;}};}

// ---------- today-only tools step aside on other matchups; New Era + layout ----------
["nx","rg","of","rc","is"].forEach(k=>{try{DWK_NOW.add(k);}catch(e){}});
{const s=document.createElement("style");s.textContent=[...["nx","rg","of","rc","is"]].map(k=>`.dash.dwk-off .dtile.dk-${k}`).join(",")+`{display:none!important}
.wn-lead{margin:0 0 8px;font-size:.9rem}.wn-sub{margin:10px 0 6px;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.wn-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}.wn-tag{padding:3px 9px;border-radius:999px;border:1px solid var(--line);font-size:.78rem}.wn-tag.hi,.wn-tag.ok{border-color:#22c55e;color:#16a34a}.wn-tag.dn{border-color:#ef4444;color:#dc2626}.wn-tag.mid{border-color:#f59e0b;color:#d97706}
.wn-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}.wn-l>li{display:flex;align-items:center;gap:10px}.wn-l>li>span{flex:1;min-width:0;display:flex;flex-direction:column}.wn-l small{font-size:.74rem}.wn-l .num.ok{color:#16a34a}
.wn-days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;height:64px;align-items:end;margin:6px 0}.wn-days>span{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:3px}.wn-days i{display:block;width:70%;min-height:2px;border-radius:4px 4px 0 0;background:var(--accent,#2f6fed)}.wn-days small{font-size:.62rem;color:var(--muted)}
.wn-l .dface{flex:none}.ow-h p .wn-b{font-weight:800}.wn-sw{display:flex;gap:8px;align-items:center;font-size:.8rem;margin-top:6px}
.wn-review{margin-top:12px;padding-top:10px;border-top:1px dashed var(--line)}.wn-rv{margin:0 0 6px;padding-left:18px;font-size:.84rem}.wn-rv .ok{color:#16a34a}`;document.head.appendChild(s);}
NEP_DEF.splice(0,NEP_DEF.length,
  ["xa","f"],["kp","f"],
  ["hd","f",{t:"Right now",sub:"Injury news, today's lineups and anything to fix before tip-off"}],["fw","f"],["gp","w"],["cd","s"],["tl","w"],["otl","w"],["rg","w"],["rc","w"],
  ["hd","f",{t:"Win this week",sub:"Who to stream, which categories to chase and what your opponent is doing"}],["pl","f"],["of","w"],["cl","w"],["ow","s"],["op","s"],
  ["hd","f",{t:"Next week",sub:"Get a head start on the next matchup"}],["nx","f"],
  ["hd","f",{t:"Build your team",sub:"Trades and pickups that make you better for the rest of the season"}],["tg","f"],["sb","w"],["is","w"],["id","f"],["or","w"],["hc","s"],
  ["hd","f",{t:"The season",sub:"Your path to the playoffs, week by week"}],["sv","f"],["po","w"],["ps","s"],["ls","f"]);
NEP_VER=9;
