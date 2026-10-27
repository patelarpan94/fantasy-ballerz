
/* ============================================================================
   GITHUB APP: the league lives in a Google Sheet behind an Apps Script web
   app (Store above). A 1-minute Google timer pulls ESPN during games, so
   Refresh only asks the server for anything new; the commissioner's Refresh
   also starts a full ESPN pull right away.
   ============================================================================ */
// badges come back keyed by sha256(code hash), so the list can't be used to log in
function bid(h){if(!h)return "";if(bid.m[h])return bid.m[h];
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const b=[...new TextEncoder().encode(h)],l=b.length*8;b.push(0x80);while(b.length%64!==56)b.push(0);for(let i=7;i>=0;i--)b.push(i>3?0:(l>>>(i*8))&255);
  const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],r=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let o=0;o<b.length;o+=64){const w=[];for(let i=0;i<16;i++)w[i]=(b[o+i*4]<<24)|(b[o+i*4+1]<<16)|(b[o+i*4+2]<<8)|b[o+i*4+3];
    for(let i=16;i<64;i++){const s0=r(w[i-15],7)^r(w[i-15],18)^(w[i-15]>>>3),s1=r(w[i-2],17)^r(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0;}
    let [a,c,d,e,f,g,k,m]=H;for(let i=0;i<64;i++){const t1=(m+(r(f,6)^r(f,11)^r(f,25))+((f&g)^(~f&k))+K[i]+w[i])|0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&c)^(a&d)^(c&d)))|0;m=k;k=g;g=f;f=(e+t1)|0;e=d;d=c;c=a;a=(t1+t2)|0;}
    [a,c,d,e,f,g,k,m].forEach((x,i)=>H[i]=(H[i]+x)|0);}
  return bid.m[h]=H.map(x=>(x>>>0).toString(16).padStart(8,"0")).join("");}
bid.m={};
/* ESPN FEED: ESPN's box-score feed refuses Google's servers but allows browsers, so
   the app pulls it. One open device at a time holds the "feed" lease (refresh/feed,
   2.5 minutes, renewed each minute) and runs the same pull code as the Apps Script
   backend (Code.gs, below) in a background worker: every minute while games are
   on, a full pull (injuries, news, ownership) once an hour. Results are saved for
   everyone; unchanged docs are skipped. */
