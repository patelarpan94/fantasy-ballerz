
/* ============================================================================
   SHOT CHARTS (2026-10-22). Refresh saves every field-goal attempt with its
   court spot from ESPN's game summary: shots/<season>_d<day> {p:{name:[[x,y,made,2|3,q]]}}.
   ESPN x runs 0-50 ft across; y is about feet from the rim, so the court here puts the
   baseline at y=-4.25. Free throws have no spot, so they show as a count only.
   ============================================================================ */
const SHOTC={};
function shotsDay(sp){const c=SHOTC[sp];if(c&&(sp<TODAY-1||Date.now()-c.t<120e3))return c.p;
  const p=Store.get("shots",`${SEASON}_d${sp}`).catch(()=>null);SHOTC[sp]={t:Date.now(),p};return p;}
const SHOT_CATS=["FGP","FTP","TPM","PTS","FGM","FTM"];
const shotXY=s=>[Math.max(0,Math.min(50,s[0])),s[1]+4.25];
const shotZone=s=>{if(s[3]===3)return "3PT";const [x,y]=shotXY(s);return Math.hypot(x-25,y-5.25)<=8?"Rim":"Mid";};
const ZONES=[["Rim","At the rim (8 ft)"],["Mid","Mid-range"],["3PT","Threes"]];
function courtSvg(shots){
  // shots logged at the same spot fan out in a small spiral so a make and a miss never sit on top of each other
  const placed=[],spot=s=>{const [x0,y0]=shotXY(s);let x=x0,y=y0;for(let k=1;k<60&&placed.some(([a,b])=>Math.hypot(a-x,b-y)<1.8);k++){const r=1.15*Math.sqrt(k),t=k*2.4;x=x0+r*Math.cos(t);y=Math.max(-.5,y0+r*Math.sin(t));}placed.push([x,y]);return [+x.toFixed(2),+y.toFixed(2)];};
  const ln='class="ctl"',mk=shots.map((s,i)=>{const [x,y]=spot(s),d=`style="--i:${Math.min(i,60)}"`;
    return s[2]?`<circle class="sm" ${d} cx="${x}" cy="${y}" r=".95"/>`:`<path class="sx" ${d} d="M${x-.75} ${y-.75}l1.5 1.5m0-1.5l-1.5 1.5"/>`;}).join("");
  return `<svg class="court" viewBox="-1 -1 52 38" role="img" aria-label="Shot chart: ${shots.filter(s=>s[2]).length} made, ${shots.filter(s=>!s[2]).length} missed">
    <path ${ln} d="M0 37V0h50v37"/><rect class="ctp" x="17" y="0" width="16" height="19"/><rect ${ln} x="17" y="0" width="16" height="19"/>
    <circle ${ln} cx="25" cy="19" r="6"/><path ${ln} d="M21 5.25a4 4 0 0 0 8 0"/><path ${ln} d="M3 0v14.2A23.75 23.75 0 0 0 47 14.2V0"/>
    <line ${ln} x1="22" y1="4" x2="28" y2="4"/><circle class="ctr" cx="25" cy="5.25" r=".75"/>${mk}</svg>`;}
