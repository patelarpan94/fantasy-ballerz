/* ============================================================================
   NEW ARP LOOK (2.18, Arp 2026-10-30: "modernize the UI a bit more. Make it a theme called NEW ARP").
   Display › Look: Classic | NEW ARP, saved per login (prefs.style, localStorage dfStyle). Works with
   Light/Dark, team colors and every layout. Everything sits under html.arp (+ arpx/arpy/arpz layers),
   so Classic is untouched:
   - Glass: Archivo type, frosted header, floating phone tab bar, one pill style for every switch,
     outline-free cards, dark scoreboard on Matchup
   - Glass+: page glow, My Team score line as a mini scoreboard, category leader pills, press feedback
   - Glass++: category tug-of-war bars, win rings, big section titles, League scoreboard win bars
   - Pro: NBA headshots (ESPN ids) with team logo badges, half-court art, sliding pills, count-up,
     rows that rise in. Reduce Motion turns the motion off.
   Comparison page: https://claude.ai/artifact/EGFHZZVqnKSrE5pK2Doqfs
   ============================================================================ */
let STYLE="classic";try{STYLE=localStorage.getItem("dfStyle")==="arp"?"arp":"classic";}catch(e){}
const STYLES=[["classic","Classic"],["arp","NEW ARP"]];
// ESPN player ids by name from past seasons' History files (filled in by the build), topped up by ESPN ownership (nba.own[n][3])
const ARP_IDS=/*ARPIDS*/{};
const ARP_NBA={ATL:37,BOS:38,CLE:39,NO:40,CHI:41,DAL:42,DEN:43,GS:44,HOU:45,LAC:46,LAL:47,MIA:48,MIL:49,MIN:50,BKN:51,NY:52,ORL:53,IND:54,PHI:55,PHX:56,POR:57,SAC:58,SA:59,OKC:60,TOR:61,UTAH:62,MEM:63,WSH:64,DET:65,CHA:66};
const arpLogo=a=>ARP_NBA[a]?`https://cdn.nba.com/logos/nba/16106127${ARP_NBA[a]}/primary/L/logo.svg`:"";
const arpShot=n=>{const id=(typeof NBA!=="undefined"&&NBA?.own?.[n]?.[3])||ARP_IDS[n];return id?`https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=140&h=102&scale=crop&cquality=60`:"";};
const ARP_CSS=`/* ---- NEW ARP style (2.18): rounder, softer, glass header + floating tab bar, Archivo type,
   dark "scoreboard" matchup hero. Everything sits under html.arp so Classic is untouched. ---- */
html.arp{
  --f-display:"Archivo Narrow","Archivo",system-ui,sans-serif;
  --f-body:"Archivo",system-ui,-apple-system,"Segoe UI",sans-serif;
  --f-mono:"Archivo",system-ui,sans-serif;
  --bg:#eceff4; --surface:#ffffff; --ink:#0f1a2b; --muted:#5d6a7d; --faint:#a1abba; --line:#e3e7ee; --past:#f6f7fa;
  --chip:#e4e8ef; --glass:rgba(255,255,255,.74); --lift:0 1px 2px rgba(15,26,43,.05),0 10px 28px -14px rgba(15,26,43,.18);
  --board:#121a2b; --board2:#1b2540; --topbg:var(--glass);
  --r1:10px; --r2:16px; --r3:22px;
}
html.arp:not(.nbat){--accent:#3352f5;--accent-wash:#e8ecff;--s-me:#3352f5;--s-op:#e2701f;--opp:#c25d14;--opp-wash:#fdeee2}
@media (prefers-color-scheme: dark){html.arp:not([data-theme="light"]){
  --bg:#0f1319; --surface:#171c24; --ink:#e8edf4; --muted:#93a0b3; --faint:#4f5a6b; --line:#252c38; --past:#141920;
  --chip:#222936; --glass:rgba(23,28,36,.72); --lift:0 0 0 1px #232a35; --board:#0b0f16; --board2:#18213a}
  html.arp:not(.nbat):not([data-theme="light"]){--accent:#8098ff;--accent-wash:#1d2545;--s-me:#6d86ff;--s-op:#f08a3e;--opp:#f09a55;--opp-wash:#33241a}}
html.arp[data-theme="dark"]{
  --bg:#0f1319; --surface:#171c24; --ink:#e8edf4; --muted:#93a0b3; --faint:#4f5a6b; --line:#252c38; --past:#141920;
  --chip:#222936; --glass:rgba(23,28,36,.72); --lift:0 0 0 1px #232a35; --board:#0b0f16; --board2:#18213a}
html.arp[data-theme="dark"]:not(.nbat){--accent:#8098ff;--accent-wash:#1d2545;--s-me:#6d86ff;--s-op:#f08a3e;--opp:#f09a55;--opp-wash:#33241a}

html.arp body{font-variant-numeric:tabular-nums;letter-spacing:-.003em;-webkit-font-smoothing:antialiased}
html.arp body::before{background:var(--glass);-webkit-backdrop-filter:blur(20px) saturate(1.6);backdrop-filter:blur(20px) saturate(1.6)}

/* header: frosted glass, no hard rule */
/* the blur sits on a layer behind the bar: a backdrop-filter on .bar itself would trap the fixed phone tab bar inside it */
html.arp body:not(.duow) .bar{background:transparent;border-bottom:0;box-shadow:0 1px 0 color-mix(in srgb,var(--line) 70%,transparent)}
html.arp body:not(.duow) .bar::after{content:"";position:absolute;inset:0;z-index:-1;background:var(--glass);-webkit-backdrop-filter:blur(20px) saturate(1.6);backdrop-filter:blur(20px) saturate(1.6)}
html.arp .navwrap{border-top:0}
html.arp select{background:var(--chip);border-color:transparent;border-radius:12px;font-weight:650}
html.arp .arrow,html.arp .hbtn{background:var(--chip);border-color:transparent;border-radius:12px;color:var(--ink)}
html.arp .hbtn{border-radius:50%}
html.arp .rbtn,html.arp .btn{border-radius:999px;font-weight:650;padding-inline:14px}
html.arp .btn.ghost{background:var(--chip);border-color:transparent;color:var(--ink)}
html.arp .btn.sm{padding-inline:10px}
html.arp .todayb{border-radius:999px}

/* desktop tabs: soft pills instead of the underline, sentence case */
html.arp .mainnav{gap:4px;padding-block:6px}
html.arp .mainnav button{font-family:var(--f-body);text-transform:none;letter-spacing:0;font-weight:600;font-size:.92rem;border:0;border-radius:999px;padding:8px 14px}
html.arp .mainnav button[aria-selected="true"]{background:var(--accent-wash);color:var(--accent)}

/* surfaces: no outlines, bigger radius, a soft lift */
html.arp .panel,html.arp .lalert,html.arp .dpick{border-color:transparent;border-radius:var(--r3);box-shadow:var(--lift)}
html.arp .lalert{border-left:0;box-shadow:var(--lift),inset 4px 0 0 var(--loss)}
html.arp .note{border-radius:var(--r2);padding:11px 14px}
html.arp .tcard{border-color:transparent;border-radius:var(--r2);background:var(--chip)}
html.arp .card{border-bottom-color:color-mix(in srgb,var(--line) 80%,transparent)}
html.arp .teamhead .tn,html.arp .cbhead{font-family:var(--f-body);font-weight:750;letter-spacing:-.01em}
html.arp .field input,html.arp .field select,html.arp .trow input,html.arp .row input[type=text],html.arp .hsearch input,html.arp #q{background:var(--chip);border-color:transparent;border-radius:12px}

/* segmented controls: one pattern for tabs, the matchup switch and day chips */
html.arp .tabs,html.arp .mfocus,html.arp .ptviews{border:0;border-radius:14px;background:var(--chip);padding:3px;gap:2px;overflow:visible}
html.arp .tabs button,html.arp .mfocus button,html.arp .ptviews button{border-radius:11px}
html.arp .ptviews button{background:transparent;border-color:transparent}
html.arp .tabs button[aria-selected="true"],html.arp .mfocus button[aria-pressed="true"],html.arp .ptviews button[aria-pressed="true"]{border-color:transparent;background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(15,26,43,.12)}
html.arp .cbdays button{border-color:transparent;background:var(--chip)}
html.arp .cbdays button[aria-pressed="true"]{background:var(--accent);border-color:transparent;color:var(--on-accent,#fff)}

/* tables: quieter headers in sentence weight, no shouting */
html.arp .grid thead th,html.arp .pool th,html.arp .drres th,html.arp .logt th,html.arp table.pt th{letter-spacing:.02em;font-weight:650}
html.arp .box th,html.arp .board th{font-family:var(--f-body);letter-spacing:0;font-weight:650}

/* the one loud thing: the matchup hero is a dark scoreboard in both light and dark */
html.arp .hero{position:relative;overflow:hidden;color:#f2f5fb;border:0;border-radius:var(--r3);
  background:radial-gradient(120% 140% at 0% 0%,color-mix(in srgb,var(--s-me) 55%,transparent),transparent 55%),
             radial-gradient(120% 140% at 100% 100%,color-mix(in srgb,var(--s-op) 45%,transparent),transparent 55%),
             linear-gradient(160deg,var(--board2),var(--board));box-shadow:0 18px 40px -22px rgba(10,16,30,.6)}
html.arp .hero .tlink,html.arp .hero .hname{color:#fff}
html.arp .hero .hsub,html.arp .hero .hlab{color:rgba(232,238,248,.66)}
html.arp .hero .hvs{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16);color:rgba(255,255,255,.75)}
html.arp .hero .hrec{font-family:"Archivo",sans-serif;font-stretch:125%;font-weight:800;font-size:2.4rem;letter-spacing:-.02em;color:#fff}
html.arp .hero .hproj{font-family:"Archivo",sans-serif;font-stretch:112%;color:rgba(255,255,255,.85)}
html.arp .hero .hbar{background:rgba(255,255,255,.14)}
html.arp .hero .hpct.up{color:#5fe39a}
html.arp .hero .hpct.down{color:#ff8a8a}
html.arp .hero .hav{box-shadow:0 0 0 3px rgba(255,255,255,.14)}

/* day picker */
html.arp .dpc{border-radius:12px}
html.arp .dpc.on{box-shadow:0 6px 14px -6px color-mix(in srgb,var(--accent) 70%,transparent)}

/* chat button */
html.arp .chatfab{border-radius:18px;box-shadow:0 12px 26px -10px color-mix(in srgb,var(--accent) 80%,transparent)}

/* login pad */
html.arp .gate .key{border-color:transparent;background:var(--surface);box-shadow:var(--lift)}
html.arp .gbadge{border-radius:22px}

/* sheets */
html.arp dialog.sheet,html.arp .sheet{border-radius:var(--r3)}

/* phone: floating glass tab bar with a pill behind the active icon */

/* two-pane rail: section tiles as soft chips, smaller scoreboard numbers */
html.arp body.duow .mainnav button{border-color:transparent;background:var(--chip);border-radius:var(--r2)}
html.arp body.duow .mainnav button[aria-selected="true"]{background:var(--accent-wash);color:var(--accent)}
html.arp body.duow .hero .hrec{font-size:1.9rem}
/* ---- Glass+ extras on top of NEW ARP (html.arp.arpx) ---- */
/* 1. ambient light: your color glows at the top of the page, the opponent's faintly on the right, so the glass has something to frost */
html.arp.arpx body{background:
  radial-gradient(70% 38% at 0% 0%,color-mix(in srgb,var(--accent) 22%,transparent),transparent 70%),
  radial-gradient(55% 30% at 100% 4%,color-mix(in srgb,var(--s-op) 14%,transparent),transparent 70%),
  var(--bg);background-attachment:fixed}
/* 2. My Team score line becomes a mini scoreboard, the same language as the Matchup hero */
html.arp.arpx .ptscore{border:0;border-radius:18px;padding:12px 16px;color:rgba(232,238,248,.75);
  background:radial-gradient(90% 160% at 0% 0%,color-mix(in srgb,var(--s-me) 55%,transparent),transparent 60%),radial-gradient(90% 160% at 100% 100%,color-mix(in srgb,var(--s-op) 40%,transparent),transparent 60%),linear-gradient(160deg,var(--board2),var(--board));
  box-shadow:0 14px 30px -18px rgba(10,16,30,.7)}
html.arp.arpx .ptscore b{color:#fff;font-family:"Archivo",sans-serif;font-stretch:125%;font-weight:800;font-size:1.5rem;letter-spacing:-.02em}
html.arp.arpx .ptscore .ptwin{background:rgba(95,227,154,.16);color:#5fe39a}
html.arp.arpx .ptscore .ptwin.down{background:rgba(255,138,138,.16);color:#ff8a8a}
html.arp.arpx .ptscore .ptgo{color:#fff}
/* 3. wide, heavy section titles */
html.arp.arpx .teamhead .tn{font-family:"Archivo",sans-serif;font-stretch:112%;font-weight:800;font-size:1.4rem;letter-spacing:-.02em}
/* 4. category board: leaders get a soft pill instead of a full green block */
html.arp.arpx .cbv.lead{background:transparent;box-shadow:none}
html.arp.arpx .cbv.lead b{background:var(--win-wash);color:var(--win);padding:2px 14px;border-radius:999px}
html.arp.arpx .cbv b{font-family:"Archivo",sans-serif;font-stretch:100%;font-weight:700;font-size:1.25rem}
html.arp.arpx .cbc{background:transparent;font-family:var(--f-body);font-weight:700;font-size:.8rem;letter-spacing:.02em}
html.arp.arpx .cbrow{border-bottom-color:color-mix(in srgb,var(--line) 60%,transparent)}
/* 5. slot pills and team badges get a light gradient and a ring */
html.arp.arpx .ptp .mvb:not([disabled]):not(.lk):not(.s12):not(.s13):not(.on){background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 70%,#9b5cff));box-shadow:0 4px 10px -5px var(--accent)}
html.arp.arpx .hav{background-image:linear-gradient(135deg,rgba(255,255,255,.22),transparent 60%)}
/* 6. today glows in the day strip */
html.arp.arpx .dpc.on,html.arp.arpx #days .on,html.arp.arpx .cbdays button[aria-pressed="true"]{box-shadow:0 8px 18px -8px var(--accent)}
/* 7. touch feedback: buttons give a little when pressed; the tab pill slides in */
html.arp.arpx :is(.btn,.rbtn,.tabs button,.ptviews button,.mfocus button,.mainnav button,.dpc,.ptscore,.cbdays button):active{transform:scale(.96)}
html.arp.arpx :is(.btn,.rbtn,.tabs button,.ptviews button,.mfocus button,.mainnav button,.dpc,.ptscore,.cbdays button){transition:transform .12s ease,background-color .2s ease,box-shadow .2s ease}
html.arp.arpx .mainnav button svg{transition:background-color .25s ease}
/* 8. sheets float on a frosted backdrop */
html.arp.arpx dialog::backdrop{background:rgba(10,16,30,.28);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
@media (prefers-reduced-motion:reduce){html.arp.arpx *{transition:none!important}html.arp.arpx :active{transform:none!important}}
/* ---- Glass++ (html.arp.arpx.arpy) ---- */
/* big iOS-style title for the section you're on */
html.arpy .arptitle{display:flex;flex-direction:column;gap:2px;padding:6px 2px 4px}
html.arpy .arptitle h1{margin:0;font-family:"Archivo",sans-serif;font-stretch:118%;font-weight:800;font-size:2.1rem;letter-spacing:-.03em;line-height:1.05;
  background:linear-gradient(90deg,var(--ink) 40%,color-mix(in srgb,var(--accent) 80%,var(--ink)));-webkit-background-clip:text;background-clip:text;color:transparent}
html.arpy .arptitle span{font-size:.82rem;color:var(--muted);font-weight:600}
/* two-pane already names the section in the rail */
html.arpy body.duow .arptitle{display:none}
/* tug-of-war bar under each category: your share vs theirs, leader in full color */
html.arpy .cbrow{position:relative}
html.arpy .arptug{position:absolute;left:14px;right:14px;bottom:3px;height:4px;border-radius:4px;pointer-events:none;
  background:linear-gradient(90deg,var(--s-me) 0 var(--a),var(--s-op) var(--a));opacity:.28}
html.arpy .arptug[data-lead]:not([data-lead=""]){opacity:.9}
html.arpy .arptug[data-lead="me"]{background:linear-gradient(90deg,var(--s-me) 0 var(--a),color-mix(in srgb,var(--s-op) 30%,transparent) var(--a))}
html.arpy .arptug[data-lead="op"]{background:linear-gradient(90deg,color-mix(in srgb,var(--s-me) 30%,transparent) 0 var(--a),var(--s-op) var(--a))}
/* win-chance ring round the hero badges */
html.arpy .hero .hav.arpring{position:relative;box-shadow:none}
html.arpy .hero .hav.arpring::before{content:"";position:absolute;inset:-6px;border-radius:50%;
  background:conic-gradient(#5fe39a calc(var(--p)*1%),rgba(255,255,255,.16) 0);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 calc(100% - 3px));mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 calc(100% - 3px))}
html.arpy .hero .hav.arpring{margin:6px}
/* league scoreboard: win-chance split bar along each card */
html.arpy .sccard{position:relative;border:0;border-radius:16px;background:var(--chip);padding-bottom:12px}
html.arpy .arpsplit{position:absolute;left:12px;right:12px;bottom:6px;height:4px;border-radius:4px;background:linear-gradient(90deg,var(--accent) 0 var(--a),color-mix(in srgb,var(--accent) 22%,transparent) var(--a))}
/* active tab icon fills in */
html.arpy .mainnav button[aria-selected="true"] svg{fill:color-mix(in srgb,currentColor 22%,transparent)}
/* hero record gets a subtle light sweep */
html.arpy .hero .hrec{background:linear-gradient(180deg,#fff 30%,rgba(255,255,255,.72));-webkit-background-clip:text;background-clip:text;color:transparent}
/* panels lift a touch more and get a hairline highlight on top (glass edge) */
html.arpy .panel{box-shadow:var(--lift),inset 0 1px 0 rgba(255,255,255,.6)}
@media (prefers-color-scheme: dark){html.arpy:not([data-theme="light"]) .panel{box-shadow:var(--lift),inset 0 1px 0 rgba(255,255,255,.05)}}
html.arpy[data-theme="dark"] .panel{box-shadow:var(--lift),inset 0 1px 0 rgba(255,255,255,.05)}
/* the live dot breathes while stats are fresh */
@keyframes arpbreathe{50%{opacity:.35}}
html.arpy .upd::first-letter{animation:arpbreathe 2.4s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){html.arpy .upd::first-letter{animation:none}}

/* ---- Glass Pro (html.arpz): graphics + motion on top of Glass++ ---- */
/* player faces: headshot on a soft disc, team logo badge in the corner, initials while it loads or if there is no photo */
html.arpz .arpface{position:relative;flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;
  background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--accent) 22%,var(--surface)),var(--chip));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--line) 70%,transparent)}
html.arpz .arpface>i{font-style:normal;font-weight:700;font-size:.72rem;color:var(--muted)}
html.arpz .arpface>img:not(.arptl){position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 10%;border-radius:50%;opacity:0;transform:scale(.85);transition:opacity .35s ease,transform .45s cubic-bezier(.2,1.4,.4,1)}
html.arpz .arpface.in>img:not(.arptl){opacity:1;transform:none}
html.arpz .arpface.in>i{visibility:hidden}
html.arpz .arpface .arptl{position:absolute;right:-4px;bottom:-3px;width:17px;height:17px;padding:1px;border-radius:50%;background:var(--surface);box-shadow:0 1px 3px rgba(15,26,43,.25)}
html.arpz .ptp{gap:6px}
html.arpz .ptp .arpface{width:34px;height:34px}
html.arpz .arpface.xl{width:84px;height:84px}
html.arpz .arpface.xl .arptl{width:28px;height:28px;right:-2px;bottom:0}
/* player card header: big face, faded team logo behind */
html.arpz .pchead.arppc{position:relative;overflow:hidden;border-radius:18px;padding:12px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 12%,var(--surface)),var(--surface))}
html.arpz .pchead.arppc::after{content:"";position:absolute;right:-30px;top:-20px;width:170px;height:170px;background:var(--arplogo) center/contain no-repeat;opacity:.12;pointer-events:none}
/* the matchup scoreboard sits on a faint half-court drawing */
html.arpz .hero::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.14;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 300' preserveAspectRatio='xMidYMid slice'%3E%3Cg fill='none' stroke='white' stroke-width='2'%3E%3Cline x1='300' y1='0' x2='300' y2='300'/%3E%3Ccircle cx='300' cy='150' r='48'/%3E%3Ccircle cx='300' cy='150' r='16'/%3E%3Crect x='0' y='95' width='120' height='110'/%3E%3Cpath d='M120 110a40 40 0 0 1 0 80'/%3E%3Cpath d='M0 15h90a170 170 0 0 1 0 270H0'/%3E%3Crect x='480' y='95' width='120' height='110'/%3E%3Cpath d='M480 110a40 40 0 0 0 0 80'/%3E%3Cpath d='M600 15h-90a170 170 0 0 0 0 270h90'/%3E%3C/g%3E%3C/svg%3E") center/cover no-repeat}
html.arpz .hero>*{position:relative;z-index:1}
/* fantasy team badges get a striped crest texture */
html.arpz .hav{background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.14) 0 3px,transparent 3px 8px),linear-gradient(135deg,rgba(255,255,255,.22),transparent 60%)}
/* ---- motion ---- */
/* sliding thumb in every segmented control */
html.arpz .arpseg{position:relative}
html.arpz .arpseg>button{position:relative;z-index:1}
html.arpz .arpseg>button[aria-selected="true"],html.arpz .arpseg>button[aria-pressed="true"]{background:transparent!important;box-shadow:none!important}
html.arpz .arpthumb{position:absolute;left:0;top:0;border-radius:11px;background:var(--surface);box-shadow:0 1px 4px rgba(15,26,43,.16);transition:transform .32s cubic-bezier(.3,1.25,.5,1),width .32s cubic-bezier(.3,1.25,.5,1);pointer-events:none}
/* the tab-bar pill glides to the tab you tap */
html.arpz .mainnav{position:relative}
html.arpz .mainnav button[aria-selected="true"] svg{background:transparent!important}
html.arpz .arppill{position:absolute;left:0;top:0;border-radius:999px;background:var(--accent-wash);transition:transform .38s cubic-bezier(.3,1.3,.5,1),width .3s ease;pointer-events:none}
html.arpz .mainnav button{position:relative;z-index:1}
@media (min-width:641px){html.arpz body:not(.fold) .arppill{display:none}html.arpz body:not(.fold) .mainnav button[aria-selected="true"]{background:var(--accent-wash)}}
/* win rings and tug bars draw in */
@property --p{syntax:"<number>";inherits:true;initial-value:0}
@property --a{syntax:"<percentage>";inherits:true;initial-value:50%}
html.arpz .hero .hav.arpring{transition:--p 1.1s cubic-bezier(.2,.8,.2,1)}
html.arpz .hero .hav.arpring::before{animation:arpring 1.1s cubic-bezier(.2,.8,.2,1) both}
@keyframes arpring{from{--p:0}}
html.arpz .arptug{animation:arptug .9s cubic-bezier(.2,.8,.2,1) both}
@keyframes arptug{from{--a:50%;opacity:0}}
html.arpz .arpsplit{animation:arptug .9s cubic-bezier(.2,.8,.2,1) both}
/* rows and cards rise in when you switch screens */
html.arpz body.navin table.pt tbody tr,html.arpz body.navin .sccard,html.arpz body.navin .panel{animation:arprise .45s cubic-bezier(.2,.8,.2,1) both}
html.arpz body.navin table.pt tbody tr:nth-child(2){animation-delay:.03s}html.arpz body.navin table.pt tbody tr:nth-child(3){animation-delay:.06s}html.arpz body.navin table.pt tbody tr:nth-child(4){animation-delay:.09s}html.arpz body.navin table.pt tbody tr:nth-child(5){animation-delay:.12s}html.arpz body.navin table.pt tbody tr:nth-child(n+6){animation-delay:.15s}
@keyframes arprise{from{opacity:0;transform:translateY(10px)}}
/* player card springs up */
html.arpz dialog.sheet[open]{animation:arpsheet .42s cubic-bezier(.2,1.2,.4,1)}
@keyframes arpsheet{from{transform:translateY(40px) scale(.97);opacity:0}}
/* big title slides in */
html.arpz .arptitle h1{animation:arptitle .5s cubic-bezier(.2,.8,.2,1) both}
@keyframes arptitle{from{opacity:0;transform:translateX(-12px)}}
@media (prefers-reduced-motion:reduce){html.arpz *,html.arpz *::before{animation:none!important;transition:none!important}}
html.arpz .pwho .arpface{width:32px;height:32px}html.arpz .pwho .arpface .arptl{width:15px;height:15px}
/* desktop day cards and week cards lose their outlines too */
html.arp #days .day:not([aria-pressed="true"]):not(.tod){border-color:transparent;background:var(--chip)}
html.arp #days .day{border-radius:14px}
html.arp .wkc{border-color:transparent;border-radius:var(--r2);box-shadow:var(--lift)}
/* with Bold team colors the glass takes the team's color, keeps its stripe, and the tabs stay white */
html.arp.nbat:not(.nbasub){--glass:color-mix(in srgb,var(--nba1) 90%,transparent)}
html.arp.nbat:not(.nbasub) body:not(.duow) .bar::after{background:linear-gradient(to top,var(--nba2) 0 3px,transparent 3px),var(--glass)}
html.arp.nbat:not(.nbasub) .mainnav button[aria-selected="true"]{background:rgba(255,255,255,.18);color:#fff;box-shadow:none}
html.arp.nbat:not(.nbasub) .arppill{background:rgba(255,255,255,.22)}
html.arp.nbat .ptscore{background:radial-gradient(90% 160% at 0% 0%,color-mix(in srgb,var(--nba1) 70%,transparent),transparent 60%),linear-gradient(160deg,var(--board2),var(--board))}`;
const ARP_PHONE=`html.arp body@ .navwrap{left:12px;right:12px;bottom:calc(8px + env(safe-area-inset-bottom,0px));padding-bottom:0;border:0;border-radius:26px;background:var(--glass);-webkit-backdrop-filter:blur(22px) saturate(1.7);backdrop-filter:blur(22px) saturate(1.7);box-shadow:0 14px 34px -14px rgba(10,16,30,.45),0 0 0 1px color-mix(in srgb,var(--line) 70%,transparent)}
  html.arp body@ .mainnav{padding:6px 4px;gap:0}
  html.arp body@ .mainnav button{font-size:.66rem;padding:4px 2px 3px;border-top:0;border-radius:0;font-weight:600}
  html.arp body@ .mainnav button svg{width:44px;height:28px;padding:4px 11px;box-sizing:border-box;border-radius:999px}
  html.arp body@ .mainnav button[aria-selected="true"]{background:none;color:var(--accent)}
  html.arp body@ .mainnav button[aria-selected="true"] svg{background:var(--accent-wash)}
  html.arp body@:not(.hasdock){padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))}
  html.arp body@ .chatfab{bottom:calc(92px + env(safe-area-inset-bottom,0px))}
  html.arp body@ .hero .hrec{font-size:2.1rem}

html.arp.nbat:not(.nbasub) body@ .navwrap{border-top:0;box-shadow:0 14px 34px -14px rgba(10,16,30,.45),0 0 0 2px var(--nba2)}
  html.arp.nbat:not(.nbasub) body@ .mainnav button[aria-selected="true"]{background:none;color:#fff}
  html.arpy body@ .arptitle h1{font-size:1.75rem}html.arpy body@ .arptitle{padding:2px 2px 0}`;
