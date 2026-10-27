
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
const tradeState=t=>t.reverses?"Reversal":t.status==="countered"?"Countered":t.status==="proposed"?`Waiting on ${teamName(t.to)}`:t.status==="review"?`League vote · ends in ${untilTxt(t.reviewEnds)}`:
  t.status==="accepted"?(t.resolved==="commish"?"Approved by the commissioner":t.resolved==="vote"?"Passed by league vote":"Went through"):t.status==="vetoed"?"Vetoed":t.status==="rejected"?"Rejected":t.status==="cancelled"?"Cancelled":t.status==="failed"?"Didn't go through":t.status;
function tradeMsgActs(t){
  const me=myTeamNum(),cm=isCommish(),b=(cls,a,l)=>`<button class="btn ${cls} sm" data-trv="${a}:${esc(t.id)}">${l}</button>`;if(WRITE_BLOCKED)return "";
  if(t.status==="proposed")return (tnum(t.to)===me?b("good","accept","Accept")+`<button class="btn sm" data-tcounter="${esc(t.id)}">Counter</button>`+b("danger","reject","Reject"):"")+(tnum(t.from)===me?b("ghost","cancel","Cancel offer"):"")+(cm?b("ghost","approve","Approve now")+b("ghost","veto","Veto"):"");
  if(t.status==="review"){const y=tally(t),party=y.parties.includes(me);
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
