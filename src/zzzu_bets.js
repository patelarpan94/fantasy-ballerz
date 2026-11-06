
/* ============================================================================
   SIDE BETS (2.61, 2026-11-06, Arp: "make something new"). Fun › Side bets.
   Challenge another manager to a friendly bet the app settles on its own:
     h2h     our matchup this week (categories won)
     cat     more of one category this matchup (team totals, any two teams)
     player  my player vs your player in one category this matchup
     stand   who finishes higher in the regular-season standings
   Stakes are free text (lunch, $5, loser renames their team...). The other
   team accepts or passes, from the Side bets page, the dashboard widget or
   the DM the offer lands in. When the matchup is final any open app settles
   it, posts the result to league chat and adds it to the ledger (who owes
   who, with a Paid button). Double or nothing re-offers it for next matchup.
   Docs live in the "bets" collection:
     {season, from:"tN", to:"tN", k, c (CATDEF key), pa, pb (player names),
      n (matchup), stake, status open|live|done|declined|cancelled|expired|void,
      res A|B|push, sc [shown A, shown B], paid, at, acceptedAt, settledAt}
   No server change: the backend lets any logged-in team write this
   collection, and the app only shows the buttons to the right team.
   ============================================================================ */
let BET_L=[];
const BF={o:null,k:"",c:"",pa:"",pb:"",n:0,s:""};
const BET_STAKES=["🍔 Lunch","$5","$20","🍺 A round","Loser renames their team","Loser posts the winner's choice of avatar","Bragging rights"];
const BET_KINDS=[["h2h","Our matchup"],["cat","One category"],["player","Player vs player"],["stand","Season finish"]];
const betMe=()=>myTeamNum()||(isCommish()&&TEAMS[cur]?cur:0);
const betCanWrite=()=>!!SESSION&&!WRITE_BLOCKED&&!!(Store.db||Store.local);
const betDays=n=>{const w=WEEKS[n-1],o=[];if(!w)return o;for(let sp=w[1];sp<=Math.min(w[2],TODAY);sp++)o.push(sp);return o;};
// a matchup is over once its last day is in the past and that day's box scores are final (or a day later)
const betOver=n=>{const w=WEEKS[n-1];return !!w&&TODAY>w[2]&&(TODAY>w[2]+1||!!(STATS[w[2]]&&STATS[w[2]].final));};
const betNowWeek=()=>{const w=weekOf(Math.min(TODAY,SEASON_END));return betOver(w[0])&&w[0]<WEEKS.length?w[0]+1:w[0];};
const betCat=k=>CATDEF[k]||CATS[0];
const betCatKey=c=>Object.keys(CATDEF).find(k=>CATDEF[k]===c)||"PTS";
const betZero=()=>new Array(10).fill(0);
function betPl(n,days){const t=betZero(),D=DAYLINES[n]||{};let g=0;days.forEach(sp=>{const l=D[sp];if(l&&l[K.MIN]>0){g++;for(let i=0;i<10;i++)t[i]+=l[i];}});return {t,g};}
const betRank=T=>{const o=typeof standOrder==="function"?standOrder():[];const i=o.indexOf(T);return i<0?99:i+1;};
const betEndN=b=>b.k==="stand"?regWeeks():b.n;
const betWk=n=>WEEKS[n-1]?weekName(n):"?";

// one plain sentence for the bet, from the offering team's side
function betText(b){const A=teamName(b.from),B=teamName(b.to),c=betCat(b.c),w=betWk(b.n);
  if(b.k==="h2h")return `${A} beats ${B} in ${w}`;
  if(b.k==="cat")return c[1]==="pct"?`${A} has a better ${c[0]} than ${B} in ${w}`:`${A} gets more ${c[0]} than ${B} in ${w}`;
  if(b.k==="player")return c[1]==="pct"?`${b.pa} (${A}) shoots a better ${c[0]} than ${b.pb} (${B}) in ${w}`:`${b.pa} (${A}) gets more ${c[0]} than ${b.pb} (${B}) in ${w}`;
  return `${A} finishes above ${B} in the regular-season standings`;}
const betLabel=b=>b.k==="h2h"?"Matchup":b.k==="cat"?betCat(b.c)[0]:b.k==="player"?`${betCat(b.c)[0]} duel`:"Season finish";

