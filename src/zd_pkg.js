/* ============================================================================
   TRADE PACKAGES (2.22, 2026-11-03): Analytics › Trade packages. Build any
   trade by hand: pick a team for each side (or no team), add any players to
   either side (rostered anywhere or free agents), and see the two packages
   side by side: per-game category totals, overall value, games left, and,
   when a side has a team, what the trade does to that team's categories,
   league ranks and expected categories won a week. Packages can be saved so
   different offers can be lined up against each other.
   ============================================================================ */
const PK={a:{t:null,ns:[]},b:{t:null,ns:[]},mode:"proj",fa:true,saved:[]};
try{Object.assign(PK,JSON.parse(localStorage.getItem("dfPkg")||"{}"));}catch(e){}
const savePK=()=>{try{localStorage.setItem("dfPkg",JSON.stringify(PK));}catch(e){}};
// per-game line for this tool: ESPN projection or season so far; OUT players count as nothing in team totals
const pkLine=n=>{const D=DIR[n];if(!D)return null;return pgLine(PK.mode==="season"?(D.ss&&D.ss[11]?D.ss:null):D.pj);};
const pkGp=n=>{const D=DIR[n],a=D&&(PK.mode==="season"?D.ss:D.pj);return a&&a[11]?Math.round(a[11]):0;};
const pkTeams=()=>L.teams.map(t=>tnum(t.id)).filter(x=>TEAMS[x]&&TEAMS[x].P.length);
const pkFmt=(v,c)=>v==null?"–":c[1]==="pct"?pct(v):v.toFixed(1);
const pkLeft=(n,from,to)=>{const D=DIR[n];if(!D||INJ[n]==="OUT")return 0;let g=0;for(let sp=from;sp<=to;sp++)if(upcoming(D.t,sp)&&gameOn(D.t,sp))g++;return g;};
const pkLeftWk=n=>{const D=DIR[n];if(!D||INJ[n]==="OUT")return 0;return DAYS.filter(sp=>upcoming(D.t,sp)&&gameOn(D.t,sp)).length;};
const pkShort=n=>{const w=n.split(" ").filter(x=>!/^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(x));return w[w.length-1]||n;};
// league picture with this tool's stat mode (same model as Trade targets)
function pkLeague(){
  const ids=pkTeams(),act={},S={},LN={},ln=n=>{if(!(n in LN))LN[n]=INJ[n]==="OUT"?null:pkLine(n);return LN[n];};
  ids.forEach(x=>{act[x]=activeNames(x);S[x]=lineSum(act[x].map(ln));});
  const sd={};CATS.forEach(c=>{const xs=ids.map(x=>val(S[x],c)),m=xs.reduce((a,b)=>a+b,0)/(xs.length||1);sd[c[0]]=Math.sqrt(xs.reduce((a,b)=>a+(b-m)**2,0)/(xs.length||1))||(c[1]==="pct"?.01:1);});
  const rank=(x,c,SS)=>1+ids.filter(y=>val(SS[y],c)>val(SS[x],c)+1e-9).length;
  return {ids,act,S,ln,sd,rank};
}
// best healthy free agents not already in either package, for teams that end up with open roster spots
function pkFAs(k,skip){const out=[];Object.values(DIR).forEach(D=>{if(ownerNow(D.n)||INJ[D.n]==="OUT"||skip.includes(D.n))return;const l=pkLine(D.n),z=l?zOf(l):null;if(z!=null)out.push([z,D.n]);});
  return out.sort((a,b)=>b[0]-a[0]).slice(0,k).map(x=>x[1]);}
