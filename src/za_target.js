
/* ============================================================================
   TRADE TARGETS (2.19, 2026-11-02): Analytics › Trade targets. Pick one team
   and the app lines it up against yours category by category (per-game
   totals and league ranks), says what each side has to spare and what it
   needs, and suggests 1-for-1, 2-for-1, 1-for-2 and 2-for-2 trades aimed at
   that team. Every trade is scored by how many more categories each team
   would expect to win in a week against the rest of the league, so a
   suggestion only shows if both teams come out ahead.
   ============================================================================ */
const TT={o:null,mode:"proj",sort:"fair",size:"all"};
try{Object.assign(TT,JSON.parse(localStorage.getItem("dfTgt")||"{}"));}catch(e){}
const saveTT=()=>{try{localStorage.setItem("dfTgt",JSON.stringify(TT));}catch(e){}};
// per-game line used everywhere in this tool: ESPN projection or season so far; OUT players count as nothing
const ttLine=n=>{const D=DIR[n];if(!D||INJ[n]==="OUT")return null;return pgLine(TT.mode==="season"?(D.ss&&D.ss[11]?D.ss:null):D.pj);};
// standard normal CDF (Abramowitz-Stegun), for the chance one team beats another in a category
const ttPhi=x=>{const t=1/(1+.2316419*Math.abs(x)),d=.3989423*Math.exp(-x*x/2),p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return x>0?1-p:p;};
// the league picture: active (non-IR) rosters, per-game totals and the spread of each category across teams
function ttLeague(){
  const ids=L.teams.map(t=>tnum(t.id)).filter(x=>TEAMS[x]&&TEAMS[x].P.length),act={},S={},LN={};
  ids.forEach(x=>{act[x]=activeNames(x);act[x].forEach(n=>{if(!(n in LN))LN[n]=ttLine(n);});S[x]=lineSum(act[x].map(n=>LN[n]));});
  const sd={};CATS.forEach(c=>{const xs=ids.map(x=>val(S[x],c)),m=xs.reduce((a,b)=>a+b,0)/(xs.length||1);sd[c[0]]=Math.sqrt(xs.reduce((a,b)=>a+(b-m)**2,0)/(xs.length||1))||(c[1]==="pct"?.01:1);});
  const rank=(x,c,SS=S)=>1+ids.filter(y=>val(SS[y],c)>val(SS[x],c)+1e-9).length;
  return {ids,act,S,LN,sd,rank};
}
// expected categories won in one week against an average other team (out of CATS.length)
function ttWins(G,x,SS){let s=0;const others=G.ids.filter(y=>y!==x);
  others.forEach(y=>CATS.forEach(c=>{s+=ttPhi((val(SS[x],c)-val(SS[y],c))/G.sd[c[0]]);}));return others.length?s/others.length:0;}
