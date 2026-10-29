
/* ============================================================================
   UI AUDIT FIXES (1.38+): small layout fixes from the Oct 26 audit
   ============================================================================ */
// an empty sub-bar (no tabs, no search) no longer leaves a blank band
{const _rc=renderChrome;renderChrome=function(){const r=_rc.apply(this,arguments);const sb=$("#subbar");if(sb)sb.hidden=$("#subtabs").hidden&&$("#searchWrap").hidden;return r;};}
// wide tables fade at the right edge until scrolled to the end, so hidden columns are easy to spot
{const _fs=fitScrolls;fitScrolls=function(){_fs.apply(this,arguments);document.querySelectorAll("main .scroll").forEach(s=>{const sx=!s.classList.contains("fits")&&s.scrollWidth>s.clientWidth+1;s.classList.toggle("sx",sx);
  const upd=()=>s.classList.toggle("end",s.scrollLeft+s.clientWidth>=s.scrollWidth-2);upd();if(!s._sxw){s._sxw=1;s.addEventListener("scroll",upd,{passive:true});}});};}

/* ---- 1.39 cleanup ---- */
// My Team: one Auto-set row (the day picker's), so the separate Auto-set card goes
autoBar=()=>"";
// Players: Player list and Market (Trending, Rising/Falling on ESPN, hot and cold players) as two views
let APV="list",APMORE=false;try{APV=localStorage.getItem("dfApv")==="market"?"market":"list";}catch(e){}
const apvBar=()=>`<div class="tabs sm apv" role="tablist"><button data-apv="list" aria-selected="${APV==="list"}">Player list</button><button data-apv="market" aria-selected="${APV==="market"}">Market</button></div>`;
{const _av=allView;allView=function(){return apvBar()+_av.apply(this,arguments);};}
document.addEventListener("click",e=>{const b=e.target.closest("[data-apv],[data-apvgo]");if(!b)return;APV=b.dataset.apv||b.dataset.apvgo;try{localStorage.setItem("dfApv",APV);}catch(x){}
  if(b.dataset.apvgo)setNav("players");else renderRosters();});
document.addEventListener("toggle",e=>{if(e.target.classList?.contains("apmore"))APMORE=e.target.open;},true);
// header: the login badge becomes an account button (initials) that opens a small menu
{const _rw=renderWho;renderWho=function(){_rw.apply(this,arguments);const w=$("#whoBtn");if(!SESSION||!w)return;const cm=SESSION.role==="commish",nm=cm?"Commissioner":teamName(SESSION.team);
  w.innerHTML=`<span class="whoav">${esc(cm?"CM":tmInit(tnum(SESSION.team)))}</span><span class="whonm">${esc(nm)}</span>`;w.setAttribute("aria-label",`Account: ${nm}`);w.title="Account";};}
document.addEventListener("click",e=>{const w=e.target.closest("#whoBtn");if(!w)return;e.stopPropagation();e.preventDefault();
  const nm=isCommish()?"the commissioner":esc(teamName(SESSION.team)),dot=!!$("#relBtn")?.querySelector(".dot,.reldot,i");
  openSheet("Account",`<p>You're logged in as <b>${nm}</b>.</p><div class="acctl">
    <button class="btn ghost" data-acct="theme">◐ Display settings</button><button class="btn ghost" data-acct="rel">🗂 Release notes</button><button class="btn ghost" data-acct="help">? How this app works</button></div>
    <div class="sheetacts"><button class="btn ghost" data-sheet="close">Close</button><button class="btn danger" data-logout="1">Log out</button></div>`);},true);
document.addEventListener("click",e=>{const b=e.target.closest("[data-acct]");if(!b)return;sheet().close();const id={theme:"#themeBtn",rel:"#relBtn",help:"#helpBtn"}[b.dataset.acct];setTimeout(()=>$(id)?.click(),30);});