// where the bet stands right now: x/y shown for each side, lead 1 (A ahead) / -1 / 0, fin when it can settle
function betEval(b){const A=tnum(b.from),B=tnum(b.to),n=betEndN(b),w=WEEKS[n-1];
  const out={xs:"–",ys:"–",lead:0,fin:betOver(n),started:!!w&&TODAY>=w[1],left:w?Math.max(0,w[2]-Math.max(TODAY,w[1])+1):0,void:false,sub:""};
  if(!TEAMS[A]||!TEAMS[B]||!w){out.void=out.fin;return out;}
  if(b.k==="stand"){const ra=betRank(A),rb=betRank(B);out.xs=ord(ra);out.ys=ord(rb);out.lead=ra<rb?1:ra>rb?-1:0;out.started=TODAY>=WEEKS[0][1];out.sub="in the standings";return out;}
  const days=betDays(n);
  if(b.k==="h2h"){if(opponentIn(A,n)!==B){out.void=out.fin;out.sub="they don't play each other that matchup";return out;}
    const r=h2h(dayTotals(A,days)||betZero(),dayTotals(B,days)||betZero());out.xs=String(r[0]);out.ys=String(r[1]);out.lead=Math.sign(r[0]-r[1]);out.sub=r[2]?`${r[2]} tied`:"categories";return out;}
  const c=betCat(b.c);let ta,tb;
  if(b.k==="player"){const pa=betPl(b.pa,days),pb=betPl(b.pb,days);ta=pa.t;tb=pb.t;out.sub=`${pa.g} game${pa.g===1?"":"s"} to ${pb.g}`;}
  else{ta=dayTotals(A,days)||betZero();tb=dayTotals(B,days)||betZero();out.sub=c[0];}
  const x=val(ta,c),y=val(tb,c);out.xs=String(show(c[1]==="pct"?x:Math.round(x),c));out.ys=String(show(c[1]==="pct"?y:Math.round(y),c));
  out.lead=Math.abs(x-y)<1e-9?0:x>y?1:-1;if(c[1]==="pct"&&!x&&!y)out.lead=0;return out;}

// ---- writes
async function betChat(b,ev){const A=b.from,B=b.to,stake=b.stake?`Loser owes: ${b.stake}`:"Just for bragging rights";
  const dm=ev==="offer"||ev==="declined"||ev==="cancelled",members=dm?[A,B]:["all"];
  const r=b.res==="A"?[A,B]:b.res==="B"?[B,A]:null,sc=b.sc?`${b.sc[0]} to ${b.sc[1]}`:"";
  const head={offer:`🎲 Side bet offer from ${teamName(A)}`,live:`🤝 Side bet is on: ${teamName(A)} vs ${teamName(B)}`,declined:`${teamName(B)} passed on the side bet`,cancelled:`${teamName(A)} took back the side bet`,
    done:r?`💰 ${teamName(r[0])} won a side bet vs ${teamName(r[1])}`:`🤷 Side bet push: ${teamName(A)} vs ${teamName(B)}`,void:`Side bet called off: ${teamName(A)} vs ${teamName(B)}`}[ev];
  const tail=ev==="done"?(r?`${betText(b)}${sc?` · ${sc}`:""}\n${teamName(r[1])} owes: ${b.stake||"bragging rights"}`:`${betText(b)}${sc?` · ${sc}`:""}\nNobody owes anything.`):`${betText(b)}\n${stake}`;
  try{await Store.set("chat",`sys_bet_${b.id}_${ev}`,{ch:dm?dmKey(A,B):"league",members,from:"sys",kind:"trade",tx:"bet:"+b.id,bet:b.id,text:`${head}\n${tail}`,at:Date.now()});}catch(e){}}
async function betOffer(){const A=betMe(),B=+BF.o;if(!A||!B||A===B)return toast("Pick a team to bet against.");
  const k=BF.k,n=k==="stand"?regWeeks():+BF.n;
  if(k==="h2h"&&opponentIn(A,n)!==B)return toast(`You don't play ${teamName(B)} in ${betWk(n)}.`);
  if(k==="player"&&(!BF.pa||!BF.pb))return toast("Pick a player on each side.");
  if(betOver(n))return toast("That matchup is already over.");
  const stake=String(BF.s||"").trim().slice(0,80);
  const b={season:SEASON,from:tkey(A),to:tkey(B),k,c:k==="h2h"||k==="stand"?null:(BF.c||betCatKey(CATS[0])),pa:k==="player"?BF.pa:null,pb:k==="player"?BF.pb:null,n,stake,status:"open",at:Date.now(),...actor()};
  const id=newId();try{await Store.set("bets",id,b);}catch(e){return showErr(e);}
  betChat({...b,id},"offer");BF.s="";toast(`Bet sent to ${teamName(B)}. It's on once they accept.`);}
