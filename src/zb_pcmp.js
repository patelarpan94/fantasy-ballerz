
/* ============================================================================
   PLAYER COMPARE (2.20, 2026-11-02): Players › Compare, season so far. Up to
   four players side by side over a time window (Season, Last 14, Last 7,
   Custom) with their role (minutes, usage, shots), the league's categories,
   shooting and turnovers, a game log for each player with his best game
   marked, and a takeaway line that also checks each player against his own
   last season from the History database. Box scores come from this season's
   History days (hist/<season>_d<day>), which have 3PA, turnovers and team
   totals; until they load, the panel uses the plain stats feed.
   ESPN projections keep the original compare table.
   ============================================================================ */
const PCX={win:"season",from:"",to:"",view:"stats"};
try{Object.assign(PCX,JSON.parse(localStorage.getItem("dfPcmp")||"{}"));}catch(e){}
const savePCX=()=>{try{localStorage.setItem("dfPcmp",JSON.stringify(PCX));}catch(e){}};
const PCX_PREV=HSEASONS.filter(s=>s!==HNOW).slice(0,2);
let PCX_HN=false;
// load this season's box scores (and up to two past seasons for the takeaway), then redraw Players
function pcxNeed(ss){
  ss.forEach(s=>{if(HDATA[s]||pcxNeed.p.has(s))return;pcxNeed.p.add(s);
    histLoad(s).then(()=>{pcxNeed.p.delete(s);if(nav==="players")renderRosters();},()=>{pcxNeed.p.delete(s);pcxNeed.err.add(s);});});
}
pcxNeed.p=new Set();pcxNeed.err=new Set();
// the window as ISO dates (ET), and as app days for the plain stats feed
function pcxRange(){
  const last=Math.max(1,Math.min(TODAY,SEASON_END));let a=1,b=last;
  if(PCX.win==="l14")a=Math.max(1,last-13);
  else if(PCX.win==="l7")a=Math.max(1,last-6);
  else if(PCX.win==="custom"){a=spOf(PCX.from)||1;b=Math.min(last,spOf(PCX.to)||last);if(a>b)[a,b]=[b,a];}
  return {a,b,fa:isoOf(a),fb:isoOf(b)};
}
// team totals per game (minutes, FGA, FTA, turnovers), for usage rate
function pcxTeamTot(D){
  if(D._tt)return D._tt;const m=new Map();
  D.l.forEach(l=>{const k=l[0]+"|"+l[2];let t=m.get(k);if(!t)m.set(k,t=[0,0,0,0]);t[0]+=l[4];t[1]+=l[7];t[2]+=l[11];t[3]+=l[18];});
  return D._tt=m;
}
// one player's numbers over a set of History lines (rows from hLines)
function pcxAgg(rows,D){
  const X={gp:0,full:true,min:0,pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,reb:0,ast:0,stl:0,blk:0,to:0,un:0,ud:0,rows};
  const tt=D?pcxTeamTot(D):null;
  rows.forEach(r=>{const L=r.L;if(!L[4])return;X.gp++;X.min+=L[4];X.pts+=L[5];X.fgm+=L[6];X.fga+=L[7];X.tpm+=L[8];X.tpa+=L[9];X.ftm+=L[10];X.fta+=L[11];
    X.reb+=L[14];X.ast+=L[15];X.stl+=L[16];X.blk+=L[17];X.to+=L[18];
    const t=tt&&tt.get(L[0]+"|"+L[2]);if(t&&t[0]){X.un+=(L[7]+.44*L[11]+L[18])*(t[0]/5);X.ud+=L[4]*(t[1]+.44*t[2]+t[3]);}});
  X.usg=X.ud?X.un/X.ud:null;return X;
}
// fallback from the plain stats feed: no 3PA, turnovers or usage
function pcxFeed(n,R){
  const d=DAYLINES[n]||{},X={gp:0,full:false,min:0,pts:0,fgm:0,fga:0,tpm:0,tpa:null,ftm:0,fta:0,reb:0,ast:0,stl:0,blk:0,to:null,usg:null,rows:[]};
  Object.entries(d).forEach(([sp,l])=>{sp=+sp;if(sp<R.a||sp>R.b||!(l[K.MIN]>0))return;if(sp>=TODAY&&!(STATS[sp]&&STATS[sp].final))return;X.gp++;
    X.min+=l[K.MIN];X.pts+=l[K.PTS];X.fgm+=l[K.FGM];X.fga+=l[K.FGA];X.tpm+=l[K.TPM];X.ftm+=l[K.FTM];X.fta+=l[K.FTA];X.reb+=l[K.REB];X.ast+=l[K.AST];X.stl+=l[K.STL];X.blk+=l[K.BLK];});
  return X;
}
function pcxPlayer(n,R){
  const D=HDATA[HNOW];
  if(D){const rows=hLines(n,[HNOW],2).filter(r=>r.G.d>=R.fa&&r.G.d<=R.fb);if(rows.length)return pcxAgg(rows,hIx(HNOW));}
  return pcxFeed(n,R);
}
// his most recent past season with at least 15 games, for the takeaway
function pcxPast(n){
  for(const s of PCX_PREV){const D=HDATA[s];if(!D)return null;const rows=hLines(n,[s],2);if(rows.length>=15){const X=pcxAgg(rows,hIx(s));X.s=s;return X;}}
  return null;
}
// a stat for display: per game (or totals), or a percentage
const PCXS={
  min:{l:"MIN",f:(X,t)=>X.min/(t?1:X.gp)},
  usg:{l:"Usage %",f:X=>X.usg,p:1,pct:1},
  pts:{l:"PTS",f:(X,t)=>X.pts/(t?1:X.gp)},reb:{l:"REB",f:(X,t)=>X.reb/(t?1:X.gp)},ast:{l:"AST",f:(X,t)=>X.ast/(t?1:X.gp)},
  stl:{l:"STL",f:(X,t)=>X.stl/(t?1:X.gp)},blk:{l:"BLK",f:(X,t)=>X.blk/(t?1:X.gp)},tpm:{l:"3PM",f:(X,t)=>X.tpm/(t?1:X.gp)},
  fgm:{l:"FGM",f:(X,t)=>X.fgm/(t?1:X.gp)},ftm:{l:"FTM",f:(X,t)=>X.ftm/(t?1:X.gp)},
  fgp:{l:"FG%",f:X=>X.fga?X.fgm/X.fga:null,pct:1},ftp:{l:"FT%",f:X=>X.fta?X.ftm/X.fta:null,pct:1},
  tpp:{l:"3P%",f:X=>X.tpa?X.tpm/X.tpa:null,pct:1},ts:{l:"TS%",f:X=>X.fga+X.fta?X.pts/(2*(X.fga+.44*X.fta)):null,pct:1},
  to:{l:"TO",f:(X,t)=>X.to==null?null:X.to/(t?1:X.gp)}};
