/* ============================================================================
   DASHBOARD THEMES (2.59, Arp 2026-11-05: "find good ways to add the themes
   onto the dashboards. Make the New Era dashboard special tho").
   - Every dashboard can wear its own NBA team colors (🎨 Theme next to Share),
     separate from the app's Display › Team colors: a Lakers board, a Celtics
     board. The board header turns into a team banner with the logo, tiles get
     the team stripe and every chart, ring and bar follows the board's colors.
     "Match my app" (the default) keeps the app's look.
   - New Era + gets stages only it has: Night, Team colors, Hardwood, Neon and
     Gold. Each one changes the arena behind the board, the title, the glowing
     borders and a header effect (spotlights, team logo, court, sunset grid,
     sparkles). The stage lights come up when you open the board.
   - Fix: New Era + used the light-mode team shade on its dark stage, so team
     colors looked muddy. It now always uses the bright (dark mode) shade.
   ============================================================================ */
const DTH_AB={NOP:"NO",GSW:"GS",NYK:"NY",SAS:"SA",UTA:"UTAH",WAS:"WSH"};
const dthLogo=k=>{try{return arpLogo(DTH_AB[k]||k);}catch(e){return "";}};
const dthTeam=k=>NBACOL.find(x=>x[0]===k);
// a board's own team colors ("" = match the app)
const dthOf=id=>{id=id||dashCur();const t=id==="main"?(UI.dash&&UI.dash.th):(dashBoards().find(b=>b.id===id)||{}).th;return dthTeam(t)?t:"";};
function dthSet(v){const c=dashCur();if(c==="main")dashBoardSet({th:v});else dashBoardSet({boards:dashBoards().map(b=>b.id===c?{...b,th:v}:b)});}
// New Era + stages
const NST=[["night","Night","Spotlights over a midnight arena"],["team","Team colors","Your team's colors, logo and glow"],["wood","Hardwood","Warm court floor under the lights"],["neon","Neon","Sunset grid, pink and cyan"],["gold","Gold","Black and gold, title night"]];
const nstOf=()=>{const s=UI.dash&&UI.dash.nst;return NST.some(x=>x[0]===s)?s:"night";};
// the team the New Era + board shows: its own pick, else the app's
const nepTeam=()=>dthOf(NEP_ID)||(dthTeam(NBATHEME)?NBATHEME:"");

/* ---- colors: one rule set per team, scoped to the board ---- */
{const v=(o,dark,t)=>`--accent:${o.acc};--accent-wash:${o.wash};--on-accent:${inkOn(o.acc)};--s-me:${o.acc};--nba1:${o.hdr};--nba1d:${o.hdr2};--nba2:${o.pop};--nba2ink:${inkOn(o.pop)};--nbaline:${dark?o.popD:t[3]};`;
  const css=NBACOL.map(t=>{const {lt,dk}=nbaShades(t[2],t[3]),s=`[data-bt="${t[0]}"]`,[pL,pC,pH]=okl(t[2]),[sL,sC,sH]=okl(t[3]),grey=pC<.03,
      hC=grey&&sC>=.03?sC:pC,hH=grey&&sC>=.03?sH:pH,c=Math.min(hC,.07);
    return `.dash${s}{${v(lt,0,t)}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .dash${s}{${v(dk,1,t)}}}
:root[data-theme="dark"] .dash${s},.dash.dnep${s}{${v(dk,1,t)}}
.dbdot[data-c="${t[0]}"]{--c1:${lt.hdr};--c2:${lt.pop}}
body.nepon.nst-team[data-nbt="${t[0]}"]{--nbg:${okhex(.13,c*.7,hH)};--nS:${okhex(.2,c,hH)};--nT1:${okhex(.23,c,hH)};--nT2:${okhex(.17,c,hH)};--nB:${dk.popD};--nB2:${dk.hdr};--nL:${okhex(.9,.04,hH)};--nE:${dk.popD};--nD:${dk.popD}}`;}).join("\n");
  const s=document.createElement("style");s.id="dthCss";s.textContent=css;document.head.appendChild(s);}

