/* ============================================================================
   USAGE LOG (GitHub app, 2.24, 2026-11-03). League › Usage log, commissioner
   only: how often the app is used, by whom, when, on what and roughly where.
   Each phone says hello to the league server when the app opens and when it
   comes back after 30+ minutes away; the server also logs logins, wrong
   passwords and logouts. The server works out who it is from the session.
   Place is the city (or only the state) from a free IP lookup, or off, per
   the commissioner's setting; IP addresses are never kept.
   ============================================================================ */
document.head.insertAdjacentHTML("beforeend",`<style>
.ulwrap{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ulwrap>.panel{margin:0;min-width:0}
.ulog .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.ulog .tile{background:var(--surface2,var(--surface));border:1px solid var(--line);border-radius:12px;padding:10px 12px}
.ulog .tile b{display:block;font-size:24px;line-height:1.1}.ulog .tile span{font-size:12px;color:var(--muted)}
.ulog .ubars{display:flex;align-items:flex-end;gap:3px;height:130px}
.ulog .ubar{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;position:relative}
.ulog .ubar i{display:block;width:100%;max-width:26px;background:var(--accent,#2b6ef2);border-radius:4px 4px 0 0;min-height:2px}
.ulog .ubar.z i{background:var(--line);}
.ulog .ubar em{font-style:normal;font-size:10px;line-height:14px;height:14px;color:var(--muted)}
.ulog .uax{display:flex;gap:3px;font-size:10px;color:var(--muted);margin-top:4px}.ulog .uax span{flex:1 1 0;min-width:0;text-align:center;overflow:visible;white-space:nowrap}
.ulog table{width:100%;border-collapse:collapse;font-size:13px}.ulog th,.ulog td{padding:6px 8px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
.ulog th{font-size:12px;color:var(--muted);font-weight:600;white-space:nowrap}.ulog td.n,.ulog th.n{text-align:right;font-variant-numeric:tabular-nums}
.ulog .bad{color:var(--bad,#d33);font-weight:600}.ulog .uctl{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}
.ulog .uctl label{display:inline-flex;gap:6px;align-items:center;font-size:13px}.ulog select{font:inherit;font-size:14px;padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}
.ulog .dots{display:inline-flex;gap:2px;vertical-align:middle}.ulog .dots i{width:8px;height:8px;border-radius:2px;background:var(--line)}.ulog .dots i.on{background:var(--accent,#2b6ef2)}
@media (max-width:640px){.ulwrap{grid-template-columns:1fr}.ulog .hidep{display:none}.ulog th,.ulog td{padding:6px 5px}}
</style>`);

/* ---------------------------------------------------------- phone: hello */
// "iPhone · Safari · Home Screen app", worked out on the phone (only this short text is sent)
function uaShort(){const u=navigator.userAgent||"",dev=/iPad/.test(u)||(/Macintosh/.test(u)&&navigator.maxTouchPoints>1)?"iPad":/iPhone/.test(u)?"iPhone":/Android/.test(u)?(/Mobile/.test(u)?"Android phone":"Android tablet"):/Macintosh/.test(u)?"Mac":/Windows/.test(u)?"Windows PC":/CrOS/.test(u)?"Chromebook":/Linux/.test(u)?"Linux":"Other";
  const br=/EdgiOS|Edg\//.test(u)?"Edge":/CriOS|Chrome\//.test(u)&&!/OPR\//.test(u)?"Chrome":/FxiOS|Firefox\//.test(u)?"Firefox":/OPR\//.test(u)?"Opera":/Safari\//.test(u)?"Safari":"Browser";
  const app=matchMedia?.("(display-mode: standalone)").matches||navigator.standalone;
  return `${dev} · ${app?"Home Screen app":br}`;}
