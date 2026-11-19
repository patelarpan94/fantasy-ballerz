/* ============================================================================
   ASK CLAUDE EVERYWHERE (2.87, 2026-11-19). Arp: "make this more general ... I want
   it to work throughout the app" and "it should compare all the players we can
   pickup and suggest based on what it thinks. the more data the better".
   - A ✳ button on every screen (above the chat button) and on every player card.
   - It opens an Ask Claude sheet: what Claude will see, suggested questions for the
     screen you're on, your own question, Ask Claude ↗ and Copy prompt.
   - Every prompt carries the league rules, your matchup by category (now, projected,
     chance), your roster, EVERY free agent with a game left this matchup (projection,
     season, last 14, last 7, games this week and next, % rostered on ESPN, injury
     note) and the opponent's roster with stat lines. Then what's on screen: the
     planner's moves (dashboard), one player in full (player card), the standings
     (League), or every team's roster (trades).
   - A big prompt doesn't fit in a link, so it's copied and Claude opens on a new
     chat: paste it. Small ones open filled in. Nothing paid, no server change,
     no passcodes; each friend uses their own Claude account.
   ============================================================================ */
let ASKX={k:"screen",n:null};
const askT=()=>typeof dashT==="function"?dashT():myTeamNum();
const askNext=()=>{const w=weekOf(TODAY),n=WEEKS.find(x=>x[0]===w[0]+1);if(!n)return [];const a=[];for(let sp=n[1];sp<=n[2];sp++)a.push(sp);return a;};
const askGN=(t,days)=>days.filter(sp=>gameOn(t,sp)).length;
const askOwn=n=>{const o=typeof ownOf==="function"?ownOf(n):null;return o?` · ${Math.round(o[0])}% rostered${o[1]?` (${o[1]>0?"+":""}${(Math.round(o[1]*10)/10)} wk)`:""}`:"";};
const askInj=n=>{const ij=typeof injOf==="function"?injOf(n):null,s=INJ&&INJ[n];if(!ij||!s||s==="ACTIVE")return askStatus(n);
  return ` [${s==="DAY_TO_DAY"?"day-to-day":s}${ij.t?`, ${ij.t}`:""}${ij.r?`, back ~${ij.r}`:""}${ij.c?`: ${String(ij.c).slice(0,140)}`:""}]`;};
// one player, every number we have: ESPN projection, season, last 14, last 7, games this matchup and next
function askPl(p,days,nx,extra){const D=DIR[p.n]||{},s=recentPG(p.n,400),l=recentPG(p.n,14),l7=recentPG(p.n,7),pj=pgLine(D.pj),g=askDays(p.t||D.t,days);
  return `- ${p.n} (${p.t||D.t}, ${askPos(p.el&&p.el.length?p.el:D.el)}${extra||""})${askInj(p.n)}: ${askG(g)}${nx.length?`, next wk ${askGN(p.t||D.t,nx)}g`:""}${askOwn(p.n)} | Proj ${askLine(pj)} | Season${s?` ${s.g}gp`:""} ${askLine(s&&s.pg)} | L14 ${askLine(l&&l.pg)} | L7 ${askLine(l7&&l7.pg)}`;}

