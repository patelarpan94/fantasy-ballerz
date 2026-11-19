/* ============================================================================
   ASK CLAUDE (2.87, 2026-11-19). Arp: an "Ask Claude" button on the Win-the-week
   planner. A friend asked: "your app tells me to pick up someone, but category
   standings right now tell me otherwise, who should I pick up?"
   - Builds one prompt from what the app already knows: league rules (pickup limit,
     waivers, roster lock, position limits), the matchup score so far and the
     projected final per category with the chance of winning each, your roster with
     games left and per-game stats, the planner's moves and other options, the best
     free agents with games left, and the opponent's roster.
   - Opens Claude with the prompt filled in (claude.ai/new?q=...). Each friend uses
     their own Claude account. No API key, nothing paid, no server change.
   - The prompt is also copied, and a Copy prompt button is there for when the
     prompt is too long for a link: open Claude and paste.
   - Never includes passcodes, logins or anything outside the league's rosters and stats.
   ============================================================================ */
const ASK_URL_MAX=7800; // keep the link under ~8 KB, longer links can fail to open
let ASK_Q="";
const askN=v=>v==null||!isFinite(v)?"-":Math.abs(v)>=100?Math.round(v).toString():(Math.round(v*10)/10).toString();
const askPct=(m,a)=>a?(m/a).toFixed(3).replace(/^0/,""):"-";
const askPos=el=>{const p=[...new Set((el||[]).filter(s=>s<5).map(s=>SLOT[s]))];return p.length?p.join("/"):"UTIL";};
// one stat line in the league's categories, per game
// compact so the whole prompt fits in a link: numbers in the order of askCols(), percentages with makes/attempts
const askCols=()=>CATS.map(c=>c[1]==="pct"?`${c[0]}(made/att)`:c[0]).join(" ")+" MIN";
const askLine=pg=>pg?CATS.map(c=>c[1]==="pct"?`${askPct(pg[c[2]],pg[c[3]])}(${askN(pg[c[2]])}/${askN(pg[c[3]])})`:askN(pg[c[2]])).join(" ")+" "+askN(pg[K.MIN]):"no stats";
const askTot=t=>CATS.map(c=>c[1]==="pct"?`${c[0]} ${askPct(t[c[2]],t[c[3]])}`:`${c[0]} ${askN(t[c[2]])}`).join(", ");
const askDays=(t,days)=>days.filter(sp=>gameOn(t,sp)&&upcoming(t,sp));
const askDayNm=sp=>sp===TODAY?"Today":dow(sp).slice(0,3)+" "+(dateOf(sp).getMonth()+1)+"/"+dateOf(sp).getDate();
const askStatus=n=>{const s=INJ&&INJ[n];return s&&s!=="ACTIVE"?` [${s==="DAY_TO_DAY"?"day-to-day":s}]`:"";};
const askG=g=>`${g.length}g${g.length?" "+g.map(sp=>sp===TODAY?"today":dow(sp).slice(0,3)).join(","):""}`;