async function betAct(a,id){const b=BET_L.find(x=>x.id===id);if(!b)return;const me=betMe(),cm=isCommish(),A=tnum(b.from),B=tnum(b.to);
  try{
    if(a==="accept"&&b.status==="open"&&(me===B||cm)){if(betOver(betEndN(b)))return toast("Too late, that matchup is over.");await Store.update("bets",id,{status:"live",acceptedAt:Date.now()});betChat(b,"live");toast("You're on. The app settles it when the matchup ends.");}
    else if(a==="decline"&&b.status==="open"&&(me===B||cm)){await Store.update("bets",id,{status:"declined",closedAt:Date.now()});betChat(b,"declined");}
    else if(a==="cancel"&&b.status==="open"&&(me===A||cm)){await Store.update("bets",id,{status:"cancelled",closedAt:Date.now()});betChat(b,"cancelled");}
    else if(a==="void"&&cm&&b.status!=="done"){await Store.update("bets",id,{status:"void",closedAt:Date.now()});if(b.status==="live")betChat(b,"void");toast("Bet called off");}
    else if(a==="paid"&&b.status==="done"&&(me===A||me===B||cm)){await Store.update("bets",id,{paid:!b.paid,paidAt:Date.now()});toast(b.paid?"Marked as not paid":"Paid. Debt settled ✓");}
    else if(a==="double"&&b.status==="done"&&(me===A||me===B)){const O=me===A?B:A,n=betNowWeek();
      Object.assign(BF,{o:O,k:b.k==="h2h"&&opponentIn(me,n)!==O?"cat":b.k,c:b.c||"PTS",pa:me===A?b.pa||"":b.pb||"",pb:me===A?b.pb||"":b.pa||"",n,s:/^Double or nothing/.test(b.stake||"")?b.stake:`Double or nothing: ${b.stake||"bragging rights"}`});
      if(b.k==="player"&&(ownerNow(BF.pa)!==me||ownerNow(BF.pb)!==O)){BF.pa="";BF.pb="";}
      if(nav!=="pickem"||SUB.pickem!=="bets")setNav("pickem","bets");else renderRosters();
      setTimeout(()=>{const f=document.getElementById("betForm");if(f)f.scrollIntoView({behavior:"smooth",block:"start"});},80);return;}
  }catch(e){showErr(e);}}

// any open, logged-in app settles finished bets (same result from every device, so a double write is harmless)
let BET_BUSY=false;
async function betSettle(){if(BET_BUSY||!betCanWrite()||!L||!Object.keys(TEAMS).length)return;BET_BUSY=true;
  try{for(const b of BET_L.slice()){
    if(b.status==="open"&&betOver(betEndN(b))){await Store.update("bets",b.id,{status:"expired",closedAt:Date.now()});continue;}
    if(b.status!=="live")continue;const e=betEval(b);if(!e.fin)continue;
    if(e.void){await Store.update("bets",b.id,{status:"void",closedAt:Date.now()});betChat(b,"void");continue;}
    const res=e.lead>0?"A":e.lead<0?"B":"push",patch={status:"done",res,sc:[e.xs,e.ys],settledAt:Date.now()};
    await Store.update("bets",b.id,patch);betChat({...b,...patch},"done");}}
  catch(e){}finally{BET_BUSY=false;}}
setInterval(()=>{if(!document.hidden)betSettle();},60e3);

{const _ss=subscribeSeason;subscribeSeason=function(){_ss();BET_L=[];
  UNSUB.push(Store.watch("bets",SEASON,d=>{BET_L=d.sort((a,b)=>(b.at||0)-(a.at||0));setTimeout(betSettle,1500);queueRebuild();}));};}

