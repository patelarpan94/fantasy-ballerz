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
const PLO=()=>{const o=(UI.dash&&UI.dash.plan)||{};return {x:o.x||[],c:o.c||{},drops:o.drops!==false,n:o.n||0};};
function dPlanSave(o){if(prefKey())dashBoardSet({plan:o});else UI={...UI,dash:{...(UI.dash||{}),plan:o}};DPL_K="";}
function dPlanBuild2(T,o){const opp=dOpp(T);if(!opp)return null;
  const days=DAYS.filter(sp=>sp>=TODAY);if(!days.length)return {opp,done:true};
  const B=fcProj(opp).fin,now=score(T),K=now.length,lim=+L.addLimit||0,mode=L.addMode||"matchup";
  let cap=lim?(mode==="day"?lim*days.length:pickupsLeft(T)):PL_MAX;cap=Math.max(0,Math.min(cap,PL_MAX));
  const budget=o.n?Math.min(o.n,cap):cap,perDay=mode==="day"&&lim?lim:99;
  const W=CATS.map(c=>o.c[c[0]]==="p"?0:o.c[c[0]]==="t"?1.5:1);
  const score2=tot=>CATS.reduce((s,c,i)=>s+W[i]*dLogit(val(tot,c),val(B,c),c),0);
  const zOfP=p=>{const r=recentPG(p.n,14),pj=pgLine(p.pj);return pj?zOf(pj):r?zOf(r.pg):-5;};
  const regs=dNowP(T).map(p=>({n:p.n,t:p.t,el:(p.el&&p.el.length?p.el:(DIR[p.n]&&DIR[p.n].el)||[11]),pj:pgLine(p.pj),z:zOfP(p),ir:slotOn(p,TODAY)===13,out:p.st==="OUT"}));
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
  const b0=evalPlan({drops:{},adds:[]});
  const skip=new Set(o.x);
  const fa=Object.values(DIR).filter(D=>!ownerNow(D.n)&&!skip.has(D.n)&&INJ[D.n]!=="OUT"&&D.t&&days.some(sp=>gameOn(D.t,sp))).map(D=>{const r=recentPG(D.n,14),pj=pgLine(D.pj)||(r&&r.pg);if(!pj)return null;
      return {n:D.n,t:D.t,el:(D.el&&D.el.length?D.el:[11]),pj,z:zOf(pj),w:typeof onWaivers==="function"&&onWaivers(D.n)};}).filter(Boolean).sort((a,b)=>b.z-a.z).slice(0,18);
  const openN=Math.max(0,ROSTER_MAX-dNowP(T).length);
  const keepRk=Object.keys(TEAMS).length*13,zs=n=>{const r=recentPG(n,400);return r?zOf(r.pg):-9;};
  const dropC=o.drops?act.filter(r=>!r.out&&!skip.has(r.n)&&!(DIR[r.n]&&DIR[r.n].rk&&DIR[r.n].rk<=keepRk)).map(r=>({...r,zs:zs(r.n)})).sort((a,b)=>a.zs-b.zs).slice(0,3):[];
  const end=days[days.length-1];
  // every next move from a plan, scored
  const kids=st=>{const out=[],pl=st.pl;const push=(np,kind)=>{const r=evalPlan(np);const g=r.s-st.r.s;if(g>.03)out.push({pl:np,r,open:st.open-(kind==="open"?1:0)});};
    for(const x of fa){if(pl.adds.some(a=>a.x.n===x.n))continue;
      const ok=d=>d>=TODAY+PL_LAG+(x.w?1:0)&&plays(x,d)&&pl.adds.filter(a=>a.from===d).length<perDay;const d0=days.find(ok);if(d0==null)continue;
      if(st.open>0)push({drops:pl.drops,adds:[...pl.adds,{x,from:d0,to:end,spot:"open"+st.open}]},"open");
      for(const p of dropC){if(pl.drops[p.n]!=null||p.zs>=zs(x.n))continue;push({drops:{...pl.drops,[p.n]:d0},adds:[...pl.adds,{x,from:d0,to:end,spot:p.n}]},"drop");}
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
  return {opp,days,budget,cap,lim,mode,moves,b0,cur,pB,pA,w0:wp(b0.tot),w1:wp(cur.tot),gain:cur.exp-b0.exp,games:moves.reduce((s,m)=>s+m.games.length,0),regs,plan,o};}
let DPL_BUSY=false;
dPlan=function(T,sync){const o=PLO(),k=T+":"+TODAY+":"+TXLOG.length+":"+(LIVE&&LIVE.at||0)+":"+(typeof REV!=="undefined"?REV:"")+":"+JSON.stringify(o);
  if(k===DPL_K)return DPL;if(!sync){if(!DPL_BUSY){DPL_BUSY=true;setTimeout(()=>{DPL_BUSY=false;try{DPL=dPlanBuild2(T,o);}catch(e){console.warn(e);DPL=null;}DPL_K=k;if(nav==="dash")dashDraw();},30);}return undefined;}
  DPL_K=k;try{DPL=dPlanBuild2(T,o);}catch(e){console.warn(e);DPL=null;}return DPL;};

DW.pl.desc="Plans every pickup for the rest of this matchup inside your pickup limit, looking several moves ahead: who to add, who to drop, when to swap streamers. Skip players, target or punt categories, and see who plays each day.";
DW.pl.view=function(w,T){const r=dPlan(T);if(r===undefined)return `<div class="pl-wait"><i></i><i></i><i></i><span>Planning your week…</span></div>`;
  if(!r)return dashEmpty("No matchup this week.");if(r.done)return dashEmpty("This matchup is over. The planner wakes up for the next one.");
  const o=r.o,ed=dCanEdit(T),on=dShort(r.opp),phone=PHONE(),dn=sp=>sp===TODAY?"Today":dow(sp),who=prefKey();
  const head=`<div class="pl-h"><div class="pl-ba"><span><small>No moves</small><b class="num">${dRound(r.b0.exp).toFixed(1)}</b><i>${r.w0!=null?dPct(r.w0)+"% win":""}</i></span><span class="pl-arr" aria-hidden="true">→</span><span class="pl-after"><small>With the plan</small><b class="num">${dRound(r.cur.exp).toFixed(1)}</b><i>${r.w1!=null?dPct(r.w1)+"% win":""}</i></span></div>
    <p class="pl-sum">${r.moves.length?`<b>${r.moves.length} pickup${r.moves.length>1?"s":""}, ${r.games} extra game${r.games>1?"s":""}</b> · expected categories won vs ${esc(on)} out of ${CATS.length}`:`Expected categories won vs ${esc(on)} out of ${CATS.length}`}<br><small class="muted">A pickup plays from the next day, and only counts on days he has a game and fits an open spot. Looks several moves ahead.</small></p></div>`;
  // controls
  const cc=c=>o.c[c[0]]||"";const ctl=`<div class="pl-ctl"><div class="pl-row"><span class="pl-lab">Categories</span>${CATS.map((c,i)=>`<button class="pl-cat ${cc(c)}" data-plc="${esc(c[0])}" title="Tap: normal → target → punt"><b>${esc(c[0])}</b><i class="num">${dPct(r.pA[i])}%</i>${cc(c)==="t"?"<em>★</em>":cc(c)==="p"?"<em>✕</em>":""}</button>`).join("")}</div>
    <div class="pl-row"><span class="pl-lab">Pickups</span><span class="pl-step"><button data-pln="-1" aria-label="Fewer pickups"${(o.n||r.cap)<=1?" disabled":""}>−</button><b class="num">${o.n?Math.min(o.n,r.cap):r.cap}</b><button data-pln="1" aria-label="More pickups"${(o.n||r.cap)>=r.cap?" disabled":""}>+</button></span><small class="muted">of ${r.cap} you can use</small>
      <label class="pl-tog"><input type="checkbox" data-pld${o.drops?" checked":""}><span>Allow drops</span></label>${o.x.length||Object.keys(o.c).length||o.n||!o.drops?`<button class="pl-reset" data-plreset>Reset</button>`:""}</div>
    ${o.x.length?`<div class="pl-row"><span class="pl-lab">Skipped</span>${o.x.map(n=>`<button class="pl-skip" data-plux="${esc(n)}" title="Bring back">${esc(dashLast(n))} ↺</button>`).join("")}</div>`:""}
    <p class="dsm muted pl-hint">Tap a category: <b>★ target</b> counts it 1.5×, <b>✕ punt</b> ignores it. ✕ on a move skips that player and re-plans.${who?"":" Log in to keep your settings."}</p></div>`;
  if(!r.moves.length)return head+ctl+`<p class="dempty okc">✓ No pickup helps with these settings. Your open spots are covered${r.budget?"":", or you've used your pickups"}.</p>`;
  const flips=CATS.map((c,i)=>({c,a:r.pB[i],b:r.pA[i]})).filter(x=>Math.abs(x.b-x.a)>=.05);
  const cats=flips.length?`<div class="pl-cats">${flips.map(x=>`<span class="${x.a<.5&&x.b>=.5?"flip":""}"><b>${esc(x.c[0])}</b><i class="num">${dPct(x.a)}→${dPct(x.b)}%</i></span>`).join("")}</div>`:"";
  const mv=`<ol class="pl-m">${r.moves.map((m,i)=>{const today=m.from-PL_LAG===TODAY;
    const btn=ed&&today?(m.x.w?`<button class="btn sm" data-add="${esc(m.x.n)}">Claim</button>`:`<button class="btn sm" data-pladd="${esc(m.x.n)}"${m.drop?` data-pldrop="${esc(m.drop)}"`:""}>Add</button>`):today?"":`<small class="pl-when muted">${esc(dn(m.from-PL_LAG))}</small>`;
    return `<li style="--d:${i*80}ms"><span class="pl-day">${esc(dn(m.from-PL_LAG))}</span>${dFace(m.x.n,m.x.t,"sm")}<span class="pl-who"><b>Add ${dashNm(m.x.n)}</b><small class="muted">${esc(m.x.t)}${m.drop?` · drop ${esc(dashLast(m.drop))}`:" · open roster spot"} · plays from ${esc(dow(m.from))}${m.x.w?" · on waivers":""}</small>
      ${m.dc.length||m.worth!=null?`<span class="pl-imp">${m.worth!=null?`<b class="num">+${Math.max(0,m.worth).toFixed(2)}</b>`:""}${m.dc.slice(0,4).map(x=>`<i>${esc(x.c[0])} +${dPct(x.d)}</i>`).join("")}</span>`:""}</span>
      <span class="pl-g" aria-label="${m.games.length} games">${r.days.map(sp=>`<i class="${m.games.includes(sp)?"on":sp>=m.from&&sp<=m.to&&gameOn(m.x.t,sp)?"no":""}" title="${esc(dn(sp))}"></i>`).join("")}<small>${m.games.length} g</small></span>
      ${btn}${who?`<button class="pl-x" data-plx="${esc(m.x.n)}" aria-label="Skip ${esc(m.x.n)} and re-plan" title="Skip him">✕</button>`:""}</li>`;}).join("")}</ol>`;
  // who plays when
  const rows=[...r.regs.map(x=>({x,k:"reg"})),...r.moves.map(m=>({x:m.x,k:"add",m}))];
  const cell=(row,sp)=>{const u=r.cur.use[sp];const n=row.x.n;
    if(row.k==="reg"){if(row.x.ir)return `<td class="ir" title="IR">IR</td>`;const gone=r.plan.drops[n]!=null&&sp>=r.plan.drops[n];if(gone)return `<td class="gone" title="Dropped">✕</td>`;
      if(!gameOn(row.x.t,sp))return `<td class="ng"></td>`;if(row.x.out)return `<td class="out" title="Out">OUT</td>`;return u.used.has(n)?`<td class="st" title="Starts">●</td>`:`<td class="sit" title="Game, but no open spot">○</td>`;}
    const m=row.m;if(sp<m.from||sp>m.to)return `<td class="na"></td>`;if(!gameOn(row.x.t,sp))return `<td class="ng"></td>`;return u.used.has(n)?`<td class="st add" title="Starts">●</td>`:`<td class="sit" title="Game, but no open spot">○</td>`;};
  const filled=sp=>{const u=r.cur.use[sp];return `${LINEUP.length-u.free}/${LINEUP.length}`;};
  const grid=`<details class="pl-wg"${phone?"":" open"}><summary>Who plays when <small class="muted">● starts · ○ has a game but no open spot · ✕ dropped</small></summary><div class="pl-wgw"><table class="pl-tab"><thead><tr><th></th>${r.days.map(sp=>`<th class="${sp===TODAY?"tdy":""}">${esc(sp===TODAY?"Today":dow(sp).slice(0,3))}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(row=>`<tr class="${row.k}"><th>${row.k==="add"?'<i class="pl-new">+</i>':""}${esc(dashLast(row.x.n))}</th>${r.days.map(sp=>cell(row,sp)).join("")}</tr>`).join("")}</tbody>
    <tfoot><tr><th>Spots filled</th>${r.days.map(sp=>`<td class="num">${filled(sp)}</td>`).join("")}</tr></tfoot></table></div></details>`;
  return head+cats+mv+ctl+grid+`<p class="dsm muted">Plans from ESPN projections and today's roster. Make each move after that day's games so the player you drop still plays. Add opens the add sheet with the planned drop already picked.</p>`;};

// controls
document.addEventListener("click",e=>{if(nav!=="dash")return;let b;const o=PLO();
  if((b=e.target.closest("[data-plc]"))){e.stopPropagation();const c={...o.c},k=b.dataset.plc;c[k]=!c[k]?"t":c[k]==="t"?"p":undefined;if(!c[k])delete c[k];dPlanSave({...o,c});dashDraw();return;}
  if((b=e.target.closest("[data-pln]"))){e.stopPropagation();const cap=(DPL&&DPL.cap)||PL_MAX,n=Math.max(1,Math.min(cap,(o.n||cap)+(+b.dataset.pln)));dPlanSave({...o,n:n>=cap?0:n});dashDraw();return;}
  if((b=e.target.closest("[data-plx]"))){e.stopPropagation();dPlanSave({...o,x:[...new Set([...o.x,b.dataset.plx])]});dashDraw();return;}
  if((b=e.target.closest("[data-plux]"))){e.stopPropagation();dPlanSave({...o,x:o.x.filter(n=>n!==b.dataset.plux)});dashDraw();return;}
  if((b=e.target.closest("[data-plreset]"))){e.stopPropagation();dPlanSave({});dashDraw();return;}
  if((b=e.target.closest("[data-pladd]"))){e.stopPropagation();sheetAdd(b.dataset.pladd);const d=b.dataset.pldrop;if(d)setTimeout(()=>{const i=[...document.querySelectorAll('#sheetBody input[name="drop"]')].find(x=>x.value===d);if(i){i.checked=true;i.dispatchEvent(new Event("change",{bubbles:true}));i.closest("label")?.scrollIntoView({block:"nearest"});}},0);return;}
},true);
document.addEventListener("change",e=>{const b=e.target.closest("[data-pld]");if(!b||nav!=="dash")return;dPlanSave({...PLO(),drops:b.checked});dashDraw();},true);

{const s=document.createElement("style");s.textContent=`
.pl-wait{display:flex;align-items:center;gap:6px;padding:24px 4px;color:var(--muted);font-size:.9rem}.pl-wait i{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:plw 1s ease-in-out infinite}.pl-wait i:nth-child(2){animation-delay:.15s}.pl-wait i:nth-child(3){animation-delay:.3s}.pl-wait span{margin-left:6px}
@keyframes plw{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
.pl-ctl{margin:4px 0 14px;padding:12px;border-radius:14px;border:1px dashed var(--line);display:flex;flex-direction:column;gap:10px}
.pl-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.pl-lab{font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);min-width:78px}
.pl-cat{position:relative;display:inline-flex;gap:5px;align-items:center;font:inherit;font-size:.78rem;padding:5px 10px;border-radius:99px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}.pl-cat i{font-style:normal;color:var(--muted)}
.pl-cat.t{border-color:#f59e0b;background:rgba(245,158,11,.14)}.pl-cat.t em{color:#f59e0b}.pl-cat.p{opacity:.55;text-decoration:line-through}.pl-cat em{font-style:normal;font-weight:800}
.pl-step{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:99px;overflow:hidden}.pl-step button{font:inherit;width:30px;height:28px;border:0;background:transparent;color:var(--ink);cursor:pointer;font-size:1rem}.pl-step button:disabled{opacity:.3}.pl-step b{min-width:22px;text-align:center}
.pl-tog{display:inline-flex;align-items:center;gap:6px;margin-left:10px;font-size:.84rem;cursor:pointer}.pl-reset,.pl-skip{font:inherit;font-size:.76rem;padding:4px 10px;border-radius:99px;border:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer}.pl-reset{margin-left:auto}
.pl-hint{margin:0}
.pl-imp{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.pl-imp b{font-size:.74rem;color:#22c55e;margin-right:2px}.pl-imp i{font-style:normal;font-size:.68rem;padding:1px 6px;border-radius:6px;background:rgba(34,197,94,.12);color:#22c55e;font-weight:700}
.pl-m li{grid-template-columns:62px 30px minmax(0,1fr) auto auto auto}
.pl-x{font:inherit;width:28px;height:28px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer}.pl-x:hover{color:#ef4444;border-color:#ef4444}
.pl-wg{margin:6px 0 10px;border:1px solid var(--line);border-radius:14px;padding:10px 12px}.pl-wg summary{cursor:pointer;font-weight:700;font-size:.9rem}.pl-wg summary small{font-weight:500;margin-left:8px}
.pl-wgw{overflow-x:auto;margin-top:10px}.pl-tab{border-collapse:separate;border-spacing:3px;width:100%;font-size:.8rem}
.pl-tab th{text-align:left;font-weight:600;white-space:nowrap;padding:2px 8px 2px 0;color:var(--ink)}.pl-tab thead th{text-align:center;font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.pl-tab thead th.tdy{color:var(--accent)}
.pl-tab td{text-align:center;height:26px;min-width:34px;border-radius:7px;background:color-mix(in srgb,var(--muted) 8%,transparent);font-size:.8rem}
.pl-tab td.st{background:color-mix(in srgb,var(--accent) 26%,transparent);color:var(--accent)}.pl-tab td.st.add{background:rgba(34,197,94,.22);color:#22c55e;box-shadow:0 0 10px -3px #22c55e}
.pl-tab td.sit{color:#f59e0b;background:rgba(245,158,11,.10)}.pl-tab td.gone{color:#ef4444;background:rgba(239,68,68,.10)}.pl-tab td.ir,.pl-tab td.out{font-size:.6rem;font-weight:800;color:#ef4444}.pl-tab td.na{background:transparent}
.pl-tab tr.add th{color:#22c55e}.pl-new{font-style:normal;font-weight:800;margin-right:4px}.pl-tab tfoot th{font-size:.7rem;color:var(--muted);text-transform:uppercase}.pl-tab tfoot td{background:transparent;font-weight:800;font-size:.75rem}
@media (max-width:760px){.pl-m li{grid-template-columns:28px minmax(0,1fr) auto auto}.pl-day{grid-column:1/5}.pl-g{grid-column:2/3}.pl-m li .btn{grid-column:3;grid-row:2/4;align-self:center}.pl-x{grid-column:4;grid-row:2/4;align-self:center}.pl-lab{min-width:100%}.pl-tog{margin-left:0}}
@media (prefers-reduced-motion:reduce){.pl-wait i{animation:none}}
`;document.head.appendChild(s);}
