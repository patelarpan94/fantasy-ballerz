/* ============================================================================
   2.51 (2026-11-05). Arp: "Tool should track anyone I dropped or added per its
   suggestion." The Win-the-week planner remembers every add/drop it suggests
   to your own team (per login, UI.dash.plh), then matches them to the moves
   you really made (roster history in OWN, so it works in mirror mode too) and
   shows how each one paid off: games he started for you and his stats, and
   what the player you dropped did over the same days.
   ============================================================================ */
const PLH_MAX=80;
const plhList=()=>(UI.dash&&Array.isArray(UI.dash.plh))?UI.dash.plh:[];
// whose moves this login tracks: a team login its own team, the commissioner the team the dashboard shows (BUG-303:
// the commissioner login was skipped, so nothing was logged or shown). Each entry carries its team (T).
// BUG-314: the commissioner gets it for whichever team the dashboard shows, also while the league mirrors ESPN
// (dCanEdit is false in mirror mode, so the commissioner saw no pickups and nothing was tracked).
const plhOn=T=>!!(prefKey()&&T&&TEAMS[T]&&(T===myTeamNum()||isCommish()));
const plhFor=T=>plhList().filter(e=>(e.T||myTeamNum()||T)===T);
// remember the moves the planner suggests to your own team (first day suggested, every drop it paired)
function plhLog(T,r){if(!r||!r.moves||!r.moves.length||!plhOn(T)||!DAYS.length)return;
  const wk=DAYS[0],list=plhList().map(e=>({...e,ds:[...(e.ds||[])]}));let ch=false;
  r.moves.forEach(m=>{let e=list.find(x=>x.a===m.x.n&&x.wk===wk&&(x.T||T)===T);
    if(!e){e={a:m.x.n,t:m.x.t,ds:[],sp:TODAY,wk,T};list.push(e);ch=true;}
    if(m.drop&&!e.ds.includes(m.drop)){e.ds.push(m.drop);ch=true;}});
  if(ch)dashBoardSet({plh:list.slice(-PLH_MAX)});}
// Arp 2026-11-05: pickups you made from a suggestion go on your Willing to drop list (once, so taking one off sticks)
function plhSyncDrop(T){if(!plhOn(T))return;const list=plhList();let ch=false;const add=[];
  const nl=list.map(e=>{if(e.dl||(e.T||T)!==T)return e;const m=plhMatch(T,e);if(!m||m.gone!=null||ownerNow(e.a)!==T)return e;ch=true;add.push(e.a);return {...e,dl:1};});
  if(!ch)return;const o=PLO();
  const np=o.d?{...o,d:[...new Set([...o.d,...add])]}:{...o,ad:[...new Set([...(o.ad||[]),...add])]};
  dashBoardSet({plh:nl,plan:np});DPL_K="";}
{const _dp=dPlan;dPlan=function(T,sync){try{plhSyncDrop(T);}catch(e){}const r=_dp.apply(this,arguments);try{if(r&&!r.done)plhLog(T,r);}catch(e){}return r;};}

// a logged suggestion you acted on: he joined your team on/after the day it was suggested (within a week)
function plhMatch(T,e){const iv=(OWN[e.a]||[]).find(i=>i.team===T&&i.from>=e.sp&&i.from<=e.sp+7);if(!iv)return null;
  let drop=null;for(const d of e.ds||[]){const dv=(OWN[d]||[]).find(i=>i.team===T&&i.to!==Infinity&&i.to>=e.sp&&i.to<=iv.from+1);if(dv){drop={n:d,day:dv.to};break;}}
  const end=Math.min(iv.to===Infinity?TODAY:iv.to-1,TODAY,SEASON_END),days=[];for(let sp=iv.from;sp<=end;sp++)days.push(sp);
  const p=TEAMS[T]&&TEAMS[T].P.find(q=>q.n===e.a);
  const sum=(n,f)=>{const a=new Array(11).fill(0);let g=0;days.forEach(sp=>{const l=DAYLINES[n]&&DAYLINES[n][sp];if(!l||!f(sp))return;g++;l.forEach((v,i)=>{if(i<11)a[i]+=v;});});return {a,g};};
  const st=sum(e.a,sp=>p&&p.sl[sp]!=null&&p.sl[sp]<12),pl=sum(e.a,()=>true),dr=drop?sum(drop.n,()=>true):null;
  return {e,from:iv.from,gone:iv.to!==Infinity?iv.to:null,drop,days,st,pl,dr};}