const FEED_SRC=/*FEED_SRC*/"";
const FEED_SHIMS=`var __props={},__cache={},__meta=null,__in={},__out=[];
var PropertiesService={getScriptProperties:function(){return {getProperty:function(k){return k in __props?__props[k]:null},setProperty:function(k,v){__props[k]=String(v)},deleteProperty:function(k){delete __props[k]},getProperties:function(){return Object.assign({},__props)}}}};
var CacheService={getScriptCache:function(){return {get:function(k){var x=__cache[k];return x&&x.e>Date.now()?x.v:null},put:function(k,v,s){__cache[k]={v:v,e:Date.now()+(s||600)*1000}},remove:function(k){delete __cache[k]}}}};
var Utilities={sleep:function(){},formatDate:function(d,tz,f){var p={};new Intl.DateTimeFormat("en-US",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d).forEach(function(x){p[x.type]=x.value});
  return f.replace("yyyy",p.year).replace("MM",p.month).replace("dd",p.day).replace("H",String(+p.hour)).replace("m",String(+p.minute));}};
function __get(u,h){var x=new XMLHttpRequest();try{x.open("GET",u,false);for(var k in h||{})x.setRequestHeader(k,h[k]);x.send();}catch(e){return {getResponseCode:function(){return 0},getContentText:function(){return ""}};}
  return {getResponseCode:function(){return x.status},getContentText:function(){return x.responseText}};}
var UrlFetchApp={fetch:function(u,o){return __get(u,o&&o.headers)},fetchAll:function(rs){return rs.map(function(r){return __get(r.url,r.headers)})}};
var LockService={getScriptLock:function(){return {waitLock:function(){},releaseLock:function(){}}}};
var SpreadsheetApp={},ContentService={},ScriptApp={},DriveApp={},Logger={log:function(){}};
`;
const FEED_TAIL=`
getDoc_=function(c,id){return __in[c+"/"+id]||null};
getCol_=function(){return {}};
putDoc_=function(c,id,v){__out.push({c:c,i:id,v:v});return true};
meta_=function(){return __meta};
saveMeta_=function(m){__meta=m};
onmessage=function(e){var d=e.data;__in=d.docs;__out=[];
  if(!__meta)__meta={days:{},tips:{}};
  for(var sp in d.days){var a=__meta.days[sp]||(__meta.days[sp]={}),b=d.days[sp];if(b.final){a.final=true;a.finalAt=a.finalAt||b.finalAt;}if(b.hist)a.hist=true;}
  var msg;try{msg=syncEspn_(d.full,d.maxDays||4);}catch(x){msg="failed: "+x;}
  postMessage({id:d.id,msg:msg,out:__out,meta:__meta});};
`;
const FEED={w:null,busy:false,id:0,cb:{},meta:null,log:[]};
function feedWorker(){
  if(!FEED.w){FEED.w=new Worker(URL.createObjectURL(new Blob([FEED_SHIMS+FEED_SRC+FEED_TAIL],{type:"text/javascript"})));
    FEED.w.onmessage=e=>{const f=FEED.cb[e.data.id];delete FEED.cb[e.data.id];f&&f(e.data);};}
  return FEED.w;
}
const feedStrip=d=>{if(!d)return null;const {id,...v}=d;return v;};
function feedRun(full,maxDays){return new Promise(res=>{const id=++FEED.id;FEED.cb[id]=res;
  const docs={};if(L)docs["league/"+SEASON]=feedStrip(L);if(NBA)docs["nba/"+SEASON]=feedStrip(NBA);
  const days={};Object.values(STATS||{}).forEach(s=>{if(s&&s.sp!=null)days[s.sp]={final:!!s.final,finalAt:s.at||0,hist:!!s.hist};});
  feedWorker().postMessage({id,full,maxDays,docs,days});});}
const feedSame=(a,b)=>{const x={...a},y={...b};delete x.at;delete y.at;delete x.id;delete y.id;return JSON.stringify(x)===JSON.stringify(y);};
async function feedSave(out){let n=0;
  for(const x of out){const cur=Store._d[x.c]?.[x.i]?.v;if(cur&&feedSame(cur,x.v))continue;
    try{await Store.set(x.c,x.i,x.v);n++;}catch(e){}}
  return n;}
// the lease: only one device pulls at a time; a forced pull (commissioner's Refresh) takes it over
async function feedLease(force){
  const me=Store.uid,now=Date.now(),cur=await Store._call("get",{c:"refresh",i:"feed"}),v=cur.v||{};
  if(!force&&v.holder&&v.holder!==me&&v.until>now)return null;
  const nv={...v,holder:me,until:now+150e3};
  try{await Store._call("set",{c:"refresh",i:"feed",v:nv,ifRev:cur.r||0});}catch(e){return null;}
  return nv;
}
// the same game window as the backend: 1 hour before the first tip to 1 hour after the last final
function feedInWindow(){const M=FEED.meta;if(!M)return true;const T=todaySp(),now=Date.now();
  for(let sp=T-1;sp<=T;sp++){const t=M.tips[sp],d=M.days[sp]||{};if(!t||now<t[0]-3600e3)continue;if(!d.final||now<=(d.finalAt||0)+3600e3)return true;}
  return false;}
