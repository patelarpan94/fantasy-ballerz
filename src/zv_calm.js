/* ============================================================================
   2.48 (2026-11-05). Arp: "the page also does this glitch behavior when it's
   open. It blinks." Cause: every refresh (each minute, every 30 s on game
   nights, and each time the league server sends new data) rebuilt the whole
   dashboard from scratch. That re-made every player photo (initials first,
   then the photo faded back in), restarted every moving background and
   border, replayed the hero court drawing and the alert slide-in, closed open
   panels, and the Win-the-week planner went blank ("Planning your week…") for
   a moment, which made the whole page below it jump up and back.
   - Refreshes now patch the board in place: only text and numbers that
     changed are touched; photos, animations and open panels stay put.
   - The planner keeps showing its last plan while it works out the new one.
   ============================================================================ */
const DKEEP=["rv","in","dfirst","uihid","folded"];
const dFaceKey=(fn,ft,cls)=>fn+"|"+(ft||"")+"|"+String(cls||"").replace(/\s+/g," ").trim();
{const _af=arpFace;arpFace=function(name,team,cls){const s=_af.apply(this,arguments);try{s.dataset.afk=dFaceKey(name,team,cls);}catch(e){}return s;};}

// make live node a look like fresh node b; returns the node that belongs in a's place
function dMorph(a,b){
  if(a.nodeType!==b.nodeType||a.nodeName!==b.nodeName)return b;
  if(a.nodeType!==1){if(a.nodeValue!==b.nodeValue)a.nodeValue=b.nodeValue;return a;}
  // a player photo already drawn for the same player: keep it (no reload, no fade)
  if(a.dataset.afk&&b.classList.contains("dface")&&b.dataset.fn!=null)
    return a.dataset.afk===dFaceKey(b.dataset.fn,b.dataset.ft,b.className.replace("dface","").trim())?a:b;
  for(const at of [...b.attributes]){const v=at.value;
    if(at.name==="class"){const keep=DKEEP.filter(c=>a.classList.contains(c)&&!b.classList.contains(c));const nv=keep.length?v+" "+keep.join(" "):v;if(a.getAttribute("class")!==nv)a.setAttribute("class",nv);continue;}
    if(at.name==="style"){if(a.getAttribute("style")!==v){const gr=a.style.gridRowEnd,i=a.style.getPropertyValue("--i");a.setAttribute("style",v);if(gr&&!a.style.gridRowEnd)a.style.gridRowEnd=gr;if(i&&!a.style.getPropertyValue("--i"))a.style.setProperty("--i",i);}continue;}
    if(a.getAttribute(at.name)!==v)a.setAttribute(at.name,v);}
  for(const at of [...a.attributes]){const n=at.name;if(b.hasAttribute(n))continue;
    if(n==="open"&&a.nodeName==="DETAILS")continue;
    if(n==="class"){const keep=DKEEP.filter(c=>a.classList.contains(c));keep.length?a.setAttribute("class",keep.join(" ")):a.removeAttribute("class");continue;}
    if(n==="style"&&(a.style.gridRowEnd||a.style.getPropertyValue("--i"))){const gr=a.style.gridRowEnd,i=a.style.getPropertyValue("--i");a.removeAttribute("style");if(gr)a.style.gridRowEnd=gr;if(i)a.style.setProperty("--i",i);continue;}
    a.removeAttribute(n);}
  dMorphKids(a,b);
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(a.nodeName)&&a!==document.activeElement){
    if(a.type==="checkbox"||a.type==="radio")a.checked=b.checked;else if(a.value!==b.value)a.value=b.value;}
  return a;}
function dMorphKids(a,b){
  const ac=[...a.childNodes],bc=[...b.childNodes],key=n=>n.nodeType===1?(n.dataset.dw||n.dataset.dwid||n.id||""):"";
  const keyed=new Map();ac.forEach(n=>{const k=key(n);if(k&&!keyed.has(k))keyed.set(k,n);});
  const used=new Set();let j=0;const out=[];
  for(const nb of bc){const k=key(nb);let na=null;
    if(k){na=keyed.get(k)||null;if(na&&used.has(na))na=null;}
    else{while(j<ac.length&&(used.has(ac[j])||key(ac[j])))j++;if(j<ac.length)na=ac[j++];}
    let r=nb;if(na){used.add(na);r=dMorph(na,nb);}out.push(r);}
  out.forEach((n,i)=>{if(a.childNodes[i]!==n)a.insertBefore(n,a.childNodes[i]||null);});
  while(a.childNodes.length>out.length)a.lastChild.remove();}

let DPAINT={b:null,e:null};
dashPaint=function(el,h){const b=dashCur(),same=el.dataset.view==="dash"&&DPAINT.b===b&&DPAINT.e===DASH_EDIT&&!DASH_EDIT&&el.firstElementChild;
  DPAINT={b,e:DASH_EDIT};
  if(!same){el.innerHTML=h;return;}
  try{const t=document.createElement("div");t.innerHTML=h;dMorphKids(el,t);if(typeof uiCards==="function")uiCards();}
  catch(e){console.warn(e);el.innerHTML=h;}};

// planner: keep the last plan on screen while the new one is worked out
{const _dp=dPlan;let last=null;dPlan=function(T,sync){const r=_dp.apply(this,arguments);
  if(r!==undefined){last={T,r};return r;}
  return last&&last.T===T&&!sync?last.r:r;};}
