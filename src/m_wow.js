
/* ============================================================================
   WOW FEATURES (2026-10-22): trade finder, pick'em, record book + Wrapped.
   ============================================================================ */

// ---- 1. trade finder: 1-for-1 swaps that help both teams where they're weak
// Each team weighs categories by its projected league rank: weak categories count more, strong ones less.
function catWeights(ids,S,T){const w={};CATS.forEach(c=>{const r=1+ids.filter(y=>val(S[y],c)>val(S[T],c)+1e-9).length,third=ids.length/3;w[c[0]]=r>ids.length-third?1.6:r<=third?.5:1;});return w;}
function findTrades(T,max=8){
  const ids=L.teams.map(t=>tnum(t.id)).filter(x=>TEAMS[x]&&TEAMS[x].P.length);if(!TEAMS[T])return [];
  const S=Object.fromEntries(ids.map(x=>[x,projSum(activeNames(x))])),W0=Object.fromEntries(ids.map(x=>[x,catWeights(ids,S,x)]));
  const z=n=>{const D=DIR[n],pg=D&&INJ[n]!=="OUT"?pgLine(D.pj):null;return pg?Object.fromEntries(CATS.map(c=>[c[0],catZ(pg,c)])):null;};
  const tot=zz=>CATS.reduce((s,c)=>s+zz[c[0]],0),gain=(w,inn,out)=>CATS.reduce((s,c)=>s+w[c[0]]*(inn[c[0]]-out[c[0]]),0);
  const mine=activeNames(T).map(n=>[n,z(n)]).filter(x=>x[1]),out=[];
  ids.filter(O=>O!==T).forEach(O=>{const theirs=activeNames(O).map(n=>[n,z(n)]).filter(x=>x[1]);
    mine.forEach(([g,zg])=>theirs.forEach(([r,zr])=>{
      if(Math.abs(tot(zg)-tot(zr))>1.2)return; // keep it fair: similar overall value
      const a=gain(W0[T],zr,zg),b=gain(W0[O],zg,zr);if(a<=.25||b<=.25)return;
      const up=CATS.filter(c=>zr[c[0]]-zg[c[0]]>.3&&W0[T][c[0]]>=1).map(c=>c[0]),down=CATS.filter(c=>zg[c[0]]-zr[c[0]]>.3&&W0[O][c[0]]>=1).map(c=>c[0]);
      if(!up.length||!down.length)return;
      out.push({O,give:[g],get:[r],a,b,s:Math.min(a,b)+.15*(a+b),up,down});}));});
  // best few, at most two per partner so the list isn't one team
  const per={};return out.sort((x,y)=>y.s-x.s).filter(x=>(per[x.O]=(per[x.O]||0)+1)<=2).slice(0,max);
}
function tradeFinderView(T){
  if(!TEAMS[T])return "";const list=findTrades(T),can=!mirror()&&!WRITE_BLOCKED&&actTeam()===T;
  const weak=(()=>{const ids=L.teams.map(t=>tnum(t.id)).filter(x=>TEAMS[x]),S=Object.fromEntries(ids.map(x=>[x,projSum(activeNames(x))])),w=catWeights(ids,S,T);return CATS.filter(c=>w[c[0]]>1).map(c=>c[0]);})();
  const body=list.length?`<ol class="tflist">${list.map((x,i)=>`<li><div class="tfdeal"><span><span class="muted">You send</span> <span class="nmb" role="button" tabindex="0" data-pcard="${esc(x.give[0])}"><b>${esc(x.give[0])}</b></span></span><span class="tfar" aria-hidden="true">⇄</span><span><span class="muted">${esc(teamName(x.O))} sends</span> <span class="nmb" role="button" tabindex="0" data-pcard="${esc(x.get[0])}"><b>${esc(x.get[0])}</b></span></span></div>
      <div class="tfwhy"><span class="okc">You gain ${x.up.join(", ")}</span><span class="tfdot">·</span><span>They gain ${x.down.join(", ")}</span></div>
      <div class="tfacts"><button class="mini-b" data-tfcmp="${i}">Compare</button>${can?`<button class="btn sm" data-tfoffer="${i}">Offer this trade</button>`:""}</div></li>`).join("")}</ol>`:`<p class="empty">No fair swaps found that help both sides right now.</p>`;
  tradeFinderView.list=list;tradeFinderView.T=T;
  return sec("Trade finder",`Fair 1-for-1 swaps that help ${esc(teamName(T))}${weak.length?` in ${weak.join(", ")}`:""} and the other team where they're weak · ESPN projections`,body+`<p class="anote">Each team's weak categories (bottom third of the league) count more and strong ones count less, so both sides come out ahead. Swaps are kept to players of similar overall value.${mirror()?" Trades run in ESPN while the app mirrors it.":""}</p>`);
}
function openCmp(A,B,give,get){openSheet("Compare trade",`<div id="tcBox">${tradeCmpHtml(A,B,give,get)}</div><p class="flabel">Trade check</p>${tradeImpactHtml(tnum(A),tnum(B),give,get)}<div class="sheetacts"><button class="btn" data-sheet="close">Done</button></div>`);openTradeCompare.id=null;openCmp.last=[A,B,give,get];}
function offerTrade(O,give,get){sheetTradeWith(O,get[0]);const body=$("#sheetBody");
  body.querySelectorAll('input[name="get"]').forEach(i=>i.checked=get.includes(i.value));body.querySelectorAll('input[name="give"]').forEach(i=>i.checked=give.includes(i.value));tradeImpact();}