/* ---- 1.40 phone upgrades ---- */
// I1: one-row phone header. Theme, release notes, help, stats time, this week and switch-to-opponent move into the account menu;
// only the commissioner keeps the Refresh button there
{const _rw=renderWho;renderWho=function(){_rw.apply(this,arguments);document.body.classList.toggle("iscm",isCommish());const w=$("#whoBtn");if(w)w.classList.toggle("hasnew",!!$("#relBtn")?.classList.contains("hasnew"));};}
document.addEventListener("click",e=>{if(!e.target.closest("#whoBtn"))return;setTimeout(()=>{const a=$("#sheetBody .acctl");if(!a||a.dataset.x)return;a.dataset.x=1;
  const up=$("#updated")?.textContent||"",ph=PHONE();
  a.insertAdjacentHTML("afterbegin",`${up?`<p class="muted acup">${esc(UPDATED?`Stats updated ${fmtStamp(UPDATED)} ET`:up)}</p>`:""}${ph?`<button class="btn ghost" data-acct="today">📅 Go to this week</button><button class="btn ghost" data-acct="swap">⇄ Switch to the opponent</button>`:""}`);
  if($("#relBtn")?.classList.contains("hasnew"))a.querySelector('[data-acct="rel"]')?.insertAdjacentHTML("beforeend",' <span class="newdot">new</span>');},0);},true);
document.addEventListener("click",e=>{const b=e.target.closest('[data-acct="today"],[data-acct="swap"]');if(!b)return;e.stopImmediatePropagation();sheet().close();(b.dataset.acct==="today"?$("#todayBtn"):$("#swapBtn"))?.click();},true);
// I3: Scoreboard leads with each matchup's category score and win chance, ESPN-style
function scoreCards(){const pairs=W[wk[0]]||[];if(!pairs.length)return "";const live=started();
  const card=([a,b])=>{const sa=score(a),sb=score(b);let w=0,l=0,t=0;const live=started()&&(sa.some(v=>v)||sb.some(v=>v));CATS.forEach(c=>{const x=val(sa,c),y=val(sb,c);if(live){x===y?t++:x>y?w++:l++;}});
    let p=null;try{p=winProb(fcProj(a),fcProj(b));}catch(e){}
    const side=(id,mine,rec,pp)=>`<div class="scs${mine===null?"":mine?" lead":""}${id===cur||id===M.opp?" mine":""}"><span class="hav xs">${esc(tmInit(id))}</span><button class="tlink" data-team="${id}">${esc(teamName(id))}</button><b class="num">${rec}</b>${pp!=null?`<i class="num">${Math.round(pp*100)}%</i>`:""}</div>`;
    const lead=!live||w===l?null:w>l;
    return `<div class="sccard">${side(a,lead,live?`${w}-${l}-${t}`:"–",p)}${side(b,lead===null?null:!lead,live?`${l}-${w}-${t}`:"–",p==null?null:1-p)}</div>`;};
  return sec(`${weekName(wk[0])} scores`,`Category score${started()?" so far":""} and chance to win · tap a team to open its matchup`,`<div class="scgrid">${pairs.map(card).join("")}</div>`);}
{const _sv=scoreView;scoreView=function(){return scoreCards()+_sv.apply(this,arguments);};}

/* ---- 1.41 later items ---- */
// I5: Analytics Insights gets a jump bar to each card, and each card folds up (remembered per browser)
let ANCOL={};try{ANCOL=JSON.parse(localStorage.getItem("dfAnCol")||"{}")||{};}catch(e){}
const anKey=t=>t.split(" · ")[0].replace(/[0-9]+/g,"").trim().toLowerCase();
function anJump(){const R=$("#rosters");if(!R||R.querySelector(".anjump"))return;
  const secs=[...R.querySelectorAll(":scope > section.panel")].filter(s=>s.querySelector(":scope > .teamhead .tn"));if(secs.length<3)return;
  const chips=secs.map((s,i)=>{const t=s.querySelector(":scope > .teamhead .tn").textContent.trim(),k=anKey(t);s.id="ans"+i;s.dataset.ank=k;s.classList.add("anfold");
    const h=s.querySelector(":scope > .teamhead");if(!h.querySelector(".anfb"))h.insertAdjacentHTML("beforeend",`<button class="anfb" data-anfold="${i}" aria-label="Fold or open this card"></button>`);
    s.classList.toggle("ancol",!!ANCOL[k]);h.querySelector(".anfb").setAttribute("aria-expanded",String(!ANCOL[k]));
    return `<button class="chip" data-anj="${i}">${esc(t.split(" · ")[0].slice(0,24))}</button>`;}).join("");
  const at=R.querySelector(".anbar");const html=`<div class="anjump" role="navigation" aria-label="Jump to a card">${chips}</div>`;
  if(at)at.insertAdjacentHTML("afterend",html);else R.insertAdjacentHTML("afterbegin",html);fitScrolls();}