// what the trade does to one team: it sends its side's players (those it actually has) and takes the other side's
function pkImpact(G,T,send,recv,SS){
  const owned=send.filter(n=>ownerNow(n)===T),lost=G.act[T].filter(n=>owned.includes(n));
  const after=G.act[T].filter(n=>!lost.includes(n)).concat(recv.filter(n=>!G.act[T].includes(n)));
  const recvNew=recv.filter(n=>ownerNow(n)!==T).length,size=rosterNow(T).length-owned.length+recvNew,open=Math.max(0,ROSTER_MAX-size),over=Math.max(0,size-ROSTER_MAX);
  return {T,owned,after,size,open,over,recvNew,notOwned:send.filter(n=>ownerNow(n)!==T)};
}
function pkWins(G,x,SS){let s=0;const o=G.ids.filter(y=>y!==x);o.forEach(y=>CATS.forEach(c=>{s+=ttPhi((val(SS[x],c)-val(SS[y],c))/G.sd[c[0]]);}));return o.length?s/o.length:0;}
function pkCalc(){
  const A=PK.a,B=PK.b,G=pkLeague(),SS={...G.S},imp=[];
  const sides=[[A,A.ns,B.ns],[B,B.ns,A.ns]];
  sides.forEach(([s,send,recv],i)=>{if(s.t&&G.S[s.t]&&!(i===1&&+B.t===+A.t))imp.push(pkImpact(G,+s.t,send,recv));});
  // free agents fill a team's open spots only when the trade opened them (it sent more than it got)
  const used=[...A.ns,...B.ns];
  imp.forEach(I=>{const net=I.owned.length-I.recvNew;
    I.fa=PK.fa&&net>0?pkFAs(Math.min(net,I.open,3),used.concat(imp.flatMap(J=>J.fa||[]))):[];
    SS[I.T]=lineSum(I.after.concat(I.fa).map(G.ln));});
  imp.forEach(I=>{I.base=pkWins(G,I.T,G.S);I.now=pkWins(G,I.T,SS);I.d=I.now-I.base;});
  return {G,SS,imp};
}
// ---- the builder: one card per side
function pkSide(k){
  const s=PK[k],ids=pkTeams(),other=PK[k==="a"?"b":"a"];
  const opts=`<option value="0"${!s.t?" selected":""}>No team (any players)</option>`+ids.map(x=>`<option value="${x}"${+s.t===x?" selected":""}>${esc(TEAMS[x].name)}${x===myTeamNum()?" (you)":""}</option>`).join("");
  const chip=n=>{const l=pkLine(n),z=l?zOf(l):null,o=ownerNow(n),off=s.t&&o!==+s.t;
    return `<span class="pkchip${off?" off":""}"><span class="nmb" role="button" tabindex="0" data-pcard="${esc(n)}"><b>${esc(n)}</b></span><small>${esc(DIR[n]?.t||"")}${INJ[n]?` · <span class="badc">${esc(INJ[n])}</span>`:""}${z!=null?` · ${z>=0?"+":""}${z.toFixed(1)}`:""}${off?` · ${o?esc(teamName(o)):"free agent"}`:""}</small><button class="cmpx" data-pkrm="${k}:${esc(n)}" aria-label="Remove ${esc(n)}">✕</button></span>`;};
  const pool=s.t&&TEAMS[s.t]?rosterNow(+s.t).filter(n=>!s.ns.includes(n)&&!other.ns.includes(n)).map(n=>{const l=pkLine(n);return [l?zOf(l):-99,n];}).sort((a,b)=>b[0]-a[0]).map(x=>x[1]):[];
  const label=s.t&&TEAMS[s.t]?`${esc(TEAMS[s.t].name)} sends`:`Side ${k.toUpperCase()} sends`;
  return `<div class="pkside"><div class="pkhead"><b>${label}</b><label class="hf"><span>Team</span><select data-pkteam="${k}">${opts}</select></label></div>
    <div class="pkchips">${s.ns.length?s.ns.map(chip).join(""):`<span class="muted">No players yet</span>`}</div>
    <div class="pkadd"><input type="search" class="pkq" data-pkq="${k}" placeholder="Add any player…" autocomplete="off" enterkeyhint="search" aria-label="Add a player to this side"><div class="pksug" data-pksug="${k}" hidden></div></div>
    ${pool.length?`<div class="pkpool"><span class="muted">From the roster</span>${pool.map(n=>`<button class="pkp" data-pkadd="${k}:${esc(n)}">+ ${esc(pkShort(n))}<small>${esc(DIR[n]?.t||"")}</small></button>`).join("")}</div>`:""}</div>`;
}
// ---- package vs package: each player, side totals, value and games left
function pkTable(){
  const A=PK.a,B=PK.b,nm=s=>s.t&&TEAMS[s.t]?esc(TEAMS[s.t].name):null,lab=[nm(A)||"Side A",nm(B)||"Side B"];
  const tot=[A.ns,B.ns].map(ns=>{const ls=ns.map(pkLine).filter(Boolean);return ls.length?lineSum(ls):null;});
  const better=c=>{const [a,b]=tot.map(t=>t?val(t,c):null);if(a==null||b==null||Math.abs(a-b)<1e-9)return -1;return a>b?0:1;};
  const zs=[A.ns,B.ns].map(ns=>ns.reduce((s,n)=>{const l=pkLine(n),z=l?zOf(l):null;return s+(z||0);},0));
  const wk=[A.ns,B.ns].map(ns=>ns.reduce((s,n)=>s+pkLeftWk(n),0)),ss=[A.ns,B.ns].map(ns=>ns.reduce((s,n)=>s+pkLeft(n,Math.max(1,TODAY),SEASON_END),0));
  const hi=(i,xs)=>xs[i]>xs[1-i]+1e-9?" best":"";
  const row=(n,i)=>{const l=pkLine(n),z=l?zOf(l):null;return `<tr><td class="pl"><span class="nmb" role="button" tabindex="0" data-pcard="${esc(n)}">${esc(n)}</span><small>${esc(DIR[n]?.t||"")}${INJ[n]?` · <span class="badc">${esc(INJ[n])}</span>`:""}</small></td><td class="num">${pkGp(n)||"–"}</td><td class="num pkx" data-pkx="z:${esc(n)}">${z!=null?(z>=0?"+":"")+z.toFixed(1):"–"}</td><td class="num pkx" data-pkx="g:${esc(n)}">${pkLeftWk(n)}</td>${CATS.map((c,ci)=>`<td class="num${l?" pkx":""}"${l?` data-pkx="pc:${ci}:${esc(n)}"`:""}>${l?pkFmt(val(l,c),c):"–"}</td>`).join("")}</tr>`;};
  const body=[A.ns,B.ns].map((ns,i)=>`<tr class="tcside"><th colspan="${CATS.length+4}">${lab[i]} sends</th></tr>${ns.length?ns.map(n=>row(n,i)).join(""):`<tr><td class="pl muted" colspan="${CATS.length+4}">Nothing</td></tr>`}
    <tr class="tot"><td class="pl">Package per game</td><td></td><td class="num pkx${hi(i,zs)}" data-pkx="pz:${i}">${(zs[i]>=0?"+":"")+zs[i].toFixed(1)}</td><td class="num pkx${hi(i,wk)}" data-pkx="pg:${i}">${wk[i]}</td>${CATS.map((c,ci)=>`<td class="num${tot[i]?" pkx":""}${better(c)===i?" best":""}"${tot[i]?` data-pkx="pt:${i}:${ci}"`:""}>${tot[i]?pkFmt(val(tot[i],c),c):"–"}</td>`).join("")}</tr>`).join("");
  const wins=[0,1].map(i=>CATS.filter(c=>better(c)===i));
  const head=tot[0]&&tot[1]?`<div class="pkscore"><div><span class="muted">${lab[0]}'s package</span><span class="big num">${wins[0].length}</span><small>${wins[0].map(c=>c[0]).join(", ")||"no categories"}</small></div><div class="pkvs">vs</div><div><span class="muted">${lab[1]}'s package</span><span class="big num">${wins[1].length}</span><small>${wins[1].map(c=>c[0]).join(", ")||"no categories"}</small></div></div>`:"";
  const facts=`<div class="ttfit"><div><span class="muted">Value per game</span><b>${lab[0]} ${(zs[0]>=0?"+":"")+zs[0].toFixed(1)} · ${lab[1]} ${(zs[1]>=0?"+":"")+zs[1].toFixed(1)}</b></div><div><span class="muted">Games left · this matchup / season</span><b>${lab[0]} ${wk[0]} / ${ss[0]} · ${lab[1]} ${wk[1]} / ${ss[1]}</b></div></div>`;
  return sec("Package vs package",`${PK.mode==="season"?"Season per game":"ESPN projections"} · better package in each category in green`,
    `${head}${facts}<div class="scroll"><table class="tcmpt pkt"><thead><tr><th class="pl">Player</th><th class="num">GP</th><th class="num" title="Overall value per game: z-scores across our categories vs the top 150 players">Value</th><th class="num" title="Games left this matchup">Wk</th>${CATS.map(c=>`<th class="num">${c[0]}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>
    <p class="anote"><b>Tap or hover any dotted number to see how it's worked out.</b> Value adds up each player's z-scores across our categories (0 is about the 150th best player), so it rewards raw production; the category table shows where it comes from. Percentages are combined from makes and attempts, so a high-volume shooter moves them more.</p>`);
}
// ---- what it does to each team that's part of the trade
function pkTeamsSec(R){
  const {G,SS,imp}=R;if(!imp.length)return sec("Team impact","Pick a team for a side to see what the trade does to it",`<p class="empty">Pick a team at the top of a side to see its categories, ranks and expected wins before and after.</p>`);
  const N=G.ids.length;
  const col=I=>{const rows=CATS.map((c,ci)=>{const b=val(G.S[I.T],c),a=val(SS[I.T],c),rb=G.rank(I.T,c,G.S),ra=G.rank(I.T,c,SS),d=a-b,good=c[1]==="pct"?d>1e-4:d>.05,bad=c[1]==="pct"?d<-1e-4:d<-.05;
      return `<tr><td class="nm"><b>${c[0]}</b></td><td class="num pkx" data-pkx="tn:${I.T}:${ci}">${pkFmt(b,c)}</td><td class="num pkx ${good?"okc":bad?"badc":""}" data-pkx="ta:${I.T}:${ci}">${pkFmt(a,c)}<small>${c[1]==="pct"?(d<0?"−":"+")+pct(Math.abs(d)||0).replace("–",".000"):fmtD(d)}</small></td><td class="num pkx ${ra<rb?"okc":ra>rb?"badc":""}" data-pkx="tr:${I.T}:${ci}">${ord(rb)}${ra!==rb?` → ${ord(ra)}`:""}</td></tr>`;}).join("");
    const up=CATS.filter(c=>G.rank(I.T,c,SS)<G.rank(I.T,c,G.S)).map(c=>c[0]),dn=CATS.filter(c=>G.rank(I.T,c,SS)>G.rank(I.T,c,G.S)).map(c=>c[0]);
    const verdict=I.d>.05?"okc":I.d<-.05?"badc":"";
    const notes=[I.over?`<span class="badc">Over the roster limit by ${I.over}: they'd have to drop ${I.over===1?"a player":I.over+" players"}.</span>`:"",
      I.fa.length?`Open ${I.fa.length===1?"spot":"spots"} counted as picking up ${I.fa.map(esc).join(", ")} (best free ${I.fa.length===1?"agent":"agents"}).`:"",
      I.notOwned.length?`<span class="muted">${I.notOwned.map(esc).join(", ")} ${I.notOwned.length===1?"isn't":"aren't"} on this team, so ${I.notOwned.length===1?"he's":"they're"} left out of its totals.</span>`:""].filter(Boolean);
    return `<div class="pkimp"><div class="anhero"><span class="big num pkx ${verdict}" data-pkx="tw:${I.T}">${I.d>=0?"+":""}${I.d.toFixed(2)}</span><span class="muted">${esc(TEAMS[I.T].name)}: categories won a week, ${I.base.toFixed(1)} → ${I.now.toFixed(1)} of ${CATS.length}${up.length?` · rank up in ${up.join(", ")}`:""}${dn.length?` · down in ${dn.join(", ")}`:""}</span></div>
      <div class="scroll"><table class="lg antable ttab"><thead><tr><th class="nm">Cat</th><th>Now</th><th>After</th><th>Rank of ${N}</th></tr></thead><tbody>${rows}</tbody></table></div>${notes.length?`<p class="anote">${notes.join(" ")}</p>`:""}</div>`;};
  const v=imp.length===2?(imp[0].d>.05&&imp[1].d>.05?"Both teams come out ahead.":imp[0].d>.05||imp[1].d>.05?`Only ${esc(TEAMS[(imp[0].d>imp[1].d?imp[0]:imp[1]).T].name)} comes out ahead.`:"Neither team comes out ahead."):"";
  return sec("Team impact",`Per-game totals of healthy, non-IR players before and after · ${v||"pick a team on the other side too"}`,`<div class="pkimps">${imp.map(col).join("")}</div>
    <p class="anote">"Categories won a week" is how many categories the team would expect to win against an average team in the league, from per-game totals. OUT players count as nothing. A team that takes more players than it sends needs open roster spots.</p>`);
}
// ---- saved packages, scored again every time so they stay current
const pkName=p=>`${p.a.ns.map(pkShort).join(" + ")||"nothing"} ⇄ ${p.b.ns.map(pkShort).join(" + ")||"nothing"}`;
function pkSavedSec(){
  if(!PK.saved.length)return "";
  const keep={a:PK.a,b:PK.b},rows=PK.saved.map((p,i)=>{PK.a=p.a;PK.b=p.b;const R=pkCalc(),f=I=>I?`<span class="${I.d>.05?"okc":I.d<-.05?"badc":""}">${I.d>=0?"+":""}${I.d.toFixed(2)}</span>`:"–";
    const ia=R.imp.find(I=>I.T===+p.a.t),ib=R.imp.find(I=>I.T===+p.b.t);
    const za=p.a.ns.reduce((s,n)=>{const l=pkLine(n);return s+(l?zOf(l)||0:0);},0),zb=p.b.ns.reduce((s,n)=>{const l=pkLine(n);return s+(l?zOf(l)||0:0);},0);
    return `<tr><td class="nm"><b>${esc(pkName(p))}</b><small>${p.a.t&&TEAMS[p.a.t]?esc(TEAMS[p.a.t].name):"Side A"} ⇄ ${p.b.t&&TEAMS[p.b.t]?esc(TEAMS[p.b.t].name):"Side B"}</small></td><td class="num">${(za>=0?"+":"")+za.toFixed(1)} / ${(zb>=0?"+":"")+zb.toFixed(1)}</td><td class="num">${f(ia)}</td><td class="num">${f(ib)}</td><td class="nm"><button class="mini-b" data-pkload="${i}">Open</button> <button class="cmpx" data-pkdel="${i}" aria-label="Delete">✕</button></td></tr>`;}).join("");
  PK.a=keep.a;PK.b=keep.b;
  return sec("Saved packages",`Line up different offers · scored again with today's numbers`,`<div class="scroll"><table class="lg antable pksv"><thead><tr><th class="nm">Package</th><th title="Value per game, side A / side B">Value A / B</th><th>Side A team</th><th>Side B team</th><th class="nm"></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="anote">Team columns are the change in categories won a week for that side's team.</p>`);
}
function pkgView(){
  if(!L||!Object.keys(TEAMS).length)return `<section class="panel emptyst"><h2>No data yet</h2><p>Trade packages fill in once rosters exist.</p></section>`;
  const ids=pkTeams();
  if(PK.a.t==null){PK.a.t=TEAMS[cur]?cur:ids[0];PK.b.t=M.opp&&TEAMS[M.opp]&&M.opp!==PK.a.t?M.opp:ids.find(x=>x!==PK.a.t)||0;savePK();}
  ["a","b"].forEach(k=>{if(PK[k].t&&!TEAMS[PK[k].t])PK[k].t=0;PK[k].ns=PK[k].ns.filter(n=>DIR[n]);});
  const seg=(k,o)=>`<div class="tabs sm" role="group">${o.map(([v,l])=>`<button data-pkb="${k}:${v}" aria-selected="${String(PK[k])===String(v)}">${l}</button>`).join("")}</div>`;
  const any=PK.a.ns.length||PK.b.ns.length;
  const A=+PK.a.t,B=+PK.b.t,can=!mirror()&&!WRITE_BLOCKED&&A&&B&&A!==B&&actTeam()===A&&PK.a.ns.length&&PK.b.ns.length&&PK.a.ns.every(n=>ownerNow(n)===A)&&PK.b.ns.every(n=>ownerNow(n)===B)&&!(pastDeadline()&&!isCommish());
  const bar=`<div class="tcbar">${seg("mode",[["proj","ESPN projections"],["season","Season so far"]])}${seg("fa",[["true","Fill open spots with FAs"],["false","Don't"]])}</div>
    <div class="tcbar pkacts"><button class="btn ghost sm" data-pkswap>⇄ Swap sides</button>${any?`<button class="btn ghost sm" data-pkclear>Clear players</button><button class="btn ghost sm" data-pksave>Save package</button>`:""}${can?`<button class="btn sm" data-pkoffer>Offer this trade</button>`:""}</div>`;
  const build=sec("Trade packages","Add any players to either side and compare what each package brings",`<div class="pkgrid">${pkSide("a")}<div class="pkmid" aria-hidden="true">⇄</div>${pkSide("b")}</div>${bar}`);
  if(!any)return `${build}${pkSavedSec()}<p class="foot-note">Tip: tap + on a roster player, or search for anyone in the league, including free agents. Player cards and Trade targets ideas have a Trade package button too.</p>`;
  const R=pkCalc();pkgView.R=R;
  return `${build}${pkTable()}${pkTeamsSec(R)}${pkSavedSec()}<p class="foot-note">Packages are saved on this device only. IR players are left out of team totals.</p>`;
}
{const _av=analyticsView;analyticsView=function(){return SUB.analytics==="pkg"?pkgView():_av();};}
// add a player to a side (and take him off the other side)
function pkAdd(k,n){if(!DIR[n])return;const o=k==="a"?"b":"a";PK[o].ns=PK[o].ns.filter(x=>x!==n);if(!PK[k].ns.includes(n)){if(PK[k].ns.length>=8)PK[k].ns.shift();PK[k].ns.push(n);}savePK();}
// search: suggestions are drawn in place so typing never redraws the page
document.addEventListener("input",e=>{const q=e.target.closest("[data-pkq]");if(!q)return;const k=q.dataset.pkq,box=document.querySelector(`[data-pksug="${k}"]`);if(!box)return;
  const s=q.value.trim().toLowerCase();if(s.length<2){box.hidden=true;box.innerHTML="";return;}
  const hits=Object.values(DIR).filter(D=>D.n.toLowerCase().includes(s)).map(D=>{const l=pkLine(D.n),z=l?zOf(l):null;return [D.n.toLowerCase().startsWith(s)||D.n.toLowerCase().includes(" "+s)?1:0,z??-99,D];})
    .sort((a,b)=>b[0]-a[0]||b[1]-a[1]).slice(0,8);
  box.innerHTML=hits.length?hits.map(([,z,D])=>{const o=ownerNow(D.n);return `<button data-pkadd="${k}:${esc(D.n)}"><b>${esc(D.n)}</b><small>${esc(D.t||"")} · ${o?esc(teamName(o)):"Free agent"}${INJ[D.n]?` · ${esc(INJ[D.n])}`:""}${z>-99?` · ${z>=0?"+":""}${z.toFixed(1)}`:""}</small></button>`;}).join(""):`<p class="muted">No player matches “${esc(q.value.trim())}”.</p>`;
  box.hidden=false;});
