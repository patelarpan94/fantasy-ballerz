/* ============================================================================
   DASHBOARD 6 (2.35, Arp 2026-11-04: screenshot of Today's lineup and Quick
   add, "any improvemnts to this UI" then "yes" to all six ideas).
   Today's lineup: player photos, tighter rows split into Starters / Bench / IR,
   a live game dot or tip time on every row, today's projection (or his line so
   far once the game starts), last 7 days on wide tiles, and today's projected
   team total in the header. Quick add: photos and ESPN ownership trend.
   While the league mirrors ESPN, both say so and link to ESPN.
   ============================================================================ */
const dLive=t=>LIVE&&LIVE.day===TODAY&&LIVE.g?LIVE.g[t]:null;
const dPj=p=>pgLine(p.pj||(DIR[p.n]&&DIR[p.n].pj));
const dTri=a=>`${Math.round(+a[K.PTS]||0)}/${Math.round(+a[K.REB]||0)}/${Math.round(+a[K.AST]||0)}`;
// game status: green dot while live, grey after the final, bold tip time before
function dGameSt(t,sp){const g=gameOn(t,sp);if(!g)return `<span class="dgs none">no game</span>`;const vs=`${g[1]?"vs":"@"} ${esc(g[0])}`;
  const Lg=sp===TODAY?dLive(t):null;
  if(Lg&&Lg.s==="in")return `<span class="dgs in"><i aria-hidden="true"></i>${vs} · <b>${esc(liveTxt(Lg))}</b></span>`;
  if(Lg&&Lg.s==="post")return `<span class="dgs post"><i aria-hidden="true"></i>${vs} · ${esc(liveTxt(Lg))}</span>`;
  return `<span class="dgs pre">${vs}${sp===TODAY&&g[2]!=null?` · <b>${esc(fmtTime(g[2]))}</b>`:""}</span>`;}
const dMirNote=(T,what)=>mirror()?`<p class="dmir"><span>${what} on ESPN while the league mirrors ESPN.</span><a class="btn ghost sm" href="${esc(espnUrl(T))}" target="_blank" rel="noopener">Open ESPN ↗</a></p>`:"";