function askBase(T,big,noFA){const opp=dOpp(T),days=DAYS.filter(sp=>sp>=TODAY),nx=askNext(),out=[];
  const lim=typeof addLimitFor==="function"?addLimitFor(TODAY):0,used=typeof plUsedWk==="function"?plUsedWk(T):0,cap=DPL&&DPL.cap!=null&&DPL_K&&DPL_K.startsWith(T+":")?DPL.cap:null;
  const limN=lim||(cap!=null?used+cap:typeof PL_MAX!=="undefined"?PL_MAX:7);
  const pm=typeof posMaxL==="function"?posMaxL():{},pmTxt=Object.entries(pm).map(([k,v])=>`${k} max ${v}`).join(", ");
  out.push(`You are my fantasy basketball advisor for an ESPN head-to-head categories league. Below is live data from our league app (pulled ${fmtET(Date.now())}). Use all of it: compare every option, weigh the categories I can still win or lose, games left, recent form and injuries, then give me a clear recommendation with your reasoning. Name players and days. If you think the app's own suggestions are wrong, say so and why.`);
  out.push(`\nLEAGUE RULES\n- ${Object.keys(TEAMS).length} teams. Categories (${CATS.length}): ${CATS.map(c=>c[0]).join(", ")}. Each category won counts as a win in the weekly matchup.\n- Starting lineup: ${LINEUP.map(s=>SLOT[s]).join(", ")}. Bench ${CAP[12]||0}, IR ${CAP[13]||0}. Roster max ${ROSTER_MAX} = ${typeof activeMax==="function"?activeMax():ROSTER_MAX} active (non-IR) spots + ${CAP[13]||0} IR slots. IR slots are separate: only players with OUT status can sit there, and dropping a player who is on IR does NOT open an active spot for a pickup. A pickup needs an open ACTIVE spot, so if my active spots are full I must drop an active (non-IR) player.${pmTxt?`\n- Position limit on the roster: ${pmTxt} (by main position, IR not counted).`:""}\n- Pickup limit: ${limN} per matchup${L.addMode==="mday"?" (1 per day of the matchup, usable on any day)":""}. I've used ${used} this matchup, ${Math.max(0,limN-used)} left.\n- Free agents added before the day's first tip-off play that same day${typeof plTipTxt==="function"&&plTipTxt()?` (first tip today ${plTipTxt()})`:""}. Rosters lock at the first game of each day.\n- Waivers: a dropped player is on waivers for 1 day; claims clear at 3 AM ET. A player on waivers can only be claimed.\n- A player picked up can't be dropped the same day.`);
  out.push(`\nSTAT LINES are per game, numbers in this order: ${askCols()}. Proj = ESPN projection, Season (gp = games played), L14/L7 = last 14/7 days. "2g Fri,Sun" = games left this matchup, "next wk 4g" = games next matchup.`);
  if(opp){const a=fcProj(T),b=fcProj(opp),wk=weekOf(TODAY);let wp=null;try{wp=winProb(a,b);}catch(e){}
    out.push(`\nMATCHUP: Week ${wk[0]}, ${askDayNm(wk[1])} to ${askDayNm(wk[2])}. Me: ${TEAMS[T].name} vs ${TEAMS[opp].name}. Days left including today: ${days.length}${days.length?` (${days.map(askDayNm).join(", ")})`:""}.`);
    out.push(`By category (me vs them): now | projected final if everyone plays to projection | my chance to win it`);
    CATS.forEach(c=>{const f=c[1]==="pct"?(v=>v.toFixed(3).replace(/^0/,"")):askN;let ch="";try{ch=typeof wpCat==="function"?dPct(wpCat(a,b,c))+"%":"";}catch(e){}
      out.push(`- ${c[0]}: ${f(val(a.now,c))} vs ${f(val(b.now,c))} | ${f(val(a.fin,c))} vs ${f(val(b.fin,c))} | ${ch}`);});
    if(wp!=null)out.push(`Chance to win the matchup: ${dPct(wp)}%. Record so far: ${STAND[T]?STAND[T].rec.join("-"):"?"} (W-L-T in categories).`);}
  else out.push(`\nNo matchup this week.`);
  {const me=dNowP(T),irN=me.filter(p=>slotOn(p,TODAY)===13).length,aMax=typeof activeMax==="function"?activeMax():ROSTER_MAX,open=typeof plOpen==="function"?plOpen(T):Math.max(0,aMax-(me.length-irN));
    out.push(`\nMY ROSTER (${TEAMS[T].name}): ${me.length-irN} of ${aMax} active spots used, ${irN} of ${CAP[13]||0} IR slots used. Open active spots for a pickup right now: ${open}${open?"":" (every pickup needs a drop of an active player)"}.`);}
  const dl=new Set(DPL&&DPL.dl||[]);
  dNowP(T).forEach(p=>{const sl=slotOn(p,TODAY);out.push(askPl(p,days,nx,sl===13?`, on IR: does not use an active spot, dropping him does not open one`:`, today ${SLOT[sl]||"BE"}${dl.has(p.n)?", I'm willing to drop":""}`));});
  if(opp){out.push(`\nOPPONENT ROSTER (${TEAMS[opp].name})`);dNowP(opp).forEach(p=>out.push(askPl(p,days,nx,slotOn(p,TODAY)===13?", IR":"")));}
  if(!noFA)out.push(...askFATxt(big));
  return out;}