/* ---- the page: attributes on the board, team banner, stage effects, chip dots ---- */
function nepFx(st,k){const t=dthTeam(k);
  if(st==="team")return t?`${dthLogo(k)?`<img class="nfx-logo" src="${dthLogo(k)}" alt="" loading="lazy" onerror="this.remove()">`:""}<b class="nfx-nick">${esc(t[1])}</b>`:`<i class="nfx-sp a"></i><i class="nfx-sp b"></i>`;
  if(st==="neon")return `<i class="nfx-sun"></i><i class="nfx-grid"></i>`;
  if(st==="gold")return `<i class="nfx-cup">🏆</i>`+Array.from({length:16},(_,i)=>`<s style="--x:${(i*37+11)%97}%;--y:${(i*53+7)%88}%;--d:${((i*7)%23)/10}s;--z:${.6+((i*5)%7)/10}"></s>`).join("");
  return `<i class="nfx-sp a"></i><i class="nfx-sp b"></i>`;}
{const _dv=dashView;dashView=function(){let h=_dv.apply(this,arguments);const c=dashCur(),nep=c===NEP_ID;if(h.indexOf('<div class="dash')<0)return h;
  const bt=nep?nepTeam():dthOf(c),st=nep?nstOf():"";
  h=h.replace('<div class="dash',`<div${bt?` data-bt="${bt}"`:""}${st?` data-nst="${st}"`:""} class="dash`);
  if(nep)h=h.replace('<div class="dhead">',`<div class="dhead"><div class="nep-fx nfx-${st}" aria-hidden="true">${nepFx(st,bt)}</div>`);
  else if(bt){const t=dthTeam(bt),lg=dthLogo(bt);
    h=h.replace(/<div class="dhead"><div><h2>Dashboard<\/h2>/,`<div class="dhead dthb"><span class="dth-wm" aria-hidden="true">${lg?`<img src="${lg}" alt="" loading="lazy" onerror="this.remove()">`:""}<b>${esc(t[0])}</b></span><div><h2>${esc(dashBName())}</h2>`);}
  // a small color dot on each board chip
  h=h.replace(/<button role="tab" class="dbc" data-dboard="([^"]+)"([^>]*)>/g,(m,id)=>{const k=id===NEP_ID?nepTeam():dthOf(id);
    return id===NEP_ID?`${m}<i class="dbdot nst-${nstOf()}"${k?` data-c="${k}"`:""}></i>`:k?`${m}<i class="dbdot" data-c="${k}"></i>`:m;});
  // theme button next to Share
  if(prefKey())h=h.replace(/(<button class="btn ghost sm" data-dshare)/,`<button class="btn ghost sm" data-dtheme title="Colors for this dashboard">🎨 Theme</button>$1`);
  return h;};}
{const _rr=renderRosters;renderRosters=function(){const r=_rr.apply(this,arguments);try{const b=document.body,on=nav==="dash"&&dashCur()===NEP_ID,st=nstOf(),k=nepTeam();
    NST.forEach(([x])=>b.classList.toggle("nst-"+x,on&&st===x));if(on&&k)b.dataset.nbt=k;else delete b.dataset.nbt;
    const d=document.querySelector("#rosters .dash");if(d&&nav==="dash"){const bt=on?k:dthOf();if(bt)d.dataset.bt=bt;else delete d.dataset.bt;if(on)d.dataset.nst=st;else delete d.dataset.nst;}}catch(e){}return r;};}

