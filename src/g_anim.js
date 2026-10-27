
/* ============================================================================
   ANIMATIONS (2026-10-22). All skip when the phone or browser asks for reduced motion.
   ============================================================================ */
const NOMO=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
const isPhone=()=>PHONE();
const NAV_ORDER=["team","matchup","players","league","pickem","analytics","draft"];
const replay=(el,cls)=>{if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);el.addEventListener("animationend",()=>el.classList.remove(cls),{once:true});};

// ---- 1. sheets and help slide up on phones, slide down to close, swipe down on the top to close
{const dlgs=[$("#sheet"),$("#helpDlg"),$("#relDlg")].filter(Boolean);
 dlgs.forEach(d=>{
  const real=HTMLDialogElement.prototype.close;
  d.close=function(...a){if(!this.open)return;if(NOMO()||!isPhone()){real.apply(this,a);return;}
    if(this._closing)return;this._closing=true;this.classList.add("dlgout");
    this._ct=setTimeout(()=>{this._closing=false;this.classList.remove("dlgout");this.style.transform="";real.apply(this,a);},220);};
  // reopened while it slides away (Account › Display settings): cancel the close so the new sheet stays
  const show=HTMLDialogElement.prototype.showModal;
  d.showModal=function(...a){if(this._closing){clearTimeout(this._ct);this._closing=false;this.classList.remove("dlgout");this.style.transform="";if(this.open)return;}return show.apply(this,a);};
  const head=d.querySelector(".hhead");if(head)head.insertAdjacentHTML("afterbegin",'<span class="dgrab" aria-hidden="true"></span>');
  let y0=null,dy=0,t0=0;
  d.addEventListener("touchstart",e=>{if(!isPhone()||NOMO())return;const body=d.querySelector(".hbody");if(!e.target.closest(".hhead")&&body&&body.scrollTop>0)return;if(e.target.closest("input,select,textarea,label"))return;y0=e.touches[0].clientY;dy=0;t0=Date.now();d.style.transition="none";},{passive:true});
  d.addEventListener("touchmove",e=>{if(y0==null)return;dy=Math.max(0,e.touches[0].clientY-y0);if(dy>4){d.style.transform=`translateY(${dy}px)`;if(e.cancelable)e.preventDefault();}},{passive:false});
  const end=()=>{if(y0==null)return;y0=null;d.style.transition="";if(dy>110||(dy>40&&dy/(Date.now()-t0)>.5))d.close();else{d.style.transition="transform .2s ease";d.style.transform="";setTimeout(()=>d.style.transition="",220);}};
  d.addEventListener("touchend",end);d.addEventListener("touchcancel",end);});}

// ---- 2. swipe left/right on My Team to change days (phones)
{let x0=null,y0=0,ok=false;
 document.addEventListener("touchstart",e=>{x0=null;if(!isPhone()||nav!=="team"||!e.target.closest("#rosters")||e.target.closest(".scroll,.ptw,.ptstrip,.dpcs,.hfunrow,.movepop,input,select,textarea"))return;x0=e.touches[0].clientX;y0=e.touches[0].clientY;ok=true;},{passive:true});
 document.addEventListener("touchmove",e=>{if(x0==null)return;if(Math.abs(e.touches[0].clientY-y0)>40)ok=false;},{passive:true});
 document.addEventListener("touchend",e=>{if(x0==null||!ok)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)<70)return;
   const i=DAYS.indexOf(viewDay()),j=i+(dx<0?1:-1);if(j<0||j>=DAYS.length){SLIDE_DIR=dx<0?"l":"r";stepWeek(dx<0?1:-1);return;}
   selDay=DAYS[j];MOVING=null;SLIDE_DIR=dx<0?"l":"r";try{renderBox();renderDays();renderHero();}catch(x){}renderRosters();});}
let SLIDE_DIR=null;
// past the last day of a matchup: go to the next matchup's first day (or back to the previous one's last day)
function stepWeek(dir){const n=wk[0]+dir;if(n<1||n>WEEKS.length)return;wk=WEEKS[n-1];load();selDay=dir>0?DAYS[0]:DAYS[DAYS.length-1];MOVING=null;try{renderBox();renderDays();renderHero();}catch(x){}renderRosters();}

// ---- 3. lineup moves glide (FLIP), the lineup alert folds away after Fix lineup
// ---- 4. changed numbers tick up and flash
{let lastKey="",rects={},vals={};
 const key=()=>nav+"|"+(SUB[nav]||"")+"|"+cur+"|"+wk[0]+"|"+viewDay();
 const _rr=renderRosters;renderRosters=function(){
   const el=$("#rosters"),k=key(),same=k===lastKey&&!NOMO();
   if(same){rects={};el.querySelectorAll(".card.cr .who[data-log]").forEach(b=>{const c=b.closest(".card");if(c.offsetParent)rects[b.dataset.log]=c.getBoundingClientRect().top;});}
   _rr();
   if(SLIDE_DIR&&!NOMO()){el.classList.add(SLIDE_DIR==="l"?"swl":"swr");setTimeout(()=>el.classList.remove("swl","swr"),300);SLIDE_DIR=null;}
   if(same)el.querySelectorAll(".card.cr .who[data-log]").forEach(b=>{const c=b.closest(".card"),old=rects[b.dataset.log];if(old==null||!c.offsetParent)return;const d=old-c.getBoundingClientRect().top;if(Math.abs(d)<2)return;
     c.style.transition="none";c.style.transform=`translateY(${d}px)`;c.style.position="relative";c.style.zIndex=2;requestAnimationFrame(()=>{c.style.transition="transform .38s cubic-bezier(.2,.8,.2,1)";c.style.transform="";setTimeout(()=>{c.style.transition="";c.style.zIndex="";},420);});});
   lastKey=k;tick();};
 const tick=()=>{if(NOMO())return;document.querySelectorAll("[data-tk]").forEach(e=>{const k=e.dataset.tk,t=e.textContent,o=vals[k];vals[k]=t;if(o==null||o===t)return;
   replay(e,"tkflash");const a=parseFloat(o),b=parseFloat(t);if(/^-?\d+$/.test(t)&&/^-?\d+$/.test(o)&&b>a&&b-a<=60){let s=null;const step=ts=>{s=s||ts;const f=Math.min(1,(ts-s)/600);e.textContent=String(Math.round(a+(b-a)*f));if(f<1)requestAnimationFrame(step);else e.textContent=t;};requestAnimationFrame(step);}});};
 const _rh=renderHero;renderHero=function(){_rh();tick();};}