// ---- view pieces
const betSide=(b,s)=>s==="A"?tnum(b.from):tnum(b.to);
function betCard(b,o){o=o||{};const me=betMe(),cm=isCommish(),A=tnum(b.from),B=tnum(b.to),e=betEval(b),mine=me===A||me===B;
  const btn=(a,l,cls)=>`<button class="${cls||"btn sm"}" data-bet="${a}:${esc(b.id)}">${l}</button>`,can=betCanWrite();
  const nmA=esc(o.short?dShort(A):teamName(A)),nmB=esc(o.short?dShort(B):teamName(B));
  let st="",acts="";
  if(b.status==="open"){st=`<span class="bt-st op">${me===B?"Waiting on you":`Waiting on ${esc(teamName(B))}`}</span>`;
    if(can&&(me===B||cm))acts+=btn("accept","Accept")+btn("decline","Pass","btn sm ghost");
    if(can&&me===A&&!o.short)acts+=btn("cancel","Take back","btn sm ghost");}
  else if(b.status==="live"){const w=WEEKS[betEndN(b)-1];st=!e.started?`<span class="bt-st">Starts ${w?md(w[1]):""}</span>`:e.fin?`<span class="bt-st">Final, settling…</span>`:`<span class="bt-st live">● Live${b.k==="stand"?"":` · ${e.left} day${e.left===1?"":"s"} left`}</span>`;}
  else if(b.status==="done"){const r=b.res==="push"?null:betSide(b,b.res),l=r?(r===A?B:A):null;
    st=r?`<span class="bt-st won">${esc(teamName(r))} won${b.paid?" · paid ✓":""}</span>`:`<span class="bt-st">Push</span>`;
    if(can&&r&&b.stake&&(mine||cm)&&!o.short)acts+=btn("paid",b.paid?"Not paid":"Mark paid","btn sm ghost");
    if(can&&mine&&!o.short&&b.k!=="stand")acts+=btn("double",l===me?"Double or nothing":"Run it back","btn sm ghost");}
  else st=`<span class="bt-st off">${{declined:"Passed",cancelled:"Taken back",expired:"Expired, never accepted",void:"Called off"}[b.status]||b.status}</span>`;
  if(can&&cm&&!o.short&&(b.status==="open"||b.status==="live"))acts+=btn("void","Call off","mini-b");
  const showSc=b.status==="live"&&e.started||b.status==="done";
  const xs=b.status==="done"&&b.sc?b.sc[0]:e.xs,ys=b.status==="done"&&b.sc?b.sc[1]:e.ys;
  const lead=b.status==="done"?(b.res==="A"?1:b.res==="B"?-1:0):e.lead;
  const pa=b.k==="player"?`<small>${esc(b.pa)}</small>`:"",pb=b.k==="player"?`<small>${esc(b.pb)}</small>`:"";
  const board=`<div class="bt-sb"><span class="bt-t${showSc&&lead>0?" up":""}${A===me?" me":""}"><b>${nmA}</b>${pa}</span><span class="bt-sc num">${showSc?`<b class="${lead>0?"up":""}">${esc(xs)}</b><i>${b.k==="h2h"?"–":"vs"}</i><b class="${lead<0?"up":""}">${esc(ys)}</b>`:`<i>vs</i>`}</span><span class="bt-t r${showSc&&lead<0?" up":""}${B===me?" me":""}"><b>${nmB}</b>${pb}</span></div>`;
  return `<li class="bt-card${mine?" mine":""} s-${b.status}"><div class="bt-top"><span class="bt-k">${esc(betLabel(b))}${b.k!=="stand"?` · ${esc(betWk(b.n))}`:""}</span>${st}</div>${board}
    <p class="bt-tx">${esc(betText(b))}${showSc&&e.sub&&b.status==="live"?` <small class="muted">· ${esc(e.sub)}</small>`:""}</p>
    <p class="bt-stake"><span aria-hidden="true">🏷️</span> ${b.stake?`Loser owes <b>${esc(b.stake)}</b>`:"Bragging rights only"}</p>${acts?`<div class="bt-acts">${acts}</div>`:""}</li>`;}
const betList=(arr,o)=>`<ol class="bt-l">${arr.map(b=>betCard(b,o)).join("")}</ol>`;

