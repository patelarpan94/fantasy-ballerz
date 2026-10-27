
/* ============================================================================
   LEGAL ROSTERS (1.36): at most ROSTER_MAX players, at most ACTIVE_MAX off IR,
   and only OUT players on IR. An illegal team can only drop players or move a
   healthy player off IR; adds, claims, trades and lineup changes stay locked.
   Stats keep counting. Off while the league mirrors ESPN (ESPN enforces it).
   ============================================================================ */
const activeMax=()=>ROSTER_MAX-(CAP[13]||0);
// the roster as it stands once today's moves land (drops of players who already played today take effect tomorrow)
const legalDay=()=>Math.max(0,Math.min(TODAY+1,SEASON_END));
function legalSlots(T){const E=legalDay(),out={};rosterNow(T).forEach(n=>{const p=TEAMS[T]?.P.find(q=>q.n===n);out[n]=p&&p.sl[E]!=null?p.sl[E]:12;});return out;}
const onIR=(T,n)=>legalSlots(T)[n]===13;
function legalIssues(T){
  if(!L||mirror()||!TEAMS[T]||TODAY>SEASON_END)return null;
  const sl=legalSlots(T),ns=Object.keys(sl),ir=ns.filter(n=>sl[n]===13),act=ns.length-ir.length,bad=ir.filter(n=>INJ[n]!=="OUT");
  const r={total:ns.length,act,overT:Math.max(0,ns.length-ROSTER_MAX),overA:Math.max(0,act-activeMax()),ir:bad};
  return r.overT||r.overA||bad.length?r:null;
}
const legalMark=id=>legalIssues(id)?` <span class="lgwarn" title="Roster not legal" aria-label="Roster not legal">⚠</span>`:"";
const lgLocked=T=>!!(T&&legalIssues(T));
const LG_MSG="Your roster isn't legal yet. Fix it on My Team first: drop a player or move a healthy player off IR.";
function lgText(T,x){const nm=esc(TEAMS[T].name),items=[];
  x.ir.forEach(n=>items.push(`<li><b>${esc(n)}</b> is on IR but isn't OUT anymore.${canEditTeam(T)?` <button class="btn sm" data-lgir="${esc(n)}">Move him to the bench</button>`:""}</li>`));
  if(x.overA)items.push(`<li><b>${x.act}</b> players off IR. The max is <b>${activeMax()}</b>, so drop ${x.overA}.${canEditTeam(T)?` <button class="btn sm danger" data-lgdrop="${T}">${isCommish()&&myTeamNum()!==T?"Drop for them":"Drop a player"}</button>`:""}</li>`);
  if(x.overT)items.push(`<li><b>${x.total}</b> players in total. The max is <b>${ROSTER_MAX}</b>, so drop ${x.overT}.${canEditTeam(T)&&!x.overA?` <button class="btn sm danger" data-lgdrop="${T}">${isCommish()&&myTeamNum()!==T?"Drop for them":"Drop a player"}</button>`:""}</li>`);
  return `<div class="note lgban" role="alert"><b>⚠ ${nm}'s roster isn't legal.</b> Adds, waiver claims, trades and lineup changes are locked until it's fixed. Stats still count.<ul>${items.join("")}</ul></div>`;}
{const _rb=renderBanner;renderBanner=function(){_rb.apply(this,arguments);const b=$("#banner");if(!b||!L||mirror())return;let h="";
  if(nav==="team"&&TEAMS[cur]){const x=legalIssues(cur);if(x)h=lgText(cur,x);}
  else{const me=myTeamNum();if(me&&legalIssues(me))h=`<div class="note lgban" role="alert"><b>⚠ Your roster isn't legal.</b> Adds, claims, trades and lineup changes are locked until you fix it. <button class="btn sm" data-lgfix="1">Fix on My Team</button></div>`;}
  if(h){b.insertAdjacentHTML("afterbegin",h);b.hidden=false;}};}
