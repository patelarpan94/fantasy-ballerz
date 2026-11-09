
/* ============================================================================
   DASHBOARD BY MATCHUP (2.62, 2026-11-09, Arp: "right now the dashboard only
   shows current week. Can we design it so it shows past weeks as well? We can
   use the matchup filter on the top").
   - The matchup picker at the top (and a ‹ Matchup N › strip on the dashboard
     itself) now drives the whole dashboard. Week widgets (matchup, arena,
     swing categories, win % tracker, tug-of-war, race chart, daily production,
     player of the week, league scoreboard, lineup efficiency, bench points...)
     already read the picked matchup; they now get the room.
   - Looking back at a finished matchup: a full-width Matchup recap leads the
     board (result, every category with the margin, each side's top players,
     best single game, starts and bench points), and the tools that only make
     sense for today (today's lineup, quick add, planner, countdown, claims,
     waiver feed...) step aside with one line saying so. Season widgets stay.
   - A future matchup shows the same way as a preview (no recap yet).
   - "This week" jumps straight back.
   ============================================================================ */
// widgets about today / right now: hidden while a past or future matchup is picked
const DWK_NOW=new Set(["lu","tl","otl","qa","co","cd","gm","lt","nw","fa","tr","wf","wa","sm","mw","ct","pl","cl","fw","or","gp","ij","gl","kp","op","wl","ch","hd","rr"]);
// projections that read wrong once a matchup is final
const DWK_PAST=new Set(["sw","wp"]);
const dwkNow=()=>weekOf(Math.min(TODAY,SEASON_END));
const dwkMode=()=>{const n=wk[0],c=dwkNow()[0];return n===c?"now":n<c?"past":"next";};
const dwkRange=w=>`${md(w[1])} – ${dateOf(w[1]).getMonth()===dateOf(w[2]).getMonth()?dateOf(w[2]).getDate():md(w[2])}`;
const dwkDays=w=>{const o=[];for(let sp=w[1];sp<=Math.min(w[2],TODAY);sp++)o.push(sp);return o;};
// what one player did for a team in the picked matchup (started games only), plus bench points
function dwkPlayers(T,w){const days=dwkDays(w),out=[];let bench=0,starts=0,best=null;
  TEAMS[T].P.forEach(p=>{const t=new Array(11).fill(0);let g=0;
    days.forEach(sp=>{const l=p.d[sp];if(!l||!(l[K.MIN]>0))return;const s=slotOn(p,sp);
      if(s===12)bench+=l[K.PTS];if(s==null||s>=12)return;g++;starts++;l.forEach((v,i)=>{if(i<11)t[i]+=v;});
      const sc=l[K.PTS]+1.2*l[K.REB]+1.5*l[K.AST]+3*l[K.STL]+3*l[K.BLK]+l[K.TPM];if(!best||sc>best.sc)best={n:p.n,t:p.t,l,sp,sc};});
    if(g)out.push({n:p.n,t:p.t,g,tot:t,sc:t[K.PTS]+1.2*t[K.REB]+1.5*t[K.AST]+3*t[K.STL]+3*t[K.BLK]+t[K.TPM]});});
  return {ps:out.sort((a,b)=>b.sc-a.sc),bench,starts,best};}
