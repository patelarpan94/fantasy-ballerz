
/* ============================================================================
   WAIVERS (2026-10-22). A dropped player sits on waivers until the first
   processing time at least L.waivers.hours after the drop. Teams put in claims
   (claims/<id>); at each processing time the first manager to open the app runs
   them once (waivers/<season>_r<time>, claimed under a lease) in priority order:
   rolling (a winner moves to the back), reverse standings, or FAAB bids.
   Every rule lives in L.waivers and is edited in League > Settings > Waivers.
   ============================================================================ */
const WAIVER_DEFAULT={type:"rolling",hours:24,days:[0],hour:8,budget:100,minBid:1};
const WTYPES=[["rolling","Rolling (a successful claim moves you to the back)"],["standings","Reverse standings (worst record goes first)"],["faab","Bidding (FAAB budget, highest bid wins)"]];
const DOW_FULL=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const wcfg=()=>({...WAIVER_DEFAULT,...(L?.waivers||{})});
let CLAIMS=[],WDOCS=[];
// ms for an ET wall-clock time on a calendar day
function etMs(y,m,d,h){let t=Date.UTC(y,m,d,h+5);for(let i=0;i<2;i++){const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour:"numeric",hourCycle:"h23",day:"numeric"}).formatToParts(new Date(t));
  const hh=+p.find(x=>x.type==="hour").value,dd=+p.find(x=>x.type==="day").value;t-=((dd!==d?(dd>d?24:-24):0)+hh-h)*3600e3;}return t;}
function etParts(ms){const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"numeric",day:"numeric",weekday:"short"}).formatToParts(new Date(ms)),g=k=>p.find(x=>x.type===k).value;
  return {y:+g("year"),m:+g("month")-1,d:+g("day"),w:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(g("weekday"))};}
function nextProcess(ms){const c=wcfg(),days=c.days?.length?c.days:[0,1,2,3,4,5,6];
  for(let i=0;i<15;i++){const p=etParts(ms+i*864e5),t=etMs(p.y,p.m,p.d,+c.hour||0);if(days.includes(p.w)&&t>=ms)return t;}return ms;}
const fmtET=ms=>new Date(ms).toLocaleString("en-US",{timeZone:"America/New_York",weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})+" ET";
// players on waivers now: {name: clear time}
function waiverMap(){const out={},c=wcfg(),now=Date.now();if(!L||mirror())return out;
  TXLOG.forEach(t=>{if(!t.ok||!t.drop||t.by==="ESPN import"||t.role==="waiver-clear")return;const at=t.at||0,clr=nextProcess(at+(+c.hours||0)*3600e3);
    if(clr>now&&!ownerNow(t.drop))out[t.drop]=Math.max(out[t.drop]||0,clr);});return out;}
let WMAP={};
const onWaivers=n=>!!WMAP[n];
const wdoc=()=>WDOCS.find(d=>d.id===SEASON)||null;
function priorityOrder(){const c=wcfg(),ids=L.teams.map(t=>tnum(t.id));
  if(c.type==="standings"){try{return standOrder().slice().reverse();}catch(e){}}
  const o=(wdoc()?.order||[]).map(tnum).filter(t=>ids.includes(t));const base=o.length?o:(L.draft?.order||[]).map(tnum).slice().reverse();
  return [...base.filter(t=>ids.includes(t)),...ids.filter(t=>!base.includes(t))];}