document.addEventListener("keydown",e=>{const q=e.target.closest("[data-pkq]");if(!q||e.key!=="Enter")return;e.preventDefault();document.querySelector(`[data-pksug="${q.dataset.pkq}"] [data-pkadd]`)?.click();});
document.addEventListener("change",e=>{const s=e.target.closest("[data-pkteam]");if(!s)return;const k=s.dataset.pkteam;PK[k].t=+s.value||0;savePK();s.blur();renderRosters();});
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-pkb],[data-pkadd],[data-pkrm],[data-pkswap],[data-pkclear],[data-pksave],[data-pkload],[data-pkdel],[data-pkoffer]");if(!b)return;e.preventDefault();e.stopPropagation();
  const d=b.dataset;
  if(d.pkb){const [k,v]=d.pkb.split(":");PK[k]=k==="fa"?v==="true":v;}
  else if(d.pkadd){const i=d.pkadd.indexOf(":");pkAdd(d.pkadd.slice(0,i),d.pkadd.slice(i+1));document.activeElement?.blur?.();}
  else if(d.pkrm){const i=d.pkrm.indexOf(":"),k=d.pkrm.slice(0,i),n=d.pkrm.slice(i+1);PK[k].ns=PK[k].ns.filter(x=>x!==n);}
  else if(d.pkswap!=null){[PK.a,PK.b]=[PK.b,PK.a];}
  else if(d.pkclear!=null){PK.a.ns=[];PK.b.ns=[];}
  else if(d.pksave!=null){const p={a:{t:PK.a.t,ns:PK.a.ns.slice()},b:{t:PK.b.t,ns:PK.b.ns.slice()}},key=JSON.stringify(p);if(!PK.saved.some(x=>JSON.stringify(x)===key)){PK.saved.unshift(p);PK.saved=PK.saved.slice(0,8);toast("Package saved");}else toast("Already saved");}
  else if(d.pkload!=null){const p=PK.saved[+d.pkload];if(p){PK.a={t:p.a.t,ns:p.a.ns.slice()};PK.b={t:p.b.t,ns:p.b.ns.slice()};window.scrollTo({top:0,behavior:"smooth"});}}
  else if(d.pkdel!=null){PK.saved.splice(+d.pkdel,1);}
  else if(d.pkoffer!=null){return offerTrade(+PK.b.t,PK.a.ns.slice(),PK.b.ns.slice());}
  savePK();renderRosters();},true);