function betForm(){const A=betMe();if(!A)return sec("Make a bet","",`<p class="empty">Log in with your team to make a side bet.</p>`);
  if(!betCanWrite())return "";
  const ids=L.teams.map(t=>tnum(t.id)).filter(x=>TEAMS[x]&&x!==A);if(!ids.length)return "";
  const n0=betNowWeek(),weeks=[n0,n0+1].filter(n=>WEEKS[n-1]&&!betOver(n));
  if(!weeks.includes(+BF.n))BF.n=weeks[0]||n0;
  const opp=opponentIn(A,+BF.n);
  if(BF.o==null||!ids.includes(+BF.o))BF.o=opp&&ids.includes(opp)?opp:ids[0];
  const O=+BF.o,regOver=betOver(regWeeks());
  const kinds=BET_KINDS.filter(([k])=>k==="h2h"?opponentIn(A,+BF.n)===O:k==="stand"?!regOver:true);
  if(!kinds.some(([k])=>k===BF.k))BF.k=kinds[0][0];
  if(!BF.c||!CATS.includes(CATDEF[BF.c]))BF.c=betCatKey(CATS.find(c=>c[0]==="PTS")||CATS[0]);
  const roster=T=>dNowP(T).slice().sort((a,b)=>(a.rk[0]||a.rk[1]||999)-(b.rk[0]||b.rk[1]||999));
  const mineP=roster(A),theirP=roster(O);
  if(BF.k==="player"){if(!mineP.some(p=>p.n===BF.pa))BF.pa=mineP[0]?.n||"";if(!theirP.some(p=>p.n===BF.pb))BF.pb=theirP[0]?.n||"";}
  const opt=(v,l,on)=>`<option value="${esc(v)}"${on?" selected":""}>${esc(l)}</option>`;
  const sel=(lab,k,html)=>`<label class="hf"><span>${lab}</span><select data-bf="${k}">${html}</select></label>`;
  let f=sel("Bet against","o",ids.map(x=>opt(x,teamName(x)+(x===opponentIn(A,+BF.n)?" · your opponent":""),x===O)).join(""));
  f+=`<div class="hf bt-kinds"><span>The bet</span><div class="bt-seg" role="group">${kinds.map(([k,l])=>`<button class="${k===BF.k?"on":""}" data-bfk="${k}" aria-pressed="${k===BF.k}">${l}</button>`).join("")}</div></div>`;
  if(BF.k!=="stand")f+=sel("Matchup","n",weeks.map(n=>opt(n,weekName(n)+(n===n0&&WEEKS[n-1][1]<=TODAY?" · now":""),n===+BF.n)).join(""));
  if(BF.k==="cat"||BF.k==="player")f+=sel("Category","c",CATS.map(c=>opt(betCatKey(c),c[0],betCatKey(c)===BF.c)).join(""));
  if(BF.k==="player"){f+=sel("Your player","pa",mineP.map(p=>opt(p.n,p.n,p.n===BF.pa)).join(""));f+=sel("Their player","pb",theirP.map(p=>opt(p.n,p.n,p.n===BF.pb)).join(""));}
  f+=`<label class="hf bt-stk"><span>Loser owes</span><input data-bfs maxlength="80" placeholder="Lunch, $5, renames their team…" value="${esc(BF.s)}"></label>`;
  const chips=`<div class="bt-chips">${BET_STAKES.map(s=>`<button class="chip${BF.s===s?" on":""}" data-bfstake="${esc(s)}">${esc(s)}</button>`).join("")}</div>`;
  const pv={from:tkey(A),to:tkey(O),k:BF.k,c:BF.c,pa:BF.pa,pb:BF.pb,n:BF.k==="stand"?regWeeks():+BF.n};
  // the app's read on it, so nobody bets blind
  const e=betEval(pv);let hint="";
  if(BF.k==="h2h"&&+BF.n===wk[0]&&TEAMS[A]&&TEAMS[O]&&typeof winProb==="function"){try{hint=`The app gives you a ${Math.round(winProb(fcProj(A),fcProj(O))*100)}% chance to win this matchup.`;}catch(x){}}
  else if(e.started&&BF.k!=="h2h")hint=`Right now: ${e.xs} to ${e.ys}${BF.k==="stand"?"":` · ${e.left} day${e.left===1?"":"s"} left`}.`;
  else if(BF.k==="player"){const c=betCat(BF.c),pg=n=>{const s=DIR[n]&&DIR[n].ss;return s&&s[11]?(c[1]==="pct"?(s[c[3]]?s[c[2]]/s[c[3]]:0):s[c[2]]/s[11]):null;},x=pg(BF.pa),y=pg(BF.pb);
    if(x!=null&&y!=null)hint=`This season: ${BF.pa} ${c[1]==="pct"?pct(x):x.toFixed(1)} ${c[0]} a game, ${BF.pb} ${c[1]==="pct"?pct(y):y.toFixed(1)}.`;}
  const body=`<div class="hfilters bt-form">${f}</div>${chips}<div class="bt-pv"><p><b>${esc(betText(pv))}</b></p><p class="muted">${BF.s?`Loser owes ${esc(BF.s)}`:"No stakes yet: bragging rights only"}${hint?` · ${esc(hint)}`:""}</p>
    <button class="btn" data-betoffer>Send bet to ${esc(teamName(O))}</button></div>`;
  return `<div id="betForm">${sec("Make a bet",`From ${esc(teamName(A))} · they get it in a DM and accept or pass`,body)}</div>`;}