DW.tl.view=function(w,T){const sp=TODAY;if(!DAYS.includes(sp)&&sp>SEASON_END)return dashEmpty("The season is over.");
  const ed=dCanEdit(T),wide=!PHONE()&&w.s!=="s";
  const P=TEAMS[T].P.filter(p=>slotOn(p,sp)!=null).slice().sort((a,b)=>slotOn(a,sp)-slotOn(b,sp));
  let can=0;try{can=benchPlan(T,sp).extra||0;}catch(e){}
  const st=P.filter(p=>slotOn(p,sp)<12),plays=st.filter(p=>gameOn(p.t,sp)&&p.st!=="OUT");
  // today's total: projection for starters who play, and what they have so far once games start
  const z3=()=>{const a=[];a[K.PTS]=a[K.REB]=a[K.AST]=0;return a;},tot=z3(),sf=z3(),add=(a,b)=>[K.PTS,K.REB,K.AST].forEach(k=>a[k]+=+b[k]||0);let any=0;
  plays.forEach(p=>{const pj=dPj(p),d=p.d&&p.d[sp];if(pj)add(tot,pj);if(d){any=1;add(sf,d);}});
  const row=p=>{const s=slotOn(p,sp),g=gameOn(p.t,sp),bad=s<12&&g&&p.st==="OUT",idle=s<12&&!g,fill=s===12&&g&&p.st!=="OUT"&&can>0,d=p.d&&p.d[sp],pj=dPj(p),Lg=dLive(p.t);
    const started=d||(Lg&&Lg.s!=="pre");
    const today=bad?'<b class="badc">OUT</b>':fill?'<b class="warnc">Could start</b>':d?`<b class="num">${dTri(d)}</b><small class="muted">${Lg&&Lg.s==="post"?"final":"so far"}</small>`:g&&pj&&!started&&p.st!=="OUT"?`<span class="num">${dTri(pj)}</span><small class="muted">proj</small>`:"";
    const r=wide?recentPG(p.n,7):null;
    return `<li class="${bad?"bad":fill?"fill":idle?"idle":""}${s>=12?" off":""}${Lg&&Lg.s==="in"&&g?" live":""}">${dSlotBtn(p,T,sp)}${dFace(p.n,p.t,"sm")}
      <span class="dtln"><span class="dtlnm">${dashNm(p.n)} ${stTag(p.n,p.st)}</span><small class="muted">${esc(p.t||"")} · ${dGameSt(p.t,sp)}</small></span>
      <span class="dtls">${today}</span>${wide?`<span class="dtl7 num">${r?pra(r.pg):"–"}</span>`:""}</li>`;};
  const grp=(lab,xs)=>xs.length?`<li class="dtlg" aria-hidden="true"><span>${lab}</span>${wide?`<span></span><span></span><span>Today</span><span>Last 7</span>`:""}</li>${xs.map(row).join("")}`:"";
  const bench=P.filter(p=>slotOn(p,sp)===12),ir=P.filter(p=>slotOn(p,sp)===13);
  return `${dMirNote(T,"Lineups are set")}<div class="dtlh"><span class="dtlk"><b class="dbig num">${dCount(plays.length)}</b><span> of ${st.length} starters play today${can?`<br><b class="warnc">${can} open spot${can>1?"s":""} the bench could fill</b>`:""}</span></span>
    ${plays.length?`<span class="dtlt" title="Points / rebounds / assists from today's starters"><small class="muted">${any?"So far":"Projected today"}</small><b class="num">${any?dTri(sf):dTri(tot)}</b>${any?`<small class="muted">proj ${dTri(tot)}</small>`:'<small class="muted">PTS / REB / AST</small>'}</span>`:""}
    ${ed?`<button class="btn sm" data-dauto="today">Auto-set today</button>`:""}</div>
    <ol class="dtl${wide?" wide":""}">${grp("Starters",st)}${grp("Bench",bench)}${grp("IR",ir)}</ol>${ed?'<p class="dsm muted">Tap a slot to move a player. Changes save right away, and slots lock at tip-off.</p>':""}`;};

DW.qa.view=function(w,T,big){const ed=dCanEdit(T),own=NBA&&NBA.own||{};
  const fa=Object.values(DIR).filter(D=>!ownerNow(D.n)&&INJ[D.n]!=="OUT").map(D=>{const r=recentPG(D.n,14);return r?{D,r,z:zOf(r.pg)}:null;}).filter(Boolean).sort((a,b)=>b.z-a.z).slice(0,big?6:4);
  let left=null;try{left=pickupsLeft(T);}catch(e){}
  const trend=n=>{const o=own[n];if(!o)return "";const ch=+o[1]||0;return `<span class="dqo num" title="Rostered in ${(+o[0]).toFixed(1)}% of ESPN leagues, ${ch>=0?"+":""}${ch.toFixed(1)} this week"><b>${Math.round(+o[0])}%</b><small class="${ch>0.05?"okc":ch<-0.05?"badc":"muted"}">${ch>0.05?"▲":ch<-0.05?"▼":"•"} ${Math.abs(ch).toFixed(1)}</small></span>`;};
  return `${dMirNote(T,"Adds and drops are made")}${ed?`<div class="dqa"><input id="dqaIn" list="dqaList" placeholder="Search free agents" aria-label="Search free agents" autocomplete="off"><button class="btn sm" data-dqa>Add</button></div>
    <datalist id="dqaList">${Object.values(DIR).filter(D=>!ownerNow(D.n)).map(D=>`<option value="${esc(D.n)}">${esc(D.t||"")}</option>`).join("")}</datalist>`:""}
    ${left!=null&&isFinite(left)&&ed?`<p class="dsm muted">${left} pickup${left===1?"":"s"} left ${L.addMode==="day"?"today":L.addMode==="season"?"this season":"this matchup"}</p>`:""}
    <p class="dcoh">Best free agents · last 14 days</p>
    <ol class="dqal">${fa.map(x=>`<li>${dFace(x.D.n,x.D.t,"sm")}<span>${dashNm(x.D.n)}<small class="muted">${esc(x.D.t||"")} · <span class="num">${pra(x.r.pg)}</span> · ${dDaysLeft().filter(d=>gameOn(x.D.t,d)).length} games left</small></span>${trend(x.D.n)}${ed?`<button class="actb add" data-add="${esc(x.D.n)}" aria-label="Add ${esc(x.D.n)}" title="Add">+</button>`:""}</li>`).join("")}</ol>`;};

