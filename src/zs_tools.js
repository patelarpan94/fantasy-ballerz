/* ============================================================================
   2.45 (2026-11-05). Three dashboard tools Arp asked for ("do all 3"):
   - Opportunity radar (or): when a starter is OUT, which teammates actually
     produce more without him. Real with/without splits from this season's box
     scores; if he hasn't missed a game yet, an estimate from his minutes and
     who plays his position. Free agents who get a bump feed the planner.
   - Sunday closer (cl): which categories are safe, gone or still open, and who
     to bench on which day to protect a close ratio (FG%/FT%) without giving
     away a counting category.
   - Playoff schedule edge (ps): games per NBA team in our playoff weeks, your
     players with light or heavy playoff schedules, and targets to trade for or
     pick up now.
   ============================================================================ */
const dLineAvg=ls=>{if(!ls.length)return null;const t=lineSum(ls);return t.map(v=>v/ls.length);};
const dSeasonPG=n=>{const D=DIR[n];return D&&D.ss&&D.ss[11]?pgLine(D.ss):null;};
const dMinOf=l=>l?+l[10]||0:0;
const dPos=n=>{const el=(DIR[n]&&DIR[n].el)||[];return el.filter(s=>s>=0&&s<=4);};
const dWhoOwns=n=>{const o=ownerNow(n);return o?{id:o,nm:dShort(o)}:null;};

// ---------- Opportunity radar ----------
let ORC_K="",ORC=null;
function dOppRadar(){
  const k=TODAY+":"+((NBA&&NBA.at)||0)+":"+Object.keys(INJ).length+":"+Object.keys(STATS).length;if(ORC_K===k&&ORC)return ORC;
  const left=DAYS.filter(sp=>sp>=TODAY),next7=[];for(let sp=TODAY;sp<TODAY+7;sp++)next7.push(sp);
  const byTeam={};Object.values(DIR).forEach(D=>{if(D.t)(byTeam[D.t]=byTeam[D.t]||[]).push(D.n);});
  const stars=Object.keys(INJ).filter(n=>INJ[n]==="OUT"&&DIR[n]&&DIR[n].t).map(n=>{const pg=dSeasonPG(n);return {n,t:DIR[n].t,pg,min:dMinOf(pg)};})
    .filter(s=>s.min>=22||(DIR[s.n].rk&&DIR[s.n].rk<=120));
  const out=[];
  stars.forEach(s=>{const ij=injOf(s.n)||{},back=ij.r&&typeof spOf==="function"?spOf(ij.r):null;
    const outOn=sp=>gameOn(s.t,sp)&&(back==null||sp<back);
    const missWk=left.filter(outOn).length,miss7=next7.filter(outOn).length;if(!miss7&&!missWk)return;
    const mates=(byTeam[s.t]||[]).filter(m=>m!==s.n&&INJ[m]!=="OUT");
    // only days both played for this team (a traded player's old games don't count)
    const onTeam=(n,sp)=>{const I=STATS[sp]&&STATS[sp].info&&STATS[sp].info[n];return !I||!I[0]||I[0]===s.t;};
    const playedOn=sp=>{const l=DAYLINES[s.n]&&DAYLINES[s.n][sp];return l&&dMinOf(l)>0&&onTeam(s.n,sp);};
    // estimate: his minutes go to teammates who play his spot, in proportion to their minutes
    const sp0=dPos(s.n),bases=mates.map(m=>{const pg=dSeasonPG(m);if(!pg)return null;const ov=dPos(m).some(x=>sp0.includes(x))?1:.35;return {m,pg,min:dMinOf(pg),w:ov*Math.max(4,dMinOf(pg))};}).filter(Boolean).filter(b=>b.min>=6);
    const W=bases.reduce((a,b)=>a+b.w,0)||1;
    const bens=bases.map(b=>{const extra=Math.max(0,Math.min(s.min*b.w/W,36-b.min,14)),est=b.pg.map((v,i)=>i===10?b.min+extra:v*(b.min+extra)/Math.max(b.min,1));
      const ls=Object.entries(DAYLINES[b.m]||{}).filter(([sp,l])=>+sp<TODAY&&dMinOf(l)>0&&onTeam(b.m,+sp));
      const wo=ls.filter(([sp])=>!playedOn(+sp)).map(([,l])=>l),wi=ls.filter(([sp])=>playedOn(+sp)).map(([,l])=>l);
      // small samples lean on the estimate (3 games' worth), and "with him" leans on his season line
      const woA=dLineAvg(wo),wiA=dLineAvg(wi),nw=wo.length,ni=wi.length;
      const line=nw?woA.map((v,i)=>(nw*v+3*est[i])/(nw+3)):est;
      const base=ni?wiA.map((v,i)=>(ni*v+3*b.pg[i])/(ni+3)):b.pg,dz=zOf(line)-zOf(base);
      return {n:b.m,t:s.t,base,line,dz,nWo:wo.length,nWi:wi.length,own:dWhoOwns(b.m),w:typeof onWaivers==="function"&&onWaivers(b.m)};})
      .filter(b=>b.dz>.25&&(b.own||zOf(b.line)>-2.5)).sort((a,b)=>b.dz-a.dz).slice(0,3);
    if(bens.length)out.push({...s,back,missWk,miss7,bens,top:Math.max(...bens.map(b=>b.own?b.dz*.6:b.dz))});});
  out.sort((a,b)=>b.top-a.top);
  ORC_K=k;ORC=out;return out;}
