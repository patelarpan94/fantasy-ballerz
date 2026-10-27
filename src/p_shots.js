
/* ============================================================================
   HISTORY › SHOTS (2026-10-22): every field-goal attempt from 2021-22 to
   2025-26, from ESPN play-by-play, one file per team per season
   (hist/shots/<season>/<TEAM>.json, about 200 KB). The Shots view uses the
   same filters as the game logs: it loads the team files those lines need and
   keeps only the shots from those games by those players.
   Row: [game, player, quarter, x, y, code (0 miss 2, 1 make 2, 2 miss 3, 3 make 3), type, feet, assister or -1]
   ============================================================================ */
const HSHOT={},HSHOTP={};let SHMODE=null;
function shotFile(s,t){const k=s+"/"+t;if(HSHOT[k])return Promise.resolve(HSHOT[k]);
  if(s===HNOW)return histNow().then(()=>HSHOT[k]||(HSHOT[k]={s,team:t,ty:[],r:[]}));
  if(!HSHOTP[k])HSHOTP[k]=fetch(`hist/shots/${s}/${t}.json`).then(r=>{if(!r.ok)throw new Error(`Couldn't load ${t} shots for ${s}`);return r.json();}).then(d=>HSHOT[k]=d).catch(e=>{delete HSHOTP[k];HSHOT.err=e.message;throw e;});
  return HSHOTP[k];}
// court zones, in the shot chart's coordinates (rim at 25, 5.25; baseline at 0)
function shZone(r){const x=r[3],y=r[4]+4.25,three=r[5]>=2;
  if(three)return y<=14?"C3":"AB3";const d=Math.hypot(x-25,y-5.25);if(d<=4)return "RA";if(x>=17&&x<=33&&y<=19)return "PT";return "MR";}
const SHZ=[["RA","Restricted area",.63],["PT","Paint (non-RA)",.42],["MR","Mid-range",.41],["C3","Corner 3",.39],["AB3","Above the break 3",.355]];
const SHD=[["0-3 ft",0,3],["4-9 ft",4,9],["10-15 ft",10,15],["16 ft-3PT",16,99,"2"],["3PT",0,99,"3"]];
const shMade=r=>r[5]===1||r[5]===3,sh3=r=>r[5]>=2;
const shPct=(m,a)=>a?Math.round(m/a*1000)/10+"%":"–";
function shotsFor(rows){
  // which (season, team) files, and which (season, game, player) lines
  const need=new Map(),keep=new Set();
  rows.forEach(r=>{const D=HDATA[r.s];need.set(r.s+"/"+r.team,[r.s,r.team]);keep.add(r.s+"|"+r.L[0]+"|"+r.L[1]);});
  return {need:[...need.values()],keep};}