function sheetFinder(){const T=actTeam()||cur;openSheet("Trade finder",tradeFinderView(T).replace('<section class="panel team">','<section class="panel team tfsheet">')+`<div class="sheetacts"><button class="btn" data-sheet="close">Done</button></div>`);}
document.addEventListener("click",e=>{const b=e.target.closest("[data-tfcmp],[data-tfoffer],[data-tffind]");if(!b)return;e.preventDefault();e.stopPropagation();
  if(b.dataset.tffind!=null)return sheetFinder();
  const x=(tradeFinderView.list||[])[+(b.dataset.tfcmp??b.dataset.tfoffer)],T=tradeFinderView.T;if(!x)return;
  if(b.dataset.tfcmp!=null){TCMODE="proj";return openCmp(T,x.O,x.give,x.get);}offerTrade(x.O,x.give,x.get);},true);
// compare's Season/Projection switch also works for these ad hoc trades
document.addEventListener("click",e=>{const m=e.target.closest("[data-tcmode]");if(!m||openTradeCompare.id||!openCmp.last||!$("#sheetBody #tcBox")||document.querySelector("#sheetBody #trImpact"))return;setTimeout(()=>{const box=$("#tcBox");if(box)box.innerHTML=tradeCmpHtml(...openCmp.last);},0);});
{const _av=analyticsView;analyticsView=function(){const h=_av();if(!L||!TEAMS[cur])return h;return h+tradeFinderView(TEAMS[cur]?cur:actTeam());};}
{const _tv=tradesView;tradesView=function(){return _tv().replace('<button class="btn" data-tradewith="0">Propose a trade</button>','<span class="row" style="gap:6px"><button class="btn ghost" data-tffind>Find trades</button><button class="btn" data-tradewith="0">Propose a trade</button></span>');};}