document.addEventListener("click",e=>{const b=e.target.closest("[data-fixday]");if(!b||NOMO())return;const a=b.closest(".lalert");if(a)a.classList.add("lagone");},true);

// ---- 5. bars grow in, and 8. pages slide, right after a tab change
{const _sn=setNav;setNav=function(n,sub){const from=NAV_ORDER.indexOf(nav),to=NAV_ORDER.indexOf(n);_sn(n,sub);if(NOMO())return;
  document.body.classList.remove("navin","pgl","pgr");void document.body.offsetWidth;document.body.classList.add("navin");if(isPhone()&&from>=0&&to>=0&&from!==to)document.body.classList.add(to>from?"pgl":"pgr");
  clearTimeout(setNav._t);setNav._t=setTimeout(()=>document.body.classList.remove("navin","pgl","pgr"),900);};
 addEventListener("load",()=>{if(!NOMO()){document.body.classList.add("navin");setTimeout(()=>document.body.classList.remove("navin"),900);}});}

// ---- 6. pull down to refresh (phones, at the top of the page)
{let y0=null,dy=0;const ind=document.createElement("div");ind.className="ptr";ind.innerHTML='<span class="ptri">↓</span><span class="ptrt">Pull to refresh</span>';document.body.appendChild(ind);
 document.addEventListener("touchstart",e=>{y0=null;if(!isPhone()||scrollY>0||CHAT_OPEN||document.querySelector("dialog[open]")||e.target.closest(".chatpane,.movepop,.gate"))return;y0=e.touches[0].clientY;dy=0;},{passive:true});
 document.addEventListener("touchmove",e=>{if(y0==null)return;dy=e.touches[0].clientY-y0;if(dy<=0||scrollY>0){ind.style.transform="";ind.classList.remove("on","go");return;}
   const p=Math.min(dy,140);ind.classList.add("on");ind.style.transform=`translateY(${p*.6}px)`;ind.classList.toggle("go",dy>90);ind.querySelector(".ptrt").textContent=dy>90?"Release to refresh":"Pull to refresh";},{passive:true});
 document.addEventListener("touchend",()=>{if(y0==null)return;const go=dy>90;y0=null;ind.classList.remove("on","go");ind.style.transform="";
   if(go){const b=$("#refreshBtn");if(b&&!b.disabled&&!b.hidden)b.click();else{render();toast("Up to date");}}});}

// ---- 7. small celebrations
// chat: the bar buzzes on a new message
{let last=null;const _rc=renderChat;renderChat=function(){_rc();const n=["league",...new Set(CHAT_D.map(m=>m.ch))].reduce((s,ch)=>s+chatUnread(ch),0);
  if(last!=null&&n>last&&!NOMO()){replay($("#chatDock"),"buzz");replay($("#chatFab"),"buzz");try{navigator.vibrate?.(30);}catch(e){}}last=n;};}
// + and − pop when tapped
document.addEventListener("click",e=>{const b=e.target.closest(".actb,.mvb,.dpc,.btn");if(b&&!NOMO())replay(b,"pop");},true);
// confetti once per matchup you won, the first time you open it after it ends
function confetti(){const box=document.createElement("div");box.className="confetti";const C=["#2f6fed","#1f9d55","#f2b01e","#e5484d","#8e4ec6"];
  for(let i=0;i<70;i++){const s=document.createElement("i");s.style.left=Math.random()*100+"%";s.style.background=C[i%C.length];s.style.animationDelay=Math.random()*.6+"s";s.style.animationDuration=1.6+Math.random()*1.2+"s";s.style.setProperty("--dx",(Math.random()*120-60)+"px");s.style.setProperty("--r",(Math.random()*720-360)+"deg");box.appendChild(s);}
  document.body.appendChild(box);setTimeout(()=>box.remove(),3400);}
{const _rh=renderHero;renderHero=function(){_rh();try{
  if(NOMO()||nav!=="matchup"||!weekDone(wk[0])||!M.opp||!TEAMS[cur]||(myTeamNum()&&myTeamNum()!==cur))return;
  const r=weekRec(h2h(wt(cur,wk[0]),wt(M.opp,wk[0])));if(!(r[0]>r[1]))return;
  const k=`dfConf_${SEASON}_${cur}_${wk[0]}`;try{if(localStorage.getItem(k))return;localStorage.setItem(k,"1");}catch(e){}
  confetti();toast(`You won ${weekName(wk[0])}!`);}catch(x){}};}