{const s=document.createElement("style");s.textContent=`
.dmir{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px;padding:7px 10px;border-radius:10px;font-size:.8rem;background:color-mix(in srgb,var(--accent) 10%,transparent);border:1px solid color-mix(in srgb,var(--accent) 28%,transparent)}
.dmir .btn{flex:none;text-decoration:none}
.dtlh{align-items:center}.dtlk{display:flex;align-items:center;gap:8px;line-height:1.2}
.dtlt{display:flex;flex-direction:column;align-items:flex-end;line-height:1.15;margin-left:auto}.dtlt b{font-size:1.15rem}.dtlt small{font-size:.68rem}
.dtl{gap:1px;margin-top:6px}
.dtl li{grid-template-columns:62px 28px minmax(0,1fr) auto;gap:8px;padding:3px 6px}
.dtl.wide li{grid-template-columns:62px 28px minmax(0,1fr) 84px 84px}
.dtl li.off:first-of-type,.dtl li:not(.off)+li.off{margin-top:0;border-top:0;padding-top:3px}
.dtl li.dtlg{display:grid;padding:8px 6px 2px;font-size:.66rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;opacity:1;background:none}
.dtl li.dtlg:first-child{padding-top:0}.dtl li.dtlg span:nth-child(4),.dtl li.dtlg span:nth-child(5){text-align:right}
.dtl li.dtlg>span:first-child{grid-column:1/4}.dtl li.dtlg>span:nth-child(2),.dtl li.dtlg>span:nth-child(3){display:none}
.dtl .mvb,.dtl .slot{min-width:0;width:100%;padding-left:4px;padding-right:4px}
.dtls{display:flex;flex-direction:column;align-items:flex-end;line-height:1.15}.dtls small{font-size:.66rem}
.dtl7{font-size:.78rem;text-align:right;color:var(--muted)}
.dtl li.live{box-shadow:inset 3px 0 0 var(--win,#2e7d32)}
.dface.sm,.dtl .arpface,.dqal .arpface,html .dtl .arpface.sm,html .dqal .arpface.sm{width:28px;height:28px;min-width:28px}.dface.sm i,.arpface.sm>i{font-size:.62rem}.dtl .arpface .arptl,.dqal .arpface .arptl{width:13px;height:13px;right:-4px;bottom:-3px}.arpface.sm .arphc{width:14px;height:14px;font-size:8px}
.dface.sm{font-size:.62rem}.dface.sm i{font-style:normal}
.dgs{white-space:nowrap}.dgs b{font-weight:800;color:var(--ink)}
.dgs i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;vertical-align:1px}
.dgs.in i{background:var(--win,#2e7d32);box-shadow:0 0 0 0 color-mix(in srgb,var(--win,#2e7d32) 60%,transparent);animation:dgsp 1.6s ease-out infinite}
.dgs.in b{color:var(--win,#2e7d32)}.dgs.post i{background:var(--muted)}.dgs.none{color:var(--loss,#c62828)}
@keyframes dgsp{70%{box-shadow:0 0 0 6px transparent}100%{box-shadow:0 0 0 0 transparent}}
@media (prefers-reduced-motion:reduce){.dgs.in i{animation:none}}
.dqal{gap:4px}.dqal li{display:grid;grid-template-columns:28px minmax(0,1fr) auto auto;gap:8px}
.dqal li>span:not(.dqo){display:flex;flex-direction:column;min-width:0}.dqal li .dnm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dqo{display:flex;flex-direction:column;align-items:flex-end;line-height:1.1;font-size:.8rem}.dqo small{font-size:.66rem}
@media (max-width:640px){.dtl li{grid-template-columns:58px 26px minmax(0,1fr) auto;gap:6px;padding:3px 4px}.dtl li small .dgs{white-space:normal}}
`;document.head.appendChild(s);}