// ---- locks
{const _sa=sheetAdd;sheetAdd=function(n){const T=actTeam();if(lgLocked(T))return openSheet(`Add ${n}`,`<p>${LG_MSG}</p><div class="sheetacts"><button class="btn" data-sheet="close">OK</button></div>`);return _sa(n);};}
{const _sc=sheetClaim;sheetClaim=function(n){const T=actTeam();if(lgLocked(T))return openSheet(`Claim ${n}`,`<p>${LG_MSG}</p><div class="sheetacts"><button class="btn" data-sheet="close">OK</button></div>`);return _sc(n);};}
{const _sv=saveClaim;saveClaim=function(n){const T=actTeam();if(lgLocked(T))return toast(LG_MSG);const body=$("#sheetBody"),drop=(body.querySelector('input[name="drop"]:checked')||{}).value||null;
  const a=legalSlots(T),act=Object.values(a).filter(s=>s!==13).length-(drop&&a[drop]!==13?1:0)+1;if(act>activeMax())return toast(`That would give you ${act} players off IR (max ${activeMax()}). Drop someone who isn't on IR.`);return _sv(n);};}
{const _st=sheetTradeWith;sheetTradeWith=function(O,n){const T=actTeam();if(lgLocked(T))return openSheet("Propose a trade",`<p>${LG_MSG}</p><div class="sheetacts"><button class="btn" data-sheet="close">OK</button></div>`);return _st(O,n);};}
const actAfter=(T,out,inn)=>{const a=legalSlots(T);return Object.values(a).filter(s=>s!==13).length-out.filter(n=>a[n]!==13).length+inn.length;};
{const _sa=sheetAct;sheetAct=function(b){const a=b.dataset.sheet,T=actTeam(),body=$("#sheetBody");
  if(a==="add"){if(lgLocked(T))return toast(LG_MSG);const drop=(body.querySelector('input[name="drop"]:checked')||{}).value||null,act=actAfter(T,drop?[drop]:[],[b.dataset.n]);
    if(act>activeMax())return toast(`That would give you ${act} players off IR (max ${activeMax()}). Drop someone who isn't on IR, or move an OUT player to IR first.`);}
  if(a==="trade"){if(lgLocked(T))return toast(LG_MSG);const O=+(body.querySelector("#trWith")?.value||b.dataset.o),get=[...body.querySelectorAll('input[name="get"]:checked')].map(i=>i.value),give=[...body.querySelectorAll('input[name="give"]:checked')].map(i=>i.value);
    if(O){if(actAfter(T,give,get)>activeMax())return toast(`That would put you over ${activeMax()} players off IR. Add a player to send.`);if(actAfter(O,get,give)>activeMax())return toast(`That would put them over ${activeMax()} players off IR.`);}}
  return _sa(b);};}
{const _ta=tradeAct;tradeAct=function(v){const i=v.indexOf(":"),a=v.slice(0,i),t=TXS.find(x=>x.id===v.slice(i+1));
  if(t&&(a==="accept"||a==="approve")){const A=tnum(t.from),B=tnum(t.to);if(a==="accept"&&lgLocked(B))return toast(LG_MSG);
    if(actAfter(A,t.give,t.get)>activeMax()||actAfter(B,t.get,t.give)>activeMax())return toast(`This trade would put a team over ${activeMax()} players off IR. One side needs to drop a player first.`);}
  return _ta(v);};}
// lineups: while illegal, only moves that fix it (off IR, or an OUT player onto IR)
{const _mo=moveOptions;moveOptions=function(T,sp,n){const o=_mo(T,sp,n);if(!lgLocked(T))return o;const p=TEAMS[T].P.find(q=>q.n===n),from=p?.sl[sp];return o.filter(x=>from===13||x.slot===13);};}
{const _rp=renderMovePop;renderMovePop=function(){_rp.apply(this,arguments);if(!MOVING||!lgLocked(MOVING.team))return;const e=$("#movePop .mpbody .empty");if(e)e.textContent="Lineup changes are locked until your roster is legal. You can still move an OUT player to IR.";};}
{const _as=autoSet;autoSet=function(w){if(lgLocked(cur))return toast(LG_MSG);return _as(w);};}
{const _ad=setAutoDaily;setAutoDaily=function(on){if(on&&lgLocked(cur))return toast(LG_MSG);return _ad(on);};}
// ---- fixes
async function lgMoveOffIR(T,n){const p=TEAMS[T]?.P.find(q=>q.n===n);if(!p||!canEditTeam(T))return;const sp=locked(p,TODAY)?TODAY+1:TODAY;
  const map={};TEAMS[T].P.forEach(q=>{const s=q.sl[sp];if(s!=null)map[q.n]=s;});map[n]=12;
  if(await saveSnaps(T,{[sp]:map}))toast(`${n} moved to the bench${sp>TODAY?" from tomorrow (his game today has started)":""}`);}
function lgDropSheet(T){const x=legalIssues(T)||{overA:0,overT:0};const need=Math.max(x.overA,x.overT,1);
  openSheet(`Drop ${need>1?need+" players":"a player"}`,`<p>${esc(TEAMS[T].name)} needs to drop ${need}${x.overA?" player"+(need>1?"s":"")+" who aren't on IR":""}. Players whose game has started today leave after it.</p>
    ${rosterPick(T,"lgd","checkbox",[],false)}<div class="sheetacts"><button class="btn ghost" data-sheet="close">Cancel</button><button class="btn danger" data-lgdo="${T}">Drop</button></div>`);}
async function lgDoDrop(T){const ns=[...$("#sheetBody").querySelectorAll('input[name="lgd"]:checked')].map(i=>i.value);if(!ns.length)return toast("Pick at least one player.");
  try{for(const n of ns)await Store.set("tx",newId(),{season:SEASON,type:"drop",team:tkey(T),add:null,drop:n,dropDay:lockedName(n,TODAY)?TODAY+1:TODAY,day:TODAY,at:Date.now(),...actor(),...(isCommish()&&myTeamNum()!==T?{forced:true}:{})});
    sheet().close();toast(`${ns.join(", ")} dropped`);}catch(e){showErr(e);}}
document.addEventListener("click",e=>{const b=e.target.closest("[data-lgir],[data-lgdrop],[data-lgdo],[data-lgfix]");if(!b)return;
  if(b.dataset.lgir)lgMoveOffIR(cur,b.dataset.lgir);else if(b.dataset.lgdrop)lgDropSheet(+b.dataset.lgdrop);else if(b.dataset.lgdo)lgDoDrop(+b.dataset.lgdo);
  else if(b.dataset.lgfix){const me=myTeamNum();if(me)cur=me;setNav("team","sched");}});