function askPrompt(T,r,q){const opp=r.opp,days=r.days,me=TEAMS[T].name,on=TEAMS[opp].name,now=score(T),onow=score(opp);
  const wk=weekOf(TODAY),lim=typeof addLimitFor==="function"?addLimitFor(TODAY):0,used=typeof plUsedWk==="function"?plUsedWk(T):0;
  const pm=typeof posMaxL==="function"?posMaxL():{},pmTxt=Object.entries(pm).map(([k,v])=>`${k} max ${v}`).join(", ");
  const slots=LINEUP.map(s=>SLOT[s]).join(", "),ir=CAP[13]||0,dl=new Set(r.dl||[]);
  const out=[];
  out.push(`You are my fantasy basketball advisor for an ESPN head-to-head categories league. Use the data below from our league app (pulled ${fmtET(Date.now())}). Help me win this matchup. Be specific: name players, days and which categories each move helps or hurts. If you disagree with the app's planner, say why. Keep it short and practical.`);
  out.push(`\nLEAGUE RULES\n- Categories (${CATS.length}): ${CATS.map(c=>c[0]).join(", ")}. Each category won counts as a win.\n- Starting lineup: ${slots}. Bench ${CAP[12]||0}, IR ${ir}. Roster max ${ROSTER_MAX} including IR.${pmTxt?`\n- Position limit on the roster: ${pmTxt} (by main position, IR not counted).`:""}\n- Pickup limit: ${lim||used+Math.max(0,r.cap)} per matchup${L.addMode==="mday"?" (1 per day of the matchup, can be used on any day)":""}. Used ${used}, ${Math.max(0,r.cap)} left.\n- Free agents: added before the day's first tip-off, they play that same day${typeof plTipTxt==="function"&&plTipTxt()?` (first tip today ${plTipTxt()})`:""}. Rosters lock at the first game of each day.\n- Waivers: a dropped player sits on waivers for 1 day, claims clear at 3 AM ET. A player on waivers can only be claimed, not added.\n- A player picked up can't be dropped the same day.`);
  out.push(`\nMATCHUP: Week ${wk[0]}, ${askDayNm(wk[1])} to ${askDayNm(wk[2])}. Me: ${me} vs ${on}. Days left including today: ${days.length} (${days.map(askDayNm).join(", ")}).`);
  out.push(`Score so far by category (me vs them):`);
  CATS.forEach((c,i)=>{const a=val(now,c),b=val(onow,c),pa=val(r.cur.tot,c),pb=val(r.B,c),f=c[1]==="pct"?(v=>v.toFixed(3).replace(/^0/,"")):askN;
    out.push(`- ${c[0]}: now ${f(a)} vs ${f(b)} | projected final, no moves ${f(val(r.b0.tot,c))} vs ${f(pb)}, with planner moves ${f(pa)} vs ${f(pb)} | my chance to win it ${dPct(r.pB[i])}% with no moves, ${dPct(r.pA[i])}% with planner moves`);});
  out.push(`Win chance: ${r.w0!=null?dPct(r.w0)+"%":"?"} with no moves, ${r.w1!=null?dPct(r.w1)+"%":"?"} with the planner's moves.`);
  const strat=r.strat||[],nm=k=>strat.filter(x=>x.eff===k).map(x=>x.c[0]);
  if(strat.length)out.push(`Planner strategy: target ${nm("t").join(", ")||"none"}; punt ${nm("p").join(", ")||"none"}.`);
  out.push(`\nSTAT LINES below are per game, numbers in this order: ${askCols()}. "Season" = this season, "L14" = last 14 days. "3g today,Sat,Sun" = games left this matchup.`);
  out.push(`\nMY ROSTER`);
  dNowP(T).forEach(p=>{const sl=slotOn(p,TODAY),g=askDays(p.t,days),s=recentPG(p.n,400),l=recentPG(p.n,14);
    out.push(`- ${p.n} (${p.t}, ${askPos(p.el&&p.el.length?p.el:DIR[p.n]&&DIR[p.n].el)}, today ${SLOT[sl]||"BE"})${askStatus(p.n)}${dl.has(p.n)?" [I'm willing to drop]":""}: ${askG(g)} | Season ${askLine(s&&s.pg)} | L14 ${askLine(l&&l.pg)}`);});
  if(r.moves&&r.moves.length){out.push(`\nAPP PLANNER'S SUGGESTED MOVES`);
    r.moves.forEach((m,i)=>{out.push(`${i+1}. ${m.x.w?"Claim":"Add"} ${m.x.n} (${m.x.t}, ${askPos(m.x.el)})${m.drop?`, drop ${m.drop}`:", into an open spot"}, on ${askDayNm(plActDay(m))}; plays ${askG(m.games)}; helps ${m.dc.slice(0,4).map(x=>`${x.c[0]} +${dPct(x.d)}%`).join(", ")||"little"}.`);
      if(m.alts&&m.alts.length)out.push(`   Other options for that spot: ${m.alts.map(a=>`${a.x.n} (${a.x.t}, ${a.games.length}g, ${a.d>=0?"+":""}${a.d.toFixed(2)} expected cats vs the pick)`).join("; ")}.`);});}
  else out.push(`\nAPP PLANNER: no pickup raises my expected categories with my settings${r.cap?"":" (no pickups left)"}.`);
  // free agents with games left (not just the planner's), so Claude can weigh category needs itself
  const fa=Object.values(DIR).filter(D=>D.t&&!ownerNow(D.n)&&(!INJ||INJ[D.n]!=="OUT")&&askDays(D.t,days).length).map(D=>{const s=recentPG(D.n,400),l=recentPG(D.n,14),pj=pgLine(D.pj)||(s&&s.pg);return pj?{D,s,l,z:zOf(pj)}:null;}).filter(Boolean).sort((a,b)=>b.z-a.z).slice(0,12);
  if(fa.length){out.push(`\nBEST FREE AGENTS WITH GAMES LEFT`);
    fa.forEach(({D,s,l})=>{const g=askDays(D.t,days),wc=typeof wvClear==="function"?wvClear(D.n):0;
      out.push(`- ${D.n} (${D.t}, ${askPos(D.el)})${askStatus(D.n)}${wc?` [on waivers, claim clears ${fmtET(wc).replace(/^(\w+), \w+ \d+, /,"$1 ")}]`:""}: ${askG(g)} | Season ${askLine(s&&s.pg)} | L14 ${askLine(l&&l.pg)}`);});}
  out.push(`\nOPPONENT ROSTER (${on}; games left this matchup)`);
  out.push(dNowP(opp).filter(p=>slotOn(p,TODAY)!==13).map(p=>`${p.n} (${p.t})${askStatus(p.n)} ${askDays(p.t,days).length}g`).join("; "));
  out.push(`\nMY QUESTION: ${q&&q.trim()?q.trim():"Based on where each category stands right now, who should I pick up and drop, and when? Is the app planner's pick right, or is someone else better for the categories I can still win?"}`);
  return out.join("\n");}