// for the planner: a free agent's line while the starter he backs up is out this matchup
function dOppBoost(n){let r=null;try{for(const s of dOppRadar()){if(!s.missWk)continue;const b=s.bens.find(x=>x.n===n&&!x.own);if(b&&(!r||b.dz>r.dz))r={...b,star:s.n};}}catch(e){}return r;}

const dStatBumps=(a,b)=>[["PTS",K.PTS],["REB",K.REB],["AST",K.AST],["3PM",K.TPM],["STL",K.STL],["BLK",K.BLK]].map(([l,i])=>({l,d:b[i]-a[i]})).filter(x=>x.d>=.6).sort((x,y)=>y.d-x.d).slice(0,3);
DW.or={name:"Opportunity radar",desc:"When a starter is ruled OUT, the teammates who really produce more without him (from this season's box scores), and which of them you can pick up.",s:"w",
  view(w,T){const xs=dOppRadar(),ed=dCanEdit(T),full=w.s==="f",lim=full?8:PHONE()?2:w.s==="w"?3:2;
    if(!xs.length)return `<p class="dempty okc">✓ No key starter is out right now, so nobody gets an injury bump.</p>`;
    const fa=xs.reduce((a,s)=>a+s.bens.filter(b=>!b.own).length,0);
    return `<p class="or-sum"><b>${xs.length} starter${xs.length>1?"s":""} out</b> · ${fa?`<b class="okc">${fa} free agent${fa>1?"s":""}</b> get a bump`:"no free agent gets a bump"}</p>
    <ol class="or-l">${xs.slice(0,lim).map((s,i)=>`<li style="--d:${i*70}ms"><div class="or-st">${dFace(s.n,s.t,"sm")}<span><b>${dashNm(s.n)}</b> <small class="muted">${esc(s.t)} · OUT${s.back?` · back ~${esc(dow(s.back))} ${esc(dateOf(s.back).toLocaleDateString("en-US",{month:"short",day:"numeric"}))}`:" · no return date"}</small><small class="or-miss">${s.missWk?`misses ${s.missWk} game${s.missWk>1?"s":""} left this matchup`:`misses ${s.miss7} in the next 7 days`} · ${Math.round(s.min)} min a game</small></span></div>
      <ul class="or-b">${s.bens.slice(0,full?99:3).map(b=>{const tag=b.own?(b.own.id===T?`<em class="or-me">Yours</em>`:`<em>${esc(b.own.nm)}</em>`):`<em class="or-fa">${b.w?"Waivers":"Free agent"}</em>`;
        const bm=dStatBumps(b.base,b.line);
        return `<li>${dFace(b.n,b.t,"sm")}<span class="or-who"><b>${dashNm(b.n)}</b>${tag}<small class="muted">${Math.round(dMinOf(b.base))}→${Math.round(dMinOf(b.line))} min${bm.map(x=>` · ${x.l} +${x.d.toFixed(1)}`).join("")}</small><small class="or-src">${b.nWo?`${b.nWo} game${b.nWo>1?"s":""} without him${b.nWo===1?" + estimate":""}`:"estimate: he hasn't missed a game yet"}</small></span>
          <b class="or-dz num">+${b.dz.toFixed(1)}</b>${!b.own&&ed?`<button class="btn sm" data-add="${esc(b.n)}">${b.w?"Claim":"Add"}</button>`:""}</li>`;}).join("")}</ul></li>`).join("")}</ol>${xs.length>lim?`<p class="dsm muted">${xs.length-lim} more starter${xs.length-lim>1?"s":""} out. Make this widget full width (Edit) to see them all.</p>`:""}
    <p class="dsm muted">+ is the change in value per game (z-score across your categories). Free agents here also count in the Win-the-week planner while the starter is out.</p>`;}};