const plhCats=x=>{if(!x)return "";return CATS.map(c=>c[1]==="pct"?`${esc(c[0])} ${x.a[c[2]]}/${x.a[c[3]]}`:`${x.a[c[2]]} ${esc(c[0])}`).join(" · ");};
function plhNet(m){if(!m.dr)return [];return CATS.filter(c=>c[1]!=="pct").map(c=>({c,d:m.st.a[c[2]]-m.dr.a[c[2]]})).filter(x=>x.d);}
function plhRow(m){const e=m.e,net=plhNet(m),up=net.filter(x=>x.d>0).length,dn=net.filter(x=>x.d<0).length;
  const verdict=!m.st.g&&!(m.dr&&m.dr.g)?`<i class="plh-v">no games yet</i>`:m.dr?`<i class="plh-v ${up>dn?"ok":dn>up?"bad":""}">${up>dn?"paying off":dn>up?"behind":"even"} · ${up} up, ${dn} down</i>`:(m.st.g?`<i class="plh-v ok">+${m.st.g} game${m.st.g>1?"s":""}</i>`:"");
  return `<li>${dFace(e.a,e.t||(DIR[e.a]&&DIR[e.a].t)||"","sm")}<span class="plh-who"><span><b>Added ${dashNm(e.a)}</b>${e.mine?"":`<i class="plh-v pp">planner pick</i>`}${verdict}</span>
    <small class="muted">${esc(dow(m.from))}${m.drop?` · dropped ${dashNm(m.drop.n)}`:" · open spot"}${m.gone!=null?` · gone ${esc(dow(m.gone))}`:""}</small>
    <small>For you: <b class="num">${m.st.g}</b> start${m.st.g===1?"":"s"}${m.pl.g>m.st.g?` <span class="muted">(${m.pl.g-m.st.g} on bench)</span>`:""}${m.st.g?` · <span class="num">${plhCats(m.st)}</span>`:""}</small>
    ${m.dr?`<small class="muted">${esc(dashLast(m.drop.n))} since: <b class="num">${m.dr.g}</b> game${m.dr.g===1?"":"s"}${m.dr.g?` · <span class="num">${plhCats(m.dr)}</span>`:""}</small>`:""}
    ${net.length?`<span class="plh-net">${net.map(x=>`<i class="${x.d>0?"up":"dn"}">${esc(x.c[0])} ${x.d>0?"+":""}${x.d}</i>`).join("")}</span>`:""}</span></li>`;}
// every pickup this matchup, not only the planner's (Arp 2026-11-05 picked up Zaire Williams and Jrue Holiday and saw nothing):
// adds from the move log (with the drop paired in the same move) or, in mirror mode, players who joined the roster this week
function plhAuto(T,claimed,skip){const lo=DAYS[0]||TODAY,out=[],usedDrop=new Set(claimed||[]);
  const tradeIn=new Set(TXLOG.filter(t=>t.ok&&t.type==="trade").flatMap(t=>tnum(t.from)===T?t.get:tnum(t.to)===T?t.give:[]));
  Object.entries(OWN).forEach(([n,ivs])=>ivs.forEach(iv=>{if(iv.team!==T||iv.from<Math.max(1,lo)||iv.from>TODAY+1||tradeIn.has(n)||(skip&&skip.has(n+"|"+iv.from)))return;
    const tx=[...TXLOG].reverse().find(t=>t.ok&&t.add===n&&tnum(t.team)===T&&t.type!=="trade");
    let ds=tx&&tx.drop?[tx.drop]:[];
    if(!tx){ds=Object.entries(OWN).filter(([d,dv])=>d!==n&&!usedDrop.has(d)&&dv.some(i=>i.team===T&&i.to!==Infinity&&i.to>=iv.from-1&&i.to<=iv.from+1)).map(([d])=>d).slice(0,1);}
    ds.forEach(d=>usedDrop.add(d));
    out.push({a:n,t:DIR[n]&&DIR[n].t,ds,sp:Math.max(0,(tx?tx.day:iv.from)-1),wk:lo,T,mine:1});}));
  return out;}
