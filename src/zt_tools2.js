/* ============================================================================
   2.46 (2026-11-05). Arp picked "1 and 3":
   - Opponent watch (ow): your opponent's moves this matchup, what each did to
     your win chance and categories, and the counter (target those categories in
     the planner). New moves also show as a dashboard alert until you tap Got it.
   - Team identity (id): the punt build your roster fits, where you rank in each
     category, who on your team doesn't fit (sell), and trade targets and pickups
     who fit the build all season, not just this week.
   ============================================================================ */
// a player's value in one category (z), same scale as zOf
const dCatZ=(pg,c)=>{if(!pg)return 0;const b=zBase()[c[0]];if(!b)return 0;const x=c[1]==="pct"?pg[c[2]]-b.lg*pg[c[3]]:pg[c[2]];return (x-b.m)/b.sd;};
const dBestPG=n=>{const D=DIR[n];if(!D)return null;return pgLine(D.pj)||(D.ss&&D.ss[11]?pgLine(D.ss):null)||((recentPG(n,30)||{}).pg)||null;};

// ---------- Opponent watch ----------
const OW_KEY="dfOppSeen";
const owSeen=()=>{try{return JSON.parse(localStorage.getItem(OW_KEY)||"[]");}catch(e){return [];}};
const owMark=ks=>{try{localStorage.setItem(OW_KEY,JSON.stringify([...new Set([...owSeen(),...ks])].slice(-300)));}catch(e){}};
const owTxKey=t=>String(t.id||((t.at||0)+":"+(t.add||"")+":"+(t.drop||"")+":"+(t.give||[]).join(",")));
function dOppWatch(T){const opp=dOpp(T);if(!opp||!DAYS.length)return null;const d0=DAYS[0],d1=DAYS[DAYS.length-1];
  const P=TEAMS[opp].P,slotP=n=>P.find(p=>p.n===n);
  const txs=TXLOG.filter(t=>t.ok&&(t.day||0)>=d0&&(t.day||0)<=d1&&((t.type!=="trade"&&tnum(t.team)===opp)||(t.type==="trade"&&(tnum(t.from)===opp||tnum(t.to)===opp))));
  if(!txs.length)return {opp,moves:[]};
  // what one player adds to their week from day `from`: real lines so far (when started), projection after
  const gain=(n,from,started)=>{const t=new Array(11).fill(0),p=slotP(n),pj=dBestPG(n);
    DAYS.forEach(sp=>{if(sp<from)return;const st=started?(p?startedOn(p,sp):false):INJ[n]!=="OUT"&&(!p||startedOn(p,from-1)||slotOn(p,from-1)==null);if(!st||!gameOn((DIR[n]||{}).t,sp))return;
      const l=sp<TODAY||(sp===TODAY&&!upcoming((DIR[n]||{}).t,sp))?(DAYLINES[n]||{})[sp]:pj;if(l)l.forEach((v,i)=>{if(i<11)t[i]+=+v||0;});});return t;};
  const effOf=t=>{const d=new Array(11).fill(0),inc=(n,day,sign,st)=>gain(n,day,st).forEach((v,i)=>d[i]+=sign*v);
    if(t.type==="trade"){const mine=tnum(t.from)===opp,ins=mine?t.get:t.give,outs=mine?t.give:t.get;ins.forEach(n=>inc(n,t.day,1,true));outs.forEach(n=>inc(n,t.day,-1,false));}
    else{if(t.add)inc(t.add,t.addDay??t.day,1,true);if(t.drop)inc(t.drop,t.dropDay??t.day,-1,false);}return d;};
  const me=fcProj(T).fin,op=fcProj(opp).fin;
  const wp=X=>{try{return winProb({fin:me},{fin:X});}catch(e){return null;}},cp=X=>CATS.map(c=>dLogit(val(me,c),val(X,c),c));
  const moves=txs.map(t=>{const d=effOf(t),wo=op.map((v,i)=>v-d[i]);return {t,k:owTxKey(t),d,wpWith:wp(op),wpWo:wp(wo),cats:CATS.map((c,i)=>({c,a:cp(wo)[i],b:cp(op)[i]})).filter(x=>x.a-x.b>=.04).sort((x,y)=>(y.a-y.b)-(x.a-x.b))};});
  const all=moves.reduce((s,m)=>s.map((v,i)=>v-m.d[i]),op.slice());
  const hurt=CATS.map((c,i)=>({c,a:cp(all)[i],b:cp(op)[i]})).filter(x=>x.a-x.b>=.04).sort((x,y)=>(y.a-y.b)-(x.a-x.b));
  return {opp,moves:moves.sort((a,b)=>(b.t.at||0)-(a.t.at||0)),wpNow:wp(op),wpBefore:wp(all),hurt};}