// planner: free agents use their "starter out" line, and the move says why
if(typeof dPlanBuild2==="function"){const _b=dPlanBuild2;dPlanBuild2=function(T,o){const sv={};
  try{dOppRadar().forEach(s=>{if(!s.missWk)return;s.bens.forEach(b=>{if(b.own||sv[b.n])return;const D=DIR[b.n];if(!D)return;sv[b.n]={D,pj:D.pj,ob:s.n};
    const g=Math.max(1,(D.pj&&D.pj[11])||10);D.pj=b.line.slice(0,11).map(v=>v*g).concat([g]);});});}catch(e){}
  let r;try{r=_b.apply(this,arguments);}finally{Object.values(sv).forEach(x=>{x.D.pj=x.pj;});}
  if(r&&r.moves)r.moves.forEach(m=>{if(sv[m.x.n])m.ob=sv[m.x.n].ob;});return r;};}
{const _v=DW.pl.view;DW.pl.view=function(w,T){let h=_v.apply(this,arguments);const r=DPL;if(!r||!r.moves)return h;
  r.moves.forEach(m=>{if(!m.ob)return;const a=`<b>Add ${dashNm(m.x.n)}</b>`;h=h.replace(a,a+`<span class="or-tag" title="${esc(m.ob)} is out">↑ ${esc(dashLast(m.ob))} out</span>`);});return h;};}

// ---------- Sunday closer ----------
function dCloser(T){const opp=dOpp(T);if(!opp)return null;const days=DAYS.filter(sp=>sp>=TODAY);if(!days.length)return {done:true,opp};
  const me=fcProj(T),op=fcProj(opp),B=op.fin;
  const cands=[];dNowP(T).filter(healthy).forEach(p=>{const pg=pgLine(p.pj)||(recentPG(p.n,14)||{}).pg;if(!pg)return;
    days.forEach(sp=>{if(gameOn(p.t,sp)&&upcoming(p.t,sp)&&startedOn(p,sp)&&!(sp===TODAY&&locked({t:p.t},sp)))cands.push({n:p.n,t:p.t,sp,pg});});});
  const exp=tot=>dExpCats(tot,B),probs=tot=>CATS.map(c=>dLogit(val(tot,c),val(B,c),c));
  let tot=me.fin.slice(),cur=exp(tot);const bench=[],used=new Set();
  for(let k=0;k<8;k++){let best=null;cands.forEach((c,i)=>{if(used.has(i))return;const t2=tot.map((v,j)=>v-(+c.pg[j]||0)),e=exp(t2);if(e-cur>.03&&(!best||e>best.e))best={i,e,t2};});
    if(!best)break;used.add(best.i);bench.push(cands[best.i]);tot=best.t2;cur=best.e;}
  const p0=probs(me.fin),p1=probs(tot);
  const by={};bench.forEach(c=>{(by[c.n]=by[c.n]||{n:c.n,t:c.t,days:[]}).days.push(c.sp);});
  return {opp,days,me,op,p0,p1,tot,e0:exp(me.fin),e1:cur,bench:Object.values(by),wp0:winProb({fin:me.fin},{fin:B}),wp1:winProb({fin:tot},{fin:B})};}