// pickups made this matchup: the move log's count (app mode), or the roster joins this week (mirror mode), whichever is more
function plUsedWk(T){if(!TEAMS[T])return 0;const m=L&&(L.addMode||"matchup");let a=0;try{a=plhAuto(T).length;}catch(e){}
  const b=(m==="matchup"||m==="mday")&&typeof pickupsUsed==="function"?pickupsUsed(T,TODAY):0;return Math.max(a,b);}
function plhView(T){if(!plhOn(T))return "";
  const wk=DAYS[0];const logged=plhFor(T).map(e=>{try{return plhMatch(T,e);}catch(x){return null;}}).filter(Boolean);
  const seen=new Set(logged.map(m=>m.e.a+"|"+m.from));
  // BUG-316: a drop already paired with a tracked planner pick isn't paired again with another pickup
  const auto=plhAuto(T,logged.filter(m=>m.drop).map(m=>m.drop.n),seen).map(e=>{try{return plhMatch(T,e);}catch(x){return null;}}).filter(m=>m&&!seen.has(m.e.a+"|"+m.from));
  const now=[...logged.filter(m=>m.e.wk===wk),...auto].sort((a,b)=>b.from-a.from),old=logged.filter(m=>m.e.wk!==wk).sort((a,b)=>b.from-a.from);
  const pm=logged.length,starts=logged.reduce((s,m)=>s+m.st.g,0);
  const lim=addLimitFor(TODAY)||PL_MAX,used=plUsedWk(T),wkOnly=!L.addMode||L.addMode==="matchup"||L.addMode==="mday";
  return `<div class="plh"><p class="plh-h"><b>Your pickups</b>${wkOnly?`<span class="plh-cnt"><b class="num">${used}</b> pickup${used===1?"":"s"} this matchup · <b class="num">${Math.max(0,lim-used)}</b> left of ${lim}</span>`:""}<small class="muted">${pm} planner pick${pm===1?"":"s"} this season${pm?` · ${starts} start${starts===1?"":"s"} from them`:""}</small></p>
    ${now.length?`<ol class="plh-l">${now.map(plhRow).join("")}</ol>`:`<p class="dsm muted">No pickups this matchup yet. When you add someone, he shows up here with his starts and stats for you, what the player you dropped did since, and the difference in each category.</p>`}
    ${old.length?`<details class="plh-old"><summary>Planner picks in earlier matchups (${old.length})</summary><ol class="plh-l">${old.map(plhRow).join("")}</ol></details>`:""}
    <p class="dsm muted"><b>Planner pick</b> = a player the planner suggested and you added. Stats for him are from games he started for you; stats for the player you dropped are from all his games since. A pickup made today shows numbers once his first game starts.</p></div>`;}
{const _v=DW.pl.view;DW.pl.view=function(w,T){const h=_v.apply(this,arguments);let t="";try{t=plhView(T);}catch(e){console.warn(e);}return h+t;};}

{const s=document.createElement("style");s.textContent=`
.plh{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
.plh-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin:0 0 8px}.plh-h small{font-size:.75rem}
.plh-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.plh-l li{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:12px;background:color-mix(in srgb,var(--ink) 4%,transparent);border:1px solid var(--line)}
.plh-who{display:flex;flex-direction:column;gap:2px;min-width:0;line-height:1.3;font-size:.8rem}.plh-who b{font-size:.88rem}
.plh-v{display:inline-block;margin-left:6px;font-style:normal;font-size:.7rem;font-weight:700;padding:1px 7px;border-radius:99px;background:var(--chip);color:var(--muted);vertical-align:middle}
.plh-v.ok{background:color-mix(in srgb,var(--win) 18%,transparent);color:var(--win)}.plh-v.bad{background:color-mix(in srgb,var(--loss) 16%,transparent);color:var(--loss)}
.plh-net{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}.plh-net i{font-style:normal;font-size:.7rem;font-weight:700;padding:1px 6px;border-radius:6px}
.plh-net i.up{color:var(--win);background:color-mix(in srgb,var(--win) 12%,transparent)}.plh-net i.dn{color:var(--loss);background:color-mix(in srgb,var(--loss) 10%,transparent)}
.plh-v.pp{background:var(--accent-wash);color:var(--accent)}
.plh-cnt{font-size:.8rem;padding:2px 9px;border-radius:99px;background:var(--chip)}
.plh-old{margin-top:8px}.plh-old summary{cursor:pointer;font-size:.8rem;color:var(--muted);margin-bottom:6px}
`;document.head.appendChild(s);}