// open the tool with a ready-made trade (from Trade targets ideas and player cards)
function pkOpen(A,give,B,get){PK.a={t:A||0,ns:give.slice()};PK.b={t:B||0,ns:get.slice()};savePK();document.querySelector('[data-sheet="close"]')?.click();setNav("analytics","pkg");}
document.addEventListener("click",e=>{const b=e.target.closest("[data-ttpkg],[data-pkcard]");if(!b)return;e.preventDefault();e.stopPropagation();
  if(b.dataset.ttpkg!=null){const it=(targetView.list||[])[+b.dataset.ttpkg];if(it)pkOpen(targetView.T,it.give,targetView.O,it.get);return;}
  const n=b.dataset.pkcard,o=ownerNow(n),me=myTeamNum()||(TEAMS[cur]?cur:0);
  if(PK.a.t==null){PK.a.t=me||0;PK.b.t=0;}
  if(o&&o===+PK.a.t)pkAdd("a",n);else{if(o&&(!PK.b.t||!PK.b.ns.length))PK.b.t=o;pkAdd("b",n);}
  document.querySelector('[data-sheet="close"]')?.click();setNav("analytics","pkg");},true);
// Trade targets: each idea gets a Trade package button
{const _tg=targetView;targetView=function(){return _tg().replace(/<button class="mini-b" data-ttcmp="(\d+)">Compare<\/button>/g,'<button class="mini-b" data-ttcmp="$1">Compare</button><button class="mini-b" data-ttpkg="$1">Trade package</button>');};}
// player cards: add him to a trade package
{const _pc=playerCard;playerCard=function(n){_pc(n);const acts=document.querySelector("#sheetBody .sheetacts");if(!acts||!DIR[n])return;
  const inn=PK.a.ns.includes(n)||PK.b.ns.includes(n);acts.insertAdjacentHTML("afterbegin",`<button class="btn ghost" data-pkcard="${esc(n)}">${inn?"Open trade package":"Trade package"}</button>`);};}