DW.cl={name:"Sunday closer",desc:"Late in the week: which categories are safe, gone or still open, and who to bench on which day to protect a close FG% or FT% lead.",s:"w",
  view(w,T){const r=dCloser(T);if(!r)return dashEmpty("No matchup this week.");if(r.done)return dashEmpty("This matchup is over.");
    const on=dShort(r.opp),late=r.days.length<=3,st=p=>p>=.9?["safe","Safe"]:p<=.1?["gone","Gone"]:p>=.6?["lean","Leaning yours"]:p<=.4?["lean2","Leaning theirs"]:["toss","Toss-up"];
    const rows=CATS.map((c,i)=>{const s=st(r.p1[i]),mv=Math.abs(r.p1[i]-r.p0[i])>=.04;
      return `<tr class="${s[0]}"><th>${esc(c[0])}</th><td class="num">${esc(fmtStat(val(r.me.now,c),c,true))}<small> – ${esc(fmtStat(val(r.op.now,c),c,true))}</small></td><td class="num">${esc(fmtStat(val(r.tot,c),c,true))}<small> – ${esc(fmtStat(val(r.op.fin,c),c,true))}</small></td><td class="num"><b>${dPct(r.p1[i])}%</b>${mv?`<small class="${r.p1[i]>r.p0[i]?"up":"dn"}"> ${r.p1[i]>r.p0[i]?"▲":"▼"}${Math.abs(dPct(r.p1[i])-dPct(r.p0[i]))}</small>`:""}</td><td><span class="cl-chip ${s[0]}">${s[1]}</span></td></tr>`;}).join("");
    const cnt=k=>r.p1.filter(p=>k==="safe"?p>=.9:k==="gone"?p<=.1:p>.1&&p<.9).length;
    const adv=r.bench.length?`<div class="cl-adv${late?"":" early"}"><p><b>${late?"Bench to protect your lead":"Early read: bench to protect"}</b> · expected categories ${dRound(r.e0).toFixed(1)} → <b>${dRound(r.e1).toFixed(1)}</b>${r.wp0!=null?` · win ${dPct(r.wp0)}% → ${dPct(r.wp1)}%`:""}</p>
      <ul>${r.bench.map(b=>`<li>${dFace(b.n,b.t,"sm")}<span><b>Sit ${dashNm(b.n)}</b><small class="muted"> ${b.days.sort((a,c)=>a-c).map(sp=>sp===TODAY?"today":dow(sp)).join(", ")}</small></span></li>`).join("")}</ul>
      ${late?"":`<small class="muted">${r.days.length} days left, so projections can still swing. Check again on the last two days.</small>`}<button class="btn sm" data-nav="team">Set lineup</button></div>`
      :`<p class="cl-ok okc">✓ Play everyone. Benching nobody helps${late?"":" yet"}: your projected lead in each close category holds up better with more games.</p>`;
    return `<p class="cl-sum"><b>${cnt("safe")} safe</b> · <b>${cnt("open")} open</b> · <b>${cnt("gone")} gone</b> vs ${esc(on)} · ${r.days.length} day${r.days.length>1?"s":""} left</p>
      <div class="cl-wrap"><table class="cl-t"><thead><tr><th></th><th>Now</th><th>Projected</th><th>Win</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>${adv}`;}};

// ---------- Playoff schedule edge ----------
let PSC_K="",PSC=null;
function dPlayoffSched(){const k=TODAY+":"+TXLOG.length;if(PSC_K===k&&PSC)return PSC;
  const R=regWeeks(),wks=[];for(let n=R+1;n<=Math.min(CAL.length,R+playoffRounds());n++)wks.push(n);
  if(!wks.length)return null;const teams=Object.keys(SCHED);
  const g=teams.map(t=>({t,w:wks.map(n=>weekDaysAll(n).filter(sp=>gameOn(t,sp)).length)})).map(x=>({...x,tot:x.w.reduce((a,b)=>a+b,0)}));
  const avg=g.reduce((a,x)=>a+x.tot,0)/Math.max(1,g.length),G={};g.forEach(x=>G[x.t]=x);
  const val=n=>{const D=DIR[n];if(!D)return null;const pg=dSeasonPG(n)||pgLine(D.pj);return pg?zOf(pg):null;};
  PSC={wks,g:g.sort((a,b)=>b.tot-a.tot),avg,G,val};PSC_K=k;return PSC;}