function betLedger(){const done=BET_L.filter(b=>b.status==="done"),ids=L.teams.map(t=>tnum(t.id)).filter(x=>TEAMS[x]),me=betMe();
  const rec={};ids.forEach(x=>rec[x]=[0,0,0]);
  done.forEach(b=>{const A=tnum(b.from),B=tnum(b.to);if(!rec[A]||!rec[B])return;if(b.res==="push"){rec[A][2]++;rec[B][2]++;}else{const w=betSide(b,b.res),l=w===A?B:A;rec[w][0]++;rec[l][1]++;}});
  const owed=done.filter(b=>b.res!=="push"&&!b.paid&&b.stake);
  const rows=owed.map(b=>{const w=betSide(b,b.res),l=w===tnum(b.from)?tnum(b.to):tnum(b.from),can=betCanWrite()&&(me===w||me===l||isCommish());
    return `<li class="${me===l?"bt-owe":me===w?"bt-get":""}"><span><b>${esc(teamName(l))}</b> owes <b>${esc(teamName(w))}</b></span><span class="bt-what">${esc(b.stake||"bragging rights")}</span><small class="muted">${esc(betLabel(b))}${b.k!=="stand"?` · ${esc(betWk(b.n))}`:""}</small>${can?`<button class="btn sm ghost" data-bet="paid:${esc(b.id)}">Mark paid</button>`:""}</li>`;}).join("");
  const any=ids.filter(x=>rec[x].some(v=>v)).sort((a,b)=>(rec[b][0]-rec[b][1])-(rec[a][0]-rec[a][1])||rec[b][0]-rec[a][0]);
  const tbl=any.length?`<div class="scroll"><table class="lg antable bt-rec"><thead><tr><th class="nm">Team</th><th>W</th><th>L</th><th>Push</th><th>Owes</th></tr></thead><tbody>${any.map((x,i)=>`<tr class="${x===me?"me":""}"><td class="nm">${i===0&&rec[x][0]>rec[x][1]?"👑 ":""}${esc(teamName(x))}</td><td class="num">${rec[x][0]}</td><td class="num">${rec[x][1]}</td><td class="num">${rec[x][2]}</td><td class="num">${owed.filter(b=>{const w=betSide(b,b.res);return w!==x&&(tnum(b.from)===x||tnum(b.to)===x);}).length||""}</td></tr>`).join("")}</tbody></table></div>`:"";
  return sec("Who owes who",owed.length?`${owed.length} unpaid · tap Mark paid once it's settled up`:"Nobody owes anybody right now",(rows?`<ul class="bt-led">${rows}</ul>`:`<p class="empty">Settled bets you haven't paid show up here.</p>`)+tbl);}

function betsView(){if(!L||!Object.keys(TEAMS).length)return sec("Side bets","",`<p class="empty">Side bets open once rosters exist.</p>`);
  const me=betMe(),inv=x=>tnum(x.from)===me||tnum(x.to)===me;
  const ask=BET_L.filter(b=>b.status==="open"&&tnum(b.to)===me),wait=BET_L.filter(b=>b.status==="open"&&tnum(b.from)===me);
  const live=BET_L.filter(b=>b.status==="live").sort((a,b)=>inv(b)-inv(a)||betEndN(a)-betEndN(b));
  const others=BET_L.filter(b=>b.status==="open"&&!inv(b));
  const done=BET_L.filter(b=>b.status==="done").sort((a,b)=>(b.settledAt||0)-(a.settledAt||0));
  const off=BET_L.filter(b=>["declined","cancelled","expired","void"].includes(b.status)&&inv(b)).slice(0,8);
  const rec=[0,0];done.forEach(b=>{if(!inv(b)||b.res==="push")return;betSide(b,b.res)===me?rec[0]++:rec[1]++;});
  const sum=me?`${esc(teamName(me))} · bet record ${rec[0]}-${rec[1]}${ask.length?` · <b class="bt-new">${ask.length} waiting on you</b>`:""}`:"Log in to make or accept a bet";
  const top=sec("Side bets",sum,`<p class="bt-intro">Bet a friend on your matchup, one category, a player duel or the final standings. The app keeps score live and settles it the moment the matchup is final, then posts it in league chat.</p>`);
  let h=top;
  if(ask.length)h+=sec("Needs your answer",`${ask.length} offer${ask.length===1?"":"s"} · accept or pass`,betList(ask));
  h+=betForm();
  if(wait.length)h+=sec("Waiting on them",`${wait.length} offer${wait.length===1?"":"s"} sent`,betList(wait));
  h+=sec("Live bets",live.length?`${live.length} on the board · live scores from the box scores`:"Nothing on the board",live.length?betList(live):`<p class="empty">No bets are on right now. Make one above.</p>`);
  if(others.length)h+=sec("Open offers around the league",`${others.length} waiting to be accepted`,betList(others));
  h+=betLedger();
  if(done.length)h+=sec("Settled",`${done.length} bet${done.length===1?"":"s"} this season · newest first`,betList(done.slice(0,20)));
  if(off.length)h+=sec("Didn't happen","Passed, taken back or expired",betList(off));
  return h;}