// the best healthy free agent, picked up by whichever team ends up with an open roster spot
function ttBestFA(){let b=null,bz=-1e9;Object.values(DIR).forEach(D=>{if(ownerNow(D.n)||INJ[D.n]==="OUT")return;const l=ttLine(D.n),z=l?zOf(l):null;if(z!=null&&z>bz){bz=z;b=D.n;}});return b;}
const ttCombos=(a,k)=>k===1?a.map(x=>[x]):a.flatMap((x,i)=>a.slice(i+1).map(y=>[x,y]));
// every trade up to 2-for-2 between T and O, scored for both
function ttTrades(T,O){
  const G=ttLeague();if(!G.S[T]||!G.S[O])return {G,list:[]};
  const fa=ttBestFA(),faL=fa?ttLine(fa):null,room=x=>ROSTER_MAX-rosterNow(x).length;
  const baseT=ttWins(G,T,G.S),baseO=ttWins(G,O,G.S);
  const mine=G.act[T].filter(n=>G.LN[n]),theirs=G.act[O].filter(n=>G.LN[n]),out=[];
  const sizes=[[1,1],[2,1],[1,2],[2,2]].filter(([g,r])=>TT.size==="all"||TT.size===`${g}${r}`);
  sizes.forEach(([ng,nr])=>{
    // the team taking more players needs the roster spot; the team taking fewer picks up the best free agent
    if(nr>ng&&room(T)<nr-ng)return;if(ng>nr&&room(O)<ng-nr)return;
    const gs=ttCombos(mine,ng),rs=ttCombos(theirs,nr);
    gs.forEach(give=>rs.forEach(get=>{
      const gl=give.map(n=>G.LN[n]),rl=get.map(n=>G.LN[n]);
      let nT=G.S[T].map((v,i)=>v-gl.reduce((s,l)=>s+l[i],0)+rl.reduce((s,l)=>s+l[i],0)),nO=G.S[O].map((v,i)=>v-rl.reduce((s,l)=>s+l[i],0)+gl.reduce((s,l)=>s+l[i],0));
      if(faL&&ng>nr)nT=nT.map((v,i)=>v+faL[i]);if(faL&&nr>ng)nO=nO.map((v,i)=>v+faL[i]);
      const SS={...G.S,[T]:nT,[O]:nO},a=ttWins(G,T,SS)-baseT,b=ttWins(G,O,SS)-baseO;
      if(a<=.05||b<=.02)return;
      out.push({give,get,a,b,nT,nO,fa:ng!==nr?fa:null});}));});
  const key=TT.sort==="me"?(x=>x.a+.25*x.b):(x=>Math.min(x.a,x.b)+.2*(x.a+x.b));
  // best first, each player in at most two ideas so the list isn't one name over and over
  const seen={},pick=xs=>xs.filter(x=>{const ns=[...x.give,...x.get];if(ns.some(n=>(seen[n]||0)>=2))return false;ns.forEach(n=>seen[n]=(seen[n]||0)+1);return true;});
  out.sort((x,y)=>key(y)-key(x));
  // keep up to three straight 1-for-1 swaps in the list, so 2-player deals (which also add a free agent) don't crowd them out
  const one=TT.size==="all"?pick(out.filter(x=>x.give.length===1&&x.get.length===1)).slice(0,3):[];
  const list=one.concat(pick(out.filter(x=>!one.includes(x)))).sort((x,y)=>key(y)-key(x)).slice(0,10);
  return {G,list,baseT,baseO};
}
let _ttc={k:"",v:null};
function ttCached(T,O){const k=[T,O,TT.mode,TT.sort,TT.size,TODAY,ROSTER_MAX,rosterNow(T).join(),rosterNow(O).join(),Object.keys(INJ).length].join("|");if(_ttc.k!==k)_ttc={k,v:ttTrades(T,O)};return _ttc.v;}
// what each side can give and needs: weak = bottom half of the league, and the other team is clearly better there
function ttFit(G,T,O){const N=G.ids.length,half=N/2,need=[],give=[];
  CATS.forEach(c=>{const rt=G.rank(T,c),ro=G.rank(O,c);if(rt>half&&ro<rt&&ro<=half)need.push([c[0],rt,ro]);if(ro>half&&rt<ro&&rt<=half)give.push([c[0],rt,ro]);});return {need,give};}