DW.ps={name:"Playoff schedule edge",desc:"Games each NBA team plays in our fantasy playoff weeks, your players with light or heavy playoff schedules, and who to target now.",s:"f",
  view(w,T){const r=dPlayoffSched();if(!r)return dashEmpty("No playoff weeks in this season's settings.");
    const full=w.s==="f",lim=full?6:4,ed=dCanEdit(T),wn=n=>`Wk ${n}`;
    if(!r.g.some(x=>x.tot))return dashEmpty(`The NBA schedule for our playoff weeks (${r.wks.map(n=>esc(weekName(n))).join(", ")}) isn't loaded yet.`);
    const mx=Math.max(...r.g.map(x=>x.tot)),mn=Math.min(...r.g.map(x=>x.tot));
    const heat=`<div class="ps-heat" role="img" aria-label="Playoff games by NBA team">${r.g.map(x=>`<span class="${x.tot>=r.avg+1?"hi":x.tot<=r.avg-1?"lo":""}" title="${esc(x.t)}: ${x.w.map((v,i)=>wn(r.wks[i])+" "+v).join(", ")}"><b>${esc(x.t)}</b><i class="num">${x.tot}</i></span>`).join("")}</div>`;
    const mine=dNowP(T).map(p=>({n:p.n,t:p.t,v:r.val(p.n),s:r.G[p.t]})).filter(x=>x.s&&x.v!=null);
    const sell=mine.filter(x=>x.s.tot<=r.avg-1).sort((a,b)=>a.s.tot-b.s.tot||b.v-a.v).slice(0,lim),hold=mine.filter(x=>x.s.tot>=r.avg+1).sort((a,b)=>b.s.tot-a.s.tot||b.v-a.v).slice(0,lim);
    const pool=Object.values(DIR).filter(D=>D.t&&r.G[D.t]&&r.G[D.t].tot>=r.avg+1&&ownerNow(D.n)!==T&&INJ[D.n]!=="OUT").map(D=>({n:D.n,t:D.t,v:r.val(D.n),s:r.G[D.t],own:dWhoOwns(D.n),w:typeof onWaivers==="function"&&onWaivers(D.n)})).filter(x=>x.v!=null);
    const score=x=>x.v+(x.s.tot-r.avg)*.6;
    const trade=pool.filter(x=>x.own).sort((a,b)=>score(b)-score(a)).slice(0,lim),fa=pool.filter(x=>!x.own).sort((a,b)=>score(b)-score(a)).slice(0,lim);
    const row=(x,act)=>`<li>${dFace(x.n,x.t,"sm")}<span><b>${dashNm(x.n)}</b><small class="muted">${esc(x.t)}${x.own&&x.own.id!==T?` · ${esc(x.own.nm)}`:""} · ${x.s.w.join("-")}</small></span><b class="ps-g num ${x.s.tot>=r.avg+1?"hi":x.s.tot<=r.avg-1?"lo":""}">${x.s.tot} g</b>${act||""}</li>`;
    const col=(t,xs,act,empty)=>`<div class="ps-c"><h4>${t}</h4>${xs.length?`<ul>${xs.map(x=>row(x,act&&act(x))).join("")}</ul>`:`<p class="dsm muted">${empty}</p>`}</div>`;
    return `<p class="ps-sum">Our playoffs: ${r.wks.map(n=>`<b>${esc(weekName(n))}</b>`).join(" · ")}. NBA teams play <b>${mn}–${mx}</b> games (average ${r.avg.toFixed(1)}).</p>${heat}
      <div class="ps-cols">${col("Your light schedules: sell high",sell,null,"None of your players has a light playoff schedule.")}
      ${col("Your heavy schedules: keep",hold,null,"None of your players has a heavy playoff schedule.")}
      ${col("Trade targets",trade,x=>`<button class="btn sm" data-trade="${esc(x.n)}">Trade</button>`,"No targets.")}
      ${col("Pick up and stash",fa,x=>ed?`<button class="btn sm" data-add="${esc(x.n)}">${x.w?"Claim":"Add"}</button>`:"",'No free agents with a heavy schedule.')}</div>
      <p class="dsm muted">Games per playoff week shown as ${r.wks.map(wn).join("-")}. Targets weigh how good a player is and how many extra games he gets.</p>`;}};

// New Era +: add the three tools once
NEP_VER=5;
{const ins=(after,k,s)=>{if(NEP_DEF.some(x=>x[0]===k))return;const i=NEP_DEF.findIndex(x=>x[0]===after);NEP_DEF.splice(i>=0?i+1:NEP_DEF.length,0,[k,s]);};
  ins("pl","cl","w");ins("cl","or","w");ins("po","ps","f");}