async function feedTick(force){
  if(FEED.busy||Store.local||!Store.db||!SESSION||!L||(document.hidden&&!force))return null;
  FEED.busy=true;
  try{
    const lease=await feedLease(force);if(!lease)return {msg:"Another phone is pulling ESPN right now.",saved:0};
    const full=force||Date.now()-(lease.lastFull||0)>=59.5*60e3;
    if(!full&&!feedInWindow())return null;
    const r=await feedRun(full,8);FEED.meta=r.meta;
    r.saved=await feedSave(r.out);FEED.log.push({at:Date.now(),full,msg:r.msg,saved:r.saved});if(FEED.log.length>30)FEED.log.shift();
    if(full)await Store._call("update",{c:"refresh",i:"feed",v:{lastFull:Date.now(),msg:String(r.msg).slice(0,500)}}).catch(()=>{});
    return r;
  }catch(e){const r={msg:"failed: "+(e?.message||e),saved:0};FEED.log.push({at:Date.now(),full:force,msg:r.msg,saved:0});return r;}
  finally{FEED.busy=false;}
}
setTimeout(()=>feedTick(),8000);setInterval(()=>feedTick(),60e3);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(()=>feedTick(),3000);});
ERR.cloud="Data updates from ESPN automatically while the app is open: every minute during games, hourly otherwise.";
async function refresh(){
  if(busy||!L)return;const btn=$("#refreshBtn");
  if(Store.local){showUpdated("Preview mode: no league server is set.",true);return;}
  busy=true;btn.disabled=true;
  try{
    showUpdated(isCommish()?"Pulling ESPN now…":"Checking for updates…");
    let r=null;for(let k=0;k<20&&FEED.busy;k++)await new Promise(z=>setTimeout(z,500));
    r=await feedTick(isCommish());await Store.poll();showUpdated();
    toast(r&&isCommish()?(/failed/.test(r.msg)?"ESPN pull had a problem: "+r.msg.slice(0,160):`ESPN data refreshed (${r.saved||0} updated). ${String(r.msg).replace(/^Full pull\. settings are set in the app; /,"").slice(0,120)}`):ERR.cloud);
  }catch(e){showUpdated(e?.message||"Couldn't reach the league server.",true);}
  finally{busy=false;btn.disabled=false;}
}

// a new version on GitHub: reload when the app is opened or brought back, so nobody runs a stale copy
async function checkVersion(){
  try{const r=await fetch(`version.json?t=${Date.now()}`,{cache:"no-store"});if(!r.ok)return;const j=await r.json();
    const u=new URL(location.href);if(j.v&&DF_CONFIG.build&&j.v!==DF_CONFIG.build&&!FEED.busy&&u.searchParams.get("v")!==j.v){u.searchParams.set("v",j.v);location.replace(u.toString());}}catch(e){}
}
setTimeout(checkVersion,1500);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkVersion();});

/* a commissioner link ending #codes=<base64 json> fills in League › Settings › Access codes.
   The codes travel only in the link (the part after # never reaches the server), never in the app's files. */
(function(){
  try{const m=location.hash.match(/codes=([^&]+)/);if(m){sessionStorage.setItem("dfCodes",atob(decodeURIComponent(m[1])));history.replaceState(null,"",location.pathname+location.search);}}catch(e){}
  let C=null;try{C=JSON.parse(sessionStorage.getItem("dfCodes")||"null");}catch(e){}
  if(!C)return;
  const t=setInterval(()=>{if(!L||!isCommish())return;clearInterval(t);try{sessionStorage.removeItem("dfCodes");}catch(e){}
    CODEF={...(SECRET?.codes||{}),...C};CODE_DIRTY=true;renderRosters();toast("Codes filled in. Open League › Settings and tap Save codes.");},1000);
})();

/* the app draws under the iPhone status bar (black-translucent), wherever iOS puts it: on top,
   or down the side of a folded Duo. The header and page already pad their content by the safe
   areas; the strip above the sticky header gets the header's own colors, or the dark brand color
   when the header is light, so the white status icons stay readable. */
function paintTop(){const b=document.querySelector(".bar");if(!b)return;const cs=getComputedStyle(b);let bg=cs.backgroundImage;
  if(!bg||bg==="none"){const m=cs.backgroundColor.match(/\d+(\.\d+)?/g)||[];const lum=m.length>=3?(0.299*m[0]+0.587*m[1]+0.114*m[2])/255:0;bg=lum>0.5?"#17202c":cs.backgroundColor;}
  document.documentElement.style.setProperty("--topbg",bg);}