const dwkLine=t=>`${t[K.PTS]} PTS · ${t[K.REB]} REB · ${t[K.AST]} AST${t[K.STL]+t[K.BLK]?` · ${t[K.STL]+t[K.BLK]} STL+BLK`:""}${t[K.TPM]?` · ${t[K.TPM]} 3PM`:""}`;
function dwkRecap(T){const w=wk,n=w[0],O=opponentIn(T,n);
  const head=`<div class="dth"><h3>${esc(weekName(n))} recap</h3></div>`;
  if(!O||!TEAMS[O])return `<section class="dtile sz-f dk-wr" data-dw="wr">${head}<div class="dbody">${dashEmpty(`${esc(TEAMS[T].name)} had no matchup in ${esc(weekName(n))}.`)}</div></section>`;
  const days=dwkDays(w),a=dayTotals(T,days)||new Array(10).fill(0),b=dayTotals(O,days)||new Array(10).fill(0),r=h2h(a,b),won=r[0]>r[1],tie=r[0]===r[1];
  const A=dwkPlayers(T,w),B=dwkPlayers(O,w);
  const res=`<div class="wr-res ${won?"won":tie?"tie":"lost"}"><span class="wr-tag">${won?"Won":tie?"Tied":"Lost"}</span><b class="num">${r.slice(0,r[2]?3:2).join("-")}</b><span>${esc(TEAMS[T].name)} vs ${esc(TEAMS[O].name)} · ${esc(dwkRange(w))}</span></div>`;
  const cats=CATS.map(c=>{const x=val(a,c),y=val(b,c),d=x-y,eq=Math.abs(d)<1e-9,mine=!eq&&d>0;
    const f=v=>c[1]==="pct"?pct(v):Math.round(v),m=c[1]==="pct"?Math.abs(d).toFixed(3).replace(/^0/,""):Math.round(Math.abs(d));
    return `<tr class="${eq?"":mine?"me":"op"}"><td class="nm">${esc(c[0])}</td><td class="num${mine?" w":""}">${f(x)}</td><td class="num${!eq&&!mine?" w":""}">${f(y)}</td><td class="wr-m">${eq?"tie":`${mine?"you":"them"} by ${m}`}</td></tr>`;}).join("");
  const tbl=`<div class="scroll"><table class="lg wr-cats"><thead><tr><th class="nm">Cat</th><th>${esc(dShort(T))}</th><th>${esc(dShort(O))}</th><th>Margin</th></tr></thead><tbody>${cats}</tbody></table></div>`;
  const stars=(X,nm)=>`<div class="wr-st"><h4>${esc(nm)}'s top players</h4>${X.ps.length?`<ol>${X.ps.slice(0,3).map(p=>`<li>${dFace(p.n,p.t,"sm")}<span><b>${dashNm(p.n)}</b><small class="muted">${p.g} game${p.g===1?"":"s"} · ${dwkLine(p.tot)}</small></span></li>`).join("")}</ol>`:`<p class="muted dsm">No games started.</p>`}</div>`;
  const best=[A.best&&{...A.best,T},B.best&&{...B.best,T:O}].filter(Boolean).sort((x,y)=>y.sc-x.sc)[0];
  const facts=`<ul class="wr-f"><li><small>Starts</small><b class="num">${A.starts} <i>vs</i> ${B.starts}</b></li><li><small>Bench points left</small><b class="num">${A.bench} <i>vs</i> ${B.bench}</b></li>${best?`<li class="wide"><small>Best game of the matchup</small><b>${dashNm(best.n)}</b><span class="muted">${esc(dShort(best.T))} · ${dow(best.sp)} ${md(best.sp)} · ${dwkLine(best.l)}</span></li>`:""}</ul>`;
  return `<section class="dtile sz-f dk-wr" data-dw="wr" aria-label="${esc(weekName(n))} recap">${head}<div class="dbody">${res}${tbl}<div class="wr-two">${stars(A,dShort(T))}${stars(B,dShort(O))}</div>${facts}</div></section>`;}