// every free agent with a game left this matchup (or next week once this one is over), best first
function askFATxt(big){const days=DAYS.filter(sp=>sp>=TODAY),nx=askNext(),out=[];
  const pool=days.length?days:nx;
  const fa=Object.values(DIR).filter(D=>D.t&&D.t!=="FA"&&!ownerNow(D.n)&&(!INJ||INJ[D.n]!=="OUT")&&pool.some(sp=>gameOn(D.t,sp))).map(D=>{const s=recentPG(D.n,400),pj=pgLine(D.pj)||(s&&s.pg);return pj?{D,z:zOf(pj)}:null;}).filter(Boolean).sort((a,b)=>b.z-a.z).slice(0,big?80:40);
  if(fa.length){out.push(`\nFREE AGENTS WITH GAMES LEFT (${fa.length}, best projection first; healthy or day-to-day)`);
    fa.forEach(({D})=>{const wc=typeof wvClear==="function"?wvClear(D.n):0;out.push(askPl({n:D.n,t:D.t,el:D.el},days,nx,wc?`, on waivers, claim clears ${fmtET(wc).replace(/^(\w+), \w+ \d+, /,"$1 ")}`:""));});}
  return out;}
function askPlanTxt(r){const out=[];if(!r||r.done||!r.opp)return out;
  out.push(`\nTHE APP'S WIN-THE-WEEK PLANNER (projection model, ${r.w0!=null?dPct(r.w0)+"%":"?"} win with no moves → ${r.w1!=null?dPct(r.w1)+"%":"?"} with its moves)`);
  const st=r.strat||[],nm=k=>st.filter(x=>x.eff===k).map(x=>x.c[0]);if(st.length)out.push(`Its strategy: target ${nm("t").join(", ")||"none"}; punt ${nm("p").join(", ")||"none"}.`);
  if(r.moves&&r.moves.length)r.moves.forEach((m,i)=>{out.push(`${i+1}. ${m.x.w?"Claim":"Add"} ${m.x.n} (${m.x.t})${m.drop?`, drop ${m.drop}`:", into an open spot"}, on ${askDayNm(plActDay(m))}; plays ${askG(m.games)}; helps ${m.dc.slice(0,4).map(x=>`${x.c[0]} +${dPct(x.d)}%`).join(", ")||"little"}.`);
    if(m.alts&&m.alts.length)out.push(`   Close alternatives: ${m.alts.map(a=>`${a.x.n} (${a.games.length}g, ${a.d>=0?"+":""}${a.d.toFixed(2)} expected cats vs the pick)`).join("; ")}.`);});
  else out.push(`It found no pickup that raises my expected categories with my settings${r.cap?"":" (no pickups left)"}.`);
  return out;}