/* ---- 2.23 (BUG-211..213): show the math. Every dotted number opens a popup
   (hover on desktop, tap anywhere) that walks through how it was worked out. */
const pkN=(v,d=1)=>(v>=0?"+":"−")+Math.abs(v).toFixed(d);
const pkSrc=()=>PK.mode==="season"?"season so far":"ESPN's season projection";
const pkArr=n=>{const D=DIR[n];return D?(PK.mode==="season"?D.ss:D.pj):null;};
const pkTbl=(head,rows,foot)=>`<table class="pkxt"><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody>${foot?`<tfoot>${foot}</tfoot>`:""}</table>`;
const pkCatWin=(G,x,SS,c)=>{const o=G.ids.filter(y=>y!==x);return o.length?o.reduce((s,y)=>s+ttPhi((val(SS[x],c)-val(SS[y],c))/G.sd[c[0]]),0)/o.length:0;};
const pkMk=(l,c)=>`${l[c[2]].toFixed(1)}/${l[c[3]].toFixed(1)}`;
function pkxHtml(key){
  const [k,...r]=key.split(":"),R=pkgView.R,sideNs=i=>[PK.a.ns,PK.b.ns][+i]||[];
  const pc=n=>`<span class="nmb">${esc(n)}</span>`;
  if(k==="z"){const n=r.join(":"),l=pkLine(n);if(!l)return `<p>No ${pkSrc()} numbers for ${esc(n)}.</p>`;const B=zBase();let t=0;
    const rows=CATS.map(c=>{const b=B[c[0]],z=catZ(l,c);t+=z;
      if(c[1]==="pct"){const x=l[c[2]]-b.lg*l[c[3]];return `<tr><td>${c[0]}</td><td>${pkMk(l,c)} = ${pct(l[c[2]]/(l[c[3]]||1))}</td><td>${pkN(x,2)} makes vs ${pct(b.lg)}</td><td>${(b.sd).toFixed(2)}</td><td><b>${pkN(z,2)}</b></td></tr>`;}
      return `<tr><td>${c[0]}</td><td>${l[c[2]].toFixed(1)}</td><td>${b.m.toFixed(1)}</td><td>${b.sd.toFixed(1)}</td><td><b>${pkN(z,2)}</b></td></tr>`;});
    return `<h4>${esc(n)} · value ${pkN(t)}</h4><p>Each category: (his number − average of the top 150 players) ÷ spread of those players. Then add them up.</p>
      ${pkTbl(["Cat","His per game","Top-150 avg","Spread","Score"],rows,`<tr><td colspan="4">Value</td><td><b>${pkN(t,2)}</b></td></tr>`)}
      <p class="muted">For FG% and FT% the number is makes above what an average shooter would make on his attempts, so volume counts.</p>`;}
  if(k==="pc"){const c=CATS[+r[0]],n=r.slice(1).join(":"),a=pkArr(n),l=pkLine(n);if(!a||!l)return "";const gp=a[11];
    return `<h4>${esc(n)} · ${c[0]}</h4>${c[1]==="pct"?`<p>${pkSrc()}: ${Math.round(a[c[2]])} made of ${Math.round(a[c[3]])} = <b>${pct(a[c[2]]/(a[c[3]]||1))}</b></p><p class="muted">Per game that's ${pkMk(l,c)}.</p>`
      :`<p>${pkSrc()}: ${Math.round(a[c[2]])} ${c[0]} in ${Math.round(gp)} games</p><p>${Math.round(a[c[2]])} ÷ ${Math.round(gp)} = <b>${l[c[2]].toFixed(1)}</b> a game</p>`}`;}
  if(k==="pt"){const i=+r[0],c=CATS[+r[1]],ns=sideNs(i).filter(n=>pkLine(n));
    if(c[1]==="pct"){let m=0,a=0;const rows=ns.map(n=>{const l=pkLine(n);m+=l[c[2]];a+=l[c[3]];return `<tr><td>${pc(n)}</td><td>${l[c[2]].toFixed(1)}</td><td>${l[c[3]].toFixed(1)}</td></tr>`;});
      return `<h4>Package ${c[0]}</h4><p>Add up makes and attempts, then divide. Not an average of the percentages.</p>${pkTbl(["Player","Made","Tried"],rows,`<tr><td>Total</td><td>${m.toFixed(1)}</td><td>${a.toFixed(1)}</td></tr>`)}<p>${m.toFixed(1)} ÷ ${a.toFixed(1)} = <b>${pct(m/(a||1))}</b></p>`;}
    let t=0;const rows=ns.map(n=>{const v=pkLine(n)[c[2]];t+=v;return `<tr><td>${pc(n)}</td><td>${v.toFixed(1)}</td></tr>`;});
    return `<h4>Package ${c[0]} per game</h4>${pkTbl(["Player",c[0]],rows,`<tr><td>Total</td><td><b>${t.toFixed(1)}</b></td></tr>`)}`;}
  if(k==="pz"){let t=0;const rows=sideNs(r[0]).map(n=>{const l=pkLine(n),z=l?zOf(l):0;t+=z||0;return `<tr><td>${pc(n)}</td><td>${l?pkN(z):"–"}</td></tr>`;});
    return `<h4>Package value</h4><p>The players' values added up (tap a player's value for his breakdown).</p>${pkTbl(["Player","Value"],rows,`<tr><td>Total</td><td><b>${pkN(t)}</b></td></tr>`)}`;}
  if(k==="g"||k==="pg"){const ns=k==="g"?[r.join(":")]:sideNs(r[0]);
    const one=n=>{const D=DIR[n];if(!D)return "";if(INJ[n]==="OUT")return `<tr><td>${pc(n)}</td><td>OUT, counted as 0</td></tr>`;
      const gs=DAYS.filter(sp=>upcoming(D.t,sp)&&gameOn(D.t,sp)).map(sp=>{const g=gameOn(D.t,sp);return `${dow(sp)} ${g[1]?"vs":"@"} ${g[0]}`;});
      return `<tr><td>${pc(n)}<small>${esc(D.t)}</small></td><td>${gs.length?gs.join(", "):"none"} <b>(${gs.length})</b><small>${pkLeft(n,Math.max(1,TODAY),SEASON_END)} left this season</small></td></tr>`;};
    return `<h4>Games left</h4><p>From the NBA schedule: games still to play this matchup (today counts until his game is final).</p>${pkTbl(["Player","This matchup"],ns.map(one))}`;}
  if(!R)return "";const {G,SS,imp}=R,T=+r[0],I=imp.find(x=>x.T===T);if(!I||!TEAMS[T])return "";const tn=esc(TEAMS[T].name);
  if(k==="tw"){const rows=CATS.map(c=>{const b=pkCatWin(G,T,G.S,c),a=pkCatWin(G,T,SS,c);return `<tr><td>${c[0]}</td><td>${(b*100).toFixed(0)}%</td><td>${(a*100).toFixed(0)}%</td><td class="${a>b+.005?"okc":a<b-.005?"badc":""}">${pkN((a-b)*100,0)}</td><td>${pkFmt(G.sd[c[0]],c)}</td></tr>`;});
    return `<h4>${tn} · categories won a week</h4><p>For each category: the chance of beating each other team, from how far ahead or behind ${tn} is divided by the spread across the league (a bell curve). Averaged over the ${G.ids.length-1} other teams, then added up across categories.</p>
      ${pkTbl(["Cat","Now","After","Change","Spread"],rows,`<tr><td>Total</td><td>${I.base.toFixed(2)}</td><td>${I.now.toFixed(2)}</td><td><b>${pkN(I.d,2)}</b></td><td></td></tr>`)}
      <p class="muted">Example: ahead by one spread ≈ 84% to win that category, even ≈ 50%, behind by one spread ≈ 16%.</p>`;}
  const c=CATS[+r[1]];
  if(k==="tr"){const order=G.ids.slice().sort((x,y)=>val(SS[y],c)-val(SS[x],c));
    return `<h4>${c[0]} ranking after the trade</h4>${pkTbl(["#","Team","Now","After"],order.map((x,j)=>`<tr${x===T?' class="me"':""}><td>${j+1}</td><td>${esc(TEAMS[x].name)}</td><td>${pkFmt(val(G.S[x],c),c)}</td><td>${pkFmt(val(SS[x],c),c)}</td></tr>`))}<p class="muted">Per-game totals of each team's healthy, non-IR players.</p>`;}
  if(k==="tn"||k==="ta"){const after=k==="ta",list=after?I.after.concat(I.fa):G.act[T],T0=after?SS[T]:G.S[T];
    const v=n=>{const l=G.ln(n);return l?(c[1]==="pct"?pkMk(l,c):l[c[2]].toFixed(1)):"0 (OUT)";};
    const tag=n=>!after?"":I.fa.includes(n)?' <small>free agent</small>':!G.act[T].includes(n)?' <small class="okc">new</small>':"";
    const gone=after?I.owned.filter(n=>G.act[T].includes(n)):[];
    return `<h4>${tn} · ${c[0]} ${after?"after":"now"}</h4><p>Every healthy, non-IR player's per-game ${c[0]} added up${c[1]==="pct"?" (makes ÷ attempts)":""}.</p>
      ${pkTbl(["Player",c[1]==="pct"?"Made/tried":c[0]],list.map(n=>`<tr><td>${pc(n)}${tag(n)}</td><td>${v(n)}</td></tr>`),`<tr><td>Total</td><td><b>${c[1]==="pct"?`${T0[c[2]].toFixed(1)}/${T0[c[3]].toFixed(1)} = ${pct(val(T0,c))}`:val(T0,c).toFixed(1)}</b></td></tr>`)}
      ${gone.length?`<p class="muted">Traded away: ${gone.map(esc).join(", ")}.</p>`:""}`;}
  return "";
}
const pkPop=(()=>{const d=document.createElement("div");d.className="pkpop";d.id="pkPop";d.hidden=true;d.setAttribute("role","dialog");document.body.appendChild(d);return d;})();
let pkPopKey=null,pkPopPin=false,pkPopT=0;
function pkShow(el,pin){
  const h=pkxHtml(el.dataset.pkx);if(!h)return;pkPopKey=el.dataset.pkx;pkPopPin=pin;
  pkPop.innerHTML=`<button class="pkpopx" aria-label="Close">✕</button>${h}`;pkPop.hidden=false;
  if(innerWidth<=640){pkPop.classList.add("sheet");pkPop.style.left=pkPop.style.top="";return;}
  pkPop.classList.remove("sheet");const b=el.getBoundingClientRect(),w=pkPop.offsetWidth,ht=pkPop.offsetHeight;
  let x=Math.min(Math.max(8,b.left+b.width/2-w/2),innerWidth-w-8),y=b.bottom+6;if(y+ht>innerHeight-8)y=Math.max(8,b.top-ht-6);
  pkPop.style.left=x+"px";pkPop.style.top=y+"px";}
