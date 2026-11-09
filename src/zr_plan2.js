/* ============================================================================
   PLANNER PRO (2.43, Arp 2026-11-05: "we should be able to do more, show me
   the best you can do").
   - Smarter search: a beam search keeps the 3 best partial plans at every
     step instead of one, so a weaker first move that sets up a better chain
     can still win.
   - Your controls (saved per login): skip any suggested player, mark each
     category Target (counts 1.5x) or Punt (ignored), allow or forbid drops,
     and how many pickups to use.
   - Each move shows what it is worth on its own and which categories it moves.
   - A who-plays-when grid: every player on your roster plus the planned
     pickups, each remaining day: starts, sits (no open slot), no game, gone.
   - Add pre-picks the planned drop in the add sheet.
   - The search runs after the page paints, so the dashboard never waits on it.
   ============================================================================ */
// open roster spots (BUG-296): ROSTER_MAX counts the IR slots, but only activeMax() players may be off IR,
// so a full active roster has no open spot even with an empty IR slot. Pending claims with no drop use a spot too.
const plOpen=T=>{const sl=typeof legalSlots==="function"?legalSlots(T):null,ns=sl?Object.keys(sl):rosterNow(T),act=sl?ns.filter(n=>sl[n]!==13).length:ns.length;
  const aMax=typeof activeMax==="function"?activeMax():ROSTER_MAX,cl=!mirror()&&typeof myClaims==="function"?myClaims(T).filter(c=>c.season===SEASON&&!c.drop).length:0;
  return Math.max(0,Math.min(ROSTER_MAX-ns.length,aMax-act)-cl);};
// BUG-302 (Arp 2026-11-05): a player you picked up can't be dropped on the day you picked him up.
// Pickup day = the add's day in the move log (mirror mode: the first day ESPN listed him). A planned drop is
// made after day d0-PL_LAG's games, so it has to be later than the pickup day: d0 >= pickup day + 1 + PL_LAG.
function plPickDay(T,n){for(let i=TXLOG.length-1;i>=0;i--){const t=TXLOG[i];if(t.ok&&t.add===n&&tnum(t.team)===T&&t.type!=="trade")return t.day??t.addDay??null;}
  const iv=(OWN[n]||[]).find(i=>i.team===T&&i.to===Infinity);return iv?iv.from:null;}