const owLine=t=>t.type==="trade"?`traded for ${(tnum(t.from)===dOpp(dashT())?t.get:t.give).map(dashLast).join(", ")}`:`${t.add?`added ${t.add}`:""}${t.add&&t.drop?", ":""}${t.drop?`dropped ${t.drop}`:""}`;
DW.ow={name:"Opponent watch",desc:"Your opponent's moves this matchup, what each one did to your win chance and categories, and how to answer in the planner.",s:"w",
  view(w,T){const r=dOppWatch(T);if(!r)return dashEmpty("No matchup this week.");const on=dShort(r.opp);
    if(!r.moves.length)return `<p class="dempty okc">✓ ${esc(on)} hasn't made a move this matchup.</p>`;
    const seen=new Set(owSeen()),fresh=r.moves.filter(m=>!seen.has(m.k));
    const head=`<div class="ow-h"><span><small>Before their moves</small><b class="num">${r.wpBefore!=null?dPct(r.wpBefore)+"%":"–"}</b></span><span class="pl-arr" aria-hidden="true">→</span><span class="${r.wpNow<r.wpBefore-.02?"dn":"ok"}"><small>Your win chance now</small><b class="num">${r.wpNow!=null?dPct(r.wpNow)+"%":"–"}</b></span>
      <p>${esc(on)} made <b>${r.moves.length} move${r.moves.length>1?"s":""}</b> this matchup${fresh.length?` · <b class="ow-new">${fresh.length} new</b>`:""}.</p></div>`;
    const list=`<ol class="ow-l">${r.moves.map(m=>{const dw=m.wpWith!=null&&m.wpWo!=null?m.wpWith-m.wpWo:0,n=m.t.add||(m.t.get||[])[0]||m.t.drop;
      return `<li class="${seen.has(m.k)?"":"new"}">${n?dFace(n,(DIR[n]||{}).t,"sm"):""}<span><b>${esc(owLine(m.t))}</b><small class="muted">${esc(m.t.day===TODAY?"today":dow(m.t.day))}${m.cats.length?` · helps them in ${m.cats.slice(0,3).map(x=>esc(x.c[0])).join(", ")}`:""}</small></span><b class="num ${dw<=-.01?"dn":"ok"}">${dw<=-.005?"−":dw>=.005?"+":"±"}${Math.abs(dPct(dw))}%</b></li>`;}).join("")}</ol>`;
    const cats=r.hurt.slice(0,3),ed=dCanEdit(T);
    const counter=cats.length?`<div class="ow-c"><p><b>Answer:</b> their moves hit your ${cats.map(x=>`<b>${esc(x.c[0])}</b> (${dPct(x.a)}→${dPct(x.b)}%)`).join(", ")}.${typeof DPL!=="undefined"&&DPL&&DPL.moves&&DPL.moves[0]?` Planner's first move: add ${esc(DPL.moves[0].x.n)}.`:""}</p>
      ${ed&&typeof dPlanSave==="function"?`<button class="btn sm" data-owt="${esc(cats.map(x=>x.c[0]).join("|"))}">Target ${cats.map(x=>esc(x.c[0])).join(", ")} in the planner</button>`:""}${fresh.length?`<button class="btn sm ghost" data-owseen="1">Got it</button>`:""}</div>`
      :`<div class="ow-c"><p class="okc">✓ Their moves don't change any category much.</p>${fresh.length?`<button class="btn sm ghost" data-owseen="1">Got it</button>`:""}</div>`;
    return head+list+counter+`<p class="dsm muted">Chance change = your win chance with the move vs without it. Uses real box scores for games already played and projections for the rest.</p>`;}};