function applyStyle(){const de=document.documentElement,on=STYLE==="arp";["arp","arpx","arpy","arpz"].forEach(c=>de.classList.toggle(c,on));
  // back to Classic: take out what arpDeco added (render() redraws the rows without photos)
  if(!on){document.querySelectorAll("#arpTitle,.arptug,.arpsplit,.arpthumb,.arppill").forEach(x=>x.remove());document.querySelectorAll(".arpseg").forEach(x=>x.classList.remove("arpseg"));return;}
  if(!document.getElementById("arpFonts")){const l=document.createElement("link");l.id="arpFonts";l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=Archivo+Narrow:wght@500..700&display=swap";document.head.appendChild(l);}
  if(!document.getElementById("arpCss")){const s=document.createElement("style");s.id="arpCss";
    s.textContent=ARP_CSS+"\n@media (max-width:640px){"+ARP_PHONE.replace(/@/g,":not(.duow)")+"}\n"+ARP_PHONE.replace(/@/g,".fold:not(.duow)");document.head.appendChild(s);}
  arpDeco();}
function setStyle(v){STYLE=v==="arp"?"arp":"classic";try{localStorage.setItem("dfStyle",STYLE);}catch(e){}applyStyle();if(L)try{render();}catch(e){}}
// Display sheet gets a Look row at the top
{const _ds=displaySheet;displaySheet=function(){_ds();const b=document.getElementById("sheetBody"),h=b&&b.querySelector("h3");if(!h)return;
  const r=document.createElement("div");r.innerHTML=`<h3>Look</h3><div class="tabs sm dsrow" role="group" aria-label="Look">${STYLES.map(([k,l])=>`<button data-ds="style:${k}" aria-selected="${STYLE===k}"${prefKey()?"":" disabled"}>${l}</button>`).join("")}</div>
    <p class="muted dsnote"><b>NEW ARP</b> is a newer look: rounder cards, player photos, a scoreboard on Matchup and smooth motion. <b>Classic</b> is the original.</p>`;
  h.before(...r.childNodes);};$("#themeBtn").onclick=displaySheet;}

// ---- the pieces CSS can't do alone: photos, bars, rings, titles, sliding pills ----
const arpNum=s=>parseFloat(String(s).replace(/[^\d.\-]/g,""));
const arpAbbr=t=>(String(t).trim().match(/^([A-Z]{2,4})\b/)||[])[1];
function arpFace(name,team,cls){const s=document.createElement("span");s.className="arpface "+(cls||"");const sh=arpShot(name),lg=arpLogo(team);
  s.innerHTML=`<i>${esc(name.split(/\s+/).map(w=>w[0]).join("").slice(0,2))}</i>${sh?`<img alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${sh}">`:""}${lg?`<img class="arptl" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${lg}">`:""}`;
  const im=s.querySelector("img:not(.arptl)");if(im){im.onload=()=>s.classList.add("in");im.onerror=()=>im.remove();}
  const tl=s.querySelector(".arptl");if(tl)tl.onerror=()=>tl.remove();return s;}
let ARP_REC="";
function arpDeco(){if(STYLE!=="arp")return;
  // photos: My Team / Matchup rows, player lists, player card
  document.querySelectorAll(".ptp:not([data-arpz])").forEach(p=>{p.dataset.arpz=1;const n=p.querySelector("[data-pcard]")?.dataset.pcard;if(!n)return;p.querySelector(".ptn")?.before(arpFace(n,arpAbbr(p.querySelector(".ptn small")?.textContent||"")));});
  document.querySelectorAll(".pwho .av:not([data-arpz])").forEach(v=>{v.dataset.arpz=1;const w=v.closest(".pwho"),n=w.querySelector("[data-pcard]")?.dataset.pcard;if(!n)return;v.replaceWith(arpFace(n,arpAbbr(w.querySelector(".pmeta")?.textContent||"")));});
  document.querySelectorAll(".pchead:not([data-arpz])").forEach(h=>{h.dataset.arpz=1;const n=document.getElementById("sheetTitle")?.textContent||"",a=arpAbbr(h.querySelector(".pcmeta")?.textContent||"");
    h.querySelector(".hav")?.replaceWith(arpFace(n,a,"xl"));if(arpLogo(a))h.style.setProperty("--arplogo",`url("${arpLogo(a)}")`);h.classList.add("arppc");});
  // tug-of-war bar under every category: your share against theirs
  document.querySelectorAll(".cbrow").forEach(r=>{const a=arpNum(r.querySelector(".cbv.me b")?.textContent),b=arpNum(r.querySelector(".cbv.op b")?.textContent);let bar=r.querySelector(".arptug");
    if(!(a+b>0)){bar?.remove();return;}if(!bar){bar=document.createElement("i");bar.className="arptug";r.appendChild(bar);}
    bar.style.setProperty("--a",(a/(a+b)*100).toFixed(1)+"%");bar.dataset.lead=r.querySelector(".cbv.me.lead")?"me":r.querySelector(".cbv.op.lead")?"op":"";});
  // win-chance ring round each scoreboard badge, and the record counts up when it first shows
  document.querySelectorAll(".hero .hside").forEach(s=>{const p=arpNum(s.querySelector(".hpct")?.textContent),h=s.querySelector(".hav");if(h&&p>=0){h.style.setProperty("--p",p);h.classList.add("arpring");}});
  document.querySelectorAll(".hero .hrec:not([data-arpz])").forEach(r=>{r.dataset.arpz=1;const fin=r.textContent,parts=fin.split("-").map(Number);if(fin===ARP_REC||parts.some(isNaN)||matchMedia("(prefers-reduced-motion:reduce)").matches){ARP_REC=fin;return;}ARP_REC=fin;
    const t0=performance.now(),step=t=>{const k=Math.min(1,(t-t0)/700),e=1-Math.pow(1-k,3);if(!r.isConnected)return;r.textContent=k<1?parts.map(x=>Math.round(x*e)).join("-"):fin;if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);});
  // League › Scoreboard: win chances as one bar per game
  document.querySelectorAll(".sccard").forEach(c=>{const p=[...c.querySelectorAll(".scs i.num")].map(i=>arpNum(i.textContent));if(p.length!==2||isNaN(p[0]))return;let bar=c.querySelector(".arpsplit");if(!bar){bar=document.createElement("i");bar.className="arpsplit";c.appendChild(bar);}bar.style.setProperty("--a",p[0]+"%");});
  // big section title (two-pane hides it: the rail already says where you are)
  const m=document.querySelector("main");if(m){let t=document.getElementById("arpTitle");if(!t){t=document.createElement("div");t.id="arpTitle";t.className="arptitle";m.prepend(t);}
    const sb=document.querySelector(".mainnav button[aria-selected=true]"),sec=sb?[...sb.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join("").trim():"";
    const tm=document.querySelector("#teamPick option:checked")?.textContent||"",wk=document.querySelector("#weekPick option:checked")?.textContent||"";
    const h=`<h1>${esc(sec)}</h1><span>${esc(tm)}${wk?" · "+esc(wk):""}</span>`;if(t.innerHTML!==h)t.innerHTML=h;}
  // a thumb that slides between the options of every pill switch
  document.querySelectorAll(".tabs,.ptviews,.mfocus").forEach(g=>{let th=g.querySelector(":scope>.arpthumb");const on=g.querySelector(':scope>button[aria-selected="true"],:scope>button[aria-pressed="true"]');
    if(!on||!on.offsetWidth){th?.remove();g.classList.remove("arpseg");return;}if(!th){th=document.createElement("i");th.className="arpthumb";g.prepend(th);g.classList.add("arpseg");}
    th.style.transform=`translate(${on.offsetLeft}px,${on.offsetTop}px)`;th.style.width=on.offsetWidth+"px";th.style.height=on.offsetHeight+"px";});
  // and a pill that glides under the tab-bar icon you tap
  const nav=document.getElementById("mainnav"),on=nav?.querySelector('button[aria-selected="true"]'),sv=on?.querySelector("svg");
  if(nav&&sv){let pl=nav.querySelector(":scope>.arppill");if(!pl){pl=document.createElement("i");pl.className="arppill";nav.prepend(pl);}const r=sv.getBoundingClientRect(),n=nav.getBoundingClientRect();
    pl.style.transform=`translate(${r.left-n.left+nav.scrollLeft}px,${r.top-n.top}px)`;pl.style.width=r.width+"px";pl.style.height=r.height+"px";}}
{let q=0;new MutationObserver(()=>{if(q||STYLE!=="arp")return;q=requestAnimationFrame(()=>{q=0;arpDeco();});}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["aria-selected","aria-pressed"]});
  addEventListener("resize",()=>{if(STYLE==="arp")requestAnimationFrame(arpDeco);});}
applyStyle();
