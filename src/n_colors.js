
/* ============================================================================
   NBA TEAM COLORS (2026-10-22): Display › Team colors repaints the app in an
   NBA team's colors (accent, highlights, a stripe across the top), saved per
   login with the other display settings. Dark mode uses a lighter shade.
   ============================================================================ */
const NBACOL=[["ATL","Hawks","#E03A3E","#C1D32F"],["BOS","Celtics","#007A33","#BA9653"],["BKN","Nets","#000000","#777D84"],["CHA","Hornets","#1D1160","#00788C"],
  ["CHI","Bulls","#CE1141","#000000"],["CLE","Cavaliers","#860038","#FDBB30"],["DAL","Mavericks","#00538C","#B8C4CA"],["DEN","Nuggets","#0E2240","#FEC524"],
  ["DET","Pistons","#C8102E","#1D42BA"],["GSW","Warriors","#1D428A","#FFC72C"],["HOU","Rockets","#CE1141","#C4CED4"],["IND","Pacers","#002D62","#FDBB30"],
  ["LAC","Clippers","#C8102E","#1D428A"],["LAL","Lakers","#552583","#FDB927"],["MEM","Grizzlies","#5D76A9","#12173F"],["MIA","Heat","#98002E","#F9A01B"],
  ["MIL","Bucks","#00471B","#EEE1C6"],["MIN","Timberwolves","#0C2340","#78BE20"],["NOP","Pelicans","#0C2340","#C8102E"],["NYK","Knicks","#006BB6","#F58426"],
  ["OKC","Thunder","#007AC1","#EF3B24"],["ORL","Magic","#0077C0","#C4CED4"],["PHI","76ers","#006BB6","#ED174C"],["PHX","Suns","#1D1160","#E56020"],
  ["POR","Trail Blazers","#E03A3E","#000000"],["SAC","Kings","#5A2D81","#63727A"],["SAS","Spurs","#000000","#C4CED4"],["TOR","Raptors","#CE1141","#000000"],
  ["UTA","Jazz","#4B2C83","#000000"],["WAS","Wizards","#002B5C","#E31837"]];
let NBATHEME="";try{NBATHEME=localStorage.getItem("dfNbaTheme")||"";}catch(e){}
function applyNbaTheme(){
  let st=document.getElementById("nbaTheme");if(!st){st=document.createElement("style");st.id="nbaTheme";document.head.appendChild(st);}
  const t=NBACOL.find(x=>x[0]===NBATHEME);document.documentElement.classList.toggle("nbat",!!t);if(!t){st.textContent="";return;}
  const [,,p,s]=t,dk=`--accent:color-mix(in srgb,${p} 45%,#fff);--accent-wash:color-mix(in srgb,${p} 30%,#131c2e);--nba2:${s};`;
  st.textContent=`:root{--accent:${p};--accent-wash:color-mix(in srgb,${p} 11%,#fff);--nba1:${p};--nba2:${s}}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dk}}}
:root[data-theme="dark"]{${dk}}`;}
applyNbaTheme();
function setNbaTheme(v){NBATHEME=v;try{localStorage.setItem("dfNbaTheme",v);}catch(e){}applyNbaTheme();}
const nbaThemeHtml=()=>`<h3>Team colors</h3><div class="nbagrid" role="group" aria-label="Team colors"><button class="nbasw none" data-nbat="" aria-pressed="${!NBATHEME}">Default</button>${NBACOL.map(([k,n,p,s])=>`<button class="nbasw" data-nbat="${k}" aria-pressed="${NBATHEME===k}" title="${n}" style="--c1:${p};--c2:${s}"><i aria-hidden="true"></i>${k}</button>`).join("")}</div>`;
document.addEventListener("click",e=>{const b=e.target.closest("[data-nbat]");if(!b)return;setNbaTheme(b.dataset.nbat);
  b.parentElement.querySelectorAll("[data-nbat]").forEach(x=>x.setAttribute("aria-pressed",x===b));savePrefs();});