// new opponent moves become a dashboard alert until you tap Got it
{const _a=dashAlerts;dashAlerts=function(T){const out=_a.apply(this,arguments);try{if(T&&T===myTeamNum()){const r=dOppWatch(T);if(r&&r.moves.length){const seen=new Set(owSeen()),f=r.moves.filter(m=>!seen.has(m.k));
  if(f.length){const m=f[0],dw=m.wpWith!=null&&m.wpWo!=null?m.wpWith-m.wpWo:0;out.push({lv:"warn",t:`${dShort(r.opp)} ${owLine(m.t)}${f.length>1?` (+${f.length-1} more)`:""}. Your win chance ${dw<-.005?"dropped "+Math.abs(dPct(dw))+"%":dw>.005?"went up "+dPct(dw)+"%":"barely moved"}. See Opponent watch.`,go:["dash",""]});}}}}catch(e){}return out;};}
document.addEventListener("click",e=>{if(nav!=="dash")return;let b;
  if((b=e.target.closest("[data-owseen]"))){e.stopPropagation();const r=dOppWatch(dashT());if(r)owMark(r.moves.map(m=>m.k));dashDraw();try{dashBadge();}catch(x){}return;}
  if((b=e.target.closest("[data-owt]"))){e.stopPropagation();const o=PLO(),c={...o.c};b.dataset.owt.split("|").forEach(k=>c[k]="t");dPlanSave({...o,c});const r=dOppWatch(dashT());if(r)owMark(r.moves.map(m=>m.k));dashDraw();try{dashBadge();}catch(x){}return;}
},true);

// ---------- Team identity ----------
let IDC_K="",IDC=null;
function dTeamCatZ(T){const ps=dNowP(T).filter(p=>slotOn(p,TODAY)!==13).map(p=>({n:p.n,pg:dBestPG(p.n)})).filter(x=>x.pg);
  const top=ps.map(x=>({...x,z:zOf(x.pg)})).sort((a,b)=>b.z-a.z).slice(0,13);return CATS.map(c=>top.reduce((s,x)=>s+dCatZ(x.pg,c),0));}
function dIdentity(T,punt){const k=T+":"+TODAY+":"+TXLOG.length+":"+(punt?punt.join(","):"auto");if(IDC_K===k&&IDC)return IDC;
  const ids=Object.keys(TEAMS).map(Number).filter(t=>t&&TEAMS[t]),Z={};ids.forEach(t=>Z[t]=dTeamCatZ(t));
  const rk=CATS.map((c,i)=>1+ids.filter(t=>t!==T&&Z[t][i]>Z[T][i]).length),N=ids.length;
  // auto punt: your worst category if you rank in the bottom third and it's far below the league middle
  const mid=CATS.map((c,i)=>{const xs=ids.map(t=>Z[t][i]).sort((a,b)=>a-b);return xs[Math.floor(xs.length/2)];});
  const gap=CATS.map((c,i)=>Z[T][i]-mid[i]);
  let auto=CATS.map((c,i)=>({i,g:gap[i],r:rk[i]})).filter(x=>x.r>N*2/3).sort((a,b)=>a.g-b.g).slice(0,1).map(x=>CATS[x.i][0]);
  const P=punt?punt.filter(x=>x!=="-"):auto,pi=new Set(P);
  const swing=CATS.filter((c,i)=>!pi.has(c[0])&&rk[i]>N/3&&rk[i]<=N*2/3).map(c=>c[0]);
  const W=CATS.map(c=>pi.has(c[0])?0:swing.includes(c[0])?1.3:1);
  const mW=W.reduce((a,b)=>a+b,0)/CATS.length||1,fit=pg=>CATS.reduce((s,c,i)=>s+W[i]*dCatZ(pg,c),0)/mW;
  // weekly categories won vs an average team, with and without the punt build
  const avg=CATS.map((c,i)=>ids.filter(t=>t!==T).reduce((s,t)=>s+Z[t][i],0)/Math.max(1,N-1));
  const pw=CATS.map((c,i)=>1/(1+Math.exp(-(Z[T][i]-avg[i])*.45)));
  const mine=dNowP(T).map(p=>({n:p.n,t:p.t,pg:dBestPG(p.n)})).filter(x=>x.pg).map(x=>({...x,z:zOf(x.pg),f:fit(x.pg)}));
  const sell=(P.length?mine:[]).filter(x=>x.z>-1).map(x=>({...x,d:x.f-x.z})).sort((a,b)=>a.d-b.d).filter(x=>x.d<-.4).slice(0,4);
  const keepRk=N*13;
  const pool=Object.values(DIR).filter(D=>D.t&&ownerNow(D.n)!==T&&INJ[D.n]!=="OUT").map(D=>{const pg=dBestPG(D.n);if(!pg)return null;return {n:D.n,t:D.t,pg,z:zOf(pg),f:fit(pg),own:ownerNow(D.n),w:typeof onWaivers==="function"&&onWaivers(D.n)};}).filter(Boolean);
  const trade=pool.filter(x=>x.own).map(x=>({...x,d:x.f-x.z})).filter(x=>x.d>.15&&x.f>1).sort((a,b)=>(b.d*3+b.f*.15)-(a.d*3+a.f*.15)).slice(0,5);
  const fa=pool.filter(x=>!x.own).sort((a,b)=>b.f-a.f).slice(0,5);
  IDC={T,rk,N,Z:Z[T],gap,auto,P,swing,pw,mine,sell,trade,fa,own:!!punt};IDC_K=k;return IDC;}