const ma=(m,a)=>`<b class="num">${m}-${a}</b><span>${a?Math.round(m/a*100)+"%":"–"}</span>`;
// where the player was rostered that day, and whether he counted
function shotTeam(n,sp){for(const id of Object.keys(TEAMS).map(Number)){const p=TEAMS[id].P.find(q=>q.n===n);if(p&&slotOn(p,sp)!=null)return {id,p};}return null;}
// the shooting categories in this league, with this game's effect on the week's matchup
function shotImpact(n,sp,line){
  const cats=CATS.filter(c=>SHOT_CATS.some(k=>CATDEF[k]===c));if(!cats.length||!line)return "";
  const tm=shotTeam(n,sp);if(!tm)return `<p class="muted shnote">Free agent that day, so this game didn't count for anyone.</p>`;
  if(!startedOn(tm.p,sp))return `<p class="muted shnote">On ${esc(teamName(tm.id))}'s bench that day, so this game didn't count.</p>`;
  const w=weekOf(sp),days=[];for(let d=w[1];d<=Math.min(w[2],TODAY);d++)days.push(d);
  const me=dayTotals(tm.id,days),op=opponentIn(tm.id,w[0]),ot=op?dayTotals(op,days):null;if(!me)return "";
  const wo=me.map((v,i)=>v-(line[i]||0)),fmt=(c,a)=>c[1]==="pct"?pct(val(a,c)):Math.round(val(a,c)),res=(a,b,c)=>{const x=val(a,c),y=val(b,c);return x>y?1:x<y?-1:0;};
  const rows=cats.map(c=>{const g=c[1]==="pct"?`${line[c[2]]}-${line[c[3]]}`:line[c[2]],now=ot?res(me,ot,c):0,was=ot?res(wo,ot,c):0;
    const tag=!ot?"":now!==was?`<span class="shflip ${now>0?"up":"dn"}">${now>0?"Won it":"Lost it"}</span>`:now>0?`<span class="shw">Winning</span>`:now<0?`<span class="shl">Losing</span>`:`<span class="muted">Tied</span>`;
    return `<tr><td class="nm">${c[0]}</td><td class="num">${g}</td><td class="num">${fmt(c,wo)} → <b>${fmt(c,me)}</b></td><td class="num">${ot?fmt(c,ot):"–"}</td><td>${tag}</td></tr>`;}).join("");
  return `<h3>Why it matters</h3><p class="muted shnote">${esc(teamName(tm.id))} in ${esc(weekName(w[0]))}${op?` vs ${esc(teamName(op))}`:""}: the week before and after this game.</p>
    <div class="scroll"><table class="lg shimp"><thead><tr><th class="nm">Cat</th><th>Game</th><th>Team week</th><th>Opp</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;}
// one shot box: game chips (or the season), a 2PT/3PT filter, the court, splits and impact
async function renderShots(box){
  const n=box.dataset.shots,sel=box.dataset.sel||"season",f=box.dataset.f||"all",D=DAYLINES[n]||{};
  const days=Object.keys(D).map(Number).filter(sp=>sp<=TODAY&&D[sp][K.FGA]>0).sort((a,b)=>b-a);
  if(!days.length){box.innerHTML=`<p class="muted">No shots yet this season.</p>`;return;}
  const t=DIR[n]?.t||mkP(n).t,pick=sel==="season"?days:[+sel];
  const chips=`<div class="tabs sm shg" role="group" aria-label="Pick a game"><button data-shsel="season" aria-selected="${sel==="season"}">Season</button>${days.slice(0,12).map(sp=>{const g=gameOn(t,sp);return `<button data-shsel="${sp}" aria-selected="${sel==sp}">${dow(sp)} ${md(sp)}${g?` ${g[1]?"v":"@"}${esc(g[0])}`:""}</button>`;}).join("")}</div>`;
  const fil=`<div class="tabs sm" role="group" aria-label="Shot type">${[["all","All shots"],["2","2PT"],["3","3PT"]].map(([k,l])=>`<button data-shf="${k}" aria-selected="${f===k}">${l}</button>`).join("")}</div>`;
  if(!box.querySelector(".court"))box.innerHTML=chips+fil+`<div class="shload muted">Loading shots…</div>`;
  const docs=await Promise.all(pick.map(shotsDay));if(box.dataset.shots!==n||(box.dataset.sel||"season")!==sel||(box.dataset.f||"all")!==f)return;
  let all=[];docs.forEach(d=>{if(d?.p?.[n])all=all.concat(d.p[n]);});
  const far=all.filter(s=>shotXY(s)[1]>36.5).length,shown=all.filter(s=>shotXY(s)[1]<=36.5&&(f==="all"||s[3]===+f));
  const tot=new Array(11).fill(0);pick.forEach(sp=>D[sp]&&D[sp].forEach((v,i)=>tot[i]+=v||0));
  const z=Object.fromEntries(ZONES.map(([k])=>[k,[0,0]]));all.forEach(s=>{const q=z[shotZone(s)];q[1]++;if(s[2])q[0]++;});
  const zt=ZONES.map(([k,l])=>{const [m,a]=z[k],p=a?m/a:0;return `<div class="shz"><span>${l}</span>${ma(m,a)}<i style="--w:${Math.round(p*100)}%"></i></div>`;}).join("");
  const tiles=`<div class="pckeys shkeys"><div>${ma(tot[K.FGM],tot[K.FGA])}<em>FG</em></div><div>${ma(tot[K.TPM],Math.max(tot[K.TPM],all.filter(s=>s[3]===3).length))}<em>3PT</em></div><div>${ma(tot[K.FTM],tot[K.FTA])}<em>FT</em></div><div><b class="num">${tot[K.PTS]}</b><span>${pick.length>1?`${(tot[K.PTS]/pick.length).toFixed(1)} a game`:"&nbsp;"}</span><em>PTS</em></div></div>`;
  const miss=all.length<tot[K.FGA]?` · ESPN placed ${all.length} of ${tot[K.FGA]} shots`:"";
  box.innerHTML=chips+fil+`<div class="courtwrap">${shown.length?courtSvg(shown):`<p class="muted">No ${f==="all"?"":f+"PT "}shots ${pick.length>1?"this season":"this game"}.</p>`}</div>
    <p class="shleg"><span><i class="lgm"></i>Made</span><span><i class="lgx">✕</i>Missed</span><span class="muted">${pick.length>1?`${pick.length} games`:"1 game"}${far?` · ${far} deep heaves not shown`:""}${miss} · free throws have no spot</span></p>
    ${tiles}<div class="shzs">${zt}</div>${sel!=="season"?shotImpact(n,+sel,D[+sel]):""}`;}
function openShots(n,sp){openSheet(`${n} · shot chart`,`<div class="shotbox" data-shots="${esc(n)}" data-sel="${sp??"season"}"></div><div class="sheetacts"><button class="btn ghost" data-pcard="${esc(n)}">Player card</button><button class="btn ghost" data-sheet="close">Close</button></div>`);
  renderShots($("#sheetBody .shotbox"));}
const shotBtn=(n,sp)=>`<button class="shotb" data-shot="${esc(n)}|${sp}" title="Shot chart" aria-label="Shot chart for ${esc(n)}"><svg viewBox="0 0 16 12" aria-hidden="true"><rect x=".5" y=".5" width="15" height="11" rx="1"/><path d="M5 .5v4.5h6V.5M3 .5v3a5 5 0 0 0 10 0v-3"/></svg><span>Shots</span></button>`;
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-shot]");if(b){e.preventDefault();e.stopPropagation();const i=b.dataset.shot.lastIndexOf("|");openShots(b.dataset.shot.slice(0,i),b.dataset.shot.slice(i+1));return;}
  const t=e.target.closest("[data-pctab]");if(t&&t.dataset.pctab==="sh"){const sb=t.closest(".pcard")?.querySelector(".shotbox");if(sb&&!sb.childElementCount)renderShots(sb);return;}
  const box=e.target.closest(".shotbox");if(!box)return;
  const s=e.target.closest("[data-shsel]"),f=e.target.closest("[data-shf]");
  if(s){box.dataset.sel=s.dataset.shsel;renderShots(box);}else if(f){box.dataset.f=f.dataset.shf;renderShots(box);}},true);
// shot charts open from the day's score, the expanded game log, and a Shots tab on the player card
{const hasShots=(p,sp)=>{const d=p.d[sp];return d&&d[K.FGA]>0&&sp<=TODAY;},attr=(p,sp)=>` role="button" tabindex="0" title="Tap for ${esc(p.n)}'s shot chart" data-shot="${esc(p.n)}|${sp}"`;
 // tap the day's score (PTS/REB/AST) to open the shot chart: phone day cards and the desktop schedule grid
 const _di=dayInfo;dayInfo=function(p,sp,id){const h=_di(p,sp,id);return hasShots(p,sp)?h.replace(/<b class="([^"]*)" data-tk="ln:/,(m,c)=>`<b class="${c} shotsc"${attr(p,sp)} data-tk="ln:`):h;};
 const _sc=schedCell;schedCell=function(p,sp,id){const h=_sc(p,sp,id);return hasShots(p,sp)?h.replace(/<span class="line([^"]*)"/,(m,c)=>`<span class="line${c} shotsc"${attr(p,sp)}`):h;};
 document.addEventListener("keydown",e=>{const b=e.target.closest?.(".shotsc[data-shot]");if(b&&(e.key==="Enter"||e.key===" ")){e.preventDefault();b.click();}});
 const _gl=gameLog;gameLog=function(p){const h=_gl(p);return h.replace(/<tr(?: class="bn-row")?><td>(\w+ \d+)<\/td>/g,(m,day)=>{const sp=DAYS.find(s=>`${dow(s)} ${dateOf(s).getDate()}`===day);const d=sp!=null&&p.d[sp];return d&&d[K.FGA]>0?m.replace("</td>",` ${shotBtn(p.n,sp)}</td>`):m;});};
 const _pc=playerCard;playerCard=function(n){_pc(n);const tabs=$("#sheetBody .pctabs"),acts=$("#sheetBody .sheetacts");if(!tabs||!acts)return;
   tabs.insertAdjacentHTML("beforeend",`<button role="tab" data-pctab="sh" aria-selected="false">Shots</button>`);
   acts.insertAdjacentHTML("beforebegin",`<div data-pane="sh" hidden><h3>Shot chart</h3><div class="shotbox" data-shots="${esc(n)}" data-sel="season"></div></div>`);};}
