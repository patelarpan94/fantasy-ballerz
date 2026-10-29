
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
let NBATHEME="",NBASTR="bold";try{NBATHEME=localStorage.getItem("dfNbaTheme")||"";NBASTR=localStorage.getItem("dfNbaStr")||"bold";}catch(e){}
/* Shades are worked out in OKLCH (even steps of lightness) so a team's colors
   never blend into mud: header = primary, stripe = secondary, and dark mode
   gets a brighter version of the same hue instead of a washed-out pastel. */
const okl=hex=>{const c=[1,3,5].map(i=>{const v=parseInt(hex.slice(i,i+2),16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}),
  l=Math.cbrt(.4122214708*c[0]+.5363325363*c[1]+.0514459929*c[2]),m=Math.cbrt(.2119034982*c[0]+.6806995451*c[1]+.1073969566*c[2]),s=Math.cbrt(.0883024619*c[0]+.2817188376*c[1]+.6299787005*c[2]),
  L=.2104542553*l+.793617785*m-.0040720468*s,a=1.9779984951*l-2.428592205*m+.4505937099*s,b=.0259040371*l+.7827717662*m-.808675766*s;
  return [L,Math.hypot(a,b),Math.atan2(b,a)];};
const okhex=(L,C,H)=>{for(;;C*=.94){const a=C*Math.cos(H),b=C*Math.sin(H),l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3,
  r=[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s];
  if(C<.002||r.every(v=>v>=-.0005&&v<=1.0005))return "#"+r.map(v=>{v=Math.min(1,Math.max(0,v));v=v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;return Math.round(v*255).toString(16).padStart(2,"0");}).join("");}};
const lum=hex=>{const c=[1,3,5].map(i=>{const v=parseInt(hex.slice(i,i+2),16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const inkOn=hex=>lum(hex)>.36?"#111827":"#fff";
function nbaShades(p,s){
  const [pL,pC,pH]=okl(p),[sL,sC,sH]=okl(s),grey=pC<.03,
    // the colorful one of the pair drives the accent when the primary is black (Nets, Spurs)
    [hC,hH]=grey&&sC>=.03?[sC,sH]:[pC,pH],
    lt={hdr:p,hdr2:okhex(Math.max(.12,pL-.08),pC,pH),acc:pL>.55?okhex(.52,pC,pH):grey?okhex(Math.min(pL,.3),0,0):p},
    dk={hdr:okhex(Math.max(pL,grey?.3:.36),pC,pH),acc:okhex(.74,Math.min(Math.max(hC,grey?0:.09),.17),hH)};
  dk.hdr2=okhex(Math.max(.2,okl(dk.hdr)[0]-.08),pC,pH);
  // secondary must stand out against the header; black/near-header secondaries fall back to white or a lighter tint
  const far=(x,h)=>{const [a,b,c]=okl(x),[d,e,f]=okl(h);return Math.hypot(a-d,b*Math.cos(c)-e*Math.cos(f),b*Math.sin(c)-e*Math.sin(f))>.12;};
  const pop=h=>far(s,h)?s:"#ffffff",popD=sL<.4?(sC<.03?"#d9dde3":okhex(.72,sC,sH)):s;
  return {lt:{...lt,pop:pop(lt.hdr),wash:okhex(.96,Math.min(pC,.035),pH)},dk:{...dk,pop:pop(dk.hdr),popD,wash:okhex(.27,Math.min(hC,.06),hH)}};}
function applyNbaTheme(){
  let st=document.getElementById("nbaTheme");if(!st){st=document.createElement("style");st.id="nbaTheme";document.head.appendChild(st);}
  const t=NBACOL.find(x=>x[0]===NBATHEME),de=document.documentElement;de.classList.toggle("nbat",!!t);de.classList.toggle("nbasub",!!t&&NBASTR==="subtle");if(!t){st.textContent="";return;}
  const {lt,dk}=nbaShades(t[2],t[3]),v=(o,dark)=>`--accent:${o.acc};--accent-wash:${o.wash};--on-accent:${inkOn(o.acc)};--nba1:${o.hdr};--nba1d:${o.hdr2};--nba2:${o.pop};--nba2ink:${inkOn(o.pop)};--nbaline:${dark?o.popD:t[3]};--nbatint:${dark?7:9}%;`;
  st.textContent=`:root{${v(lt)}}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${v(dk,1)}}}
:root[data-theme="dark"]{${v(dk,1)}}`;}
applyNbaTheme();
function setNbaTheme(v){NBATHEME=v;try{localStorage.setItem("dfNbaTheme",v);}catch(e){}applyNbaTheme();}
function setNbaStr(v){NBASTR=v==="subtle"?"subtle":"bold";try{localStorage.setItem("dfNbaStr",NBASTR);}catch(e){}applyNbaTheme();}
// each swatch is a tiny header: the team's primary with its secondary stripe, like the app will look
const nbaThemeHtml=()=>`<h3>Team colors</h3><div class="nbagrid" role="group" aria-label="Team colors"><button class="nbasw none" data-nbat="" aria-pressed="${!NBATHEME}">Default</button>${NBACOL.map(([k,n,p,s])=>{const x=nbaShades(p,s).lt;
  return `<button class="nbasw" data-nbat="${k}" aria-pressed="${NBATHEME===k}" title="${n}" style="--c1:${x.hdr};--c2:${x.pop}"><i aria-hidden="true">${k}</i><span>${n}</span></button>`;}).join("")}</div>
  <div class="tabs sm dsrow nbastr" role="group" aria-label="Team color strength"${NBATHEME?"":" hidden"}>${[["bold","Bold"],["subtle","Subtle"]].map(([k,l])=>`<button data-ds="nbastr:${k}" aria-selected="${NBASTR===k}"${prefKey()?"":" disabled"}>${l}</button>`).join("")}</div>
  <p class="muted dsnote nbastr"${NBATHEME?"":" hidden"}><b>Bold</b> paints the header and tab bar in the team's colors. <b>Subtle</b> keeps them plain and shows the team in a stripe, buttons and highlights.</p>`;
document.addEventListener("click",e=>{const b=e.target.closest("[data-nbat]");if(!b)return;setNbaTheme(b.dataset.nbat);
  b.parentElement.querySelectorAll("[data-nbat]").forEach(x=>x.setAttribute("aria-pressed",x===b));
  b.closest(".sheet,body").querySelectorAll(".nbastr").forEach(x=>x.hidden=!NBATHEME);savePrefs();});