const ID_NAMES={"FT%":"big-man","FG%":"guard-heavy","3PM":"paint","AST":"wing and big","PTS":"glue guys","REB":"small-ball","BLK":"small-ball","STL":"size"};
DW.id={name:"Team identity",desc:"The punt build your roster fits, where you rank in each category, who doesn't fit, and trade targets and pickups who fit the build all season.",s:"f",
  view(w,T){const pu=(UI.dash&&UI.dash.idp)||null;const r=dIdentity(T,pu);const ed=dCanEdit(T),who=prefKey();
    const nm=r.P.length?`Punt ${r.P.join(" + ")}${r.P.length===1&&ID_NAMES[r.P[0]]?` · ${ID_NAMES[r.P[0]]} build`:""}`:"Balanced build (no punt)";
    const strong=CATS.filter((c,i)=>r.rk[i]<=Math.ceil(r.N/3)&&!r.P.includes(c[0])).map(c=>c[0]);
    const bar=CATS.map((c,i)=>{const pct=1-(r.rk[i]-1)/Math.max(1,r.N-1),p=r.P.includes(c[0]),sw=r.swing.includes(c[0]);
      return `<button class="id-c${p?" p":sw?" sw":pct>=.66?" st":""}" data-idp="${esc(c[0])}" title="${p?"Punted":"Tap to punt"}"><b>${esc(c[0])}</b><span class="id-bar"><i style="width:${Math.round(10+pct*90)}%"></i></span><em class="num">${r.rk[i]}<small>/${r.N}</small></em><u>${p?"punt":sw?"swing":pct>=.66?"strong":""}</u></button>`;}).join("");
    const row=(x,act,sub)=>`<li>${dFace(x.n,x.t,"sm")}<span><b>${dashNm(x.n)}</b><small class="muted">${esc(x.t)}${x.own&&x.own!==T?` · ${esc(dShort(x.own))}`:""}${sub?` · ${sub}`:""}</small></span><b class="num id-f">${x.f.toFixed(1)}</b>${act||""}</li>`;
    const bestCats=pg=>CATS.filter(c=>!r.P.includes(c[0])).map(c=>({l:c[0],z:dCatZ(pg,c)})).sort((a,b)=>b.z-a.z).slice(0,2).map(x=>x.l).join(", ");
    const col=(t,xs,act,sub,empty)=>`<div class="ps-c"><h4>${t}</h4>${xs.length?`<ul>${xs.map(x=>row(x,act&&act(x),sub&&sub(x))).join("")}</ul>`:`<p class="dsm muted">${empty}</p>`}</div>`;
    return `<div class="id-h"><div><small>Your identity</small><b>${esc(nm)}</b><p class="muted dsm">${strong.length?`Strong in ${strong.join(", ")}`:"No standout category yet"}${r.swing.length?` · swing ${r.swing.join(", ")}`:""}. ${r.own?"Your pick.":"Picked for you from where you rank; tap a category to punt it or bring it back."}</p></div>${r.own&&who?`<button class="pl-reset" data-idreset>Auto</button>`:""}</div>
      <div class="id-cats">${bar}</div>
      <div class="ps-cols">${col("Fits your build: trade for",r.trade,x=>`<button class="btn sm" data-trade="${esc(x.n)}">Trade</button>`,x=>`+${(x.f-x.z).toFixed(1)} more for you`,"No clear trade targets.")}
      ${col("Fits your build: pick up",r.fa,x=>ed?`<button class="btn sm" data-add="${esc(x.n)}">${x.w?"Claim":"Add"}</button>`:"",x=>bestCats(x.pg),"No free agents fit.")}
      ${col("Doesn't fit: sell",r.sell,null,x=>`worth ${(x.z-x.f).toFixed(1)} more to others`,"Everyone fits your build.")}</div>
      <p class="dsm muted">Fit = value in the categories you play for (swing categories count 1.3×, punted ones 0), over each player's projection. Ranks use each team's top 13 players.</p>`;}};