function dwkStrip(){const m=dwkMode(),n=wk[0],c=dwkNow()[0];
  const tag=m==="now"?"This matchup":m==="past"?(n===c-1?"Last matchup · final":"Final"):"Coming up";
  return `<div class="dwk ${m}" role="group" aria-label="Pick a matchup"><button class="dwk-b" data-dwk="-1" aria-label="Previous matchup"${n<=1?" disabled":""}>‹</button>
    <span class="dwk-l"><b>${esc(weekName(n))}</b><small>${esc(dwkRange(wk))} · ${tag}</small></span><button class="dwk-b" data-dwk="1" aria-label="Next matchup"${n>=WEEKS.length?" disabled":""}>›</button>
    ${m==="now"?"":`<button class="btn sm" data-dwk="now">Back to this week</button>`}</div>`;}
{const _dv=dashView;dashView=function(){let h=_dv.apply(this,arguments);if(!L||DASH_EDIT)return h;const T=dashT();if(!TEAMS[T])return h;
  const m=dwkMode(),i=h.indexOf('<div class="dgrid"');if(i<0)return h;
  let note="";if(m!=="now"){const hid=dashW().filter(w=>DW[w.k]&&w.k!=="hd"&&(DWK_NOW.has(w.k)||m==="past"&&DWK_PAST.has(w.k))).length;
    note=`<p class="dwk-note">${m==="past"?`Looking back at ${esc(weekName(wk[0]))}.`:`Previewing ${esc(weekName(wk[0]))}.`} Week widgets show that matchup${hid?`; ${hid} tool${hid===1?"":"s"} for today ${hid===1?"is":"are"} tucked away until you go back to this week`:""}.</p>`;}
  h=h.slice(0,i)+dwkStrip()+note+h.slice(i);
  if(m!=="now"){h=h.replace('<div class="dash','<div class="dash dwk-off'+(m==="past"?" dwk-past":""));
    if(m==="past")h=h.replace(/(<div class="dgrid[^"]*" id="dgrid">)/,`$1${(()=>{try{return dwkRecap(T);}catch(e){return "";}})()}`);}
  return h;};}
document.addEventListener("click",e=>{const b=e.target.closest("[data-dwk]");if(!b||nav!=="dash")return;e.preventDefault();const v=b.dataset.dwk;
  if(v==="now")wk=dwkNow();else{const n=wk[0]+(+v);if(n<1||n>WEEKS.length)return;wk=WEEKS[n-1];}
  selDay=null;MOVING=null;load();window.scrollTo({top:0});});
{const s=document.createElement("style");s.textContent=`
.dwk{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.dwk-b{font:inherit;font-size:1.2rem;line-height:1;width:34px;height:34px;border-radius:999px;border:1px solid var(--line);background:var(--bg);color:var(--ink);cursor:pointer}
.dwk-b:disabled{opacity:.35;cursor:default}
.dwk-l{display:flex;flex-direction:column;min-width:0;flex:1 1 auto}.dwk-l b{font-family:var(--f-display);font-size:1.05rem}.dwk-l small{color:var(--muted);font-size:.78rem}
.dwk.past{border-color:var(--accent);background:var(--accent-wash)}
.dwk-note{margin:0;font-size:.82rem;color:var(--muted)}
${[...DWK_NOW].map(k=>`.dash.dwk-off .dtile.dk-${k}`).join(",")}{display:none!important}
${[...DWK_PAST].map(k=>`.dash.dwk-past .dtile.dk-${k}`).join(",")}{display:none!important}
.wr-res{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.wr-res .wr-tag{font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:.78rem;padding:3px 9px;border-radius:999px;background:var(--line)}
.wr-res.won .wr-tag{background:var(--win-wash);color:var(--win)}.wr-res.lost .wr-tag{background:var(--loss-wash);color:var(--loss)}
.wr-res b{font-family:var(--f-display);font-size:2rem;line-height:1}.wr-res span:last-child{color:var(--muted);font-size:.84rem}
.wr-cats td.w{font-weight:800}.wr-cats tr.me td.nm{box-shadow:inset 3px 0 var(--win)}.wr-cats tr.op td.nm{box-shadow:inset 3px 0 var(--loss)}
.wr-cats .wr-m{color:var(--muted);font-size:.8rem;white-space:nowrap}
.wr-two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
.wr-st h4{margin:0 0 6px;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.wr-st ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.wr-st li{display:flex;gap:8px;align-items:center}.wr-st li>span{display:flex;flex-direction:column;min-width:0}
.wr-f{list-style:none;margin:12px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.wr-f li{border:1px solid var(--line);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:2px}.wr-f li.wide{grid-column:1/-1}
.wr-f small{color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.04em}.wr-f b i{font-style:normal;color:var(--muted);font-weight:500;font-size:.8em}
@media (max-width:640px){.wr-two{grid-template-columns:1fr}.dwk .btn{flex:1 1 100%}}
`;document.head.appendChild(s);}