const plMinDrop=(T,n)=>{const P=plPickDay(T,n);return P==null?0:P+1+PL_LAG;};
const PLO=()=>{const o=(UI.dash&&UI.dash.plan)||{};return {x:o.x||[],d:Array.isArray(o.d)?o.d:null,c:o.c||{},n:o.n||0,ad:o.ad||[]};};
function dPlanSave(o){if(prefKey())dashBoardSet({plan:o});else UI={...UI,dash:{...(UI.dash||{}),plan:o}};DPL_K="";}
function dPlanBuild2(T,o){const opp=dOpp(T);if(!opp)return null;
  const days=DAYS.filter(sp=>sp>=TODAY);if(!days.length)return {opp,done:true};
  const B=fcProj(opp).fin,now=score(T),K=now.length,lim=+L.addLimit||0,mode=L.addMode||"matchup";
  // BUG-306: pickups already made this matchup count against the limit in mirror mode too (the move log is empty there)
  const usedWk=typeof plUsedWk==="function"?plUsedWk(T):0;
  let cap=mode==="day"&&lim?lim*days.length:Math.max(0,(lim||PL_MAX)-usedWk);cap=Math.max(0,Math.min(cap,PL_MAX));
  const budget=o.n?Math.min(o.n,cap):cap,perDay=mode==="day"&&lim?lim:99;
  let W=CATS.map(()=>1);
  const score2=tot=>CATS.reduce((s,c,i)=>s+W[i]*dLogit(val(tot,c),val(B,c),c),0);
  const zOfP=p=>{const r=recentPG(p.n,14),pj=pgLine(p.pj);return pj?zOf(pj):r?zOf(r.pg):-5;};
  const regs=dNowP(T).map(p=>({n:p.n,t:p.t,el:(p.el&&p.el.length?p.el:(DIR[p.n]&&DIR[p.n].el)||[11]),pj:pgLine(p.pj),z:zOfP(p),ir:slotOn(p,TODAY)===13,out:p.st==="OUT",minD:plMinDrop(T,p.n)}));
  const act=regs.filter(x=>!x.ir);
  const fits=(el,slot)=>slot===11||el.includes(slot);
  const MEMO=new Map();const dayLine=(sp,xs)=>{const mk=sp+"|"+xs.map(x=>x.n).sort().join(",");const hit=MEMO.get(mk);if(hit)return hit;const owner=new Array(LINEUP.length).fill(null),tot=new Array(K).fill(0);
    const tryA=(x,seen)=>{for(let j=0;j<LINEUP.length;j++){if(seen[j]||!fits(x.el,LINEUP[j]))continue;seen[j]=1;if(owner[j]==null||tryA(owner[j],seen)){owner[j]=x;return true;}}return false;};
    xs.slice().sort((a,b)=>b.z-a.z).forEach(x=>{if(tryA(x,[])&&x.pj)x.pj.forEach((v,i)=>tot[i]+=+v||0);});
    const out={tot,used:new Set(owner.filter(Boolean).map(x=>x.n)),free:owner.filter(v=>v==null).length};MEMO.set(mk,out);return out;};
  const plays=(x,sp)=>!x.out&&gameOn(x.t,sp)&&(sp>TODAY||!locked({t:x.t},sp));
  const evalPlan=pl=>{const tot=now.slice(),use={};
    days.forEach(sp=>{const xs=act.filter(r=>!(pl.drops[r.n]!=null&&sp>=pl.drops[r.n])&&plays(r,sp));
      pl.adds.forEach(a=>{if(sp>=a.from&&sp<=a.to&&plays(a.x,sp))xs.push(a.x);});
      const r=dayLine(sp,xs);r.tot.forEach((v,i)=>tot[i]+=v);use[sp]={used:r.used,free:r.free,on:new Set(xs.map(x=>x.n))};});
    return {tot,exp:dExpCats(tot,B),s:score2(tot),use};};
  // best path: from where each category stands with no moves, target the ones in reach and punt the lost ones (Arp 2026-11-05: automatic, still adjustable)
  const bp0=evalPlan({drops:{},adds:[]}).tot,p0=CATS.map(c=>dLogit(val(bp0,c),val(B,c),c));
  const autoC=CATS.map((c,i)=>p0[i]<=(c[1]==="pct"?.12:.06)?"p":p0[i]<.85?"t":"n");
  const strat=CATS.map((c,i)=>({c,p:p0[i],auto:autoC[i],eff:o.c[c[0]]||autoC[i],own:!!o.c[c[0]]}));
  W=strat.map(x=>x.eff==="p"?0:x.eff==="t"?1.5:1);
  const b0=evalPlan({drops:{},adds:[]});
  const skip=new Set(o.x);
  const fa=Object.values(DIR).filter(D=>!ownerNow(D.n)&&!skip.has(D.n)&&INJ[D.n]!=="OUT"&&D.t&&days.some(sp=>gameOn(D.t,sp))).map(D=>{const r=recentPG(D.n,14),pj=pgLine(D.pj)||(r&&r.pg);if(!pj)return null;
      return {n:D.n,t:D.t,el:(D.el&&D.el.length?D.el:[11]),pj,z:zOf(pj),w:typeof onWaivers==="function"&&onWaivers(D.n)};}).filter(Boolean).sort((a,b)=>b.z-a.z).slice(0,18);
  const openN=plOpen(T);
  const keepRk=Object.keys(TEAMS).length*13,zs=n=>{const r=recentPG(n,400);return r?zOf(r.pg):-9;};
  // players you're willing to drop: your list, or until you set one, the 3 weakest who aren't top-ranked (Arp 2026-11-05)
  const sugg=act.filter(r=>!r.out&&!(DIR[r.n]&&DIR[r.n].rk&&DIR[r.n].rk<=keepRk)).map(r=>({...r,zs:zs(r.n)})).sort((a,b)=>a.zs-b.zs).slice(0,3);
  // planner pickups you made join the list automatically (BUG-301, zx_track.js sets o.ad / o.d)
  const adA=(o.ad||[]).filter(n=>act.some(r=>r.n===n)&&!sugg.some(r=>r.n===n));
  // BUG-315: a list whose players have all left the roster (dropped since) goes back to the automatic suggestions
  const dKeep=o.d?o.d.filter(n=>act.some(r=>r.n===n)):null;
  const dAuto=!o.d||(o.d.length>0&&!dKeep.length),dl=dAuto?[...sugg.map(r=>r.n),...adA]:dKeep;
  const dropC=dAuto?[...sugg,...act.filter(r=>adA.includes(r.n)).map(r=>({...r,zs:zs(r.n)}))]:act.filter(r=>dl.includes(r.n)).map(r=>({...r,zs:-99})).slice(0,8);
  const end=days[days.length-1];
  // every next move from a plan, scored
  // position limits (BUG-326, ESPN: max 4 C off IR): the roster on any day left can't go over a limit it isn't already over
  const PLIM=typeof posMaxL==="function"?posMaxL():{},limK=Object.keys(PLIM).filter(k=>+PLIM[k]>0);
  // counted on every day left, so a pickup can't arrive before the center it replaces is gone
  const posN=pl=>{const c={};days.forEach(sp=>{const d={},inc=n=>{const k=posMain(n);if(limK.includes(k))d[k]=(d[k]||0)+1;};
    act.forEach(r=>{if(pl.drops[r.n]==null||sp<pl.drops[r.n])inc(r.n);});pl.adds.forEach(a=>{if(sp>=a.from&&sp<=a.to)inc(a.x.n);});limK.forEach(k=>c[k]=Math.max(c[k]||0,d[k]||0));});return c;};
  const pos0=limK.length?posN({drops:{},adds:[]}):{},posOk=pl=>{if(!limK.length)return true;const c=posN(pl);return limK.every(k=>(c[k]||0)<=Math.max(+PLIM[k],pos0[k]||0));};
  const kids=st=>{const out=[],pl=st.pl;const push=(np,kind)=>{if(!posOk(np))return;const r=evalPlan(np);const g=r.s-st.r.s;if(g>.03)out.push({pl:np,r,open:st.open-(kind==="open"?1:0)});};
    for(const x of fa){if(pl.adds.some(a=>a.x.n===x.n))continue;
      const ok=d=>d>=TODAY+PL_LAG+(x.w?1:0)&&plays(x,d)&&pl.adds.filter(a=>a.from===d).length<perDay;const d0=days.find(ok);if(d0==null)continue;
      if(st.open>0)push({drops:pl.drops,adds:[...pl.adds,{x,from:d0,to:end,spot:"open"+st.open}]},"open");
      for(const p of dropC){if(pl.drops[p.n]!=null||p.zs>=zs(x.n))continue;const dd=(p.minD||0)>d0?days.find(d=>d>=p.minD&&ok(d)):d0;if(dd==null)continue;push({drops:{...pl.drops,[p.n]:dd},adds:[...pl.adds,{x,from:dd,to:end,spot:p.n}]},"drop");}
      pl.adds.forEach((a,i)=>days.forEach(d=>{if(a.to!==end||d<=a.from||!ok(d))return;push({drops:pl.drops,adds:[...pl.adds.map((b,j)=>j===i?{...b,to:d-1}:b),{x,from:d,to:end,spot:a.spot}]},"swap");}));}
    return out.sort((a,b)=>b.r.s-a.r.s).slice(0,4);};
  const sig=pl=>pl.adds.map(a=>a.x.n+"@"+a.from+"-"+a.to).sort().join("|");
  let beam=[{pl:{drops:{},adds:[]},r:b0,open:openN}],best=beam[0];
  for(let k=0;k<budget;k++){const pool=[],seen=new Set();beam.forEach(st=>kids(st).forEach(c=>{const s=sig(c.pl);if(!seen.has(s)){seen.add(s);pool.push(c);}}));
    if(!pool.length)break;pool.sort((a,b)=>b.r.s-a.r.s);beam=pool.slice(0,3);if(beam[0].r.s>best.r.s+1e-9)best=beam[0];}
  const plan=best.pl,cur=best.r;
  // the moves, with what each is worth on its own (plan without it)
  const without=a=>{const prev=plan.adds.find(b=>b!==a&&b.spot===a.spot&&b.to===a.from-1),next=plan.adds.find(b=>b!==a&&b.spot===a.spot&&b.from===a.to+1);
    const adds=plan.adds.filter(b=>b!==a&&b!==next).map(b=>b===prev?{...b,to:a.to}:b);if(next)adds.push(prev?{...next}:{...next});
    const drops={...plan.drops};if(!prev&&!next&&!String(a.spot).startsWith("open"))delete drops[a.spot];return evalPlan({drops,adds});};
  const moves=plan.adds.map(a=>{const g=days.filter(sp=>sp>=a.from&&sp<=a.to&&cur.use[sp].used.has(a.x.n));
    const prev=plan.adds.find(b=>b!==a&&b.spot===a.spot&&b.to===a.from-1),drop=prev?prev.x.n:String(a.spot).startsWith("open")?null:a.spot;
    let wo=null;try{wo=without(a);}catch(e){}const dc=wo?CATS.map(c=>({c,d:dLogit(val(cur.tot,c),val(B,c),c)-dLogit(val(wo.tot,c),val(B,c),c)})).filter(x=>x.d>=.04).sort((x,y)=>y.d-x.d):[];
    return {x:a.x,from:a.from,to:a.to,games:g,drop,worth:wo?cur.exp-wo.exp:null,dc};}).filter(m=>m.games.length).sort((a,b)=>a.from-b.from||b.games.length-a.games.length);
  const pB=CATS.map(c=>dLogit(val(b0.tot,c),val(B,c),c)),pA=CATS.map(c=>dLogit(val(cur.tot,c),val(B,c),c));
  const wp=tot=>{try{return winProb({now,fin:tot,done:false},{now:score(opp),fin:B,done:false});}catch(e){return null;}};
  return {opp,days,budget,cap,lim,mode,moves,b0,cur,pB,pA,strat,dl,dAuto,w0:wp(b0.tot),w1:wp(cur.tot),gain:cur.exp-b0.exp,games:moves.reduce((s,m)=>s+m.games.length,0),regs,plan,o};}
