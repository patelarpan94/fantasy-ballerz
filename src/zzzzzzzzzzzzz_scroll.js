/* ============================================================================
   2.94 (BUG-392..393, 2026-11-23). Arp: "The app scrolls up sometimes random when
   I pull it up on my phone. I think it's due to the refreshes maybe?"
   Two causes:
   - BUG-392: every data refresh redraws the page. Desktop browsers keep your place
     on their own (scroll anchoring), but iPhone Safari doesn't, so when something
     above you grew or shrank (a banner, the score card, a widget, the planner
     while it works) the page moved under your finger. Background refreshes now
     pin whatever is at the top of the screen and put it back where it was, and
     the page holds its height for a moment so it can't snap up while it fills.
   - BUG-393: bringing the app back can reload it (a new version came out, or the
     iPhone closed it in the background), and a reload always started at the top.
     The app now remembers where you were on each screen and goes back there
     after a reload (up to 3 hours later), unless you've started scrolling.
   Changing tabs, weeks or teams still starts at the top, like before.
   ============================================================================ */
(function(){
  const viewKey=()=>{try{return nav+"|"+(SUB[nav]||"")+"|"+cur+"|"+(wk&&wk[0])+"|"+(typeof dashCur==="function"&&nav==="dash"?dashCur():"");}catch(e){return "";}};
  const pageKey=()=>{try{return nav+"|"+(SUB[nav]||"");}catch(e){return "";}};
  let lastAct=0,lastMove=0;
  const act=()=>{lastAct=Date.now();},move=()=>{lastMove=Date.now();};
  ["pointerdown","keydown","click"].forEach(t=>addEventListener(t,act,true));
  ["touchmove","wheel"].forEach(t=>addEventListener(t,move,{capture:true,passive:true}));
  addEventListener("keydown",e=>{if(/^(Arrow|Page|Home|End| )/.test(e.key))move();},true);
  try{history.scrollRestoration="manual";}catch(e){}

  /* ---------------- BUG-392: keep your place while the page redraws ---------------- */
  const barH=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--barh"))||0;
  const pinned=el=>{for(let n=el;n&&n!==document.body;n=n.parentElement){const p=getComputedStyle(n).position;if(p==="fixed"||p==="sticky")return true;}return false;};
  // the element at the top of the screen, as a path of child positions from <body>, with each level's top
  function grab(){const x=Math.round(innerWidth/2);
    for(let y=barH()+12;y<innerHeight*.6;y+=36){let el=document.elementFromPoint(x,y);
      if(!el||el===document.body||el===document.documentElement||pinned(el)||el.closest("dialog"))continue;
      // a gap between blocks hits the container: go down to the block at (or just below) that line
      for(let k=0;k<12&&el.children.length;k++){let nx=null;
        for(const c of el.children){const r=c.getBoundingClientRect();if(!r.height||pinned(c))continue;
          if(r.top<=y&&r.bottom>y){nx=c;break;}if(r.top>y&&(!nx||r.top<nx.getBoundingClientRect().top))nx=c;}
        if(!nx)break;el=nx;}
      const chain=[];for(let n=el;n&&n!==document.body;n=n.parentElement){const par=n.parentElement;if(!par)return null;
        chain.unshift({i:[...par.children].indexOf(n),tag:n.tagName,id:n.id||"",cls:String(n.className||""),tx:(n.textContent||"").slice(0,60),top:0,n});}
      chain.forEach(c=>{c.top=c.n.getBoundingClientRect().top;c.n=null;});return chain;}
    return null;}
  // how far the deepest element that still matches has moved. Blocks can be added or
  // removed above it, so look near its old position for the same kind of element.
  function find(par,c){if(c.id){const k=document.getElementById(c.id);return k&&k.parentElement===par&&k.tagName===c.tag?k:null;}
    const ks=par.children;let best=null,bs=-1;
    for(let o=0;o<=8;o++)for(const j of o?[c.i-o,c.i+o]:[c.i]){const k=ks[j];if(!k||k.tagName!==c.tag)continue;
      const sc=(String(k.className||"")===c.cls?2:0)+((k.textContent||"").slice(0,60)===c.tx?3:0)-o*.01;if(sc>bs){bs=sc;best=k;}}
    return bs>=2?best:null;}
  function drift(chain){let n=document.body,d=null;
    for(const c of chain){const k=find(n,c);if(!k)break;
      n=k;const r=k.getBoundingClientRect();if(r.height||r.width)d=r.top-c.top;}
    return d;}
  let depth=0,lastKey="",job=null;
  const R=()=>document.getElementById("rosters");
  function before(){const k=viewKey(),bg=Date.now()-lastAct>800;
    if(!bg||k!==lastKey||scrollY<4||document.hidden)return null;
    const chain=grab();if(!chain)return null;const el=R();
    const s={k,chain,y:scrollY,at:Date.now(),h:el?el.offsetHeight:0};
    if(el&&s.h){el.style.minHeight=s.h+"px";}
    return s;}
  function fix(s){if(!s||viewKey()!==s.k||lastMove>s.at)return false;const d=drift(s.chain);
    if(d!=null&&Math.abs(d)>=1)scrollTo(0,scrollY+d);return true;}
  function after(s){lastKey=viewKey();if(!s)return;fix(s);
    if(job)job.stop();const ts=[];let off=false;
    const stop=()=>{if(off)return;off=true;ts.forEach(clearTimeout);const el=R();if(el&&el.style.minHeight===s.h+"px")el.style.minHeight="";};
    job={stop};
    requestAnimationFrame(()=>{if(!off&&!fix(s))stop();});
    [120,350,800,1400].forEach(t=>ts.push(setTimeout(()=>{if(!off&&!fix(s))stop();},t)));
    ts.push(setTimeout(stop,1600));}
  const wrap=name=>{const f=window[name];if(typeof f!=="function"||f.__keep)return;
    const g=function(){if(depth++)try{return f.apply(this,arguments);}finally{depth--;}
      let s=null;try{s=before();}catch(e){}
      try{return f.apply(this,arguments);}finally{depth--;try{after(s);}catch(e){console.warn(e);}}};
    g.__keep=1;window[name]=g;
    // the global function names have to point at the wrapper too
    try{if(name==="render")render=g;else if(name==="renderRosters")renderRosters=g;}catch(e){}};
  window.__keepPlace={grab,drift,before,after,get lastKey(){return lastKey;},viewKey};
  const hook=()=>{wrap("render");wrap("renderRosters");};
  hook();addEventListener("DOMContentLoaded",()=>setTimeout(hook,0));

  /* ---------------- BUG-393: come back to the same spot after a reload ---------------- */
  const SK="dfScroll";let saveT=0;
  const save=()=>{if(RESTORE.on)return;try{if(!L||!booted)return;const all=JSON.parse(localStorage.getItem(SK)||"{}"),now=Date.now();
    all[pageKey()]={y:Math.round(scrollY),at:now};
    for(const k in all)if(now-all[k].at>3*3600e3)delete all[k];localStorage.setItem(SK,JSON.stringify(all));}catch(e){}};
  addEventListener("scroll",()=>{if(saveT)return;saveT=setTimeout(()=>{saveT=0;save();},400);},{passive:true});
  addEventListener("pagehide",save);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)save();});
  const RESTORE={on:true,t0:Date.now()};
  const tryRestore=()=>{if(!RESTORE.on)return;
    if(lastMove>RESTORE.t0||lastAct>RESTORE.t0||Date.now()-RESTORE.t0>12000){RESTORE.on=false;return;}
    let L_=false;try{L_=!!L&&booted&&!!R()&&!(document.getElementById("gate")&&!document.getElementById("gate").hidden);}catch(e){}
    if(!L_)return;let s=null;try{s=JSON.parse(localStorage.getItem(SK)||"{}")[pageKey()];}catch(e){}
    if(!s||Date.now()-s.at>3*3600e3||s.y<40){RESTORE.on=false;return;}
    const max=document.documentElement.scrollHeight-innerHeight;
    if(max>=s.y-2){scrollTo(0,s.y);if(Math.abs(scrollY-s.y)<3){RESTORE.done=(RESTORE.done||0)+1;if(RESTORE.done>=4)RESTORE.on=false;}}};
  const iv=setInterval(()=>{tryRestore();if(!RESTORE.on){clearInterval(iv);save();}},250);
})();