// Fun › Side bets
{const _fv=funView;funView=function(){return SUB.pickem==="bets"?betsView():_fv();};}

// chat: bet messages show as a card with Accept / Pass, like trade offers
{const _tm=tradeMsgHtml;tradeMsgHtml=function(m,ms){if(!m.bet)return _tm(m,ms);const b=BET_L.find(x=>x.id===m.bet);if(!b)return null;
  const [hd]=m.text.split("\n"),latest=ms.filter(x=>x.bet===m.bet).pop()===m,me=betMe(),cm=isCommish();
  const acts=latest&&b.status==="open"&&betCanWrite()&&(me===tnum(b.to)||cm)?`<div class="tacts"><button class="btn sm" data-bet="accept:${esc(b.id)}">Accept</button><button class="btn sm ghost" data-bet="decline:${esc(b.id)}">Pass</button></div>`:"";
  return `<div class="msg sys tmsg"><div class="tcard"><b class="thd">${esc(hd)}</b><p class="bt-cx">${esc(betText(b))}</p><p class="bt-cx muted">${b.stake?`Loser owes ${esc(b.stake)}`:"Bragging rights only"}</p>${acts}</div><span class="mtime">${new Date(m.at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})} · <button class="chlink" data-betgo="1">Open Side bets</button></span></div>`;};}

// dashboard widget
DW.bt={name:"Side bets",desc:"Bets you've made with other managers: offers waiting on you (accept right here), live scores on the ones that are on, and who owes who.",s:"w",
  view(w,T){const inv=b=>tnum(b.from)===T||tnum(b.to)===T,ask=BET_L.filter(b=>b.status==="open"&&tnum(b.to)===T),live=BET_L.filter(b=>b.status==="live"&&inv(b));
    const owe=BET_L.filter(b=>b.status==="done"&&b.res!=="push"&&!b.paid&&b.stake&&inv(b));
    let h="";if(ask.length)h+=`<p class="dsm"><b class="bt-new">${ask.length} bet${ask.length===1?"":"s"} waiting on you</b></p>`+betList(ask.slice(0,2),{short:1});
    if(live.length)h+=betList(live.slice(0,3),{short:1});
    if(owe.length){const o=owe.filter(b=>betSide(b,b.res)!==T).length,g=owe.length-o;h+=`<p class="dsm muted">${o?`You owe ${o}`:""}${o&&g?" · ":""}${g?`${g} owe${g===1?"s":""} you`:""}</p>`;}
    if(!h)h=dashEmpty("No side bets on. Challenge someone and the app settles it for you.");
    return h+dashGo("pickem","bets","Side bets");}};

// ---- events
document.addEventListener("change",e=>{const s=e.target.closest("[data-bf]");if(!s)return;const k=s.dataset.bf;BF[k]=k==="o"||k==="n"?+s.value:s.value;renderRosters();});
document.addEventListener("input",e=>{const s=e.target.closest("[data-bfs]");if(!s)return;BF.s=s.value;
  document.querySelectorAll("[data-bfstake]").forEach(c=>c.classList.toggle("on",c.dataset.bfstake===BF.s));
  const p=document.querySelector(".bt-pv .muted");if(p){const t=p.textContent.split(" · ").slice(1).join(" · ");p.textContent=(BF.s?`Loser owes ${BF.s}`:"No stakes yet: bragging rights only")+(t?` · ${t}`:"");}});
document.addEventListener("click",e=>{const t=e.target.closest("[data-bet],[data-betoffer],[data-bfk],[data-bfstake],[data-betgo]");if(!t)return;
  if(typeof DASH_EDIT!=="undefined"&&DASH_EDIT&&t.closest(".dash"))return;e.preventDefault();const d=t.dataset;
  if(d.bfk){BF.k=d.bfk;return renderRosters();}
  if(d.bfstake!=null){BF.s=BF.s===d.bfstake?"":d.bfstake;return renderRosters();}
  if(d.betgo){if(PHONE()){CHAT_OPEN=false;renderChat();}return setNav("pickem","bets");}
  if(d.betoffer!=null){t.disabled=true;return betOffer().finally(()=>{t.disabled=false;});}
  const [a,...r]=d.bet.split(":");t.disabled=true;betAct(a,r.join(":")).finally(()=>{t.disabled=false;});});