function histShotsHtml(rows){
  if(!HF.q.trim()&&!HF.team&&!HF.game)return `<p class="empty">Pick a player (type a name), a team or a game to see shots.</p>`;
  const {need,keep}=shotsFor(rows);
  if(!need.length)return `<p class="empty">No games match these filters.</p>`;
  if(need.length>40)return `<p class="empty">That's ${need.length} team-seasons of shots. Narrow it to one team or a more specific name.</p>`;
  const miss=need.filter(([s,t])=>!HSHOT[s+"/"+t]);
  if(miss.length){if(!HSHOT.err)Promise.all(miss.map(([s,t])=>shotFile(s,t))).then(()=>{if(nav==="analytics"&&SUB.analytics==="hist"&&HF.view==="shots")renderHist();}).catch(()=>renderHist());
    return `<p class="empty">${HSHOT.err?esc(HSHOT.err):`Loading shots (${miss.length} ${miss.length===1?"file":"files"})…`}</p>`;}
  const S=[],types={};
  need.forEach(([s,t])=>{const F=HSHOT[s+"/"+t];F.r.forEach(r=>{if(keep.has(s+"|"+r[0]+"|"+r[1])){S.push(r);const ty=F.ty[r[6]];(types[ty]=types[ty]||[0,0]);types[ty][0]++;if(shMade(r))types[ty][1]++;}});});
  if(!S.length)return `<p class="empty">No shots logged for these games.</p>`;
  const m=S.filter(shMade).length,a3=S.filter(sh3),m3=a3.filter(shMade).length,ast=S.filter(r=>shMade(r)&&r[8]>=0).length;
  const who=new Set(rows.map(r=>r.name));
  const head=`<p class="hsum"><b>${S.length.toLocaleString()}</b> shots · ${m.toLocaleString()} made (${shPct(m,S.length)}) · 3PT ${m3}-${a3.length} (${shPct(m3,a3.length)}) · eFG ${shPct(m+.5*m3,S.length)} · ${shPct(ast,m)} of makes assisted · ${who.size===1?esc([...who][0]):`${who.size} players`}</p>`;
  // zones
  const z={};SHZ.forEach(([k])=>z[k]=[0,0]);S.forEach(r=>{const k=shZone(r);z[k][0]++;if(shMade(r))z[k][1]++;});
  const zt=`<table class="lg antable shzt"><thead><tr><th class="nm">Zone</th><th class="num">FGM-FGA</th><th class="num">FG%</th><th class="num">vs NBA</th><th class="num">Share</th></tr></thead><tbody>${SHZ.map(([k,l,lg])=>{const [a,mm]=z[k],p=a?mm/a:null,d=p==null?null:Math.round((p-lg)*1000)/10;
    return `<tr><td class="nm">${l}</td><td class="num">${mm}-${a}</td><td class="num">${shPct(mm,a)}</td><td class="num ${d==null?"":d>=0?"okc":"badc"}">${d==null||a<5?"–":(d>0?"+":"")+d}</td><td class="num"><span class="shbar"><i style="width:${Math.round(a/S.length*100)}%"></i></span>${Math.round(a/S.length*100)}%</td></tr>`;}).join("")}</tbody></table>`;
  // distance
  const dt=`<table class="lg antable"><thead><tr><th class="nm">Distance</th><th class="num">FGM-FGA</th><th class="num">FG%</th><th class="num">Share</th></tr></thead><tbody>${SHD.map(([l,lo,hi,only])=>{const f=S.filter(r=>(only==="3"?sh3(r):only==="2"?!sh3(r)&&r[7]>=lo:!sh3(r)&&r[7]>=lo&&r[7]<=hi)),mm=f.filter(shMade).length;
    return `<tr><td class="nm">${l}</td><td class="num">${mm}-${f.length}</td><td class="num">${shPct(mm,f.length)}</td><td class="num">${Math.round(f.length/S.length*100)}%</td></tr>`;}).join("")}</tbody></table>`;
  // shot types
  const ty=Object.entries(types).sort((a,b)=>b[1][0]-a[1][0]).slice(0,12);
  const tt=`<table class="lg antable"><thead><tr><th class="nm">Shot type</th><th class="num">FGA</th><th class="num">FG%</th><th class="num">Share</th></tr></thead><tbody>${ty.map(([k,[a,mm]])=>`<tr><td class="nm">${esc(k.replace(/ Shot$/,""))}</td><td class="num">${a}</td><td class="num">${shPct(mm,a)}</td><td class="num"><span class="shbar"><i style="width:${Math.round(a/S.length*100)}%"></i></span>${Math.round(a/S.length*100)}%</td></tr>`).join("")}</tbody></table>`;
  // quarters
  const qs=[1,2,3,4,5].map(q=>{const f=S.filter(r=>q===5?r[2]>=5:r[2]===q),mm=f.filter(shMade).length;return [q===5?"OT":"Q"+q,f.length,mm];}).filter(x=>x[1]);
  const qt=`<table class="lg antable"><thead><tr><th class="nm">Quarter</th><th class="num">FGM-FGA</th><th class="num">FG%</th><th class="num">3PT</th></tr></thead><tbody>${qs.map(([l,a,mm],i)=>{const f=S.filter(r=>(l==="OT"?r[2]>=5:r[2]===i+1)&&sh3(r));return `<tr><td class="nm">${l}</td><td class="num">${mm}-${a}</td><td class="num">${shPct(mm,a)}</td><td class="num">${f.filter(shMade).length}-${f.length}</td></tr>`;}).join("")}</tbody></table>`;
  const mode=SHMODE||(S.length<=300?"dots":"heat");
  const chart=`<div class="shchart"><div class="tabs sm" role="group" aria-label="Chart"><button data-shmode="heat" aria-selected="${mode==="heat"}">Hot zones</button><button data-shmode="dots" aria-selected="${mode==="dots"}">Every shot</button></div>
    ${mode==="dots"?(S.length>1500?`<p class="muted shnote">Showing the latest 1,500 of ${S.length.toLocaleString()} shots.</p>`:"")+courtSvg(S.slice(-1500).map(r=>[r[3],r[4],shMade(r)?1:0,sh3(r)?3:2,r[2]])):shHeat(S)}
    ${mode==="heat"?`<p class="shkey"><span><i class="hk cold"></i>Colder than NBA average</span><span><i class="hk avg"></i>About average</span><span><i class="hk hot"></i>Hotter</span><span class="muted">Bigger squares = more shots</span></p>`:`<p class="shkey"><span><i class="hk made"></i>Made</span><span><i class="hk miss">×</i>Missed</span></p>`}</div>`;
  return head+`<div class="shgrid">${chart}<div class="shtables"><p class="flabel">By zone</p><div class="scroll">${zt}</div><p class="flabel">By distance</p><div class="scroll">${dt}</div></div></div><div class="shgrid two"><div><p class="flabel">Shot types</p><div class="scroll">${tt}</div></div><div><p class="flabel">By quarter</p><div class="scroll">${qt}</div></div></div>`;
}
// hot zones: 3.3 ft squares sized by attempts, colored by FG% against the NBA average for that zone
function shHeat(S){
  const c={},sz=50/15;S.forEach(r=>{const x=Math.max(0,Math.min(49.9,r[3])),y=Math.max(0,Math.min(36.9,r[4]+4.25)),k=Math.floor(x/sz)+","+Math.floor(y/sz);const o=c[k]||(c[k]={a:0,m:0,ex:0});o.a++;if(shMade(r))o.m++;o.ex+=SHZ.find(z=>z[0]===shZone(r))[2];});
  const minA=S.length>300?3:1;Object.keys(c).forEach(k=>{if(c[k].a<minA)delete c[k];});
  const max=Math.max(1,...Object.values(c).map(o=>o.a));
  const cells=Object.entries(c).map(([k,o])=>{const [i,j]=k.split(",").map(Number),f=Math.sqrt(o.a/max),w=Math.max(.9,sz*.96*f),cx=i*sz+sz/2,cy=j*sz+sz/2,d=o.m/o.a-o.ex/o.a,
    cls=o.a<4?"avg":d>.06?"hot":d>.02?"warm":d<-.06?"cold":d<-.02?"cool":"avg";
    return `<rect class="hz ${cls}" x="${(cx-w/2).toFixed(2)}" y="${(cy-w/2).toFixed(2)}" width="${w.toFixed(2)}" height="${w.toFixed(2)}" rx=".35"><title>${o.m}-${o.a} (${shPct(o.m,o.a)})</title></rect>`;}).join("");
  const ln='class="ctl"';
  return `<svg class="court heat" viewBox="-1 -1 52 38" role="img" aria-label="Hot zones from ${S.length} shots">
    <path ${ln} d="M0 37V0h50v37"/><rect ${ln} x="17" y="0" width="16" height="19"/><circle ${ln} cx="25" cy="19" r="6"/><path ${ln} d="M21 5.25a4 4 0 0 0 8 0"/><path ${ln} d="M3 0v14.2A23.75 23.75 0 0 0 47 14.2V0"/>
    <line ${ln} x1="22" y1="4" x2="28" y2="4"/><circle class="ctr" cx="25" cy="5.25" r=".75"/>${cells}</svg>`;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-shmode]");if(!b)return;SHMODE=b.dataset.shmode;renderHist();});