function askPlayerTxt(n){const D=DIR[n];if(!D)return [];const o=ownerNow(n),days=DAYS.filter(sp=>sp>=TODAY),nx=askNext(),out=[`\nTHE PLAYER I'M LOOKING AT: ${n} (${o&&TEAMS[o]?"on "+TEAMS[o].name:onWaivers(n)?"on waivers":"free agent"})`];
  out.push(askPl({n,t:D.t,el:D.el},days,nx,""));
  const gl=DAYLINES[n]||{},last=Object.keys(gl).map(Number).filter(sp=>sp<=TODAY).sort((a,b)=>b-a).slice(0,8);
  if(last.length)out.push(`Last ${last.length} games (newest first): `+last.map(sp=>`${dow(sp).slice(0,3)} ${dateOf(sp).getMonth()+1}/${dateOf(sp).getDate()}: ${askLine(gl[sp])}`).join(" ; "));
  const nw=typeof newsFor==="function"?newsFor(n).slice(0,4):[];if(nw.length)out.push(`Recent news: `+nw.map(a=>`${a.h}${a.d?` (${String(a.d).slice(0,200)})`:""}`).join(" | "));
  return out;}

function askStandTxt(){const out=[`\nSTANDINGS (category W-L-T, best first)`];try{standOrder().forEach((id,i)=>out.push(`${i+1}. ${TEAMS[id].name} ${STAND[id].rec.join("-")}`));}catch(e){}return out;}
function askTeamsTxt(T){const out=[`\nEVERY OTHER TEAM'S ROSTER (season per game)`];const days=DAYS.filter(sp=>sp>=TODAY);
  Object.keys(TEAMS).map(Number).filter(id=>id!==T).forEach(id=>{out.push(`${TEAMS[id].name} (${STAND[id]?STAND[id].rec.join("-"):""}):`);dNowP(id).forEach(p=>{const s=recentPG(p.n,400);out.push(`  ${p.n} (${p.t}, ${askPos(p.el&&p.el.length?p.el:DIR[p.n]&&DIR[p.n].el)})${askStatus(p.n)} ${askLine(s&&s.pg)}`);});});
  return out;}

// what's on screen decides the extra data and the suggested questions
function askCtx(){const x=ASKX;if(x.k==="player"&&x.n)return {k:"player",n:x.n,lab:`Player: ${x.n}`};if(x.k==="plan")return {k:"plan",lab:"Win-the-week planner"};
  const s=SUB[nav];if(nav==="dash")return {k:"plan",lab:"Win-the-week planner"};
  if((nav==="league"&&s==="trades")||(nav==="analytics"&&(s==="tgt"||s==="pkg")))return {k:"trade",lab:"Every team's roster (trades)"};
  if(nav==="league")return {k:"stand",lab:"Standings"};if(nav==="players")return {k:"fa",lab:"All free agents"};
  return {k:"screen",lab:""};}
const ASK_SUG={
  plan:["Who should I pick up and drop, and on which day?","Is the planner's pick right, or is someone else better for the categories I can still win?","Which categories should I punt or target this week?"],
  player:["Should I pick him up? Who would you drop for him?","Is he worth holding, or should I drop him?","How does he compare to the best free agents for my team?"],
  trade:["Which trade would help my team most? Suggest one that's fair for both sides.","Which of my players are sell-high or buy-low right now?","What does my team need most, and who has it?"],
  stand:["What do I need to do to make the playoffs?","Which teams are strongest in my weak categories?","How is my team built compared to the top teams?"],
  fa:["Who are the best 5 free agents for my team right now, and why?","Who should I stream this week for the most games?","Which free agent is the best long-term hold?"],
  screen:["Who should I pick up and drop this week?","Which categories can I still win this matchup?","How should I set my lineup the rest of this week?"]};

function askFull(T,q){const c=askCtx(),out=askBase(T,c.k==="fa"||c.k==="plan");
  if(c.k==="plan"){const r=DPL&&DPL_K&&DPL_K.startsWith(T+":")?DPL:null;out.push(...askPlanTxt(r));}
  if(c.k==="player")out.push(...askPlayerTxt(c.n));
  if(c.k==="stand")out.push(...askStandTxt());
  if(c.k==="trade"){out.push(...askStandTxt());out.push(...askTeamsTxt(T));}
  out.push(`\nMY QUESTION: ${q&&q.trim()?q.trim():ASK_SUG[c.k][0]}`);
  return out.join("\n");}

