
/* ============================================================================
   TRADES IN CHAT + TRADE COMPARE (2026-10-22). Trade messages in chat render
   as cards with the trade's live status and the same buttons as League ›
   Transactions (accept, reject, cancel, vote, commissioner approve/veto); only
   the newest message about a trade carries buttons. Every trade card has
   Compare: the players on each side, per game, with side totals and the
   trade check underneath.
   ============================================================================ */
let TCMODE="season";
// per-game line for a player: season so far or ESPN projection
const tcLine=(n,mode)=>{const D=DIR[n];if(!D)return null;return pgLine(mode==="proj"?D.pj:(D.ss&&D.ss[11]?D.ss:null));};
const tcFmt=(v,c)=>v==null?"–":c[1]==="pct"?pct(v):v.toFixed(1);
function tradeCmpHtml(A,B,give,get){
  if(!give.length&&!get.length)return "";
  const mode=TCMODE,sides=[[A,give],[B,get]];
  const tots=sides.map(([,ns])=>{const ls=ns.map(n=>tcLine(n,mode)).filter(Boolean);return ls.length?lineSum(ls):null;});
  const better=c=>{const [a,b]=tots.map(t=>t?val(t,c):null);if(a==null||b==null||Math.abs(a-b)<1e-9)return -1;return a>b?0:1;};
  const row=(n,i,solo)=>{const l=tcLine(n,mode),D=DIR[n];return `<tr><td class="pl"><span class="nmb" role="button" tabindex="0" data-pcard="${esc(n)}">${esc(n)}</span><small>${esc(D?.t||"")}${INJ[n]?` · <span class="badc">${esc(INJ[n])}</span>`:""}</small></td><td class="num">${l?Math.round((mode==="proj"?D.pj:D.ss)[11]):"–"}</td>${CATS.map(c=>`<td class="num${solo&&better(c)===i?" best":""}">${l?tcFmt(val(l,c),c):"–"}</td>`).join("")}</tr>`;};
  const body=sides.map(([T,ns],i)=>`<tr class="tcside"><th colspan="${CATS.length+2}">${esc(teamName(T))} sends</th></tr>${ns.length?ns.map(n=>row(n,i,ns.length===1)).join(""):`<tr><td class="pl muted" colspan="${CATS.length+2}">Nothing</td></tr>`}
    ${ns.length>1?`<tr class="tot"><td class="pl">Total per game</td><td></td>${CATS.map(c=>`<td class="num${better(c)===i?" best":""}">${tots[i]?tcFmt(val(tots[i],c),c):"–"}</td>`).join("")}</tr>`:""}`).join("");
  const wins=[0,1].map(i=>CATS.filter(c=>better(c)===i).length);
  return `<div class="tcmp"><div class="tabs sm" role="group" aria-label="Stats to compare"><button data-tcmode="season" aria-selected="${mode==="season"}">Season per game</button><button data-tcmode="proj" aria-selected="${mode==="proj"}">ESPN projection</button></div>
    <div class="scroll"><table class="tcmpt"><thead><tr><th class="pl">Player</th><th class="num">GP</th>${CATS.map(c=>`<th class="num">${c[0]}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>
    <p class="anote">${tots[0]&&tots[1]?`Per game, <b>${esc(teamName(A))}</b>'s side wins ${wins[0]} categories and <b>${esc(teamName(B))}</b>'s side wins ${wins[1]}. `:""}Better side highlighted in green.</p></div>`;
}
function openTradeCompare(id){
  const t=TXS.find(x=>x.id===id);if(!t)return;
  openSheet("Compare trade",`<div id="tcBox">${tradeCmpHtml(t.from,t.to,t.give,t.get)}</div><p class="flabel">Trade check</p>${tradeImpactHtml(tnum(t.from),tnum(t.to),t.give,t.get)}<div class="sheetacts"><button class="btn" data-sheet="close">Done</button></div>`);
  openTradeCompare.id=id;
}
// the propose sheet shows the same compare above its trade check
{const _ti=tradeImpact;tradeImpact=function(){_ti();const box=document.getElementById("trImpact");if(!box)return;const body=box.closest("#sheetBody")||document;
  const T=actTeam(),O=+(body.querySelector("#trWith")?.value||0);if(!O)return;
  const get=[...body.querySelectorAll('input[name="get"]:checked')].map(i=>i.value),give=[...body.querySelectorAll('input[name="give"]:checked')].map(i=>i.value);
  const h=tradeCmpHtml(T,O,give,get);if(h)box.insertAdjacentHTML("afterbegin",`<p class="flabel">Compare players</p><div id="tcBox">${h}</div>`);openTradeCompare.id=null;};}
document.addEventListener("click",e=>{
  const c=e.target.closest("[data-tcmp]");if(c){e.preventDefault();e.stopPropagation();return openTradeCompare(c.dataset.tcmp);}
  const m=e.target.closest("[data-tcmode]");if(m){e.preventDefault();e.stopPropagation();TCMODE=m.dataset.tcmode;if(openTradeCompare.id)return openTradeCompare(openTradeCompare.id);tradeImpact();}},true);
// ---- chat: trade messages as live cards
const tradeState=t=>t.reverses?"Reversal":t.status==="countered"?"Countered":t.status==="proposed"?`Waiting on ${teamName(t.to)}`:t.status==="review"?`${canVote()?"League vote":"Under review"} · ends in ${untilTxt(t.reviewEnds)}`:
  t.status==="accepted"?(t.resolved==="commish"?"Approved by the commissioner":t.resolved==="vote"?"Passed by league vote":"Went through"):t.status==="vetoed"?"Vetoed":t.status==="rejected"?"Rejected":t.status==="cancelled"?"Cancelled":t.status==="failed"?"Didn't go through":t.status==="expired"?"Expired at the trade deadline":t.status;
function tradeMsgActs(t){
  const me=myTeamNum(),cm=isCommish(),b=(cls,a,l)=>`<button class="btn ${cls} sm" data-trv="${a}:${esc(t.id)}">${l}</button>`;if(WRITE_BLOCKED)return "";
  if(t.status==="proposed")return (tnum(t.to)===me?b("good","accept","Accept")+`<button class="btn sm" data-tcounter="${esc(t.id)}">Counter</button>`+b("danger","reject","Reject"):"")+(tnum(t.from)===me?b("ghost","cancel","Cancel offer"):"")+(cm?b("ghost","approve","Approve now")+b("ghost","veto","Veto"):"");
  if(t.status==="review"){const y=tally(t),party=y.parties.includes(me);
    if(!canVote())return `<span class="muted">Goes through in ${untilTxt(t.reviewEnds)} unless the commissioner vetoes</span>`+(cm?b("ghost","approve","Approve now")+b("ghost","veto","Veto"):"");
    if(y.mode==="veto")return `<div class="tally"><div class="tnums"><span><b class="badc">${y.veto}</b> of ${y.need} vetoes</span><span class="muted">ends in ${untilTxt(t.reviewEnds)}</span></div></div>`+
      (me&&!party?`<span class="vote" role="group" aria-label="Your vote"><button class="vbtn veto${y.mine==="veto"?" on":""}" data-trv="vote-veto:${esc(t.id)}" aria-pressed="${y.mine==="veto"}">${y.mine==="veto"?"Vetoed":"Veto"}</button></span>`:"")+(cm?b("ghost","approve","Approve now")+b("ghost","veto","Veto"):"");
    return `<div class="tally"><div class="tbar" aria-hidden="true"><i class="p" style="width:${Math.round(y.pass/L.teams.length*100)}%"></i><i class="v" style="width:${Math.round(y.veto/L.teams.length*100)}%"></i></div><div class="tnums"><span><b class="okc">${y.pass}</b> pass</span><span><b class="badc">${y.veto}</b> veto</span><span class="muted">${y.need} needed</span></div></div>`+
      (me&&!party?`<span class="vote" role="group" aria-label="Your vote"><button class="vbtn pass${y.mine==="pass"?" on":""}" data-trv="pass:${esc(t.id)}" aria-pressed="${y.mine==="pass"}">Pass</button><button class="vbtn veto${y.mine==="veto"?" on":""}" data-trv="vote-veto:${esc(t.id)}" aria-pressed="${y.mine==="veto"}">Veto</button></span>`:party?`<span class="muted">Your trade · you count as Pass</span>`:"")+(cm?b("ghost","approve","Approve now")+b("ghost","veto","Veto"):"");}
  return "";
}
function tradeMsgHtml(m,ms){
  const t=TXS.find(x=>x.id===m.tx);if(!t)return null;
  const [hd]=m.text.split("\n"),latest=ms.filter(x=>x.tx===m.tx).pop()===m,acts=latest?tradeMsgActs(t):"";
  return `<div class="msg sys tmsg"><div class="tcard"><b class="thd">${esc(hd)}</b>${tradeSides(t)}<div class="tfoot"><span class="tstat ${t.status}">${esc(tradeState(t))}</span><button class="mini-b" data-tcmp="${esc(t.id)}">Compare players</button></div>${acts?`<div class="tacts">${acts}</div>`:""}</div><span class="mtime">${new Date(m.at).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})} · <button class="chlink" data-chgo="trades">Open Trades</button></span></div>`;
}
// trades and votes change underneath an open chat: redraw it with the app
{const _rr=renderRosters;renderRosters=function(){_rr();if(CHAT_OPEN&&CHAT_CH)try{renderChat();}catch(e){}};}

// ---- counter offers: the team that got an offer sends back its own version; the original closes as "countered"
let COUNTER=null;
{const _st=sheetTradeWith;sheetTradeWith=function(O,n){COUNTER=null;return _st(O,n);};}
function sheetCounter(id){
  const t=TXS.find(x=>x.id===id&&x.status==="proposed");if(!t)return toast("This offer is no longer open.");
  const me=myTeamNum();if(tnum(t.to)!==me)return;
  sheetTradeWith(tnum(t.from));COUNTER=id;const body=$("#sheetBody");
  // start from their offer: what they asked of you and what they offered, ready to change
  body.querySelectorAll('input[name="get"]').forEach(i=>i.checked=t.give.includes(i.value));
  body.querySelectorAll('input[name="give"]').forEach(i=>i.checked=t.get.includes(i.value));
  $("#sheetTitle").textContent="Counter offer";const s=body.querySelector('[data-sheet="trade"]');if(s){s.textContent="Send counter";s.disabled=false;}
  const sel=body.querySelector("#trWith");if(sel)sel.disabled=true;
  body.querySelector(".hint")?.insertAdjacentHTML("afterend",`<p class="note info">Change the players, then send. Your counter replaces ${esc(teamName(t.from))}'s offer, and they can accept, reject or counter back.</p>`);
  tradeImpact();
}
document.addEventListener("click",e=>{const c=e.target.closest("[data-tcounter]");if(!c)return;e.preventDefault();e.stopPropagation();if(PHONE()&&CHAT_OPEN){CHAT_OPEN=false;renderChat();}sheetCounter(c.dataset.tcounter);},true);
// ---- chat list: most recent conversation first; teams with no messages yet below
chatList=function(){
  const me=chatMe(),others=["cm",...(L?L.teams.map(t=>t.id):[])].filter(k=>k!==me);
  const row=(ch,label,sub)=>{const ms=chatMsgs(ch),last=ms[ms.length-1],u=chatUnread(ch);
    return `<button class="chrow" data-chat="${esc(ch)}"><span class="chav${ch==="league"?" lg":dmOther(ch)==="cm"?" cm":""}">${ch==="league"?"#":esc(initials(label))}</span><span class="chmid"><b>${esc(label)}</b><span>${last?esc((ch==="league"?chatName(last.from)+": ":last.from===me?"You: ":"")+last.text.split("\n")[0]):esc(sub)}</span></span>${u?`<span class="chbadge">${u}</span>`:last?`<span class="chtime">${chatTime(last.at,true)}</span>`:""}</button>`;};
  const all=[["league","League chat","Everyone in the league"],...others.map(k=>[dmKey(me,k),chatName(k),"Start a conversation"])].map(r=>{const ms=chatMsgs(r[0]);return [...r,ms.length?ms[ms.length-1].at:0];});
  const act=all.filter(r=>r[3]||r[0]==="league").sort((a,b)=>b[3]-a[3]),rest=all.filter(r=>!r[3]&&r[0]!=="league");
  return act.map(r=>row(r[0],r[1],r[2])).join("")+(rest.length?`<div class="chsec">Start a conversation</div>`+rest.map(r=>row(r[0],r[1],r[2])).join(""):"");
};