{const s=document.createElement("style");s.textContent=`
.or-sum,.cl-sum,.ps-sum{margin:0 0 10px;font-size:.88rem}
.or-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}.or-l>li{padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:color-mix(in srgb,var(--ink) 4%,transparent);animation:drise .45s cubic-bezier(.3,.7,.2,1) both;animation-delay:var(--d)}
.or-st{display:flex;gap:10px;align-items:center}.or-st>span{display:flex;flex-direction:column;min-width:0}.or-miss{color:#ef4444;font-size:.74rem;font-weight:700}
.or-b{list-style:none;margin:8px 0 0 14px;padding:0 0 0 12px;border-left:2px solid color-mix(in srgb,var(--accent) 40%,transparent);display:flex;flex-direction:column;gap:6px}
.or-b li{display:grid;grid-template-columns:26px minmax(0,1fr) auto auto;gap:8px;align-items:center}
.or-who{display:flex;flex-direction:column;min-width:0}.or-who em{font-style:normal;font-size:.62rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-left:6px}.or-who em.or-fa{color:#22c55e}.or-who em.or-me{color:var(--accent)}
.or-who small{font-size:.74rem}.or-src{font-size:.68rem!important;color:var(--muted);opacity:.8}.or-dz{color:#22c55e;font-size:1rem}
.or-tag{margin-left:6px;font-size:.66rem;font-weight:800;padding:2px 7px;border-radius:99px;color:#f59e0b;background:color-mix(in srgb,#f59e0b 16%,transparent);white-space:nowrap}
.cl-wrap{overflow-x:auto}.cl-t{width:100%;border-collapse:collapse;font-size:.84rem}.cl-t th,.cl-t td{padding:6px 6px;text-align:right;border-bottom:1px solid var(--line);white-space:nowrap}.cl-t th:first-child{text-align:left}.cl-t thead th{font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.cl-t td small{color:var(--muted)}.cl-t td small.up{color:#22c55e}.cl-t td small.dn{color:#ef4444}
.cl-chip{display:inline-block;font-size:.64rem;font-weight:800;padding:3px 8px;border-radius:99px;background:color-mix(in srgb,var(--ink) 8%,transparent);color:var(--muted)}
.cl-chip.safe{background:color-mix(in srgb,#22c55e 18%,transparent);color:#22c55e}.cl-chip.gone{background:color-mix(in srgb,#ef4444 16%,transparent);color:#ef4444}.cl-chip.toss{background:color-mix(in srgb,#f59e0b 18%,transparent);color:#f59e0b}.cl-chip.lean{color:#22c55e}.cl-chip.lean2{color:#ef4444}
.cl-adv{margin-top:12px;padding:12px;border-radius:12px;border:1px solid color-mix(in srgb,var(--accent) 45%,var(--line));background:color-mix(in srgb,var(--accent) 8%,transparent);display:flex;flex-direction:column;gap:8px}.cl-adv.early{border-style:dashed}
.cl-adv p{margin:0;font-size:.86rem}.cl-adv ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}.cl-adv li{display:flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;border-radius:99px;background:color-mix(in srgb,var(--ink) 6%,transparent)}.cl-adv .btn{align-self:flex-start}.cl-ok{margin:12px 0 0}
.ps-heat{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:4px;margin-bottom:14px}.ps-heat span{display:flex;flex-direction:column;align-items:center;padding:5px 0;border-radius:8px;background:color-mix(in srgb,var(--ink) 5%,transparent);font-size:.66rem}
.ps-heat span b{font-weight:800}.ps-heat span i{font-style:normal;font-size:.92rem;font-weight:800}.ps-heat .hi{background:color-mix(in srgb,#22c55e 20%,transparent);color:#22c55e}.ps-heat .lo{background:color-mix(in srgb,#ef4444 16%,transparent);color:#ef4444}
.ps-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}.ps-c h4{margin:0 0 6px;font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.ps-c ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.ps-c li{display:grid;grid-template-columns:26px minmax(0,1fr) auto auto;gap:8px;align-items:center}.ps-c li>span{display:flex;flex-direction:column;min-width:0}.ps-c li small{font-size:.72rem}
.ps-g{font-size:.84rem}.ps-g.hi{color:#22c55e}.ps-g.lo{color:#ef4444}
`;document.head.appendChild(s);}