function askCopy(txt){try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).catch(()=>askCopyOld(txt));return true;}}catch(e){}return askCopyOld(txt);}
function askCopyOld(txt){try{const a=document.createElement("textarea");a.value=txt;a.setAttribute("readonly","");a.style.cssText="position:fixed;left:-9999px;top:0";document.body.appendChild(a);a.select();const ok=document.execCommand("copy");a.remove();return ok;}catch(e){return false;}}
function askBuild(T){const r=DPL;if(!r||r.done||!r.opp)return "";const q=(document.querySelector("[data-askq]")||{}).value;ASK_Q=q||"";try{return askPrompt(T,r,q);}catch(e){console.warn(e);return "";}}

{const _v=DW.pl.view;DW.pl.view=function(w,T){const h=_v.apply(this,arguments);const r=DPL;if(!r||r.done||!r.opp||!TEAMS[T])return h;
  return h+`<div class="ask-c" data-askt="${T}"><div class="ask-h"><span class="ask-ic" aria-hidden="true">✳</span><b>Ask Claude about this week</b></div>
    <p class="dsm muted">Sends your matchup score, categories, roster, the planner's moves and the best free agents to Claude, in your own Claude account. Ask anything, like "who should I pick up for steals?"</p>
    <textarea class="ask-q" data-askq rows="2" placeholder="Your question (optional). Leave blank to ask who to pick up and drop.">${esc(ASK_Q)}</textarea>
    <div class="ask-b"><button class="btn sm ask-go" data-askgo>Ask Claude ↗</button><button class="btn sm ghost" data-askcp>Copy prompt</button></div></div>`;};}

document.addEventListener("click",e=>{let b;
  if((b=e.target.closest("[data-askgo]"))){e.stopPropagation();const T=+b.closest("[data-askt]").dataset.askt,p=askBuild(T);if(!p){toast("The planner is still working. Try again in a second.");return;}
    askCopy(p);const u="https://claude.ai/new?"+new URLSearchParams({q:p}).toString();
    if(u.length<=ASK_URL_MAX){window.open(u,"_blank","noopener");toast("Opening Claude with your matchup. The prompt is copied too.");}
    else{window.open("https://claude.ai/new","_blank","noopener");toast("Prompt copied. Paste it into the new Claude chat.");}
    return;}
  if((b=e.target.closest("[data-askcp]"))){e.stopPropagation();const T=+b.closest("[data-askt]").dataset.askt,p=askBuild(T);if(!p){toast("The planner is still working. Try again in a second.");return;}
    toast(askCopy(p)?"Prompt copied. Paste it into Claude.":"Couldn't copy. Your browser blocked it.");return;}
},true);
document.addEventListener("input",e=>{const t=e.target.closest&&e.target.closest("[data-askq]");if(t)ASK_Q=t.value;},true);

{const s=document.createElement("style");s.textContent=`
.ask-c{margin:12px 0 4px;padding:12px;border-radius:14px;border:1px solid color-mix(in srgb,#d97757 45%,var(--line));background:color-mix(in srgb,#d97757 7%,transparent)}
.ask-h{display:flex;align-items:center;gap:8px;font-size:.95rem}.ask-ic{color:#d97757;font-size:1.1rem}
.ask-c p{margin:6px 0 8px}
.ask-q{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--bg,transparent);color:var(--ink);resize:vertical}
.ask-b{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.ask-go{background:#d97757;border-color:#d97757;color:#fff}
`;document.head.appendChild(s);}