// I6: on a phone, the Tracker's category charts get chips so one category shows at a time
let TRKCAT="all";
// BUG-185 (Arp 2026-10-29): a picked category's chart comes first, right under the chips, ahead of Win % and Games played,
// so the tap visibly changes what's on screen
function trkShow(m){m.querySelectorAll(":scope > figure[data-tcat]").forEach(x=>{const on=TRKCAT==="all"||x.dataset.tcat===TRKCAT;x.hidden=!on;x.style.order=TRKCAT!=="all"&&on?"-1":"";});}
function trkChips(){if(!PHONE())return;document.querySelectorAll("#rosters .minis").forEach(m=>{if(m.dataset.tc)return;
  const fs=[...m.querySelectorAll(":scope > figure.mini:not(.trkx):not(.screc)")];if(fs.length<4)return;m.dataset.tc=1;
  const cats=fs.map(f=>f.querySelector("figcaption b")?.textContent.trim()||"");if(TRKCAT!=="all"&&!cats.includes(TRKCAT))TRKCAT="all";
  fs.forEach((f,i)=>{f.dataset.tcat=cats[i];});trkShow(m);
  m.insertAdjacentHTML("beforebegin",`<div class="scroll trkc"><div class="tabs sm" role="group" aria-label="Category">${["all",...cats].map(c=>`<button data-tcat="${esc(c)}" aria-pressed="${c===TRKCAT}">${c==="all"?"All":esc(c)}</button>`).join("")}</div></div>`);});}
{const _rr=renderRosters;renderRosters=function(){_rr.apply(this,arguments);try{if(nav==="analytics"&&(SUB.analytics||"main")==="main")anJump();trkChips();}catch(e){console.warn(e);}};}
document.addEventListener("click",e=>{const j=e.target.closest("[data-anj]"),f=e.target.closest("[data-anfold]"),c=e.target.closest(".trkc [data-tcat]");
  if(j){const s=$("#ans"+j.dataset.anj);if(!s)return;if(s.classList.contains("ancol")){s.classList.remove("ancol");delete ANCOL[s.dataset.ank];try{localStorage.setItem("dfAnCol",JSON.stringify(ANCOL));}catch(x){}}
    const top=s.getBoundingClientRect().top+window.scrollY-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--barh"))||0)-8;window.scrollTo({top,behavior:"smooth"});}
  else if(f){const s=$("#ans"+f.dataset.anfold);if(!s)return;const on=s.classList.toggle("ancol");f.setAttribute("aria-expanded",String(!on));if(on)ANCOL[s.dataset.ank]=1;else delete ANCOL[s.dataset.ank];try{localStorage.setItem("dfAnCol",JSON.stringify(ANCOL));}catch(x){}}
  else if(c){TRKCAT=c.dataset.tcat;const bar=c.closest(".trkc"),m=bar.nextElementSibling;bar.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===c)));
    trkShow(m);}});
// I7: Pick'em shows each team's rough chance to win next matchup, from healthy players' ESPN per-game projections x games that week
function pkProb(n,m){try{const c=CAL[n-1];if(!c)return null;const tot=T=>{const s=new Array(11).fill(0);let any=0;
    (TEAMS[T]?.P||[]).filter(healthy).forEach(p=>{const pg=pgLine(p.pj);if(!pg)return;let g=0;for(let sp=c[1];sp<=c[2];sp++)if(gameOn(p.t,sp))g++;if(g){any=1;pg.forEach((v,i)=>s[i]+=v*g);}});return any?s:null;};
  const a=tot(m[0]),b=tot(m[1]);if(!a||!b)return null;const p=winProb({fin:a},{fin:b});return [p,1-p];}catch(e){return null;}}