// ---- League › Settings › Trades (2.13): review, veto votes and the trade deadline, defaults copy the ESPN league
const TREVIEWS=[["veto","Veto votes (ESPN style): enough vetoes stop it"],["majority","League vote: a majority either way settles it early"],["commish","Commissioner only: goes through unless the commissioner vetoes"],["none","No review: goes through as soon as it's accepted"]];
const etInput=ms=>{if(!ms)return "";const p={};new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(ms)).forEach(x=>p[x.type]=x.value);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;};
const etFromInput=v=>{const m=/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(v||"");return m?etMs(+m[1],+m[2]-1,+m[3],+m[4])+(+m[5])*60e3:null;};
{const _sv=setupView;setupView=function(){const h=_sv(),F=FORM;if(!F)return h;const t={...TRADE_DEFAULT,...(F.trades||(SEASON==="2026-27"?{deadline:1803056400000}:{}))},dis=isCommish()?"":"disabled";
  const sec=`<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Trades</h2><span class="hint">Change any time. Trades already under review keep their end time.</span></div><div class="pbody fgrid">
    <div class="field" style="grid-column:1/-1"><label for="fTRev">How trades are reviewed</label><select id="fTRev" ${dis}>${TREVIEWS.map(([k,l])=>`<option value="${k}"${t.review===k?" selected":""}>${l}</option>`).join("")}</select></div>
    ${t.review==="none"?"":`<div class="field"><label for="fTHours">Review period (hours)</label><input type="number" id="fTHours" min="1" max="168" value="${+t.hours||24}" ${dis}></div>`}
    ${t.review==="veto"?`<div class="field"><label for="fTVeto">Veto votes needed</label><input type="number" id="fTVeto" min="1" max="${Math.max(1,F.teams.length-2)}" value="${+t.vetoes||3}" ${dis}><span class="hint">The two teams in the trade can't vote.</span></div>`:""}
    <div class="field" style="grid-column:1/-1"><label for="fTDead">Trade deadline (ET)</label><input type="datetime-local" id="fTDead" value="${etInput(t.deadline)}" ${dis}><span class="hint">Leave empty for no deadline. After it, no new offers, and open offers expire.</span></div>
  </div></section>`;
  return h.replace('<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Draft</h2>',sec+'<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Draft</h2>');};
 const _si=setupInput;setupInput=function(e){const F=FORM;if(F&&e.id?.startsWith("fT")&&["fTRev","fTHours","fTVeto","fTDead"].includes(e.id)){
   const t=F.trades={...TRADE_DEFAULT,...(F.trades||(SEASON==="2026-27"?{deadline:1803056400000}:{}))};
   if(e.id==="fTRev")t.review=e.value;else if(e.id==="fTHours")t.hours=Math.max(1,Math.min(168,Math.round(+e.value||24)));
   else if(e.id==="fTVeto")t.vetoes=Math.max(1,Math.min(Math.max(1,F.teams.length-2),Math.round(+e.value||3)));else if(e.id==="fTDead")t.deadline=etFromInput(e.value);
   FORM_DIRTY=true;document.querySelectorAll('[data-sact="save"],[data-sact="discard"]').forEach(b=>b.disabled=false);const sh=document.querySelector(".savebar .hint");if(sh)sh.textContent="Unsaved changes";
   if(e.tagName==="SELECT")renderRosters();return true;}return _si(e);};}
// a new season keeps the trade rules but not the old deadline
{const _nl=newLeague;newLeague=function(s,prev){const o=_nl(s,prev);if(prev?.trades)o.trades={...prev.trades,deadline:null};return o;};}

// ---- Match ESPN (2.14): the commissioner copies the ESPN league's waiver, pickup and trade rules into Settings once, after seeing what changes
const ESPN_DOW={SUNDAY:0,MONDAY:1,TUESDAY:2,WEDNESDAY:3,THURSDAY:4,FRIDAY:5,SATURDAY:6};
function espnRules(st){const a=st.acquisitionSettings||{},t=st.tradeSettings||{},out={};
  out.waivers={type:a.isUsingAcquisitionBudget?"faab":"rolling",hours:+a.waiverHours||0,days:(a.waiverProcessDays||[]).map(d=>ESPN_DOW[d]).filter(d=>d!=null).sort(),hour:+a.waiverProcessHour||0,budget:+a.acquisitionBudget||100,minBid:+a.minimumBid||0};
  if(!out.waivers.days.length)out.waivers.days=[0,1,2,3,4,5,6];
  const ml=+a.matchupAcquisitionLimit,sl=+a.acquisitionLimit;out.addLimit=ml>0?ml:sl>0?sl:0;out.addMode=ml>0?"matchup":sl>0?"season":"matchup";
  const vv=+t.vetoVotesRequired,rh=+t.revisionHours;
  out.trades={review:!(rh>0)?"none":vv>0?"veto":"commish",hours:rh>0?rh:24,vetoes:vv>0?vv:3,deadline:+t.deadlineDate||null};
  return out;}
const wDesc=w=>`${{rolling:"Rolling",standings:"Reverse standings",faab:"Bidding"}[w.type]||w.type}, ${w.days.length===7?"every day":w.days.map(d=>DOW_FULL[d].slice(0,3)).join("/")} ${fmtHour(w.hour)} ET, ${w.hours}h wait${w.type==="faab"?`, $${w.budget} budget, $${w.minBid} min`:""}`;
const tDesc=t=>`${{veto:`${t.vetoes} vetoes`,majority:"league vote",commish:"commissioner",none:"no review"}[t.review]}${t.review==="none"?"":`, ${t.hours}h`}, deadline ${t.deadline?fmtDeadline(t.deadline):"none"}`;
const aDesc=(n,m)=>n?`${n} per ${{day:"day",season:"season"}[m]||"matchup"}`:"No limit";
let ESPN_RULES=null;
async function matchEspn(){const F=FORM,E=(F&&F.espn)||L.espn;if(!F||!E?.league)return toast("This league isn't linked to an ESPN league.");
  toast("Loading ESPN's rules…");
  let st;try{const r=await fetch(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${E.season||2027}/segments/0/leagues/${E.league}?view=mSettings`);st=(await r.json()).settings;}catch(e){}
  if(!st)return toast("Couldn't reach ESPN. Try again in a minute.");
  const x=espnRules(st);ESPN_RULES=x;const w0={...WAIVER_DEFAULT,...(F.waivers||{})},t0={...TRADE_DEFAULT,...(F.trades||(SEASON==="2026-27"?{deadline:1803056400000}:{}))};
  const rows=[["Waivers",wDesc(w0),wDesc({...w0,...x.waivers})],["Pickup limit",aDesc(+F.addLimit||0,F.addMode),aDesc(x.addLimit,x.addMode)],["Trades",tDesc(t0),tDesc({...t0,...x.trades})]];
  const diff=rows.filter(r=>r[1]!==r[2]);
  openSheet("Match ESPN",`<p>${diff.length?"These settings would change to match your ESPN league. Nothing is saved until you press Save settings.":"Your settings already match ESPN."}</p>
    <div class="scroll"><table class="txt"><thead><tr><th></th><th>Now</th><th>ESPN</th></tr></thead><tbody>${rows.map(r=>`<tr${r[1]!==r[2]?' class="chg"':""}><td><b>${r[0]}</b></td><td>${esc(r[1])}</td><td>${r[1]!==r[2]?`<b>${esc(r[2])}</b>`:esc(r[2])}</td></tr>`).join("")}</tbody></table></div>
    <div class="sheetacts"><button class="btn ghost" data-sheet="close">${diff.length?"Cancel":"OK"}</button>${diff.length?`<button class="btn good" data-espnapply="1">Use ESPN's rules</button>`:""}</div>`);}
function applyEspn(){const F=FORM,x=ESPN_RULES;if(!F||!x)return;
  F.waivers={...WAIVER_DEFAULT,...(F.waivers||{}),...x.waivers};F.addLimit=x.addLimit;F.addMode=x.addMode;F.trades={...TRADE_DEFAULT,...(F.trades||{}),...x.trades};
  FORM_DIRTY=true;sheet().close();renderRosters();document.querySelectorAll('[data-sact="save"],[data-sact="discard"]').forEach(b=>b.disabled=false);const sh=document.querySelector(".savebar .hint");if(sh)sh.textContent="Unsaved changes";
  toast("ESPN's rules are filled in. Press Save settings to keep them.");}
{const _sv=setupView;setupView=function(){const h=_sv();if(!FORM||!isCommish()||!(FORM.espn||L?.espn)?.league)return h;
  const sec=`<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Match ESPN</h2><span class="hint">Copy the ESPN league's waiver, pickup and trade rules here once</span></div><div class="pbody row" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><span class="hint">Shows what would change first. You can still edit anything after.</span><button class="btn" data-espnmatch="1">Match ESPN rules</button></div></section>`;
  return h.replace('<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Waivers</h2>',sec+'<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Waivers</h2>');};}
document.addEventListener("click",e=>{const b=e.target.closest("[data-espnmatch],[data-espnapply]");if(!b)return;e.preventDefault();e.stopPropagation();if(b.dataset.espnmatch)matchEspn();else applyEspn();},true);