/* ---- the picker ---- */
function dthSheetHtml(){const nep=dashCur()===NEP_ID,cur=dthOf(),st=nstOf();
  const sw=`<div class="nbagrid" role="group" aria-label="Team colors for this dashboard"><button class="nbasw none" data-dbt="" aria-pressed="${!cur}">Match my app</button>${NBACOL.map(([k,n,p,s])=>{const x=nbaShades(p,s).lt;
    return `<button class="nbasw" data-dbt="${k}" aria-pressed="${cur===k}" title="${n}" style="--c1:${x.hdr};--c2:${x.pop}"><i aria-hidden="true">${k}</i><span>${n}</span></button>`;}).join("")}</div>`;
  const stages=nep?`<h3>Stage</h3><p class="muted dsnote">Only on New Era +. Changes the arena behind your board.</p><div class="nstg" role="group" aria-label="Stage">${NST.map(([k,n,d])=>`<button class="nstc nst-${k}" data-nst="${k}" aria-pressed="${st===k}"${k==="team"&&nepTeam()?` data-c="${nepTeam()}"`:""}><i aria-hidden="true"></i><b>${n}</b><small>${d}</small></button>`).join("")}</div>
    ${st==="team"&&!nepTeam()?`<p class="muted dsnote">Pick a team below for the Team colors stage.</p>`:""}`:"";
  return `${stages}<h3>Team colors${nep?"":" for this dashboard"}</h3><p class="muted dsnote">${nep?"Colors the glow, rings and bars. Match my app uses Display › Team colors.":"Just this dashboard. The rest of the app keeps its own look."}</p>${sw}
    <div class="sheetacts"><button class="btn" data-sheet="close">Done</button></div>`;}
function dthOpen(){openSheet(`Theme · ${dashBName()}`,`<div class="dthsheet">${dthSheetHtml()}</div>`);}
document.addEventListener("click",e=>{let b;
  if((b=e.target.closest("[data-dtheme]"))){dthOpen();return;}
  if((b=e.target.closest("[data-dbt]"))){dthSet(b.dataset.dbt);dashDraw();const s=b.closest(".dthsheet");if(s)s.innerHTML=dthSheetHtml();return;}
  if((b=e.target.closest("[data-nst]"))){dashBoardSet({nst:b.dataset.nst});dashDraw();const s=b.closest(".dthsheet");if(s)s.innerHTML=dthSheetHtml();return;}});