let DPL_BUSY=false;
dPlan=function(T,sync){const o=PLO(),k=T+":"+TODAY+":"+TXLOG.length+":"+(LIVE&&LIVE.at||0)+":"+(typeof REV!=="undefined"?REV:"")+":"+JSON.stringify(o);
  if(k===DPL_K)return DPL;if(!sync){if(!DPL_BUSY){DPL_BUSY=true;setTimeout(()=>{DPL_BUSY=false;try{DPL=dPlanBuild2(T,o);}catch(e){console.warn(e);DPL=null;}DPL_K=k;if(nav==="dash")dashDraw();},30);}return undefined;}
  DPL_K=k;try{DPL=dPlanBuild2(T,o);}catch(e){console.warn(e);DPL=null;}return DPL;};

DW.pl.desc="Plans every pickup for the rest of this matchup inside your pickup limit, looking several moves ahead: who to add, who to drop, when to swap streamers. Picks the categories to target or punt for you (you can change them), only drops players you say you're willing to drop, lets you skip players, and see who plays each day.";
DW.pl.view=function(w,T){const r=dPlan(T);if(r===undefined)return `<div class="pl-wait"><i></i><i></i><i></i><span>Planning your week…</span></div>`;
  if(!r)return dashEmpty("No matchup this week.");if(r.done)return dashEmpty("This matchup is over. The planner wakes up for the next one.");
  const o=r.o,ed=dCanEdit(T),on=dShort(r.opp),phone=PHONE(),dn=sp=>sp===TODAY?"Today":dow(sp),who=prefKey();
  const head=`<div class="pl-h"><div class="pl-ba"><span><small>No moves</small><b class="num">${dRound(r.b0.exp).toFixed(1)}</b><i>${r.w0!=null?dPct(r.w0)+"% win":""}</i></span><span class="pl-arr" aria-hidden="true">→</span><span class="pl-after"><small>With the plan</small><b class="num">${dRound(r.cur.exp).toFixed(1)}</b><i>${r.w1!=null?dPct(r.w1)+"% win":""}</i></span></div>
    <p class="pl-sum">${r.moves.length?`<b>${r.moves.length} pickup${r.moves.length>1?"s":""}, ${r.games} extra game${r.games>1?"s":""}</b> · expected categories won vs ${esc(on)} out of ${CATS.length}`:`Expected categories won vs ${esc(on)} out of ${CATS.length}`}<br><small class="muted">A pickup plays from the next day, and only counts on days he has a game and fits an open spot. Looks several moves ahead.</small></p></div>`;
  // controls
  const sx=r.strat,nm=k=>sx.filter(x=>x.eff===k).map(x=>esc(x.c[0])),safe=sx.filter(x=>x.eff==="n"&&x.p>=.85).map(x=>esc(x.c[0]));
  const path=`<div class="pl-path"><b>Best path vs ${esc(on)}</b>${nm("t").length?`<span class="t">★ Target ${nm("t").join(", ")}</span>`:""}${safe.length?`<span class="s">✓ Safe ${safe.join(", ")}</span>`:""}${nm("p").length?`<span class="p">✕ Punt ${nm("p").join(", ")}</span>`:""}<small class="muted">${sx.some(x=>x.own)?"Your changes are marked; the rest is picked for you.":"Picked for you from where each category stands. Tap a category below to change it."}</small></div>`;
  const ctl=`<div class="pl-ctl"><div class="pl-row"><span class="pl-lab">Categories</span>${sx.map((x,i)=>`<button class="pl-cat ${x.eff==="n"?"":x.eff}${x.own?" own":""}" data-plc="${esc(x.c[0])}" title="${x.own?"Your choice":"Auto"} · tap: auto → target → punt → normal"><b>${esc(x.c[0])}</b><i class="num">${dPct(r.pA[i])}%</i>${x.eff==="t"?"<em>★</em>":x.eff==="p"?"<em>✕</em>":""}${x.own?"":`<u>auto</u>`}</button>`).join("")}</div>
    <div class="pl-row"><span class="pl-lab">Pickups</span><span class="pl-step"><button data-pln="-1" aria-label="Fewer pickups"${(o.n||r.cap)<=1?" disabled":""}>−</button><b class="num">${o.n?Math.min(o.n,r.cap):r.cap}</b><button data-pln="1" aria-label="More pickups"${(o.n||r.cap)>=r.cap?" disabled":""}>+</button></span><small class="muted">of ${r.cap} you can use</small>
      ${o.x.length||o.d||Object.keys(o.c).length||o.n?`<button class="pl-reset" data-plreset>Reset all</button>`:""}</div>
    ${(()=>{const dn2=new Set(r.dl),mine=r.regs.filter(x=>!x.ir&&!dn2.has(x.n)).sort((a,b)=>a.z-b.z);
      return `<div class="pl-row pl-keep"><span class="pl-lab">Willing to drop</span>${r.dl.map(n=>`<button class="pl-lock" data-plunk="${esc(n)}" title="Tap to keep him">${esc(dashLast(n))}${typeof plhList==="function"&&plhList().some(e=>e.dl&&e.a===n)?` <small class="pl-pk">planner pickup</small>`:""}${(()=>{const x=r.regs.find(q=>q.n===n);return x&&x.minD>TODAY+PL_LAG?` <small class="pl-pk">drop from ${esc(dow(x.minD-PL_LAG))}</small>`:"";})()} ✕</button>`).join("")||`<small class="muted">Nobody, so the plan only uses open spots.</small>`}${who&&mine.length?`<select class="pl-add" data-plk aria-label="Add a player you'd drop"><option value="">+ Add a player</option>${mine.map(x=>`<option value="${esc(x.n)}">${esc(x.n)}</option>`).join("")}</select>`:""}${r.dAuto&&r.dl.length?`<small class="muted pl-sg">suggested</small>`:""}</div>`;})()}
    ${o.x.length?`<div class="pl-row"><span class="pl-lab">Skipped</span>${o.x.map(n=>`<button class="pl-skip" data-plux="${esc(n)}" title="Bring back">${esc(dashLast(n))} ↺</button>`).join("")}</div>`:""}
    <p class="dsm muted pl-hint">Tap a category: <b>★ target</b> counts it 1.5×, <b>✕ punt</b> ignores it. ✕ on a move skips that player and re-plans. The plan only drops players on your Willing to drop list; 🔒 on a move takes that player off it.${who?"":" Log in to keep your settings."}</p></div>`;
  if(!r.moves.length)return head+path+ctl+`<p class="dempty okc">✓ No pickup helps with these settings. Your open spots are covered${r.budget?"":", or you've used your pickups"}.</p>`;
  const flips=CATS.map((c,i)=>({c,a:r.pB[i],b:r.pA[i]})).filter(x=>Math.abs(x.b-x.a)>=.05);
  const cats=flips.length?`<div class="pl-cats">${flips.map(x=>`<span class="${x.a<.5&&x.b>=.5?"flip":""}"><b>${esc(x.c[0])}</b><i class="num">${dPct(x.a)}→${dPct(x.b)}%</i></span>`).join("")}</div>`:"";
  const mv=`<ol class="pl-m">${r.moves.map((m,i)=>{const today=m.from-PL_LAG===TODAY;
    const btn=ed&&today?(m.x.w?`<button class="btn sm" data-add="${esc(m.x.n)}">Claim</button>`:`<button class="btn sm" data-pladd="${esc(m.x.n)}"${m.drop?` data-pldrop="${esc(m.drop)}"`:""}>Add</button>`):today?"":`<small class="pl-when muted">${esc(dn(m.from-PL_LAG))}</small>`;
    return `<li style="--d:${i*80}ms"><span class="pl-day">${esc(dn(m.from-PL_LAG))}</span>${dFace(m.x.n,m.x.t,"sm")}<span class="pl-who"><b>Add ${dashNm(m.x.n)}</b><small class="muted">${esc(m.x.t)}${m.drop?` · drop ${esc(dashLast(m.drop))}`:" · open roster spot"} · plays from ${esc(dow(m.from))}${m.x.w?" · on waivers":""}</small>
      ${m.dc.length||m.worth!=null?`<span class="pl-imp">${m.worth!=null?`<b class="num">+${Math.max(0,m.worth).toFixed(2)}</b>`:""}${m.dc.slice(0,4).map(x=>`<i>${esc(x.c[0])} +${dPct(x.d)}</i>`).join("")}</span>`:""}</span>
      <span class="pl-g" aria-label="${m.games.length} games">${r.days.map(sp=>`<i class="${m.games.includes(sp)?"on":sp>=m.from&&sp<=m.to&&gameOn(m.x.t,sp)?"no":""}" title="${esc(dn(sp))}"></i>`).join("")}<small>${m.games.length} g</small></span>
      ${btn}<span class="pl-acts">${who&&m.drop&&r.regs.some(x=>x.n===m.drop)?`<button class="pl-x pl-kp" data-plk1="${esc(m.drop)}" aria-label="Keep ${esc(m.drop)}" title="Keep ${esc(dashLast(m.drop))}: take him off your drop list">🔒</button>`:""}${who?`<button class="pl-x" data-plx="${esc(m.x.n)}" aria-label="Skip ${esc(m.x.n)} and re-plan" title="Skip him">✕</button>`:""}</span></li>`;}).join("")}</ol>`;
  // who plays when
  const rows=[...r.regs.map(x=>({x,k:"reg"})),...r.moves.map(m=>({x:m.x,k:"add",m}))];
  const cell=(row,sp)=>{const u=r.cur.use[sp];const n=row.x.n;
    if(row.k==="reg"){if(row.x.ir)return `<td class="ir" title="IR">IR</td>`;const gone=r.plan.drops[n]!=null&&sp>=r.plan.drops[n];if(gone)return `<td class="gone" title="Dropped">✕</td>`;
      if(!gameOn(row.x.t,sp))return `<td class="ng"></td>`;if(row.x.out)return `<td class="out" title="Out">OUT</td>`;return u.used.has(n)?`<td class="st" title="Starts">●</td>`:`<td class="sit" title="Game, but no open spot">○</td>`;}
    const m=row.m;if(sp<m.from||sp>m.to)return `<td class="na"></td>`;if(!gameOn(row.x.t,sp))return `<td class="ng"></td>`;return u.used.has(n)?`<td class="st add" title="Starts">●</td>`:`<td class="sit" title="Game, but no open spot">○</td>`;};
  const filled=sp=>{const u=r.cur.use[sp];return `${LINEUP.length-u.free}/${LINEUP.length}`;};
  const grid=`<details class="pl-wg"><summary>Who plays when <small class="muted">● starts · ○ has a game but no open spot · ✕ dropped</small></summary><div class="pl-wgw"><table class="pl-tab"><thead><tr><th></th>${r.days.map(sp=>`<th class="${sp===TODAY?"tdy":""}">${esc(sp===TODAY?"Today":dow(sp).slice(0,3))}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(row=>`<tr class="${row.k}"><th>${row.k==="add"?'<i class="pl-new">+</i>':""}${row.k==="reg"&&r.dl.includes(row.x.n)?'<i class="pl-lk" title="Willing to drop">↓</i>':""}${esc(dashLast(row.x.n))}</th>${r.days.map(sp=>cell(row,sp)).join("")}</tr>`).join("")}</tbody>
    <tfoot><tr><th>Spots filled</th>${r.days.map(sp=>`<td class="num">${filled(sp)}</td>`).join("")}</tr></tfoot></table></div></details>`;
  return head+path+cats+mv+ctl+grid+`<p class="dsm muted">Plans from ESPN projections and today's roster. Make each move after that day's games so the player you drop still plays. Add opens the add sheet with the planned drop already picked.</p>`;};

// controls
document.addEventListener("click",e=>{if(nav!=="dash")return;let b;const o=PLO();
  if((b=e.target.closest("[data-plc]"))){e.stopPropagation();const c={...o.c},k=b.dataset.plc;c[k]=!c[k]?"t":c[k]==="t"?"p":c[k]==="p"?"n":undefined;if(!c[k])delete c[k];dPlanSave({...o,c});dashDraw();return;}
  if((b=e.target.closest("[data-pln]"))){e.stopPropagation();const cap=(DPL&&DPL.cap)||PL_MAX,n=Math.max(1,Math.min(cap,(o.n||cap)+(+b.dataset.pln)));dPlanSave({...o,n:n>=cap?0:n});dashDraw();return;}
  if((b=e.target.closest("[data-plx]"))){e.stopPropagation();dPlanSave({...o,x:[...new Set([...o.x,b.dataset.plx])]});dashDraw();return;}
  if((b=e.target.closest("[data-plux]"))){e.stopPropagation();dPlanSave({...o,x:o.x.filter(n=>n!==b.dataset.plux)});dashDraw();return;}
  if((b=e.target.closest("[data-plk1]"))){e.stopPropagation();dPlanSave({...o,d:((DPL&&DPL.dl)||[]).filter(n=>n!==b.dataset.plk1)});dashDraw();return;}
  if((b=e.target.closest("[data-plunk]"))){e.stopPropagation();dPlanSave({...o,d:((DPL&&DPL.dl)||[]).filter(n=>n!==b.dataset.plunk)});dashDraw();return;}
  if((b=e.target.closest("[data-plreset]"))){e.stopPropagation();dPlanSave(o.ad&&o.ad.length?{ad:o.ad}:{});dashDraw();return;}
  if((b=e.target.closest("[data-pladd]"))){e.stopPropagation();sheetAdd(b.dataset.pladd);const d=b.dataset.pldrop;if(d)setTimeout(()=>{const i=[...document.querySelectorAll('#sheetBody input[name="drop"]')].find(x=>x.value===d);if(i){i.checked=true;i.dispatchEvent(new Event("change",{bubbles:true}));i.closest("label")?.scrollIntoView({block:"nearest"});}},0);return;}
},true);
document.addEventListener("change",e=>{if(nav!=="dash")return;const k=e.target.closest("[data-plk]");if(k){if(k.value){const o=PLO();dPlanSave({...o,d:[...new Set([...((DPL&&DPL.dl)||[]),k.value])]});dashDraw();}return;}},true);

{const s=document.createElement("style");s.textContent=`
.pl-pk{font-size:.65rem;opacity:.75;font-weight:600}
.pl-wait{display:flex;align-items:center;gap:6px;padding:24px 4px;color:var(--muted);font-size:.9rem}.pl-wait i{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:plw 1s ease-in-out infinite}.pl-wait i:nth-child(2){animation-delay:.15s}.pl-wait i:nth-child(3){animation-delay:.3s}.pl-wait span{margin-left:6px}
@keyframes plw{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
.pl-ctl{margin:4px 0 14px;padding:12px;border-radius:14px;border:1px dashed var(--line);display:flex;flex-direction:column;gap:10px}
.pl-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.pl-lab{font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);min-width:78px}
.pl-cat{position:relative;display:inline-flex;gap:5px;align-items:center;font:inherit;font-size:.78rem;padding:5px 10px;border-radius:99px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}.pl-cat i{font-style:normal;color:var(--muted)}
.pl-cat.t{border-color:#f59e0b;background:rgba(245,158,11,.14)}.pl-cat.t em{color:#f59e0b}.pl-cat.p{opacity:.55;text-decoration:line-through}.pl-cat em{font-style:normal;font-weight:800}
.pl-step{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:99px;overflow:hidden}.pl-step button{font:inherit;width:30px;height:28px;border:0;background:transparent;color:var(--ink);cursor:pointer;font-size:1rem}.pl-step button:disabled{opacity:.3}.pl-step b{min-width:22px;text-align:center}
.pl-lock{font:inherit;font-size:.76rem;padding:4px 10px;border-radius:99px;border:1px solid color-mix(in srgb,var(--accent) 50%,var(--line));background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--ink);cursor:pointer}.pl-add{font:inherit;font-size:.76rem;padding:4px 8px;border-radius:99px;border:1px dashed var(--line);background:transparent;color:var(--muted);cursor:pointer;max-width:170px}.pl-add option{color:#111}.pl-path{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0 0 12px;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--accent) 9%,transparent);border:1px solid color-mix(in srgb,var(--accent) 35%,var(--line));font-size:.84rem}.pl-path small{flex-basis:100%;font-size:.72rem}.pl-path span{font-weight:700}.pl-path .t{color:#f59e0b}.pl-path .s{color:#22c55e}.pl-path .p{color:#ef4444}
.pl-cat u{text-decoration:none;font-size:.56rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);opacity:.7}.pl-cat.own{box-shadow:inset 0 0 0 1px var(--ink)}.pl-sg{font-style:italic}
.pl-lk{font-style:normal;font-size:.7em;margin-right:3px}.pl-kp{font-size:.8rem}
.pl-tog{display:inline-flex;align-items:center;gap:6px;margin-left:10px;font-size:.84rem;cursor:pointer}.pl-reset,.pl-skip{font:inherit;font-size:.76rem;padding:4px 10px;border-radius:99px;border:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer}.pl-reset{margin-left:auto}
.pl-hint{margin:0}
.pl-imp{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.pl-imp b{font-size:.74rem;color:#22c55e;margin-right:2px}.pl-imp i{font-style:normal;font-size:.68rem;padding:1px 6px;border-radius:6px;background:rgba(34,197,94,.12);color:#22c55e;font-weight:700}
.pl-m li{grid-template-columns:62px 30px minmax(0,1fr) auto auto auto}
.pl-acts{display:flex;gap:6px}.pl-acts:empty{display:none}.pl-x{font:inherit;width:28px;height:28px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer}.pl-x:hover{color:#ef4444;border-color:#ef4444}
.pl-wg{margin:6px 0 10px;border:1px solid var(--line);border-radius:14px;padding:10px 12px}.pl-wg summary{cursor:pointer;font-weight:700;font-size:.9rem}.pl-wg summary small{font-weight:500;margin-left:8px}
.pl-wgw{overflow-x:auto;margin-top:10px}.pl-tab{border-collapse:separate;border-spacing:3px;width:100%;font-size:.8rem}
.pl-tab th{text-align:left;font-weight:600;white-space:nowrap;padding:2px 8px 2px 0;color:var(--ink)}.pl-tab thead th{text-align:center;font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.pl-tab thead th.tdy{color:var(--accent)}
.pl-tab td{text-align:center;height:26px;min-width:34px;border-radius:7px;background:color-mix(in srgb,var(--muted) 8%,transparent);font-size:.8rem}
.pl-tab td.st{background:color-mix(in srgb,var(--accent) 26%,transparent);color:var(--accent)}.pl-tab td.st.add{background:rgba(34,197,94,.22);color:#22c55e;box-shadow:0 0 10px -3px #22c55e}
.pl-tab td.sit{color:#f59e0b;background:rgba(245,158,11,.10)}.pl-tab td.gone{color:#ef4444;background:rgba(239,68,68,.10)}.pl-tab td.ir,.pl-tab td.out{font-size:.6rem;font-weight:800;color:#ef4444}.pl-tab td.na{background:transparent}
.pl-tab tr.add th{color:#22c55e}.pl-new{font-style:normal;font-weight:800;margin-right:4px}.pl-tab tfoot th{font-size:.7rem;color:var(--muted);text-transform:uppercase}.pl-tab tfoot td{background:transparent;font-weight:800;font-size:.75rem}
@media (max-width:760px){.pl-m li{grid-template-columns:28px minmax(0,1fr) auto auto}.pl-day{grid-column:1/5}.pl-g{grid-column:2/3}.pl-m li .btn{grid-column:3;grid-row:2/4;align-self:center}.pl-acts{grid-column:4;grid-row:2/4;align-self:center;flex-direction:column}.pl-lab{min-width:100%}.pl-tog{margin-left:0}}
@media (prefers-reduced-motion:reduce){.pl-wait i{animation:none}}
`;document.head.appendChild(s);}