function askOpen(ctx){const T=askT();if(!T||!TEAMS[T]){toast("Log in or pick a team first.");return;}ASKX=ctx||{k:"screen"};const c=askCtx();
  const sees=["League rules","Your matchup by category","Your roster","Opponent's roster","Every free agent with games left"];if(c.lab)sees.push(c.lab);
  openSheet("Ask Claude",`<div class="askx">
    <p class="muted dsm">Claude gets live data from the app for ${esc(TEAMS[T].name)} and answers in your own Claude account.</p>
    <div class="askx-see">${sees.map(s=>`<span>${esc(s)}</span>`).join("")}</div>
    <div class="askx-sug">${ASK_SUG[c.k].map(s=>`<button type="button" class="askx-q" data-askfill="${esc(s)}">${esc(s)}</button>`).join("")}</div>
    <textarea class="ask-q" id="askxQ" rows="3" placeholder="Ask anything about your team, or tap a question above.">${esc(ASK_Q)}</textarea>
    <div class="ask-b"><button class="btn sm ask-go" data-askxgo>Ask Claude ↗</button><button class="btn sm ghost" data-askxcp>Copy prompt</button></div>
    <p class="muted dsm askx-n" id="askxN"></p>${typeof Store!=="undefined"&&Store.url&&!Store.local?`
    <details class="askx-con"><summary>Ask Claude without pasting: add the league to Claude (one time)</summary>
    <ol class="dsm"><li>In the Claude app or on claude.ai, open <b>Settings › Connectors</b> (on some plans it's <b>Customize › Connectors</b>).</li><li>Tap <b>Add custom connector</b>. Name: <b>Fantasy Ballerz${/\/uat\//.test(location.pathname)?" UAT":""}</b>. URL: the link below. Leave Advanced settings empty and tap Add.</li><li>In any chat, ask things like "Using Fantasy Ballerz, who should Cloud Team pick up today?" Claude reads the live league data itself.</li></ol>
    <div class="askx-url"><code>${esc(Store.url)}</code><button type="button" class="btn sm ghost" data-askurl="${esc(Store.url)}">Copy link</button></div>
    <p class="muted dsm">Free on every Claude plan (the free plan allows one custom connector). It's read-only: rosters, stats and matchups, no passcodes. The data updates whenever someone in the league has the app open.</p></details>`:""}</div>`);
  try{const p=askFull(T,""),u=new URLSearchParams({q:p}).toString().length+24;$("#askxN").textContent=`About ${Math.round(p.length/100)/10}k characters of data. ${u>ASK_URL_MAX?"That's too long for a link, so Ask Claude copies it and opens a new chat: paste it there.":"Claude opens with it filled in, and it's copied too."}`;}catch(e){console.warn(e);}}

function askSend(p){askCopy(p);const u="https://claude.ai/new?"+new URLSearchParams({q:p}).toString();
  if(u.length<=ASK_URL_MAX){window.open(u,"_blank","noopener");toast("Opening Claude. The prompt is copied too.");}
  else{window.open("https://claude.ai/new","_blank","noopener");toast("Prompt copied. Paste it into the new Claude chat.");}}
// the planner's own button now sends the full prompt too
askBuild=function(T){ASKX={k:"plan"};const q=(document.querySelector("[data-askq]")||{}).value;ASK_Q=q||"";try{return askFull(T,q);}catch(e){console.warn(e);return "";}};

document.addEventListener("click",e=>{let b;
  if((b=e.target.closest("#askFab"))){e.stopPropagation();askOpen({k:"screen"});return;}
  if((b=e.target.closest("[data-askpl]"))){e.stopPropagation();askOpen({k:"player",n:b.dataset.askpl});return;}
  if((b=e.target.closest("[data-askurl]"))){e.stopPropagation();toast(askCopy(b.dataset.askurl)?"Link copied. Paste it into Claude's Add custom connector.":"Couldn't copy.");return;}
  if((b=e.target.closest("[data-askfill]"))){e.stopPropagation();const t=$("#askxQ");if(t){t.value=b.dataset.askfill;ASK_Q=t.value;t.focus();}return;}
  if((b=e.target.closest("[data-askxgo],[data-askxcp]"))){e.stopPropagation();const T=askT(),q=($("#askxQ")||{}).value||"";ASK_Q=q;let p="";try{p=askFull(T,q);}catch(x){console.warn(x);}
    if(!p){toast("Couldn't build the prompt.");return;}
    if(b.dataset.askxgo!=null)askSend(p);else toast(askCopy(p)?"Prompt copied. Paste it into Claude.":"Couldn't copy. Your browser blocked it.");return;}
},true);
document.addEventListener("input",e=>{if(e.target&&e.target.id==="askxQ")ASK_Q=e.target.value;},true);

// ✳ on player cards
{const _pc=playerCard;playerCard=function(n){const r=_pc.apply(this,arguments);try{if(DIR[n]){const a=$("#sheetBody .sheetacts")||$("#sheetBody");if(a&&!a.querySelector("[data-askpl]"))a.insertAdjacentHTML("beforeend",`<button class="btn sm ask-go askx-pc" data-askpl="${esc(n)}">✳ Ask Claude</button>`);}}catch(e){}return r;};}

// ✳ on every screen
{const f=document.createElement("button");f.id="askFab";f.className="askfab";f.type="button";f.setAttribute("aria-label","Ask Claude");f.title="Ask Claude";f.innerHTML=`<span aria-hidden="true">✳</span>`;
  const add=()=>{if(!document.getElementById("askFab"))document.body.appendChild(f);};if(document.body)add();else document.addEventListener("DOMContentLoaded",add);}

{const s=document.createElement("style");s.textContent=`
.askfab{all:unset;cursor:pointer;position:fixed;right:max(20px,env(safe-area-inset-right,0px));bottom:calc(86px + env(safe-area-inset-bottom,0px));z-index:20;width:46px;height:46px;border-radius:50%;background:#d97757;color:#fff;display:grid;place-items:center;font-size:1.45rem;box-shadow:0 6px 18px rgba(15,25,45,.25)}
.askfab:focus-visible{outline:2px solid #d97757;outline-offset:3px}
@media (max-width:760px){.askfab{right:18px;bottom:calc(136px + env(safe-area-inset-bottom,0px));width:44px;height:44px}}
body.hasdock .askfab{bottom:calc(20px + env(safe-area-inset-bottom,0px))}
body.uiedit .askfab{display:none}
.chatpane:not([hidden])~.askfab{display:none}
.askx-see{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.askx-see span{font-size:.72rem;padding:3px 9px;border-radius:99px;background:color-mix(in srgb,#d97757 14%,transparent);color:var(--ink)}
.askx-sug{display:flex;flex-direction:column;gap:6px;margin:10px 0}.askx-q{font:inherit;font-size:.84rem;text-align:left;padding:8px 12px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}.askx-q:hover{border-color:#d97757}
.askx-n{margin-top:8px}.askx-con{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}.askx-con summary{cursor:pointer;font-weight:700;font-size:.85rem;color:#d97757}.askx-con ol{padding-left:18px;margin:8px 0}.askx-url{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.askx-url code{font-size:.66rem;word-break:break-all;flex:1 1 200px;padding:6px 8px;border-radius:8px;background:color-mix(in srgb,var(--muted) 10%,transparent)}.askx-pc{margin-left:6px}
`;document.head.appendChild(s);}