{const s=document.createElement("style");s.textContent=`
.bt-intro{margin:0;padding:10px 14px 14px;color:var(--muted);font-size:.86rem;line-height:1.45}
.bt-new{color:var(--accent)}
.bt-l{list-style:none;margin:0;padding:0}
.bt-card{padding:12px 14px;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:6px}
.bt-card:last-child{border-bottom:0}
.bt-card.mine{background:linear-gradient(90deg,var(--accent-wash),transparent 60%)}
.bt-top{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;font-weight:700;color:var(--muted)}
.bt-st{text-transform:none;letter-spacing:0;font-size:.76rem;padding:2px 8px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);white-space:nowrap}
.bt-st.live{color:var(--win);border-color:var(--win)}
.bt-st.won{background:var(--win-wash);color:var(--win);border-color:transparent}
.bt-st.op{background:var(--warn-wash);color:var(--warn);border-color:transparent}
.bt-st.off{color:var(--muted)}
.bt-sb{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:10px;align-items:center}
.bt-t{display:flex;flex-direction:column;min-width:0}.bt-t.r{text-align:right}
.bt-t b{font-family:var(--f-display);font-size:.98rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bt-t small{color:var(--muted);font-size:.74rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bt-t.me b{color:var(--accent)}
.bt-sc{display:flex;gap:8px;align-items:baseline;font-family:var(--f-display)}
.bt-sc b{font-size:1.35rem;color:var(--muted)}.bt-sc b.up{color:var(--ink)}
.bt-sc i{font-style:normal;color:var(--faint);font-size:.8rem}
.bt-tx{margin:0;font-size:.86rem}
.bt-stake{margin:0;font-size:.82rem;color:var(--muted)}.bt-stake b{color:var(--ink)}
.bt-acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.s-declined,.s-cancelled,.s-expired,.s-void{opacity:.65}
.bt-seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;flex-wrap:wrap}
.bt-seg button{font:inherit;font-size:.84rem;font-weight:600;text-transform:none;letter-spacing:0;border:0;background:var(--bg);color:var(--ink);padding:7px 12px;cursor:pointer}
.bt-seg button+button{border-left:1px solid var(--line)}
.bt-seg button.on{background:var(--accent);color:#fff}
.bt-stk{flex:1 1 220px}.bt-stk input{width:100%;box-sizing:border-box}
.bt-chips{display:flex;gap:6px;flex-wrap:wrap;padding:4px 14px 10px}
.bt-chips .chip{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:5px 11px;font:inherit;font-size:.78rem;font-weight:600;cursor:pointer}
.bt-chips .chip.on{background:var(--accent-wash);border-color:var(--accent);color:var(--accent)}
.bt-pv{margin:0 14px 14px;padding:12px;border:1px dashed var(--line);border-radius:12px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.bt-pv p{margin:0;font-size:.88rem}
.bt-led{list-style:none;margin:0;padding:0}
.bt-led li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;padding:10px 14px;border-bottom:1px solid var(--line);align-items:center}
.bt-led li>small{grid-column:1}.bt-led li>button{grid-column:2;grid-row:1/3}
.bt-led .bt-what{grid-column:1;font-size:.84rem}
.bt-led li.bt-owe{background:var(--loss-wash)}.bt-led li.bt-get{background:var(--win-wash)}
.bt-rec tr.me td{font-weight:700}
.bt-cx{margin:4px 0 0;font-size:.84rem;white-space:normal}
.dash .bt-card{padding:8px 0}
.dash .bt-sc b{font-size:1.1rem}
@media (max-width:640px){.bt-card{padding:10px}.bt-kinds,.bt-stk{grid-column:1/-1}.bt-seg{display:grid;grid-template-columns:1fr 1fr}.bt-seg button+button{border-left:0}.bt-seg button{border-top:1px solid var(--line)}.bt-seg button:nth-child(-n+2){border-top:0}.bt-seg button:nth-child(even){border-left:1px solid var(--line)}.bt-chips{padding:4px 10px 10px}.bt-pv{margin:0 10px 12px}}
`;document.head.appendChild(s);}