const faabSpent=T=>CLAIMS.filter(c=>c.status==="won"&&tnum(c.team)===T).reduce((s,c)=>s+(+c.bid||0),0);
const faabLeft=T=>Math.max(0,(+wcfg().budget||0)-faabSpent(T));
const myClaims=T=>CLAIMS.filter(c=>c.status==="pending"&&tnum(c.team)===T).sort((a,b)=>(a.rank??a.at)-(b.rank??b.at));
// ---- claim sheet
function sheetClaim(n){const T=actTeam();if(!T)return;const c=wcfg(),full=rosterNow(T).length>=ROSTER_MAX,pos=priorityOrder().indexOf(T)+1,dup=myClaims(T).find(x=>x.add===n);
  openSheet(`Claim ${n}`,`<div class="picklist"><label style="cursor:default">${playerCell(mkP(n))}</label></div>
    <p><b>${esc(n)}</b> is on waivers until <b>${fmtET(WMAP[n])}</b>. Claims run then${c.type==="faab"?", and the highest bid wins (ties go to waiver priority)":`, and the team highest in waiver priority gets him`}. ${c.type==="faab"?`You have <b>$${faabLeft(T)}</b> of $${c.budget} left.`:`You're <b>#${pos}</b> of ${L.teams.length} in priority.`}</p>
    ${dup?`<p class="note">You already have a claim on him. A new one replaces it.</p>`:""}
    ${c.type==="faab"?`<div class="field"><label for="wBid">Your bid ($${+c.minBid||0} minimum)</label><input type="number" id="wBid" min="${+c.minBid||0}" max="${faabLeft(T)}" value="${Math.min(faabLeft(T),Math.max(+c.minBid||0,1))}"></div>`:""}
    <p class="flabel">${full?"Your roster is full. Drop one player if the claim wins:":"Drop a player if the claim wins (optional)"}</p>
    ${full?"":`<div class="picklist"><label><input type="radio" name="drop" value="" checked><span>Don't drop anyone</span></label></div>`}${rosterPick(T,"drop","radio",[],false)}
    <div class="sheetacts"><button class="btn ghost" data-sheet="close">Cancel</button><button class="btn good" data-wclaim="${esc(n)}">Put in claim</button></div>`);}
async function saveClaim(n){const T=actTeam(),body=$("#sheetBody"),c=wcfg(),drop=(body.querySelector('input[name="drop"]:checked')||{}).value||null;
  if(rosterNow(T).length>=ROSTER_MAX&&!drop)return toast("Pick a player to drop first.");
  let bid=0;if(c.type==="faab"){bid=Math.round(+body.querySelector("#wBid").value||0);if(bid<(+c.minBid||0))return toast(`The minimum bid is $${c.minBid}.`);if(bid>faabLeft(T))return toast(`You only have $${faabLeft(T)} left.`);}
  try{for(const x of myClaims(T).filter(x=>x.add===n))await Store.update("claims",x.id,{status:"cancelled"});
    const rank=Math.max(0,...myClaims(T).map(x=>x.rank??0))+1;
    await Store.set("claims",newId(),{season:SEASON,team:tkey(T),add:n,drop,bid,rank,status:"pending",at:Date.now(),clearAt:WMAP[n],...actor()});
    sheet().close();toast(`Claim in for ${n}. It runs ${fmtET(WMAP[n])}.`);}catch(e){showErr(e);}}
// ---- processing: once per processing time, by whoever opens the app first after it
let WRUN=false;
async function runWaivers(){
  if(WRUN||!L||mirror()||WRITE_BLOCKED||!SESSION||!(Store.db||Store.local))return;const now=Date.now();
  const due=[...new Set(CLAIMS.filter(c=>c.status==="pending"&&c.clearAt&&c.clearAt<=now).map(c=>c.clearAt))].sort((a,b)=>a-b);if(!due.length)return;
  WRUN=true;try{for(const T0 of due){
    try{await Store.claimSet("waivers",`${SEASON}_r${T0}`,{season:SEASON,kind:"run",at:T0,by:SESSION.team||SESSION.role,ranAt:Date.now()},()=>false);}catch(e){continue;}
    const c=wcfg(),pend=CLAIMS.filter(x=>x.status==="pending"&&x.clearAt===T0),own={},room={},aroom={},bad={},used={},order=priorityOrder(),res=[],lim=+L.addLimit||0;
    Object.keys(OWN).forEach(n=>{const o=ownerNow(n);if(o)own[n]=o;});L.teams.forEach(t=>{const id=tnum(t.id);room[id]=ROSTER_MAX-rosterNow(id).length;aroom[id]=activeMax()-Object.values(legalSlots(id)).filter(v=>v!==13).length;bad[id]=!!legalIssues(id);used[id]=pickupsUsed(id,TODAY);});
    const left=new Set(pend.map(x=>x.id)),spent={},wonNow=new Set();
    const valid=x=>{const T=tnum(x.team);if(own[x.add])return wonNow.has(x.add)?(c.type==="faab"?"Outbid":"A team higher in priority got him"):`${x.add} was already taken`;if(x.drop&&own[x.drop]!==T)return `${x.drop} was no longer on the roster`;
      if(bad[T])return "The roster wasn't legal";if(room[T]+(x.drop?1:0)<1)return "The roster was full";if(aroom[T]+(x.drop&&!onIR(T,x.drop)?1:0)<1)return "No room off IR";if(lim&&used[T]>=lim)return "No pickups left this matchup";if(c.type==="faab"&&(+x.bid||0)>faabLeft(T)-(spent[T]||0))return "Not enough budget left";return "";};
    while(left.size){const open=pend.filter(x=>left.has(x.id));let pick;
      if(c.type==="faab")pick=open.slice().sort((a,b)=>(+b.bid||0)-(+a.bid||0)||order.indexOf(tnum(a.team))-order.indexOf(tnum(b.team))||(a.rank??a.at)-(b.rank??b.at))[0];
      else{const T=order.find(t=>open.some(x=>tnum(x.team)===t));pick=open.filter(x=>tnum(x.team)===T).sort((a,b)=>(a.rank??a.at)-(b.rank??b.at))[0];}
      left.delete(pick.id);const why=valid(pick);if(why){res.push([pick,"lost",why]);continue;}
      const T=tnum(pick.team);own[pick.add]=T;wonNow.add(pick.add);if(pick.drop)delete own[pick.drop];room[T]+=pick.drop?0:-1;aroom[T]+=pick.drop&&!onIR(T,pick.drop)?0:-1;used[T]++;spent[T]=(spent[T]||0)+(+pick.bid||0);res.push([pick,"won",""]);
      if(c.type==="rolling"){order.splice(order.indexOf(T),1);order.push(T);}}
    const sp=Math.max(TODAY,(()=>{const p=etParts(T0);return Math.round((new Date(p.y,p.m,p.d)-dateOf(0))/864e5);})());
    for(const [i,[x,st,why]] of res.entries()){
      if(st==="won")await Store.set("tx",`${SEASON}_w${T0}_${i}`,{season:SEASON,type:"add",team:x.team,add:x.add,drop:x.drop||null,addDay:sp,dropDay:x.drop?sp:null,day:sp,at:T0+i,by:"Waivers",role:"waiver",claim:x.id,bid:+x.bid||0});
      await Store.update("claims",x.id,{status:st,why,ranAt:T0});}
    if(c.type==="rolling")await Store.set("waivers",SEASON,{season:SEASON,order:order.map(t=>"t"+t),at:Date.now()});
    const won=res.filter(r=>r[1]==="won");
    if(won.length)Store.claimSet("chat",`sys_waivers_${SEASON}_${T0}`,{ch:"league",members:["all"],from:"sys",kind:"waivers",text:`Waivers ran ${fmtET(T0)}\n`+won.map(([x])=>`✅ ${teamName(x.team)} claimed ${x.add}${c.type==="faab"?` ($${+x.bid||0})`:""}${x.drop?`, dropped ${x.drop}`:""}`).join("\n"),at:Date.now()},d=>!d.text).catch(()=>{});
  }}finally{WRUN=false;}}
// ---- Players tab panel: your claims, waiver priority, players on waivers
function waiverPanel(){if(!L||mirror())return "";WMAP=waiverMap();const T=actTeam(),c=wcfg(),order=priorityOrder(),mine=T?myClaims(T):[],on=Object.entries(WMAP).sort((a,b)=>a[1]-b[1]);
  const recent=CLAIMS.filter(x=>(x.status==="won"||x.status==="lost")&&Date.now()-(x.ranAt||0)<3*864e5&&(!T||tnum(x.team)===T||x.status==="won")).sort((a,b)=>(b.ranAt||0)-(a.ranAt||0)).slice(0,8);
  const cl=mine.length?`<ol class="wcl">${mine.map((x,i)=>`<li><span class="wci">${i+1}</span><span><b>${esc(x.add)}</b>${x.drop?` <span class="muted">· drop ${esc(x.drop)}</span>`:""}${c.type==="faab"?` <span class="wbid">$${+x.bid||0}</span>`:""}<br><small class="muted">Runs ${fmtET(x.clearAt)}</small></span><span class="wca">${i?`<button class="mini-b" data-wup="${esc(x.id)}" aria-label="Move up">↑</button>`:""}<button class="mini-b" data-wcancel="${esc(x.id)}">Cancel</button></span></li>`).join("")}</ol>`:`<p class="muted wnone">No claims in. Players on waivers show a <b>W</b> button instead of +.</p>`;
  const pr=`<ol class="wpr">${order.map((t,i)=>`<li class="${t===T?"mine":""}"><span>${i+1}</span>${esc(teamName(t))}${c.type==="faab"?` <span class="muted">$${faabLeft(t)}</span>`:""}</li>`).join("")}</ol>`;
  const ow=on.length?`<ul class="won">${on.slice(0,12).map(([n,t])=>`<li><span role="button" tabindex="0" class="nmb" data-pcard="${esc(n)}">${esc(n)}</span><span class="muted"> · clears ${fmtET(t)}</span></li>`).join("")}</ul>`:`<p class="muted wnone">Nobody is on waivers right now.</p>`;
  const rs=recent.length?`<ul class="wres">${recent.map(x=>`<li class="${x.status}">${x.status==="won"?"✅":"✕"} ${esc(teamName(x.team))} ${x.status==="won"?"claimed":"missed"} <b>${esc(x.add)}</b>${x.why?` <span class="muted">(${esc(x.why)})</span>`:""}</li>`).join("")}</ul>`:"";
  const quiet=!mine.length&&!on.length&&!rs;
  if(quiet)return `<section class="panel wpanel quiet"><details><summary class="phead"><h2>Waivers</h2><span class="hint">${T?`You're #${order.indexOf(T)+1} in priority${c.type==="faab"?` · $${faabLeft(T)} left`:""} · `:""}nobody on waivers · show priority</span></summary><div class="pbody">${pr}</div></details></section>`;
  return `<section class="panel wpanel"><div class="phead"><h2>Waivers</h2><span class="hint">${esc(WTYPES.find(w=>w[0]===c.type)?.[1].split(" (")[0]||"")} · runs ${(c.days?.length===7?"every day":(c.days||[]).map(d=>DOW_FULL[d]).join(", "))} at ${fmtHour(c.hour)} ET · dropped players wait ${c.hours}h</span></div>
    <div class="pbody wgrid"><div><h3>${T?"Your claims":"Claims"}</h3>${T?cl:`<p class="muted wnone">Log in to make claims.</p>`}${rs?`<h3>Last results</h3>${rs}`:""}</div><div><h3>Waiver priority</h3>${pr}</div><div><h3>On waivers</h3>${ow}</div></div></section>`;}
const fmtHour=h=>{h=+h||0;return `${(h+11)%12+1} ${h<12?"AM":"PM"}`;};
{const _av=allView;allView=function(){return waiverPanel()+_av();};
 const _ab=actionBtn;actionBtn=function(r){WMAP=WMAP||{};if(r.oid===0&&onWaivers(r.n)&&actTeam()&&!WRITE_BLOCKED&&!mirror())return `<button class="actb add wv" data-wclaimopen="${esc(r.n)}" aria-label="Claim ${esc(r.n)} off waivers" title="On waivers until ${fmtET(WMAP[r.n])}">W</button>`;return _ab(r);};
 const _sa=sheetAdd;sheetAdd=function(n){if(onWaivers(n)&&!isCommish())return sheetClaim(n);return _sa(n);};
 const _pc=playerCard;playerCard=function(n){_pc(n);if(!onWaivers(n))return;const b=$("#sheetBody").querySelector(`[data-add]`);if(b&&!isCommish()){b.removeAttribute("data-add");b.dataset.wclaimopen=n;b.textContent=`Claim off waivers (clears ${fmtET(WMAP[n])})`;}};}
document.addEventListener("click",async e=>{const t=e.target.closest("[data-wclaim],[data-wclaimopen],[data-wcancel],[data-wup]");if(!t)return;e.preventDefault();e.stopPropagation();
  if(t.dataset.wclaimopen)return sheetClaim(t.dataset.wclaimopen);
  if(t.dataset.wclaim)return saveClaim(t.dataset.wclaim);
  try{if(t.dataset.wcancel){await Store.update("claims",t.dataset.wcancel,{status:"cancelled"});toast("Claim cancelled");}
    else{const T=actTeam(),l=myClaims(T),i=l.findIndex(x=>x.id===t.dataset.wup);if(i>0){const a=l[i-1],b=l[i],ra=a.rank??a.at,rb=b.rank??b.at;await Store.update("claims",a.id,{rank:rb});await Store.update("claims",b.id,{rank:ra});}}}catch(x){showErr(x);}},true);
// ---- League > Settings: waivers and where league settings come from
{const _sv=setupView;setupView=function(){const h=_sv(),F=FORM;if(!F)return h;const w={...WAIVER_DEFAULT,...(F.waivers||{})},dis=isCommish()?"":"disabled",src=F.settingsFrom||(F.source==="espn"?"espn":"app");
  const sec=`<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Waivers</h2><span class="hint">Change any time. New rules apply to the next run.</span></div><div class="pbody fgrid">
    <div class="field" style="grid-column:1/-1"><label for="fWType">Waiver type</label><select id="fWType" ${dis}>${WTYPES.map(([k,l])=>`<option value="${k}"${w.type===k?" selected":""}>${l}</option>`).join("")}</select></div>
    <div class="field"><label for="fWHours">Hours a dropped player stays on waivers</label><input type="number" id="fWHours" min="0" max="168" value="${+w.hours||0}" ${dis}><span class="hint">0 = straight to free agency at the next run.</span></div>
    <div class="field"><label for="fWHour">Claims run at (ET)</label><select id="fWHour" ${dis}>${Array.from({length:24},(_,h)=>`<option value="${h}"${+w.hour===h?" selected":""}>${fmtHour(h)}</option>`).join("")}</select></div>
    <div class="field" style="grid-column:1/-1"><label>Days claims run</label><div class="catpick">${DOW_FULL.map((d,i)=>`<label><input type="checkbox" data-wday="${i}" ${w.days.includes(i)?"checked":""} ${dis}>${d.slice(0,3)}</label>`).join("")}</div></div>
    ${w.type==="faab"?`<div class="field"><label for="fWBudget">Season budget per team ($)</label><input type="number" id="fWBudget" min="1" max="1000" value="${+w.budget||100}" ${dis}></div><div class="field"><label for="fWMin">Minimum bid ($)</label><input type="number" id="fWMin" min="0" max="100" value="${+w.minBid||0}" ${dis}></div>`:""}
  </div></section>
  <section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Where settings come from</h2></div><div class="pbody fgrid">
    <div class="field" style="grid-column:1/-1"><label for="fSrc">League settings</label><select id="fSrc" ${dis}><option value="app"${src==="app"?" selected":""}>Set here in the app (ESPN only sends games, stats and players)</option><option value="espn"${src==="espn"?" selected":""}>Copy from ESPN on every Refresh</option></select><span class="hint">Covers the league name, team names, categories, roster slots, playoff teams and the schedule.${F.source==="espn"?" Rosters and lineups still mirror ESPN until the league switches over.":""}</span></div>
  </div></section>`;
  return h.replace('<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Draft</h2>',sec+'<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Draft</h2>');};
 const _si=setupInput;setupInput=function(t){const F=FORM;if(F&&(t.id?.startsWith("fW")||t.dataset?.wday!=null||t.id==="fSrc")){
   if(t.id==="fSrc"){F.settingsFrom=t.value;}else{const w=F.waivers={...WAIVER_DEFAULT,...(F.waivers||{})};
   if(t.id==="fWType")w.type=t.value;else if(t.id==="fWHours")w.hours=Math.max(0,Math.min(168,Math.round(+t.value||0)));else if(t.id==="fWHour")w.hour=+t.value;
   else if(t.id==="fWBudget")w.budget=Math.max(1,Math.round(+t.value||100));else if(t.id==="fWMin")w.minBid=Math.max(0,Math.round(+t.value||0));
   else if(t.dataset.wday!=null){const d=+t.dataset.wday;w.days=t.checked?[...new Set([...w.days,d])].sort():w.days.filter(x=>x!==d);if(!w.days.length){w.days=[d];t.checked=true;toast("Pick at least one day.");}}}
   FORM_DIRTY=true;document.querySelectorAll('[data-sact="save"],[data-sact="discard"]').forEach(b=>b.disabled=false);const sh=document.querySelector(".savebar .hint");if(sh)sh.textContent="Unsaved changes";
   if(t.tagName==="SELECT"||t.type==="checkbox")renderRosters();return true;}return _si(t);};}
// a new season keeps the waiver rules and stays app-owned
{const _nl=newLeague;newLeague=function(s,prev){const o=_nl(s,prev);if(prev?.waivers)o.waivers={...prev.waivers};o.settingsFrom="app";return o;};}