// a player's per-category value (z), weighted toward the categories a team is weak in
function ttWeights(G,x){const N=G.ids.length,w={};CATS.forEach(c=>{const r=G.rank(x,c);w[c[0]]=N>1?.4+1.2*(r-1)/(N-1):1;});return w;}
function ttHelp(G,n,w){const l=G.LN[n];if(!l)return null;const zc=CATS.map(c=>({k:c[0],z:catZ(l,c)}));return {n,v:zc.reduce((s,x)=>s+x.z*w[x.k],0),helps:zc.filter(x=>x.z>.35&&w[x.k]>=1).sort((a,b)=>b.z*w[b.k]-a.z*w[a.k]).slice(0,3).map(x=>x.k)};}
function targetView(){
  if(!L||!Object.keys(TEAMS).length)return `<section class="panel emptyst"><h2>No data yet</h2><p>Trade targets fill in once rosters exist.</p></section>`;
  const ids=L.teams.map(t=>tnum(t.id)).filter(x=>TEAMS[x]&&TEAMS[x].P.length),T=TEAMS[cur]?cur:ids[0];
  if(ids.length<2)return `<section class="panel emptyst"><h2>Not enough teams</h2><p>Trade targets need at least two teams with players.</p></section>`;
  if(TT.o==null||!TEAMS[TT.o]||+TT.o===+T)TT.o=ids.find(x=>x!==T);
  const O=+TT.o,G0=ttLeague();
  const opts=ids.filter(x=>x!==T).map(x=>{const f=ttFit(G0,T,x),m=Math.min(f.need.length,f.give.length);return `<option value="${x}"${x===O?" selected":""}>${esc(TEAMS[x].name)}${m?` · ${m} ${m===1?"match":"matches"}`:""}</option>`;}).join("");
  const seg=(k,o)=>`<div class="tabs sm" role="group">${o.map(([v,l])=>`<button data-ttb="${k}:${v}" aria-selected="${TT[k]===v}">${l}</button>`).join("")}</div>`;
  const controls=`<div class="hfilters tcf"><label class="hf"><span>Target team</span><select data-tto>${opts}</select></label></div>
    <div class="tcbar">${seg("mode",[["proj","ESPN projections"],["season","Season so far"]])}</div>`;
  const {G,list,baseT,baseO}=ttCached(T,O),nT=esc(TEAMS[T].name),nO=esc(TEAMS[O].name),N=G.ids.length;
  // ---- 1. head to head, category by category
  const fit=ttFit(G,T,O);let w=0,l=0,t=0;
  const f=(v,c)=>c[1]==="pct"?pct(v):v.toFixed(1);
  const rows=CATS.map(c=>{const a=val(G.S[T],c),b=val(G.S[O],c),ra=G.rank(T,c),rb=G.rank(O,c),p=ttPhi((a-b)/G.sd[c[0]]),call=p>.6?"win":p<.4?"loss":"toss";
    if(call==="win")w++;else if(call==="loss")l++;else t++;
    const tag=fit.need.find(x=>x[0]===c[0])?`<span class="ttag get">They can help you</span>`:fit.give.find(x=>x[0]===c[0])?`<span class="ttag give">You can help them</span>`:"";
    return `<tr><td class="nm"><b>${c[0]}</b></td><td class="num${a>b+1e-9?" okc":""}">${f(a,c)}<small>${ord(ra)}</small></td><td class="num${b>a+1e-9?" okc":""}">${f(b,c)}<small>${ord(rb)}</small></td><td><span class="call ${call}">${call==="win"?"You":call==="loss"?"Them":"Toss-up"}</span></td><td class="nm">${tag}</td></tr>`;}).join("");
  const list2=(xs,i)=>xs.map(x=>`${x[0]} (${ord(x[i])})`).join(", ");
  const sum=`<div class="ttfit"><div><span class="muted">You need, they have</span><b>${fit.need.length?list2(fit.need,2):"Nothing clear"}</b></div><div><span class="muted">They need, you have</span><b>${fit.give.length?list2(fit.give,1):"Nothing clear"}</b></div></div>`;
  const h2h=sec(`${nT} vs ${nO}`,`Per-game totals of each team's healthy, non-IR players · small number is the league rank of ${N}`,
    `<div class="anhero"><span class="big num">${w}-${l}${t?`-${t}`:""}</span><span class="muted">your projected record if you played them${t?` (${t} too close to call)`:""}</span></div>${sum}
    <div class="scroll"><table class="lg antable ttab"><thead><tr><th class="nm">Cat</th><th>${nT}</th><th>${nO}</th><th class="nm">Edge</th><th class="nm">Trade fit</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  // ---- 2. trade ideas
  const can=!mirror()&&!WRITE_BLOCKED&&actTeam()===T&&!(pastDeadline()&&!isCommish());
  const pl=n=>`<span class="nmb" role="button" tabindex="0" data-pcard="${esc(n)}"><b>${esc(n)}</b></span>`;
  const moves=(before,after)=>{const up=[],dn=[];CATS.forEach(c=>{const d=val(after,c)-val(before,c),s=c[1]==="pct"?.0015:.15;if(d>s)up.push(c[0]);else if(d<-s)dn.push(c[0]);});return {up,dn};};
  const ideas=list.length?`<ol class="tflist">${list.map((x,i)=>{const mT=moves(G.S[T],x.nT),mO=moves(G.S[O],x.nO);
    return `<li><div class="tfdeal"><span><span class="muted">You send</span>${x.give.map(pl).join("")}</span><span class="tfar" aria-hidden="true">⇄</span><span><span class="muted">${nO} sends</span>${x.get.map(pl).join("")}</span></div>
      <div class="tfwhy"><span class="okc">You: +${x.a.toFixed(2)} cats a week${mT.up.length?` · up ${mT.up.join(", ")}`:""}${mT.dn.length?` · down ${mT.dn.join(", ")}`:""}</span><span class="tfdot">·</span><span>Them: +${x.b.toFixed(2)}${mO.up.length?` · up ${mO.up.join(", ")}`:""}</span></div>
      ${x.fa?`<div class="tfwhy"><span>${x.give.length>x.get.length?"You":esc(TEAMS[O].name)} open a roster spot (counted as picking up ${esc(x.fa)}, the best free agent)</span></div>`:""}
      <div class="tfacts"><button class="mini-b" data-ttcmp="${i}">Compare</button>${can?`<button class="btn sm" data-ttoffer="${i}">Offer this trade</button>`:""}</div></li>`;}).join("")}</ol>`
    :`<p class="empty">No trade with ${nO} helps both teams right now${TT.size!=="all"?" at this size. Try All sizes":""}.</p>`;
  const ideaSec=sec(`Trade ideas with ${nO}`,`Trades where both teams expect to win more categories a week · ${TT.mode==="season"?"season per game":"ESPN projections"}`,
    `<div class="tcbar">${seg("sort",[["fair","Fair for both"],["me","Best for you"]])}${seg("size",[["all","All sizes"],["11","1 for 1"],["22","2 for 2"],["21","2 for 1"],["12","1 for 2"]])}</div>${ideas}
    <p class="anote">"Cats a week" is how many more categories the team would expect to win in a week against an average team in the league, from per-game totals before and after the trade. Fair for both ranks trades where the smaller gain is biggest; Best for you puts your gain first but they still have to gain too. A team that takes more players than it sends needs an open roster spot.${mirror()?" Trades run in ESPN while the app mirrors it.":""}</p>`);
  // ---- 3. who to ask for and who they'd want
  const wT=ttWeights(G,T),wO=ttWeights(G,O);
  const want=G.act[O].map(n=>ttHelp(G,n,wT)).filter(Boolean).sort((a,b)=>b.v-a.v).slice(0,5),bait=G.act[T].map(n=>ttHelp(G,n,wO)).filter(Boolean).sort((a,b)=>b.v-a.v).slice(0,5);
  const li=x=>`<li><div><span class="pnm">${pl(x.n)}</span><span class="pmeta">${esc(DIR[x.n]?.t||"")}${x.helps.length?` · helps ${x.helps.join(", ")}`:""}</span></div><span class="spr"><span class="num">${x.v>=0?"+":""}${x.v.toFixed(1)}</span></span></li>`;
  const ppl=`<div class="angrid">${sec(`${nO} players who fit you`,`Value per game, weighted toward your weak categories`,want.length?`<ol class="plist">${want.map(li).join("")}</ol>`:`<p class="empty">No healthy players.</p>`)}${sec(`Your players ${nO} would want`,`Weighted toward their weak categories`,bait.length?`<ol class="plist">${bait.map(li).join("")}</ol>`:`<p class="empty">No healthy players.</p>`)}</div>`;
  targetView.list=list;targetView.T=T;targetView.O=O;
  return `<div class="row anbar"><span class="hint">Trade targets for <b>${nT}</b> · pick another team at the top</span></div>${sec("Trade targets",`Pick a team to line it up against ${nT} and find trades aimed at it`,controls)}${h2h}${ideaSec}${ppl}
    <p class="foot-note">Expected record now: ${nT} ${baseT.toFixed(1)} and ${nO} ${baseO.toFixed(1)} of ${CATS.length} categories a week against an average team. IR players are left out, and so are OUT players' stats.</p>`;
}
{const _av=analyticsView;analyticsView=function(){return SUB.analytics==="tgt"?targetView():_av();};}
document.addEventListener("change",e=>{const s=e.target.closest("[data-tto]");if(!s)return;TT.o=+s.value;saveTT();renderRosters();});
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-ttb]");if(b){const [k,v]=b.dataset.ttb.split(":");TT[k]=v;saveTT();return renderRosters();}
  const x=e.target.closest("[data-ttcmp],[data-ttoffer]");if(!x)return;e.preventDefault();e.stopPropagation();
  const it=(targetView.list||[])[+(x.dataset.ttcmp??x.dataset.ttoffer)];if(!it)return;
  if(x.dataset.ttcmp!=null){TCMODE=TT.mode==="season"?"season":"proj";return openCmp(targetView.T,targetView.O,it.give,it.get);}
  offerTrade(targetView.O,it.give,it.get);},true);
// League › Trades and the Trade finder card both link here
{const _tv=tradesView;tradesView=function(){return _tv().replace('<button class="btn ghost" data-tffind>Find trades</button>','<button class="btn ghost" data-tffind>Find trades</button><button class="btn ghost" data-sub-go="analytics:tgt">Target a team</button>');};}