new MutationObserver(()=>paintTop()).observe(document.documentElement,{attributes:true,attributeFilter:["class","style","data-theme"]});
new MutationObserver(()=>paintTop()).observe(document.body,{attributes:true,attributeFilter:["class"]});
paintTop();

/* folded iPhone Duo: iOS puts the status bar in a strip down the right edge. If iOS ever lets a
   web app reach into it (a right safe area), the tab bar becomes a column of icons there, like
   Instagram. As of Oct 2026 home-screen web apps get a 373px window and no safe area, so this sleeps.
   --sr is the strip's width (the right safe area), measured here. */
(function(){
  const st=document.createElement("style");st.textContent=`
html.siderail body{padding-bottom:0!important}
html.siderail .navwrap{left:auto!important;right:0!important;bottom:auto!important;top:var(--railtop,250px)!important;width:var(--sr);padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
html.siderail .mainnav{flex-direction:column!important;gap:4px!important;padding:6px 0!important;margin:0 auto;width:calc(var(--sr) - 14px);border-radius:999px;background:var(--surface)!important;border:1px solid var(--line)!important;box-shadow:0 6px 20px -8px rgba(0,0,0,.5)}
html.nbat.siderail .mainnav{background:var(--nbag)!important}
html.siderail .mainnav button{flex:0 0 auto!important;padding:6px 0!important;border-top:0!important;font-size:0!important;letter-spacing:0;border-radius:999px}
html.siderail .mainnav button[aria-selected="true"]{background:color-mix(in srgb,var(--accent) 22%,transparent)}
html.siderail .mainnav button svg{width:22px;height:22px}
html.siderail .mainnav .dot{top:4px;right:6px}
html.siderail .chatfab{right:calc(var(--sr) + 12px)!important}
html.siderail .chatdock:not([hidden]){right:var(--sr)!important;bottom:env(safe-area-inset-bottom,0px)!important}`;
  document.head.appendChild(st);
  const probe=document.createElement("div");probe.style.cssText="position:fixed;visibility:hidden;pointer-events:none;padding-right:env(safe-area-inset-right,0px);padding-top:env(safe-area-inset-top,0px)";
  document.documentElement.appendChild(probe);
  function measure(){const cs=getComputedStyle(probe);let sr=parseFloat(cs.paddingRight)||0;
    try{const t=+localStorage.getItem("dfTestRail");if(t)sr=t;}catch(e){}
    const on=sr>=40&&innerHeight>innerWidth;document.documentElement.classList.toggle("siderail",on);
    document.documentElement.style.setProperty("--sr",sr+"px");}
  measure();addEventListener("resize",measure);addEventListener("orientationchange",()=>setTimeout(measure,300));
})();

/* ?debug=1 (until ?debug=0) shows what the device reports: screen size, safe areas, home-screen mode and the build */
(function(){
  let on=false;try{const q=new URLSearchParams(location.search).get("debug");if(q!==null)localStorage.setItem("dfDebug",q);on=localStorage.getItem("dfDebug")==="1";}catch(e){}
  if(!on)return;
  const pr=document.createElement("div");pr.style.cssText="position:fixed;visibility:hidden;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";document.documentElement.appendChild(pr);
  const box=document.createElement("div");box.style.cssText="position:fixed;left:8px;top:45%;z-index:99;background:#000c;color:#fff;font:12px/1.4 ui-monospace,monospace;padding:8px 10px;border-radius:8px;pointer-events:none;white-space:pre";document.documentElement.appendChild(box);
  const show=()=>{const c=getComputedStyle(pr);box.textContent=[`build ${DF_CONFIG.build}`,`window ${innerWidth}x${innerHeight}  screen ${screen.width}x${screen.height}`,`safe T${c.paddingTop} R${c.paddingRight} B${c.paddingBottom} L${c.paddingLeft}`,`home-screen app: ${navigator.standalone===true||matchMedia("(display-mode: standalone)").matches}`,`rail: ${document.documentElement.classList.contains("siderail")}`].join("\n");};
  show();addEventListener("resize",show);setInterval(show,2000);
})();