document.addEventListener("click",e=>{if(nav!=="dash")return;let b;
  if((b=e.target.closest("[data-idp]"))){e.stopPropagation();if(!prefKey())return;const k=b.dataset.idp,cur=((UI.dash&&UI.dash.idp)||(IDC?IDC.P.slice():[])).filter(x=>x!=="-");
    const nx=cur.includes(k)?cur.filter(x=>x!==k):[...cur,k].slice(-2);dashBoardSet({idp:nx.length?nx:["-"]});IDC_K="";dashDraw();return;}
  if((b=e.target.closest("[data-idreset]"))){e.stopPropagation();dashBoardSet({idp:null});IDC_K="";dashDraw();return;}
},true);

// New Era +: Opponent watch in "Win the week", Team identity in "Your squad"
NEP_VER=6;
{const ins=(after,k,s)=>{if(NEP_DEF.some(x=>x[0]===k))return;const i=NEP_DEF.findIndex(x=>x[0]===after);NEP_DEF.splice(i>=0?i+1:NEP_DEF.length,0,[k,s]);};
  ins("op","ow","w");const sq=NEP_DEF.findIndex(x=>x[0]==="hd"&&x[2]&&x[2].t==="Your squad");if(!NEP_DEF.some(x=>x[0]==="id"))NEP_DEF.splice(sq>=0?sq+1:NEP_DEF.length,0,["id","f"]);}

{const s=document.createElement("style");s.textContent=`
.ow-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px}.ow-h>span:not(.pl-arr){display:flex;flex-direction:column;align-items:center;padding:8px 14px;border-radius:12px;border:1px solid var(--line);min-width:96px}
.ow-h small{font-size:.6rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.ow-h b{font-size:1.5rem;font-weight:800}.ow-h .dn b{color:#ef4444}.ow-h .ok b{color:#22c55e}.ow-h p{margin:0;font-size:.86rem;flex:1;min-width:180px}.ow-new{color:#f59e0b}
.ow-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.ow-l li{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 10px;border-radius:10px;background:color-mix(in srgb,var(--ink) 4%,transparent)}
.ow-l li.new{box-shadow:inset 3px 0 0 #f59e0b}.ow-l li>span{display:flex;flex-direction:column;min-width:0}.ow-l li small{font-size:.74rem}.ow-l .dn{color:#ef4444}.ow-l .ok{color:var(--muted)}
.ow-c{margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.ow-c p{margin:0;flex-basis:100%;font-size:.86rem}
.id-h{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px}.id-h small{font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.id-h b{display:block;font-size:1.35rem;font-weight:800}.id-h p{margin:2px 0 0}
.id-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;margin-bottom:14px}
.id-c{font:inherit;display:grid;grid-template-columns:auto 1fr auto;grid-template-rows:auto auto;gap:2px 8px;align-items:center;padding:7px 10px;border-radius:10px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;text-align:left}
.id-c b{font-size:.8rem}.id-c em{font-style:normal;font-size:.8rem;font-weight:800}.id-c em small{color:var(--muted);font-weight:600}.id-c u{grid-column:1/4;text-decoration:none;font-size:.58rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);min-height:.7rem}
.id-bar{height:6px;border-radius:99px;background:color-mix(in srgb,var(--ink) 8%,transparent);overflow:hidden}.id-bar i{display:block;height:100%;border-radius:99px;background:var(--muted)}
.id-c.st .id-bar i{background:#22c55e}.id-c.st u{color:#22c55e}.id-c.sw .id-bar i{background:#f59e0b}.id-c.sw u{color:#f59e0b}.id-c.p{opacity:.55}.id-c.p b{text-decoration:line-through}.id-c.p u{color:#ef4444}
.id-f{font-size:.84rem;color:var(--accent)}
`;document.head.appendChild(s);}