const PCX_CAT={FGP:"fgp",FTP:"ftp",TPM:"tpm",REB:"reb",AST:"ast",STL:"stl",BLK:"blk",PTS:"pts",FGM:"fgm",FTM:"ftm"};
const CAT_KEY=c=>Object.keys(CATDEF).find(k=>CATDEF[k]===c);
const pcxV=(X,k,t)=>!X||!X.gp?null:PCXS[k].f(X,t);
const pcxF=(v,k,t)=>{if(v==null)return "–";const s=PCXS[k];if(s.p)return (v*100).toFixed(1)+"%";if(s.pct)return pct(v);return t?String(Math.round(v)):v.toFixed(1);};
const pcxMA=(m,a,X,t)=>a==null?"":`<small class="pcxma">${t?Math.round(m):(m/X.gp).toFixed(1)}-${t?Math.round(a):(a/X.gp).toFixed(1)}</small>`;
const pcxSub=(k,X,t)=>!X||!X.gp?"":k==="fgp"?pcxMA(X.fgm,X.fga,X,t):k==="ftp"?pcxMA(X.ftm,X.fta,X,t):k==="tpp"?pcxMA(X.tpm,X.tpa,X,t):"";
function pcxControls(R){
  const seg=(k,opts)=>`<div class="tabs sm" role="group">${opts.map(([v,l])=>`<button data-pcx="${k}:${v}" aria-selected="${PCX[k]===v}">${l}</button>`).join("")}</div>`;
  if(PCX.win!=="custom"||!PCX.from){PCX.from=R.fa;PCX.to=R.fb;}
  const mx=isoOf(Math.max(1,Math.min(TODAY,SEASON_END)));
  return `<div class="tcbar pcxbar">${seg("win",[["season","Season"],["l14","Last 14"],["l7","Last 7"],["custom","Custom"]])}${seg("view",[["stats","Stats"],["log","Game log"]])}</div>
  ${PCX.win==="custom"?`<div class="hfilters tcf"><label class="hf"><span>From</span><input type="date" data-pcxd="from" value="${PCX.from}" min="${isoOf(1)}" max="${mx}"></label><label class="hf"><span>To</span><input type="date" data-pcxd="to" value="${PCX.to}" min="${isoOf(1)}" max="${mx}"></label></div>`:""}`;
}
// the side-by-side table
function pcxTable(sel,XS,t){
  const multi=sel.length>1,cells=(k,best,cls="")=>{const vs=XS.map(X=>pcxV(X,k,t));const ok=vs.filter(v=>v!=null);
    const b=best&&multi&&ok.length>1?(best<0?Math.min(...ok):Math.max(...ok)):null;
    return vs.map((v,i)=>`<td class="r num${cls}${b!=null&&v===b?" best":""}">${pcxF(v,k,t)}${pcxSub(k,XS[i],t)}</td>`).join("");};
  const row=(lab,k,best,cls="",tip="")=>`<tr${cls?` class="${cls.trim()}"`:""}><th${tip?` title="${esc(tip)}"`:""}>${lab}</th>${cells(k,best)}</tr>`;
  const head=l=>`<tr class="pcxsec"><th colspan="${sel.length+1}">${l}</th></tr>`;
  const shots=XS.map(X=>!X||!X.gp?"–":`${(X.fga/(t?1:X.gp)).toFixed(t?0:1)} · ${X.tpa==null?"–":(X.tpa/(t?1:X.gp)).toFixed(t?0:1)} · ${(X.fta/(t?1:X.gp)).toFixed(t?0:1)}`);
  const catKs=CATS.map(c=>PCX_CAT[CAT_KEY(c)]).filter(Boolean);
  const wins=XS.map((X,i)=>catKs.filter(k=>{const vs=XS.map(Y=>pcxV(Y,k,t)),ok=vs.filter(v=>v!=null);return vs[i]!=null&&ok.length&&vs[i]===Math.max(...ok);}).length);
  const extraShoot=["tpp","ts"].filter(k=>!catKs.includes(k));
  return `<div class="scroll"><table class="cmpt pcxt"><thead><tr><th></th>${sel.map(r=>`<th><div class="cmph">${playerCell(r)}<button class="cmpx" data-cmp="${esc(r.k)}" aria-label="Remove ${esc(r.n)}">✕</button></div><div class="cmpo">${esc(r.own)}</div></th>`).join("")}</tr></thead><tbody>
    ${head("Role")}<tr><th>GP</th>${XS.map(X=>`<td class="r num">${X?X.gp:"–"}</td>`).join("")}</tr>
    ${row(t?"MIN (total)":"MIN","min",0)}${row("Usage %","usg",0,"","Share of the team's plays he finishes with a shot, free throws or a turnover while on the court")}
    <tr><th title="Field goal, three-point and free throw attempts">Shots <small>FGA · 3PA · FTA</small></th>${shots.map(s=>`<td class="r num">${s}</td>`).join("")}</tr>
    ${head("Categories")}${catKs.map(k=>row(PCXS[k].l,k,1)).join("")}
    <tr class="tot"><th>Categories won</th>${wins.map(w=>`<td class="r num${multi&&w&&w===Math.max(...wins)?" best":""}">${multi?w+" of "+catKs.length:"–"}</td>`).join("")}</tr>
    ${extraShoot.length?head("Shooting")+extraShoot.map(k=>row(PCXS[k].l,k,0,"","TS% counts threes and free throws: points ÷ (2 × (FGA + 0.44 × FTA))")).join(""):""}
    ${head("Not a category")}${row("TO","to",0," pcxoff")}
  </tbody></table></div>`;
}
// one short game log per player, best game (8-category value) starred
function pcxLogs(sel,XS){
  const D=HDATA[HNOW];if(D)hZ(HNOW);
  return `<div class="pcxlogs">${sel.map((r,i)=>{const X=XS[i];
    if(!X||!X.rows.length)return `<div class="pcxlog"><h4>${esc(r.n)}</h4><p class="empty">${X&&X.gp?"Game logs show once this season's box scores load.":"No games in this window."}</p></div>`;
    const rows=X.rows.slice().reverse(),z=D&&D._zf?rows.map(x=>D._zf(x.L)):rows.map(()=>0),bi=z.indexOf(Math.max(...z));
    return `<div class="pcxlog"><h4>${esc(r.n)} <span class="muted">· ${X.gp} ${X.gp===1?"game":"games"}</span></h4><div class="scroll"><table class="lg pcxlt"><thead><tr><th class="nm">Game</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>3PM</th><th>STL</th><th>BLK</th><th>FG</th><th>FT</th><th>TO</th></tr></thead><tbody>
      ${rows.map((x,j)=>{const L=x.L;return `<tr${j===bi&&rows.length>1?` class="pcxbest" title="Best game for our categories"`:""}><td class="nm">${j===bi&&rows.length>1?"★ ":""}${hFmtD(x.G.d,false)} ${x.home?"vs":"@"} ${esc(x.opp)} ${hRes(x)}</td><td class="num">${L[4]}</td><td class="num">${L[5]}</td><td class="num">${L[14]}</td><td class="num">${L[15]}</td><td class="num">${L[8]}</td><td class="num">${L[16]}</td><td class="num">${L[17]}</td><td class="num">${L[6]}-${L[7]}</td><td class="num">${L[10]}-${L[11]}</td><td class="num muted">${L[18]}</td></tr>`;}).join("")}</tbody></table></div></div>`;}).join("")}</div>`;
}
// the takeaway: who wins the categories, who has the bigger role, and anyone well off his own last season
function pcxTake(sel,XS){
  const out=[],ok=sel.map((r,i)=>[r,XS[i]]).filter(([,X])=>X&&X.gp),first=n=>n.split(" ")[0];
  if(!ok.length)return "";
  const catKs=CATS.map(c=>PCX_CAT[CAT_KEY(c)]).filter(Boolean);
  if(ok.length>1){
    const w=ok.map(([,X])=>catKs.filter(k=>{const vs=ok.map(([,Y])=>pcxV(Y,k)),v=pcxV(X,k);return v!=null&&v===Math.max(...vs.filter(q=>q!=null));}));
    const top=Math.max(...w.map(x=>x.length)),ti=w.findIndex(x=>x.length===top);
    if(ok.length===2){const lo=1-ti,lw=w[lo].map(k=>PCXS[k].l);
      out.push(w[0].length===w[1].length?`They split the categories ${top}-${top}.`:`<b>${esc(first(ok[ti][0].n))}</b> wins ${top} of ${catKs.length} categories${lw.length?`; ${esc(first(ok[lo][0].n))} takes ${lw.join(", ")}`:""}.`);}
    else out.push(`<b>${esc(first(ok[ti][0].n))}</b> wins the most categories (${top} of ${catKs.length}).`);
    const us=ok.filter(([,X])=>X.usg!=null).sort((a,b)=>b[1].usg-a[1].usg);
    if(us.length>1&&us[0][1].usg-us[1][1].usg>=.02){const [a,b]=[us[0],us[1]],f=X=>`${(X.usg*100).toFixed(1)}% usage and ${((X.fga+X.fta)/X.gp).toFixed(1)} shots`;
      out.push(`${esc(first(a[0].n))} has the bigger role: ${f(a[1])} a game vs ${f(b[1])} for ${esc(first(b[0].n))}.`);}
  }
  if(HDATA[HNOW]){const need=PCX_PREV.filter(s=>!HDATA[s]&&!pcxNeed.err.has(s));
    if(need.length){pcxNeed(need.slice(0,1));out.push(`<span class="muted">Checking against last season…</span>`);}
    else ok.forEach(([r,X])=>{if(!X.full)return;const P=pcxPast(r.n);if(!P)return;
      // biggest change from his own last season: counts by share, percentages by points
      const tests=[["pts",.2],["reb",.25],["ast",.25],["tpm",.3],["stl",.35],["blk",.4],["min",.15],["fgp",.04],["ftp",.06],["tpp",.05],["usg",.035]];let best=null;
      tests.forEach(([k,th])=>{const a=pcxV(X,k),b=pcxV(P,k);if(a==null||b==null)return;if((k==="tpp"&&(X.tpa<10||P.tpa<30))||(k==="ftp"&&X.fta<10))return;
        const pc=PCXS[k].pct,d=pc?a-b:(b>=1?(a-b)/b:0),sc=Math.abs(d)/th;if(sc>=1&&(!best||sc>best.sc))best={k,a,b,sc,up:a>b};});
      if(best){const s=PCXS[best.k],lab=s.l==="MIN"?"minutes":s.l;
        out.push(`${esc(first(r.n))}'s ${lab} (${pcxF(best.a,best.k)}) is ${best.sc>=2?"well ":""}${best.up?"above":"below"} his ${P.s} mark (${pcxF(best.b,best.k)}).`);}});}
  const mg=Math.min(...ok.map(([,X])=>X.gp));if(mg<8)out.push(`<span class="muted">Small sample: ${mg} ${mg===1?"game":"games"}.</span>`);
  return out.length?`<p class="pcxtake">${out.join(" ")}</p>`:"";
}
function pcmpView(list){
  const sel=CMP.map(k=>list.find(r=>r.k===k)).filter(Boolean);if(!sel.length)return "";
  if(!PCX_HN){PCX_HN=true;histNow().then(()=>{if(nav==="players")renderRosters();});}
  const t=pjMode==="tot",R=pcxRange(),XS=sel.map(r=>pcxPlayer(r.n,R)),full=XS.every(X=>!X.gp||X.full);
  const win=PCX.win==="season"?"Season so far":PCX.win==="custom"?`${md(R.a)} – ${md(R.b)}`:PCX.win==="l14"?"Last 14 days":"Last 7 days";
  const body=XS.every(X=>!X.gp)?`<p class="empty">No games for ${sel.length>1?"these players":"this player"} in this window. Try Season or a wider Custom range.</p>`:PCX.view==="log"?pcxLogs(sel,XS):pcxTable(sel,XS,t);
  const hint=sel.length===1?`<p class="anote">Tick another player below, or tap Compare on a player card, to line them up.</p>`:"";
  return `<section class="panel team cmp pcx"><div class="teamhead"><span class="tn">Compare</span><span class="sum">${win} · ${PCX.view==="log"?"game by game":t?"totals":"per game"}${PCX.view!=="log"?" · best in each category highlighted":""} <button class="mini-b" data-cmpclear>Clear</button></span></div>
  ${pcxControls(R)}${pcxTake(sel,XS)}${body}${hint}
  <p class="anote">${full?"From this season's box scores. Usage % = share of team plays used while on the court (Basketball Reference formula).":"Loading full box scores… usage, 3PA and turnovers fill in when they arrive."}</p></section>`;
}
// Players list USG% column (BUG-204): season usage from this season's box scores; needs 30+ minutes and 10+ a game
function pcxUsgOf(n){const D=HDATA[HNOW];if(!D){if(!PCX_HN){PCX_HN=true;histNow().then(()=>{if(nav==="players")renderRosters();});}return null;}
  if(!D._usgN){const tt=pcxTeamTot(D),a=new Map();D.l.forEach(l=>{if(!l[4]||D.G[l[0]].ty!==2)return;const t=tt.get(l[0]+"|"+l[2]);if(!t||!t[0])return;const k=hNorm(D.p[l[1]][1]);let x=a.get(k);if(!x)a.set(k,x=[0,0,0,0]);x[2]+=l[4];x[3]++;
    x[0]+=(l[7]+.44*l[11]+l[18])*(t[0]/5);x[1]+=l[4]*(t[1]+.44*t[2]+t[3]);});D._usgN=new Map([...a].map(([k,x])=>[k,x[1]&&x[2]>=30&&x[2]/x[3]>=10?x[0]/x[1]:null]));}
  return D._usgN.get(hNorm(n))??null;}
{const _cv=compareView;compareView=function(list){return apMode==="proj"?_cv(list):pcmpView(list);};}
// player cards: Compare adds him to Players › Compare
{const _pc=playerCard;playerCard=function(n){_pc(n);
  const acts=document.querySelector("#sheetBody .sheetacts");if(!acts||!allPlayers().some(r=>r.n===n))return;
  acts.insertAdjacentHTML("afterbegin",`<button class="btn ghost" data-pcxadd="${esc(n)}">${CMP.some(k=>k.slice(2)===n)?"Open compare":CMP.length?"Compare with "+CMP.length+" picked":"Compare with…"}</button>`);};}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-pcx]");if(b){const [k,v]=b.dataset.pcx.split(":");PCX[k]=v;savePCX();return renderRosters();}
  const a=e.target.closest("[data-pcxadd]");if(!a)return;e.preventDefault();e.stopPropagation();
  const n=a.dataset.pcxadd,r=allPlayers().find(x=>x.n===n);if(!r)return;
  if(!CMP.includes(r.k)){if(CMP.length>=4)CMP.shift();CMP.push(r.k);}
  apMode="season";try{localStorage.setItem("dfApMode","season");}catch(e){}document.querySelector('[data-sheet="close"]')?.click();setNav("players");
  setTimeout(()=>document.querySelector(".pcx")?.scrollIntoView({behavior:"smooth",block:"start"}),60);},true);
document.addEventListener("change",e=>{const d=e.target.closest("[data-pcxd]");if(!d||!d.value)return;PCX.win="custom";PCX[d.dataset.pcxd]=d.value;savePCX();renderRosters();});
