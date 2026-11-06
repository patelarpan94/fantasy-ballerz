/* ============================================================================
   TRASH TALK (2.21, 2026-11-02): Fun › Trash talk. Pick a team (this week's
   opponent by default) and the app digs through real league numbers for
   ammo: the live score, win chance, starts left, their worst category, your
   best one, the last time you met, the standings, the taco, bench points,
   OUT players still in their lineup and a quiet waiver wire. Each fact comes
   with ready lines (tap 🎲 for another), tagged with the playbook rule it
   uses, and opens league chat or a DM with the line filled in so you can
   edit before sending. "Incoming" shows what they could say back.
   ============================================================================ */
const TK={o:null,rot:{}};
const TK_RULES={
  receipts:["🧾","Bring receipts","A number they can check lands harder than anything you make up. Lead with the score."],
  weak:["🎯","Hit the weak spot","Find the category they're worst at and keep pointing at it."],
  flex:["💪","Flex your strength","Name the category you own and how far ahead you are."],
  sched:["📅","Use the schedule","More starts left means more stats. Call it before the week plays out."],
  table:["📊","Point at the table","Standings, streaks and the taco don't lie."],
  roast:["🪑","Roast the decisions","Bench points, OUT players in the lineup and a dead waiver wire are fair game."]};
// possessive that reads right for names ending in s or an apostrophe
const tkPos=n=>/'$/.test(n)?n:/s$/i.test(n)?n+"'":n+"'s";
const tkF=(v,c)=>c[1]==="pct"?pct(v):String(Math.round(v));
// every fact team T can use on team O, best first
function tkFacts(T,O){
  const out=[],nO=teamName(O),add=(k,rule,w,head,lines)=>out.push({k,rule,w,head,lines});
  const ids=Object.keys(TEAMS).map(Number).filter(x=>TEAMS[x].P.length),N=ids.length;
  // ---- this week's matchup (only when O is the opponent this week)
  if(opponentIn(T,wk[0])===O&&TEAMS[T]&&started()){const a=fcProj(T),b=fcProj(O),now=h2h(a.now,b.now),[w,l]=now,done=a.done&&b.done,wn=weekName(wk[0]);
    if(w>l){const s=now.join("-");
      add("live","receipts",4+w-l,done?`Beat ${nO} ${s} in ${wn}`:`Leading ${nO} ${s} in ${wn}`,done?
        [`Final: ${s}. Frame it, ${nO}.`,`${s}. That one's going on the fridge.`,`Good game ${nO}. Well, good for me. ${s}.`]:
        [`${s} right now. The scoreboard isn't going to read itself, ${nO}.`,`Leading ${w}-${l} in categories. Feel free to check the app, I'll wait.`,`${s} and counting. Might want to check your lineup.`]);
      const lead=CATS.map(c=>{const x=val(a.now,c),y=val(b.now,c);return {c,x,y,r:(x-y)/Math.max(Math.abs(y),c[1]==="pct"?.01:1)};}).filter(o=>o.x>o.y+1e-9).sort((p,q)=>q.r-p.r)[0];
      if(lead&&lead.r>.25)add("lead","flex",2+lead.r,`${lead.c[0]} this week: ${tkF(lead.x,lead.c)} to ${tkF(lead.y,lead.c)}`,
        [`${tkF(lead.x,lead.c)} to ${tkF(lead.y,lead.c)} in ${lead.c[0]}. Is that category optional for you?`,`I've got ${lead.c[0]} locked, ${tkF(lead.x,lead.c)} to ${tkF(lead.y,lead.c)}. Don't bother.`]);}
    if(!done){const p=winProb(a,b),P=Math.round(p*100);
      if(p>=.6)add("odds","receipts",2+4*(p-.5),`${P}% to win this week, says the app`,
        [`The app has me at ${P}% to win this week. Not my numbers, the math's.`,`${P}% win chance. Even the computer is picking against you.`,`${100-P}% for you. I'd start practicing your congratulations.`]);
      const g1=gamesLeft(T),g2=gamesLeft(O);
      if(g1>=g2+3)add("sched","sched",1.5+(g1-g2)/4,`${g1} starts left vs ${tkPos(nO)} ${g2}`,
        [`I've got ${g1} starts left, you've got ${g2}. Hope your guys play 48 minutes.`,`${g1} games to your ${g2}. Volume wins, ${nO}.`,`Math check: ${g1} > ${g2}. Enjoy the rest of the week.`]);}}
  // ---- season totals: their worst category and your best
  const S=Object.fromEntries(ids.map(x=>[x,STAND[x]?.vbs||ZERO()])),played=ids.filter(x=>S[x].some(v=>v)),NP=played.length;
  if(NP>=4&&played.includes(T)&&played.includes(O)){const rank=(x,c)=>1+played.filter(y=>val(S[y],c)>val(S[x],c)+1e-9).length;
    const wo=CATS.map(c=>({c,r:rank(O,c)})).sort((p,q)=>q.r-p.r)[0];
    if(wo.r>=NP-1){const c=wo.c,v=val(S[O],c),mine=val(S[T],c),beat=mine>v+1e-9;
      add("weak","weak",2+(wo.r===NP?1:0)+(beat?.5:0),`${nO} is ${ord(wo.r)} of ${NP} in ${c[0]}`,
        [`${ord(wo.r)} of ${NP} in ${c[0]}. Is that a punt or a problem?`,c[1]==="pct"?`${pct(v)} ${c[0]} this season. That's not a stat, that's a cry for help.`:`${Math.round(v)} ${c[0]} all season. My bench has more than that.`,
         beat?`${c[0]}: me ${tkF(mine,c)}, you ${tkF(v,c)}. Just leaving that here.`:`${ord(wo.r)} in ${c[0]}. Did you draft that on purpose?`]);}
    const bm=CATS.map(c=>({c,r:rank(T,c)})).filter(o=>val(S[T],o.c)>val(S[O],o.c)+1e-9).sort((p,q)=>p.r-q.r)[0];
    if(bm&&bm.r<=2){const c=bm.c;
      add("flex","flex",1.5+(bm.r===1?1:0),`${ord(bm.r)} in the league in ${c[0]}`,
        [`${ord(bm.r)} in the league in ${c[0]}. You can fight over the other categories.`,`${c[0]}: ${tkF(val(S[T],c),c)} to your ${tkF(val(S[O],c),c)}. Not close.`,`Best ${c[0]} in the league${bm.r===1?"":", nearly"}. Just saying.`]);}}
  // ---- the last time you met, and their worst week
  const R=typeof recordsData==="function"?recordsData():{weeks:[]},met=R.weeks.filter(w=>w.T===T&&w.o===O).sort((p,q)=>q.n-p.n);
  if(met.length){const last=met[0],won=met.filter(w=>w.r[0]>w.r[1]).length;
    if(last.r[0]>last.r[1])add("met","receipts",3.5,`Won the last meeting ${last.r.slice(0,last.r[2]?3:2).join("-")} (${weekName(last.n)})`,
      [`Last time we played it was ${last.r[0]}-${last.r[1]}. Just a friendly reminder.`,`${weekName(last.n)}: ${last.r[0]}-${last.r[1]}. You remember. I know you remember.`,met.length>1?`${won}-${met.length-won} against me this season. Want to make it ${won+1}?`:`1-0 against you this season. Let's make it 2-0.`]);}
  const worst=R.weeks.filter(w=>w.T===O&&w.r[0]<w.r[1]).sort((p,q)=>(p.r[0]-p.r[1])-(q.r[0]-q.r[1]))[0];
  if(worst&&worst.r[1]-worst.r[0]>=4&&worst.o!==T)add("worst","receipts",1.5,`${tkPos(nO)} worst week: lost ${worst.r[0]}-${worst.r[1]} to ${teamName(worst.o)}`,
    [`Still thinking about that ${worst.r[0]}-${worst.r[1]} against ${teamName(worst.o)}? Because I am.`,`${worst.r[0]}-${worst.r[1]} in ${weekName(worst.n)}. Rough stuff, ${nO}.`]);
  // ---- standings, streaks, taco
  if(ids.some(x=>STAND[x]?.rec.some(v=>v))){const o=standOrder(),rT=o.indexOf(T)+1,rO=o.indexOf(O)+1,rec=x=>STAND[x].rec.join("-");
    if(typeof tacoId==="function"&&tacoId()===O)add("taco","table",3,`${nO} holds the 🌮`,
      [`Enjoy the taco 🌮. Last place looks good on you.`,`🌮 Taco Tuesday every day for you, ${nO}.`,`How's the view from the bottom? 🌮`]);
    else if(rT&&rO&&rT<rO)add("table","table",1+(rO-rT)/4,`${ord(rT)} in the standings, ${nO} ${ord(rO)}`,
      [`${ord(rT)} place (${rec(T)}) vs ${ord(rO)} place (${rec(O)}). Look up, ${nO}.`,`Standings check: me ${ord(rT)}, you ${ord(rO)}. Carry on.`]);
    const st=typeof streakOf==="function"?streakOf(O):"",k=parseInt(st);
    if(st.endsWith("L")&&k>=2)add("streak","table",1.5+k/2,`${nO} has lost ${k} straight`,
      [`${k} losses in a row. Want me to make it ${k+1}?`,`L${k} and counting. I'm happy to keep it going.`]);}
  // ---- their decisions: bench points, OUT players starting, no moves
  const bench={};ids.forEach(x=>{bench[x]=0;TEAMS[x].P.forEach(p=>Object.entries(p.d||{}).forEach(([sp,l])=>{if(l&&+sp<TODAY&&slotOn(p,+sp)===12)bench[x]+=l[K.PTS];}));});
  const bRank=1+ids.filter(x=>bench[x]>bench[O]).length;
  if(bench[O]>=25&&bRank<=3)add("bench","roast",1+bench[O]/60+(bRank===1?1:0),`${tkPos(nO)} bench: ${bench[O]} points left there this season${bRank===1?", most in the league":""}`,
    [`${bench[O]} points sitting on your bench this season. Setting a lineup is free, ${nO}.`,`Your bench has ${bench[O]} points. Maybe start them?`,bRank===1?`Most bench points in the league. Your best players are your benchwarmers.`:`${bench[O]} bench points. That's a whole extra player you didn't use.`]);
  const sp0=TODAY,outs=TEAMS[O].P.filter(p=>(p.st==="OUT"||INJ[p.n]==="OUT")&&startedOn(p,sp0)&&gameOn(p.t,sp0));
  if(outs.length)add("outs","roast",2.5+outs.length/2,`${outs.map(p=>p.n).join(", ")} ${outs.length===1?"is":"are"} OUT and still in ${tkPos(nO)} lineup today`,
    [`${outs[0].n} is OUT tonight and still starting for you. Bold strategy.`,`Starting ${outs[0].n} tonight? He's OUT. I'll take the free win.`,`Love that ${outs[0].n} is in your lineup. Love it more that he's OUT.`]);
  const mv={};ids.forEach(x=>mv[x]=0);Object.values(OWN).forEach(ivs=>ivs.forEach(iv=>{if(iv.team in mv&&iv.from>0)mv[iv.team]++;}));
  if(N>=4&&mv[O]<=1&&ids.filter(x=>mv[x]<=mv[O]).length===1&&ids.some(x=>mv[x]>=3))add("moves","roast",1.2,`${nO}: ${mv[O]} ${mv[O]===1?"pickup":"pickups"} all season, fewest in the league`,
    [`${mv[O]} ${mv[O]===1?"pickup":"pickups"} all season. Is the waiver wire blocked on your phone?`,`Set it and forget it, huh? ${mv[O]} ${mv[O]===1?"move":"moves"} so far.`,`Fewest moves in the league. Is anyone home, ${nO}?`]);
  return out.sort((p,q)=>q.w-p.w);
}
const tkLine=f=>f.lines[(TK.rot[f.k]||0)%f.lines.length];
function trashView(){
  if(!L||!Object.keys(TEAMS).length)return sec("Trash talk","",`<p class="empty">Trash talk fills in once rosters exist.</p>`);
  const ids=L.teams.map(t=>tnum(t.id)).filter(x=>TEAMS[x]&&TEAMS[x].P.length),T=TEAMS[cur]?cur:ids[0];
  if(ids.length<2)return sec("Trash talk","",`<p class="empty">Trash talk needs at least two teams.</p>`);
  if(TK.o==null||!TEAMS[TK.o]||+TK.o===+T)TK.o=M.opp&&TEAMS[M.opp]&&M.opp!==T?M.opp:ids.find(x=>x!==T);
  const O=+TK.o,nT=esc(teamName(T)),nO=esc(teamName(O)),facts=tkFacts(T,O),back=tkFacts(O,T).slice(0,3),me=chatMe(),chat=!!me&&!WRITE_BLOCKED&&!!(Store.db||Store.local);
  trashView.F=facts;trashView.O=O;
  const opts=ids.filter(x=>x!==T).map(x=>`<option value="${x}"${x===O?" selected":""}>${esc(teamName(x))}${x===M.opp?" · this week":""}</option>`).join("");
  const top=sec("Trash talk",`Ammo for ${nT} from real league numbers · pick a team to aim at`,`<div class="hfilters tcf"><label class="hf"><span>Talk trash to</span><select data-tko>${opts}</select></label></div>`);
  const card=(f,i)=>{const r=TK_RULES[f.rule];return `<li class="tkcard"><span class="tkic" aria-hidden="true">${r[0]}</span><div class="tkbody"><span class="tkrule">${r[1]}</span><b class="tkhead">${esc(f.head)}</b>
    <p class="tkline">“${esc(tkLine(f))}”</p><div class="tkacts">${f.lines.length>1?`<button class="mini-b" data-tkroll="${i}" aria-label="Another line">🎲 Another line</button>`:""}<button class="mini-b" data-tkcopy="${i}">Copy</button>${chat?`<button class="btn sm ghost" data-tksend="dm:${i}">DM ${nO}</button><button class="btn sm" data-tksend="league:${i}">Post in league chat</button>`:""}</div></div></li>`;};
  const ammo=sec(`Your ammo vs ${nO}`,`${facts.length} ${facts.length===1?"fact":"facts"} · strongest first · lines open chat so you can edit before you send`,facts.length?`<ol class="tklist">${facts.map(card).join("")}</ol>`
    :`<p class="empty">Nothing to brag about against ${nO} yet. Win a few categories and come back, or try another team.</p>`);
  const inc=sec("Incoming",`What ${nO} could say about you · have an answer ready`,back.length?`<ul class="tkinc">${back.map(f=>`<li><span aria-hidden="true">${TK_RULES[f.rule][0]}</span><span>${esc(f.head)}</span></li>`).join("")}</ul>`:`<p class="empty">They've got nothing on you right now. Enjoy it.</p>`);
  const used=new Set(facts.map(f=>f.rule));
  const book=sec("How to talk trash with stats","The playbook behind every line above",`<ol class="tkbook">${Object.entries(TK_RULES).map(([k,r])=>`<li class="${used.has(k)?"on":""}"><span aria-hidden="true">${r[0]}</span><div><b>${r[1]}</b><span>${r[2]}</span>${used.has(k)?`<small class="okc">You have ammo for this one</small>`:""}</div></li>`).join("")}
    <li><span aria-hidden="true">🤝</span><div><b>Keep it friendly</b><span>Aim at the team, not the person, and take it well when they throw it back. Trash talk is only fun if you can lose and laugh.</span></div></li></ol>`);
  return top+ammo+inc+book;
}
{const _fv=funView;funView=function(){return SUB.pickem==="trash"?trashView():_fv();};}
document.addEventListener("change",e=>{const s=e.target.closest("[data-tko]");if(!s)return;TK.o=+s.value;renderRosters();});
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-tkroll],[data-tkcopy],[data-tksend]");if(!b)return;e.preventDefault();
  const d=b.dataset,i=+(d.tkroll??d.tkcopy??d.tksend.split(":")[1]),f=(trashView.F||[])[i];if(!f)return;
  if(d.tkroll!=null){TK.rot[f.k]=(TK.rot[f.k]||0)+1;return renderRosters();}
  const text=tkLine(f);
  if(d.tkcopy!=null){try{await navigator.clipboard.writeText(text);toast("Copied. Go get 'em.");}catch(x){toast("Couldn't copy on this device.");}return;}
  const me=chatMe();if(!me)return;const tm=L.teams.find(t=>tnum(t.id)===trashView.O);
  const ch=d.tksend.startsWith("dm")&&tm?dmKey(me,tm.id):"league";
  CHAT_OPEN=true;chatOpen(ch);const inp=$("#chatInput");if(inp){inp.value=text;chatGrow();}});