const pkHide=()=>{pkPop.hidden=true;pkPopKey=null;pkPopPin=false;};
document.addEventListener("click",e=>{
  if(e.target.closest(".pkpopx"))return pkHide();
  const el=e.target.closest("[data-pkx]");
  if(el){e.preventDefault();if(pkPopKey===el.dataset.pkx&&pkPopPin)return pkHide();return pkShow(el,true);}
  if(!pkPop.hidden&&!e.target.closest("#pkPop"))pkHide();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!pkPop.hidden)pkHide();});
if(matchMedia("(hover:hover)").matches){
  document.addEventListener("mouseover",e=>{const el=e.target.closest("[data-pkx]");if(el&&!pkPopPin){clearTimeout(pkPopT);pkPopT=setTimeout(()=>pkShow(el,false),120);}
    else if(e.target.closest("#pkPop"))clearTimeout(pkPopT);});
  document.addEventListener("mouseout",e=>{if(pkPopPin)return;const el=e.target.closest("[data-pkx],#pkPop");if(!el)return;clearTimeout(pkPopT);pkPopT=setTimeout(()=>{if(!pkPopPin)pkHide();},220);});}
addEventListener("scroll",()=>{if(!pkPop.hidden&&!pkPop.classList.contains("sheet"))pkHide();},{passive:true});