// ---- 2. pick'em: pick the winner of every matchup before it starts; season leaderboard
let PICKEM=[];
const pkWeek=()=>{for(let n=1;n<=CAL.length;n++)if(CAL[n-1][1]>TODAY&&(W[n]||[]).length)return n;return null;};
const pkKey=([a,b])=>a+"_"+b;
const pkDoc=(n,T)=>PICKEM.find(d=>d.week===n&&tnum(d.team)===T);
const pkWinner=(n,[a,b])=>{if(!weekDone(n))return undefined;const r=h2h(wt(a,n),wt(b,n));return r[0]>r[1]?a:r[1]>r[0]?b:0;};
function pkScores(){const s={};L.teams.forEach(t=>s[tnum(t.id)]={w:0,l:0,wk:{}});
  PICKEM.forEach(d=>{const T=tnum(d.team),n=d.week;if(!s[T]||!weekDone(n))return;(W[n]||[]).forEach(m=>{const p=d.picks?.[pkKey(m)];if(p==null)return;const win=pkWinner(n,m);if(win===0)return;
    if(+p===win){s[T].w++;s[T].wk[n]=(s[T].wk[n]||0)+1;}else s[T].l++;});});return s;}
function pickemView(){
  if(!L)return "";const me=myTeamNum(),n=pkWeek(),cw=wk[0],done=[];for(let k=1;k<=CAL.length;k++)if(weekDone(k)&&(W[k]||[]).length)done.push(k);
  const nm=x=>esc(teamName(x));
  // next matchup: your picks
  let pick="";
  if(n){const d=me?pkDoc(n,me):null,lock=CAL[n-1][1],held=!!d?.locked,canPick=me&&!WRITE_BLOCKED&&!held;
    pick=sec(`Make your picks · ${weekName(n)}`,`Locks when it starts, ${dow(lock)} ${md(lock)} · pick the winner of every matchup, yours too`,
      `<div class="pkgrid">${(W[n]||[]).map(m=>{const p=d?.picks?.[pkKey(m)],cnt=[0,0];PICKEM.filter(x=>x.week===n).forEach(x=>{const v=x.picks?.[pkKey(m)];if(v==m[0])cnt[0]++;else if(v==m[1])cnt[1]++;});
        const pr=typeof pkProb==="function"?pkProb(n,m):null;return `<div class="pkm">${m.map((x,i)=>`<button class="pkb${p==x?" on":""}${x===me?" mine":""}" data-pk="${n}:${pkKey(m)}:${x}" ${canPick?"":"disabled"} aria-pressed="${p==x}"><b>${nm(x)}</b><small>${STAND[x]?STAND[x].rec.join("-"):""}${pr?` · ${Math.round(pr[i]*100)}% to win`:""}${cnt[i]?` · ${cnt[i]} ${cnt[i]===1?"pick":"picks"}`:""}</small></button>`).join('<span class="pkvs">vs</span>')}</div>`;}).join("")}</div>
      ${me&&!WRITE_BLOCKED?`<div class="pklock"><button class="btn ${held?"":"ghost "}sm" data-pklock="${n}" aria-pressed="${held}">${held?"🔒 Unlock picks":"🔓 Lock picks"}</button><span class="muted">${held?"Your picks are locked so a stray tap can't change them. Unlock any time before the matchup starts.":"Optional: lock your picks so a stray tap can't change them."}</span></div>`:""}
      <p class="anote">${me&&WRITE_BLOCKED?"<b>Your picks aren't saving</b> because the league is shared with you as view-only. Ask the commissioner to share it so you can use it, then reload. ":""}${me?(d&&Object.keys(d.picks||{}).length?`Saved. ${Object.keys(d.picks||{}).length} of ${(W[n]||[]).length} picked.${held?"":" Change them any time before it starts."}`:"Tap a team to pick it. Picks save as you go."):"Log in with your team code to make picks."}</p>`);}
  // this matchup: locked picks and how they're going
  let live="";
  if(cw&&!weekDone(cw)&&CAL[cw-1][1]<=TODAY&&(W[cw]||[]).length&&PICKEM.some(x=>x.week===cw)){const ps=PICKEM.filter(x=>x.week===cw);
    live=sec(`${weekName(cw)} picks · locked`,ps.length?`${ps.length} ${ps.length===1?"team":"teams"} picked · leader so far in bold`:"Nobody made picks for this matchup",
      ps.length?`<div class="scroll"><table class="lg antable pkt"><thead><tr><th class="nm">Matchup</th><th>Picked</th>${me?"<th>You</th>":""}</tr></thead><tbody>${(W[cw]||[]).map(m=>{const r=h2h(wt(m[0],cw),wt(m[1],cw)),lead=r[0]>r[1]?m[0]:r[1]>r[0]?m[1]:0,c=m.map(x=>ps.filter(d=>d.picks?.[pkKey(m)]==x).length),mp=me?pkDoc(cw,me)?.picks?.[pkKey(m)]:null;
        return `<tr><td class="nm">${m.map(x=>x===lead?`<b>${nm(x)}</b>`:nm(x)).join(" vs ")} <small class="muted">${r.join("-")}</small></td><td class="num">${c.join(" – ")}</td>${me?`<td>${mp!=null?`<span class="${+mp===lead?"okc":lead?"badc":""}">${nm(+mp)}</span>`:"–"}</td>`:""}</tr>`;}).join("")}</tbody></table></div>`:"");}
  // leaderboard
  const S=pkScores(),rows=Object.entries(S).map(([T,v])=>({T:+T,...v,g:v.w+v.l})).sort((a,b)=>b.w-a.w||a.l-b.l||teamName(a.T).localeCompare(teamName(b.T)));
  const lastW=done.length?done[done.length-1]:null,bestWk=lastW?Math.max(0,...rows.map(r=>r.wk[lastW]||0)):0;
  const board=sec("Pick'em leaderboard",done.length?`Correct picks over ${done.length} finished ${done.length===1?"matchup":"matchups"}${bestWk?` · 🔮 best last week: ${rows.filter(r=>(r.wk[lastW]||0)===bestWk).map(r=>esc(teamName(r.T))).join(", ")}`:""}`:"Scores start when the first picked matchup ends",
    `<div class="scroll"><table class="lg antable"><thead><tr><th>#</th><th class="nm">Team</th><th>Correct</th><th>Wrong</th><th>%</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${r.T===me?"mine":""}"><td class="num">${i===0&&r.w?"🏆":i+1}</td><td class="nm">${tlink(r.T)}</td><td class="num">${r.w}</td><td class="num">${r.l}</td><td class="num">${r.g?Math.round(r.w/r.g*100)+"%":"–"}</td></tr>`).join("")}</tbody></table></div>`);
  return (pick||(n?"":sec("Pick'em","No more matchups to pick this season",""))) +live+board;
}
document.addEventListener("click",async e=>{const b=e.target.closest("[data-pk]");if(!b||b.disabled)return;e.preventDefault();e.stopPropagation();
  const [n,k,x]=b.dataset.pk.split(":"),me=myTeamNum(),wkN=+n;if(!me)return;if(CAL[wkN-1][1]<=TODAY)return toast("Picks for this matchup are locked.");
  const id=`${SEASON}_w${wkN}_t${me}`,d=pkDoc(wkN,me),picks={...(d?.picks||{})};if(picks[k]==x)delete picks[k];else picks[k]=+x;
  // show it right away, then save
  if(d?.locked)return toast("Your picks are locked. Tap Unlock picks to change them.");
  const old=d?d.picks:null,nd={id,season:SEASON,week:wkN,team:tkey(me),picks};if(d)d.picks=picks;else PICKEM.push(nd);renderRosters();
  // a refused save (view-only sharing) takes the pick back so the screen matches what's saved
  try{await Store.set("pickem",id,{season:SEASON,week:wkN,team:tkey(me),picks,at:Date.now()});}catch(x){if(d)d.picks=old;else PICKEM=PICKEM.filter(z=>z!==nd);showErr(x);render();}},true);
// lock/unlock your own picks (optional; only a guard against stray taps, open until the matchup starts)
document.addEventListener("click",async e=>{const b=e.target.closest("[data-pklock]");if(!b)return;e.preventDefault();e.stopPropagation();
  const wkN=+b.dataset.pklock,me=myTeamNum();if(!me)return;if(CAL[wkN-1][1]<=TODAY)return toast("This matchup has started.");
  const id=`${SEASON}_w${wkN}_t${me}`;let d=pkDoc(wkN,me);if(!d){d={id,season:SEASON,week:wkN,team:tkey(me),picks:{}};PICKEM.push(d);}
  d.locked=!d.locked;renderRosters();
  try{await Store.set("pickem",id,{season:SEASON,week:wkN,team:tkey(me),picks:d.picks||{},locked:d.locked,at:Date.now()});}catch(x){d.locked=!d.locked;showErr(x);render();}},true);

// ---- 3. record book (this season) and Wrapped for each team
function recordsData(){
  const ids=Object.keys(TEAMS).map(Number),done=[];for(let n=1;n<=CAL.length;n++)if(weekDone(n)&&(W[n]||[]).length)done.push(n);
  const R={ids,done,weeks:[],games:[],h2h:{}};
  done.forEach(n=>(W[n]||[]).forEach(([a,b])=>{const ta=wt(a,n),tb=wt(b,n),r=h2h(ta,tb);R.weeks.push({n,T:a,t:ta,r,o:b},{n,T:b,t:tb,r:[r[1],r[0],r[2]],o:a});
    const k=a+"_"+b,k2=b+"_"+a;(R.h2h[k]=R.h2h[k]||[0,0,0]);(R.h2h[k2]=R.h2h[k2]||[0,0,0]);const x=weekRec(r);[0,1,2].forEach(i=>{R.h2h[k][i]+=x[i];R.h2h[k2][i]+=x[i===2?2:1-i];});}));
  // every started game by a rostered player, with the fantasy team that had him
  ids.forEach(T=>TEAMS[T].P.forEach(p=>Object.entries(p.d||{}).forEach(([sp,l])=>{sp=+sp;if(!l||sp>=TODAY&&!(LIVE&&LIVE.day===sp))return;if(!startedOn(p,sp))return;R.games.push({n:p.n,T,sp,l,z:zOf(l)||0});})));
  return R;
}
function streaks(R){const s={};R.ids.forEach(T=>{let cur=0,best=0;R.done.forEach(n=>{const w=R.weeks.find(x=>x.n===n&&x.T===T);if(!w)return;const r=weekRec(w.r);if(r[0]>r[1]){cur++;best=Math.max(best,cur);}else cur=0;});s[T]={best,cur};});return s;}
function recordsView(){
  if(!L||!Object.keys(TEAMS).length)return "";const R=recordsData(),nm=x=>esc(teamName(x)),day=sp=>`${dow(sp)} ${md(sp)}`;
  const statRows=[["PTS",K.PTS],["REB",K.REB],["AST",K.AST],["3PM",K.TPM],["STL",K.STL],["BLK",K.BLK]];
  const games=statRows.map(([l,i])=>{const g=R.games.slice().sort((a,b)=>b.l[i]-a.l[i])[0];return g&&g.l[i]?`<tr><td class="nm"><b>${l}</b></td><td class="num big">${g.l[i]}</td><td class="nm"><span class="nmb" role="button" tabindex="0" data-pcard="${esc(g.n)}">${esc(g.n)}</span><small>${nm(g.T)} · ${day(g.sp)}</small></td></tr>`:"";}).join("");
  const top=R.games.slice().sort((a,b)=>b.z-a.z).slice(0,5);
  const gameSec=sec("Best single games","Started games by a player on a fantasy roster this season",R.games.length?`<div class="scroll"><table class="lg antable rbt"><tbody>${games}</tbody></table></div>
    <p class="flabel" style="margin:12px 14px 4px">Best all-around games</p><ol class="plist rbl">${top.map(g=>`<li><div><span class="pnm"><span class="nm nmb" role="button" tabindex="0" data-pcard="${esc(g.n)}"><b>${esc(g.n)}</b></span></span><span class="pmeta">${nm(g.T)} · ${day(g.sp)} · ${g.l[K.PTS]} pts, ${g.l[K.REB]} reb, ${g.l[K.AST]} ast, ${g.l[K.TPM]} 3pm, ${g.l[K.STL]} stl, ${g.l[K.BLK]} blk</span></div></li>`).join("")}</ol>`:`<p class="empty">No box scores yet.</p>`);
  let teamSec;
  if(R.weeks.length){const best=(f,lab,fmt)=>{const w=R.weeks.slice().sort((a,b)=>f(b)-f(a))[0];return `<tr><td class="nm"><b>${lab}</b></td><td class="num big">${fmt(w)}</td><td class="nm">${nm(w.T)}<small>${weekName(w.n)} vs ${nm(w.o)}</small></td></tr>`;};
    const st=streaks(R),lng=R.ids.slice().sort((a,b)=>st[b].best-st[a].best)[0];
    teamSec=sec("Team records","Best single matchups this season",`<div class="scroll"><table class="lg antable rbt"><tbody>
      ${best(w=>w.r[0]-w.r[1],"Biggest win",w=>`${w.r[0]}-${w.r[1]}${w.r[2]?"-"+w.r[2]:""}`)}
      ${statRows.map(([l,i])=>best(w=>w.t[i],`Most ${l}`,w=>w.t[i])).join("")}
      ${best(w=>w.t[K.FGA]>=40?w.t[K.FGM]/w.t[K.FGA]:0,"Best FG%",w=>pct(w.t[K.FGA]?w.t[K.FGM]/w.t[K.FGA]:0))}
      ${st[lng].best?`<tr><td class="nm"><b>Longest win streak</b></td><td class="num big">${st[lng].best}</td><td class="nm">${nm(lng)}</td></tr>`:""}</tbody></table></div>`);}
  else teamSec=" "+sec("Team records","Best single matchups this season",`<p class="empty">Team records start when the first matchup ends.</p>`);
  // head-to-head grid: matchup record of the row team against the column team
  const ids=R.ids,grid=R.weeks.length?`<div class="scroll"><table class="lg h2hg"><thead><tr><th class="nm"></th>${ids.map((x,i)=>`<th title="${nm(x)}">${i+1}</th>`).join("")}</tr></thead><tbody>${ids.map((a,i)=>`<tr class="${a===cur?"mine":""}"><td class="nm"><span class="muted">${i+1}</span> ${tlink(a)}</td>${ids.map(b=>{if(a===b)return `<td class="self"></td>`;const h=R.h2h[a+"_"+b];return h?`<td class="num ${h[0]>h[1]?"okc":h[0]<h[1]?"badc":""}">${h[0]}-${h[1]}${h[2]?"-"+h[2]:""}</td>`:`<td class="num muted">·</td>`;}).join("")}</tr>`).join("")}</tbody></table></div>`:`<p class="empty">Fills in as matchups finish.</p>`;
  const tE=teamSec.startsWith(" ");
  return (tE?"":teamSec)+superView(R)+gameSec+(tE?teamSec:"")+sec("Head to head","Each row team's record against each column team this season · columns follow the row numbers",grid);
}
// Wrapped: one team's season in a few big cards
function wrappedView(R){
  const T=TEAMS[cur]?cur:null;if(!T)return "";const nm=x=>esc(teamName(x)),my=R.weeks.filter(w=>w.T===T),G=R.games.filter(g=>g.T===T);
  const cards=[];const card=(ic,lab,big,sub)=>cards.push(`<div class="wcard"><span class="wic" aria-hidden="true">${ic}</span><span class="wlab">${lab}</span><b class="wbig">${big}</b>${sub?`<span class="wsub">${sub}</span>`:""}</div>`);
  if(my.length){const rec=my.reduce((s,w)=>{const r=weekRec(w.r);return s.map((v,i)=>v+r[i]);},[0,0,0]),cats=my.reduce((s,w)=>s.map((v,i)=>v+w.r[i]),[0,0,0]);
    const mw=my.reduce((s,w)=>{const i=w.r[0]>w.r[1]?0:w.r[0]<w.r[1]?1:2;s[i]++;return s;},[0,0,0]);card("📅","Record",rec.join("-"),L.format==="most"?`${cats.join("-")} in categories`:`${mw[0]}-${mw[1]}${mw[2]?"-"+mw[2]:""} in matchups`);const bw=my.slice().sort((a,b)=>(b.r[0]-b.r[1])-(a.r[0]-a.r[1]))[0];card("💪","Best matchup",`${bw.r[0]}-${bw.r[1]}`,`${weekName(bw.n)} vs ${nm(bw.o)}`);}
  // MVP: most value from started games; best game; the category you won most
  const by={};G.forEach(g=>{(by[g.n]=by[g.n]||{z:0,g:0,pts:0});by[g.n].z+=g.z;by[g.n].g++;by[g.n].pts+=g.l[K.PTS];});
  const mvp=Object.entries(by).sort((a,b)=>b[1].z-a[1].z)[0];if(mvp)card("⭐","Your MVP",esc(mvp[0]),`${mvp[1].g} ${mvp[1].g===1?"start":"starts"} · ${mvp[1].pts} pts`);
  const bg=G.slice().sort((a,b)=>b.z-a.z)[0];if(bg)card("🔥","Best game",`${bg.l[K.PTS]}/${bg.l[K.REB]}/${bg.l[K.AST]}`,`${esc(bg.n)} · ${dow(bg.sp)} ${md(bg.sp)}`);
  if(my.length){const cw=CATS.map(c=>[c[0],my.filter(w=>{const x=val(w.t,c),o=R.weeks.find(v=>v.n===w.n&&v.T===w.o);return o&&x>val(o.t,c)+1e-9;}).length]).sort((a,b)=>b[1]-a[1])[0];card("🎯","Best category",cw[0],`won it in ${cw[1]} of ${my.length} ${my.length===1?"matchup":"matchups"}`);}
  // moves: pickups and the best one by what he did after joining
  const adds=TXLOG.filter(t=>t.ok&&t.add&&tnum(t.team)===T&&t.by!=="ESPN import"),trades=TXLOG.filter(t=>t.ok&&t.type==="trade"&&(tnum(t.from)===T||tnum(t.to)===T)&&t.status==="accepted");
  if(adds.length||trades.length){const bp=adds.map(t=>({n:t.add,z:G.filter(g=>g.n===t.add&&g.sp>=(t.addDay??t.day??0)).reduce((s,g)=>s+g.z,0)})).sort((a,b)=>b.z-a.z)[0];
    card("🧲","Moves",`${adds.length} ${adds.length===1?"pickup":"pickups"}`,`${trades.length} ${trades.length===1?"trade":"trades"}${bp&&bp.z>0?` · best pickup ${esc(bp.n)}`:""}`);}
  let bench=0;TEAMS[T].P.forEach(p=>Object.entries(p.d||{}).forEach(([sp,l])=>{sp=+sp;if(l&&sp<TODAY&&slotOn(p,sp)===12)bench+=l[K.PTS];}));if(bench)card("🪑","Points left on the bench",bench,"from players who played while benched");
  if(!cards.length)return "";
  return `<section class="panel team wrapped"><div class="teamhead"><span class="tn">${nm(T)} · Wrapped</span><span class="sum">${esc(L.season)} so far · pick another team at the top to see theirs</span></div><div class="wcards">${cards.join("")}</div></section>`;
}