const ULOC=()=>({city:"city",state:"state",off:"off"})[L?.accessLoc]||"city";
// rough place from a free IP lookup, kept on this phone for 6 hours so it asks rarely
async function uaWhere(){const lv=ULOC();if(lv==="off")return "";
  let g=null;try{g=JSON.parse(localStorage.getItem("dfGeo")||"null");}catch(e){}
  if(!g||Date.now()-g.at>6*36e5){
    const get=async(u,f)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),4000);try{const r=await fetch(u,{signal:c.signal,cache:"no-store"});if(!r.ok)return null;return f(await r.json());}catch(e){return null;}finally{clearTimeout(t);}};
    g=await get("https://get.geojs.io/v1/ip/geo.json",j=>j&&{city:j.city||"",reg:j.region||"",cc:j.country_code||""})
      ||await get("https://ipapi.co/json/",j=>j&&!j.error&&{city:j.city||"",reg:j.region||"",cc:j.country_code||""});
    if(!g)return "";g.at=Date.now();try{localStorage.setItem("dfGeo",JSON.stringify(g));}catch(e){}}
  const st=g.cc==="US"&&US_ST[g.reg]||g.reg;
  return (lv==="state"?[st,g.cc==="US"?"":g.cc]:[g.city,st,g.cc==="US"?"":g.cc]).filter(Boolean).join(", ");}
const US_ST={Alabama:"AL",Alaska:"AK",Arizona:"AZ",Arkansas:"AR",California:"CA",Colorado:"CO",Connecticut:"CT",Delaware:"DE","District of Columbia":"DC",Florida:"FL",Georgia:"GA",Hawaii:"HI",Idaho:"ID",Illinois:"IL",Indiana:"IN",Iowa:"IA",Kansas:"KS",Kentucky:"KY",Louisiana:"LA",Maine:"ME",Maryland:"MD",Massachusetts:"MA",Michigan:"MI",Minnesota:"MN",Mississippi:"MS",Missouri:"MO",Montana:"MT",Nebraska:"NE",Nevada:"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND",Ohio:"OH",Oklahoma:"OK",Oregon:"OR",Pennsylvania:"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",Tennessee:"TN",Texas:"TX",Utah:"UT",Vermont:"VT",Virginia:"VA",Washington:"WA","West Virginia":"WV",Wisconsin:"WI",Wyoming:"WY"};
const UHI={sent:false,hiddenAt:0};
async function uaHello(ev){if(Store.local||!Store.url)return;
  try{await Store._call("hello",{ev,dev:Store.uid,ua:uaShort(),where:await uaWhere()});}catch(e){}}
// once the league is loaded (the place setting lives there), then on every return after 30+ minutes away
{const t0=Date.now(),go=()=>{if(UHI.sent)return;if(!L&&Date.now()-t0<20000)return setTimeout(go,1000);UHI.sent=true;uaHello("open");};setTimeout(go,1500);}
document.addEventListener("visibilitychange",()=>{if(document.hidden){UHI.hiddenAt=Date.now();return;}
  if(UHI.sent&&UHI.hiddenAt&&Date.now()-UHI.hiddenAt>=30*60e3)uaHello("back");UHI.hiddenAt=0;});

/* --------------------------------------------- League › Usage log (commish) */
{const base=SUBTABS.league;Object.defineProperty(SUBTABS,"league",{configurable:true,
  get(){if(!isCommish()||Store.local)return base;const i=base.findIndex(([k])=>k==="setup");return [...base.slice(0,i),["usage","Usage log"],...base.slice(i)];}});}
LICON.usage=IC("M4 20V10M10 20V4M16 20v-7M22 20H2");
const UL={days:+(localStorage.getItem("dfUlDays")||30)||30,me:false,team:"",more:0,rows:null,at:0,err:"",busy:false};
async function ulLoad(force){if(UL.busy||(!force&&UL.rows&&Date.now()-UL.at<60e3))return;UL.busy=true;
  try{const j=await Store._call("accesslog",{days:UL.days});UL.rows=j.rows||[];UL.err="";UL.at=Date.now();}
  catch(e){UL.err=e?.code==="bad_request"?"The league server doesn't have the usage log yet. Run ./release.sh for this site on the Mac, then reload.":(e?.message||"Couldn't load the usage log.");}
  finally{UL.busy=false;if(nav==="league"&&SUB.league==="usage")renderRosters();}}