{const s=document.createElement("style");s.textContent=`
/* chip dots */
.dbdot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px;background:linear-gradient(135deg,var(--c1,#8098ff) 50%,var(--c2,#e2701f) 50%);box-shadow:0 0 0 1.5px rgba(255,255,255,.7)}
.dbdot.nst-night:not([data-c]){--c1:#3352f5;--c2:#a78bfa}.dbdot.nst-wood{--c1:#8a4b1f;--c2:#f59e0b}.dbdot.nst-neon{--c1:#ff3ec8;--c2:#22d3ee}.dbdot.nst-gold{--c1:#111;--c2:#e8c463}
/* a themed (non New Era +) board: team banner header, team stripe on tiles */
.dash[data-bt]:not(.dnep) .dhead.dthb{position:relative;isolation:isolate;overflow:hidden;align-items:center;padding:18px 18px 20px;border-radius:18px;color:#fff;
  background:radial-gradient(120% 160% at 100% 0%,color-mix(in srgb,var(--nba2) 26%,transparent),transparent 55%),linear-gradient(120deg,var(--nba1),var(--nba1d));box-shadow:inset 0 -5px 0 var(--nba2),0 16px 34px -20px var(--nba1)}
.dash[data-bt]:not(.dnep) .dhead.dthb h2{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.3)}.dash[data-bt]:not(.dnep) .dhead.dthb .muted{color:rgba(255,255,255,.85)}
.dash[data-bt]:not(.dnep) .dhead.dthb .btn{background:var(--nba2);color:var(--nba2ink);border-color:transparent;box-shadow:none}
.dash[data-bt]:not(.dnep) .dhead.dthb .btn.ghost{background:rgba(255,255,255,.16);color:#fff}
.dth-wm{position:absolute;right:-6px;top:50%;z-index:-1;display:flex;align-items:center;gap:6px;transform:translateY(-50%) rotate(-8deg);opacity:.22;pointer-events:none}
.dth-wm img{width:118px;height:118px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.3))}.dth-wm b{font-size:4.6rem;font-weight:900;line-height:1;letter-spacing:-.03em;color:transparent;-webkit-text-stroke:2px #fff}
.dash[data-bt]:not(.dnep) .dtile:not(.dk-hd):not(.dadd):not(.dk-xa){border-top:3px solid var(--nba1);box-shadow:inset 0 3px 0 -1px var(--nba2)}
.dash[data-bt]:not(.dnep) .dtile.dk-hd .dth h3{color:var(--accent)}
.dash[data-bt]:not(.dnep) .dtile.dk-hd .dth h3::after{background:linear-gradient(90deg,var(--nba1),var(--nba2) 40%,transparent)}
.dash[data-bt]:not(.dnep) .dbc[aria-selected="true"]{background:var(--nba1);color:#fff;box-shadow:inset 0 -3px 0 var(--nba2)}
@media (max-width:640px){.dth-wm img{width:84px;height:84px}.dth-wm b{font-size:3.2rem}.dash[data-bt]:not(.dnep) .dhead.dthb{padding:14px 14px 18px}}
/* the picker */
.dthsheet h3{margin:14px 0 4px}.dthsheet h3:first-child{margin-top:0}
.nstg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:6px 0 4px}
.nstc{all:unset;cursor:pointer;display:flex;flex-direction:column;gap:2px;border-radius:14px;padding:8px;background:var(--chip,#eef);box-shadow:inset 0 0 0 1px var(--line)}
.nstc i{display:block;height:58px;border-radius:10px;margin-bottom:6px;background:#050a18;position:relative;overflow:hidden}
.nstc b{font-size:.86rem}.nstc small{font-size:.7rem;color:var(--muted);line-height:1.25}
.nstc[aria-pressed="true"]{box-shadow:inset 0 0 0 2px var(--accent),0 8px 20px -12px var(--accent)}
.nstc:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.nstc.nst-night i{background:conic-gradient(from 160deg at 30% -10%,transparent 0 10deg,rgba(255,255,255,.35) 14deg,transparent 22deg),conic-gradient(from 180deg at 72% -10%,transparent 0 6deg,rgba(199,210,254,.3) 10deg,transparent 18deg),radial-gradient(60% 80% at 20% 30%,#3352f5aa,transparent),radial-gradient(50% 70% at 85% 20%,#e2701f88,transparent),#050a18}
.nstc.nst-team i{background:radial-gradient(60% 90% at 20% 20%,var(--c1,#3352f5),transparent),radial-gradient(60% 90% at 90% 10%,var(--c2,#e2701f),transparent),#0b0f1e}
.nstc.nst-wood i{background:radial-gradient(70% 90% at 50% 0%,rgba(255,220,150,.45),transparent 70%),repeating-linear-gradient(90deg,#7a4a22 0 18px,#5f3616 18px 19px,#8a5729 19px 37px,#6a3d1a 37px 38px)}
.nstc.nst-neon i{background:radial-gradient(circle at 70% 70%,#ffb347 0 12px,#ff3ec8 18px,transparent 19px),linear-gradient(transparent 55%,rgba(255,62,200,.4) 55% 56%,transparent 56% 72%,rgba(255,62,200,.4) 72% 73%,transparent 73% 88%,rgba(255,62,200,.4) 88% 89%,transparent 89%),linear-gradient(#1a0536,#0a0118)}
.nstc.nst-gold i{background:radial-gradient(1.5px 1.5px at 20% 30%,#fff7d6,transparent),radial-gradient(1.5px 1.5px at 60% 20%,#fff7d6,transparent),radial-gradient(2px 2px at 80% 60%,#fff7d6,transparent),radial-gradient(70% 90% at 50% 0%,rgba(232,196,99,.55),transparent 70%),#0b0906}
`;
  // ---- New Era + stages ----
  s.textContent+=`
.dash.dnep .dhead{position:relative}
.nep-fx{position:absolute;left:-16px;right:-16px;top:-24px;height:230px;z-index:-1;overflow:hidden;pointer-events:none;-webkit-mask-image:linear-gradient(#000 55%,transparent);mask-image:linear-gradient(#000 55%,transparent);animation:nfxon 1.4s ease-out both}
@keyframes nfxon{0%{opacity:0}18%{opacity:.7}26%{opacity:.15}40%{opacity:1}100%{opacity:1}}
/* spotlights (Night, Hardwood, Team without a team) */
.nfx-sp{position:absolute;top:-30px;width:220px;height:330px;transform-origin:50% 0;background:linear-gradient(rgba(255,255,255,.26),rgba(255,255,255,0) 85%);clip-path:polygon(44% 0,56% 0,100% 100%,0 100%);mix-blend-mode:screen;filter:blur(6px)}
.nfx-sp.a{left:12%;animation:nfxsw 9s ease-in-out infinite alternate}.nfx-sp.b{left:58%;animation:nfxsw 11s ease-in-out -4s infinite alternate-reverse;background:linear-gradient(color-mix(in srgb,var(--nL,#c7d2fe) 40%,transparent),transparent 85%)}
@keyframes nfxsw{from{transform:rotate(-22deg)}to{transform:rotate(18deg)}}
/* team colors: logo + nickname */
.nfx-logo{position:absolute;right:2%;top:16px;width:200px;height:200px;opacity:.28;transform:rotate(-8deg);filter:drop-shadow(0 0 40px var(--nB2))}
.nfx-nick{position:absolute;right:-1%;top:50px;font-size:clamp(4rem,12vw,8.5rem);font-weight:900;font-style:italic;line-height:1;letter-spacing:-.03em;text-transform:uppercase;white-space:nowrap;color:transparent;-webkit-text-stroke:1.5px color-mix(in srgb,var(--nB) 60%,transparent);opacity:.55}
/* neon: sunset + grid floor */
.nfx-sun{position:absolute;right:10%;top:22px;width:150px;height:150px;border-radius:50%;background:linear-gradient(#ffd166,#ff7a59 45%,#ff3ec8);box-shadow:0 0 60px 10px rgba(255,62,200,.45);
  -webkit-mask-image:linear-gradient(#000 52%,transparent 52% 58%,#000 58% 68%,transparent 68% 73%,#000 73% 82%,transparent 82% 86%,#000 86%);mask-image:linear-gradient(#000 52%,transparent 52% 58%,#000 58% 68%,transparent 68% 73%,#000 73% 82%,transparent 82% 86%,#000 86%)}
.nfx-grid{position:absolute;left:-30%;right:-30%;bottom:-40px;height:190px;transform:perspective(260px) rotateX(62deg);transform-origin:50% 100%;
  background-image:linear-gradient(rgba(255,62,200,.6) 2px,transparent 2px),linear-gradient(90deg,rgba(34,211,238,.45) 2px,transparent 2px);background-size:44px 30px;animation:nfxgrid 2.4s linear infinite}
@keyframes nfxgrid{to{background-position:0 30px}}
/* gold: trophy + sparkles */
.nfx-cup{position:absolute;right:6%;top:24px;font-size:7.5rem;font-style:normal;line-height:1;opacity:.2;filter:sepia(1) saturate(3) drop-shadow(0 0 30px #e8c463);transform:rotate(8deg)}
.nep-fx s{position:absolute;left:var(--x);top:calc(var(--y) * .8 + 10px);width:4px;height:4px;border-radius:50%;background:#fff3c4;box-shadow:0 0 8px 2px #e8c463;transform:scale(var(--z));animation:nfxtw 2.6s ease-in-out var(--d) infinite}
@keyframes nfxtw{0%,100%{opacity:.1;scale:.4}50%{opacity:1;scale:1}}

/* stage colors */
body.nepon.nst-wood{--nbg:#130b05;--nS:#26170b;--nT1:#2c1a0c;--nT2:#1e1208;--nB:#fbbf24;--nB2:#d97706;--nD:#fde68a;--nL:#ffe8c2;--nE:#ef4444}
body.nepon.nst-wood .dash.dnep{--accent:#f59e0b;--s-me:#f59e0b;--ink:#fff7ea;--muted:#cdb592;--line:rgba(253,230,138,.15)}
body.nepon.nst-wood .dash.dnep::before{height:900px;opacity:.5;animation:none;background:linear-gradient(180deg,transparent,#130b05 92%),radial-gradient(60% 50% at 50% 0%,rgba(255,214,140,.5),transparent 70%),repeating-linear-gradient(90deg,#7a4a22 0 56px,#55300f 56px 58px,#8a5729 58px 116px,#633818 116px 118px,#74461f 118px 172px,#55300f 172px 174px)}
body.nepon.nst-wood .dash.dnep::after{background-image:repeating-linear-gradient(0deg,rgba(0,0,0,.08) 0 2px,transparent 2px 7px)}
body.nepon.nst-wood .nep-court{opacity:.42}body.nepon.nst-wood .nep-court path{stroke:#fff3dc}
body.nepon.nst-wood .nfx-sp{background:linear-gradient(rgba(255,226,170,.32),transparent 85%)}
body.nepon.nst-neon{--nbg:#0a0118;--nS:#170a30;--nT1:#1c0b3a;--nT2:#12062a;--nB:#ff3ec8;--nB2:#c026d3;--nD:#22d3ee;--nL:#f5b5ff;--nE:#fb7185}
body.nepon.nst-neon .dash.dnep{--accent:#22d3ee;--s-me:#22d3ee;--muted:#b9a6d9;--line:rgba(255,62,200,.2)}
body.nepon.nst-neon .dash.dnep::before{background:radial-gradient(40% 40% at 80% 18%,rgba(255,62,200,.4),transparent 70%),radial-gradient(40% 40% at 12% 10%,rgba(34,211,238,.32),transparent 70%),linear-gradient(#1a0536,transparent 700px)}
body.nepon.nst-neon .nep-title{text-shadow:0 0 18px rgba(255,62,200,.55)}
body.nepon.nst-neon .dash.dnep .dtile:not(.dk-hd):not(.dk-xa){box-shadow:0 0 0 1px rgba(255,62,200,.18),0 0 24px -10px rgba(34,211,238,.6),0 24px 48px -28px rgba(0,0,0,.8)}
body.nepon.nst-neon .nep-no{-webkit-text-stroke-color:#ff3ec8;filter:drop-shadow(0 0 6px #ff3ec8)}
body.nepon.nst-gold{--nbg:#0a0906;--nS:#17140d;--nT1:#1c180f;--nT2:#110e08;--nB:#e8c463;--nB2:#b8892b;--nD:#fff1b8;--nL:#fff1c7;--nE:#f59e0b}
body.nepon.nst-gold .dash.dnep{--accent:#e8c463;--s-me:#e8c463;--ink:#fffaf0;--muted:#bfb29a;--line:rgba(232,196,99,.18)}
body.nepon.nst-gold .dash.dnep::before{background:radial-gradient(50% 45% at 50% 0%,rgba(232,196,99,.35),transparent 70%),radial-gradient(35% 40% at 90% 30%,rgba(184,137,43,.25),transparent 70%)}
body.nepon.nst-gold .nep-title{background:linear-gradient(100deg,#8a6a1c 0%,#fff1c7 25%,#e8c463 45%,#a07a25 60%,#fff6d8 80%,#c9a24a 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text}
body.nepon.nst-gold .dash.dnep .dbc[aria-selected="true"]{color:#1a1406}
body.nepon.nst-team .dash.dnep::before{background:radial-gradient(45% 45% at 12% 12%,color-mix(in srgb,var(--nB2) 55%,transparent),transparent 70%),radial-gradient(35% 40% at 88% 8%,color-mix(in srgb,var(--nB) 40%,transparent),transparent 70%),radial-gradient(40% 40% at 50% 55%,color-mix(in srgb,var(--nB2) 25%,transparent),transparent 70%)}
body.nepon.nst-team .dash.dnep .dtile:not(.dk-hd):not(.dk-xa){border-top:2px solid color-mix(in srgb,var(--nB) 70%,transparent)}
@media (max-width:640px){.nfx-logo{width:120px;height:120px;top:10px;right:-4%}.nfx-nick{display:none}.nfx-sun{width:96px;height:96px;right:4%;top:16px}.nfx-cup{font-size:4.5rem;top:16px}.nfx-sp{width:150px}}
@media (prefers-reduced-motion:reduce){.nep-fx,.nfx-sp,.nfx-grid,.nep-fx s{animation:none!important}}
`;document.head.appendChild(s);}