const ulDay=ms=>new Date(ms).toLocaleDateString("en-CA",{timeZone:"America/New_York"});
const ulHour=ms=>+new Date(ms).toLocaleString("en-US",{timeZone:"America/New_York",hour:"numeric",hourCycle:"h23"})%24;
const ulWho=k=>k==="commish"?"Commissioner":k?teamName(k):"Logged out";
const ulVisit=w=>w==="opened app"||w==="came back"||w==="login"||w==="first login";
const ulBad=w=>w==="wrong password"||w==="locked out";
function ulBars(cells){const mx=Math.max(1,...cells.map(c=>c[1]));
  return `<div class="ubars">${cells.map(([l,v,t])=>`<div class="ubar${v?"":" z"}" title="${esc(t)}: ${v} ${v===1?"visit":"visits"}"><em>${v&&cells.length<=14?v:""}</em><i style="height:calc((100% - 14px)*${(v/mx).toFixed(3)})"></i></div>`).join("")}</div>
    <div class="uax">${cells.map(([l])=>`<span>${esc(l)}</span>`).join("")}</div>`;}
function usageView(){
  if(!UL.rows&&!UL.err)ulLoad();
  const lv=ULOC(),ctl=`<div class="uctl">
    <div class="tabs sm" role="group" aria-label="Range">${[[7,"7 days"],[30,"30 days"],[90,"90 days"]].map(([d,l])=>`<button data-uld="${d}" aria-selected="${UL.days===d}">${l}</button>`).join("")}</div>
    <label><input type="checkbox" data-ulme ${UL.me?"checked":""}> Include my own visits</label>
    <label>Place <select data-ulloc><option value="city" ${lv==="city"?"selected":""}>City</option><option value="state" ${lv==="state"?"selected":""}>State only</option><option value="off" ${lv==="off"?"selected":""}>Off</option></select></label>
    <button class="btn ghost sm" data-ulre>${UL.busy?"Loading…":"Reload"}</button></div>`;
  const head=`<section class="panel ulog" style="grid-column:1/-1"><div class="phead"><h2>Usage log</h2><span class="hint">Only you can see this</span></div><div class="pbody">${ctl}
    <p class="hint">A visit is an app open, a return after 30+ minutes away, or a login. Place is approximate (from the internet connection, so a phone on cell data can show a nearby city) and is never more exact than a city. Device is what the phone reports, like iPhone · Home Screen app.</p></div></section>`;
  if(UL.err)return `<div class="ulwrap ulog">${head}<section class="panel" style="grid-column:1/-1"><div class="pbody"><p class="bad">${esc(UL.err)}</p></div></section></div>`;
  if(!UL.rows)return `<div class="ulwrap ulog">${head}<section class="panel" style="grid-column:1/-1"><div class="pbody"><p class="muted">Loading…</p></div></section></div>`;
  const now=Date.now(),all=UL.rows.filter(r=>UL.me||r[1]!=="commish"),V=all.filter(r=>ulVisit(r[2]));
  const today=ulDay(now),wk=now-7*864e5,vT=V.filter(r=>ulDay(r[0])===today).length,v7=V.filter(r=>r[0]>=wk);
  const teamsAll=(L?.teams||[]).map(t=>t.id),act7=new Set(v7.map(r=>r[1]).filter(k=>teamsAll.includes(k)));
  // visits per day across the range (ET days), newest on the right
  const nD=Math.min(UL.days,30),days=[];for(let i=nD-1;i>=0;i--){const ms=now-i*864e5;days.push([ulDay(ms),ms]);}
  const per={};V.forEach(r=>{const d=ulDay(r[0]);per[d]=(per[d]||0)+1;});
  const dLab=(ms,i)=>{const d=new Date(ms);const s=d.toLocaleDateString("en-US",{timeZone:"America/New_York",weekday:nD<=7?"short":undefined,month:nD<=7?undefined:"numeric",day:nD<=7?undefined:"numeric"});return nD<=7||i%Math.ceil(nD/10)===0||i===nD-1?s:"";};
  const dayCells=days.map(([d,ms],i)=>[dLab(ms,i),per[d]||0,new Date(ms).toLocaleDateString("en-US",{timeZone:"America/New_York",weekday:"short",month:"short",day:"numeric"})]);
  const busy=Object.entries(per).sort((a,b)=>b[1]-a[1])[0];
  const hrs=Array(24).fill(0);V.forEach(r=>hrs[ulHour(r[0])]++);
  const hl=h=>h===0?"12a":h<12?h+"a":h===12?"12p":(h-12)+"p";
  const hourCells=hrs.map((v,h)=>[h%3===0?hl(h):"",v,`${hl(h)} ET`]);
  const peak=hrs.indexOf(Math.max(...hrs));
  const tiles=`<div class="tiles">
    <div class="tile"><b>${vT}</b><span>visits today</span></div>
    <div class="tile"><b>${v7.length}</b><span>visits in the last 7 days</span></div>
    <div class="tile"><b>${act7.size} of ${teamsAll.length}</b><span>teams on the app this week</span></div>
    <div class="tile"><b>${V.length?(V.length/UL.days).toFixed(1):"0"}</b><span>visits a day (${UL.days}-day average)</span></div>
    <div class="tile"><b>${busy?new Date(busy[0]+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}):"–"}</b><span>busiest day${busy?` (${busy[1]} visits)`:""}</span></div>
    <div class="tile"><b>${V.length?hl(peak):"–"}</b><span>busiest hour (ET)</span></div></div>`;
  // per team: visits, days active out of the last 7, last seen, devices and usual place
  const keys=[...teamsAll,...(UL.me?["commish"]:[]),""],rowsT=keys.map(k=>{const mine=all.filter(r=>r[1]===k),mv=mine.filter(r=>ulVisit(r[2]));if(!mine.length&&!k)return null;
    const d7=new Set(mv.filter(r=>r[0]>=wk).map(r=>ulDay(r[0]))),dots=[];for(let i=6;i>=0;i--)dots.push(d7.has(ulDay(now-i*864e5)));
    const cnt=a=>{const m={};a.forEach(x=>{if(x)m[x]=(m[x]||0)+1;});return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);};
    const devs=new Set(mine.map(r=>r[5]).filter(Boolean)).size,place=cnt(mine.map(r=>r[4]))[0]||"",bad=mine.filter(r=>ulBad(r[2])).length;
    return {k,n7:mv.filter(r=>r[0]>=wk).length,n:mv.length,last:mine[0]?.[0]||0,dots,devs,dev:cnt(mine.map(r=>r[3]))[0]||"",place,bad};}).filter(Boolean)
    .sort((a,b)=>(b.last||0)-(a.last||0));
  const ago=ms=>{if(!ms)return "Not in this range";const m=Math.round((now-ms)/60e3);return m<1?"Just now":m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} h ago`:fmtStamp(ms);};
  const tTab=`<div class="scroll"><table><thead><tr><th>Team</th><th class="n">Last 7 days</th><th class="n hidep">${UL.days} days</th><th>Days on (7)</th><th>Last seen</th><th class="hidep">Usual device</th><th class="hidep">Usual place</th></tr></thead><tbody>
    ${rowsT.map(t=>`<tr><td><button class="linkbtn" data-ult="${esc(t.k||"-")}">${esc(ulWho(t.k))}</button>${t.bad?` <span class="bad" title="Wrong passwords or lockouts in this range">⚠ ${t.bad}</span>`:""}</td><td class="n">${t.n7}</td><td class="n hidep">${t.n}</td>
      <td><span class="dots" aria-label="${t.dots.filter(Boolean).length} of the last 7 days">${t.dots.map(x=>`<i class="${x?"on":""}"></i>`).join("")}</span></td><td>${esc(ago(t.last))}</td>
      <td class="hidep">${esc(t.dev)}${t.devs>1?` <span class="muted">+${t.devs-1}</span>`:""}</td><td class="hidep">${esc(t.place||"–")}</td></tr>`).join("")}</tbody></table></div>`;
  // the raw log, newest first, filterable by team
  const lg=all.filter(r=>!UL.team||(UL.team==="-"?r[1]==="":r[1]===UL.team)),show=lg.slice(0,100+UL.more);
  const opts=[["","Everyone"],...keys.filter(k=>k!==""||all.some(r=>r[1]==="")).map(k=>[k||"-",ulWho(k)])];
  const logT=`<div class="uctl" style="margin-bottom:8px"><label>Show <select data-ulteam>${opts.map(([v,l])=>`<option value="${esc(v)}" ${UL.team===v?"selected":""}>${esc(l)}</option>`).join("")}</select></label><span class="muted">${lg.length} ${lg.length===1?"entry":"entries"}</span></div>
    <div class="scroll"><table><thead><tr><th>When (ET)</th><th>Who</th><th>What</th><th class="hidep">Device</th><th>Where</th></tr></thead><tbody>
    ${show.map(r=>`<tr><td>${esc(fmtStamp(r[0]))}</td><td>${esc(ulWho(r[1]))}</td><td class="${ulBad(r[2])?"bad":""}">${esc(r[2])}</td><td class="hidep">${esc(r[3]||"–")}</td><td>${esc(r[4]||"–")}</td></tr>`).join("")||`<tr><td colspan="5" class="muted">Nothing in this range yet.</td></tr>`}</tbody></table></div>
    ${lg.length>show.length?`<button class="btn ghost sm" data-ulmore style="margin-top:8px">Show ${Math.min(200,lg.length-show.length)} more</button>`:""}`;
  return `<div class="ulwrap ulog">${head}
    <section class="panel" style="grid-column:1/-1"><div class="pbody">${tiles}</div></section>
    <section class="panel"><div class="phead"><h2>Visits per day</h2><span class="hint">Last ${nD} days</span></div><div class="pbody">${ulBars(dayCells)}</div></section>
    <section class="panel"><div class="phead"><h2>Time of day</h2><span class="hint">Visits by hour, ET, last ${UL.days} days</span></div><div class="pbody">${ulBars(hourCells)}</div></section>
    <section class="panel" style="grid-column:1/-1"><div class="phead"><h2>By team</h2><span class="hint">Newest first · tap a team for its log</span></div><div class="pbody">${tTab}</div></section>
    <section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Log</h2><span class="hint">Opens, logins, wrong passwords, logouts</span></div><div class="pbody">${logT}</div></section></div>`;}
{const _sv=scoreView;scoreView=function(){return SUB.league==="usage"&&isCommish()&&!Store.local?usageView():_sv.apply(this,arguments);};}
document.addEventListener("click",e=>{const t=e.target.closest("[data-uld],[data-ulre],[data-ulmore],[data-ult]");if(!t||!t.closest(".ulog"))return;
  if(t.dataset.uld){UL.days=+t.dataset.uld;UL.more=0;try{localStorage.setItem("dfUlDays",UL.days);}catch(x){}return ulLoad(true);}
  if(t.hasAttribute("data-ulre"))return ulLoad(true);
  if(t.hasAttribute("data-ulmore")){UL.more+=200;return renderRosters();}
  if(t.dataset.ult){UL.team=t.dataset.ult;UL.more=0;renderRosters();setTimeout(()=>document.querySelector("[data-ulteam]")?.scrollIntoView({behavior:"smooth",block:"center"}),30);}});
document.addEventListener("change",async e=>{const t=e.target;if(!t.closest?.(".ulog"))return;
  if(t.matches("[data-ulme]")){UL.me=t.checked;return renderRosters();}
  if(t.matches("[data-ulteam]")){UL.team=t.value;UL.more=0;t.blur();return renderRosters();}
  if(t.matches("[data-ulloc]")){const v=t.value;t.blur();if(await saveL({...L,accessLoc:v}))toast(v==="off"?"Place is off: phones stop sending where they are.":v==="state"?"Phones now send only their state.":"Phones now send their city.");}});
// logins, wrong passwords and logouts carry the same device and last known place (no new lookup)
{const _c=Store._call;Store._call=function(op,body){if(op==="login"||op==="claim"||op==="logout"){let w="";try{const g=JSON.parse(localStorage.getItem("dfGeo")||"null"),lv=ULOC();if(g&&lv!=="off"){const st=g.cc==="US"&&US_ST[g.reg]||g.reg;w=(lv==="state"?[st,g.cc==="US"?"":g.cc]:[g.city,st,g.cc==="US"?"":g.cc]).filter(Boolean).join(", ");}}catch(e){}
  body={dev:this.uid,ua:uaShort(),where:w,...body};}return _c.call(this,op,body);};}
