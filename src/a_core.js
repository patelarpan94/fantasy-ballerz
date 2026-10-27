<script>
/* ============================================================================
   CORE: constants, calendar and league engine. Pure logic with no DOM or
   storage calls, so it can move into Google Apps Script as-is.
   ============================================================================ */
// phone layout: a narrow screen, or the touch layout on a wider one (unfolded foldable, or the Display setting)
const PHONE=()=>innerWidth<=640||document.body.classList.contains("fold");
const K={PTS:0,BLK:1,STL:2,AST:3,REB:4,TPM:5,FGM:6,FGA:7,FTM:8,FTA:9,MIN:10};
// Category catalog in the board's format: [label, "pct"|"cnt", stat index, attempts index]
const CATDEF={FGP:["FG%","pct",K.FGM,K.FGA],FTP:["FT%","pct",K.FTM,K.FTA],TPM:["3PM","cnt",K.TPM],REB:["REB","cnt",K.REB],AST:["AST","cnt",K.AST],STL:["STL","cnt",K.STL],BLK:["BLK","cnt",K.BLK],PTS:["PTS","cnt",K.PTS],FGM:["FGM","cnt",K.FGM],FTM:["FTM","cnt",K.FTM]};
const DEFAULT_CATS=["FGP","FTP","TPM","REB","AST","STL","BLK","PTS"];
let CATS=DEFAULT_CATS.map(k=>CATDEF[k]);
const SLOT={0:"PG",1:"SG",2:"SF",3:"PF",4:"C",5:"G",6:"F",11:"UTIL",12:"BE",13:"IR"};
const SLOT_ID={PG:0,SG:1,SF:2,PF:3,C:4,G:5,F:6,UTIL:11,BE:12,IR:13};
const SLOT_KEYS=["PG","SG","SF","PF","C","G","F","UTIL","BE","IR"];
const DEFAULT_SLOTS={PG:1,SG:1,SF:1,PF:1,C:1,G:1,F:1,UTIL:3,BE:3,IR:1};
const FILL_ORDER=[0,1,2,3,4,5,6,11];
const POS={1:"PG",2:"SG",3:"SF",4:"PF",5:"C"};
const POS_EL={PG:[0,5,11],SG:[1,5,11],SF:[2,6,11],PF:[3,6,11],C:[4,11],G:[0,1,5,11],F:[2,3,6,11],"G-F":[1,2,5,6,11],"F-G":[1,2,5,6,11],"F-C":[3,4,6,11],"C-F":[3,4,6,11]};
const MAX_TEAMS=12,MIN_TEAMS=2;
let LINEUP=[0,1,2,3,4,5,6,11,11,11],CAP={},ROSTER_MAX=14;
// Mirror mode: the league's rosters and lineups come from its ESPN league (espn/<season>_d<day> snapshots), not from picks and moves made here.
let ESPNDAYS={};
const mirror=()=>!!L&&L.source==="espn";
const PRO={0:"FA",1:"ATL",2:"BOS",3:"NO",4:"CHI",5:"CLE",6:"DAL",7:"DEN",8:"DET",9:"GS",10:"HOU",11:"IND",12:"LAC",13:"LAL",14:"MIA",15:"MIL",16:"MIN",17:"BKN",18:"NY",19:"ORL",20:"PHI",21:"PHX",22:"POR",23:"SAC",24:"SA",25:"OKC",26:"UTAH",27:"WSH",28:"TOR",29:"MEM",30:"CHA"};

// 2026-27 NBA calendar in ESPN scoring days (day 1 = Tue Oct 20, 2026). Weeks 20-22 are playoff weeks.
const CAL=[[1,1,6],[2,7,13],[3,14,20],[4,21,27],[5,28,34],[6,35,41],[7,42,48],[8,49,55],[9,56,62],[10,63,69],[11,70,76],[12,77,83],[13,84,90],[14,91,97],[15,98,104],[16,105,111],[17,112,118],[18,119,132],[19,133,139],[20,140,146],[21,147,153],[22,154,160]];
const WEEKS=CAL,SEASON_END=160;
const dateOf=sp=>new Date(2026,9,19+sp);
function todaySp(){try{const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date());const g=t=>+p.find(x=>x.type===t).value;
  return Math.round((Date.UTC(g("year"),g("month")-1,g("day"))-Date.UTC(2026,9,19))/864e5);}catch(e){return Math.round((Date.now()-Date.UTC(2026,9,19,4))/864e5);}}
let TODAY=Math.max(1,Math.min(SEASON_END+1,todaySp()));

// NBA schedule for the season: team -> "day.OPP.home.minutesET;..."
const SCHED_RAW=/*SCHED*/;
const SCHED={};
for(const [t,str] of Object.entries(SCHED_RAW)){SCHED[t]={};if(!str)continue;str.split(";").forEach(g=>{const [sp,o,hm,m]=g.split(".");SCHED[t][+sp]=[o,hm==="1",m===""?null:+m];});}
const gameOn=(t,sp)=>SCHED[t]?.[sp];
const anyGame=sp=>Object.values(SCHED).some(t=>t[sp]);

// Player pool: ESPN 2026-27 preseason projections. [name, NBA team, eligible slots, preseason rank, season totals]
const POOL_RAW=/*POOL*/;

const tnum=id=>+String(id).replace(/\D/g,"");
const tkey=n=>"t"+n;

// ---- league state (filled from the store) ----
let L=null,SEASONS={},SEASON=null;
let PICKS=[],TXS=[],LUDOCS={},STATS={},NBA=null,BADGES=null,SECRET=null,SESSION=null;
let TEAMS={},W={},BYES={},STAND={},TXLOG=[],LIVE=null,DIR={},OWN={},INJ={},PO=null,DAYLINES={};
const SCORES={}; // weekly totals are computed from box scores
let UPDATED=0;

function regWeeks(){return L?.schedule?Object.keys(L.schedule).length:CAL.length-playoffRounds();}
function playoffRounds(){const n=Math.max(2,Math.min(+L?.playoffTeams||4,L?.teams.length||4));return Math.max(1,Math.ceil(Math.log2(n)));}
const isPlayoff=n=>L&&n>regWeeks();
const weekDone=n=>CAL[n-1]&&CAL[n-1][2]<TODAY;
const weekDaysAll=n=>{const w=CAL[n-1],o=[];for(let sp=w[1];sp<=w[2];sp++)o.push(sp);return o;};
const canPlayN=(n,s)=>s===11||s===12||s===13||((DIR[n]?.el)||[11]).includes(s);
const isOut=n=>INJ[n]==="OUT";

// Round-robin matchups for any team count (odd counts get a bye), repeated to fill the season.
function roundRobin(ids,weeks){
  const a=ids.slice();if(a.length%2)a.push(null);
  const n=a.length,cycle=[];
  for(let r=0;r<n-1;r++){const pairs=[];for(let i=0;i<n/2;i++){const x=a[i],y=a[n-1-i];pairs.push(r%2?[y,x]:[x,y]);}cycle.push(pairs);a.splice(1,0,a.pop());}
  const out=[];for(let w=0;w<weeks;w++)out.push(cycle[w%cycle.length]);return out;
}
// Head-to-head categories from team A's side: [wins, losses, ties]
function h2h(a,b){let w=0,l=0,t=0;CATS.forEach(c=>{const x=val(a,c),y=val(b,c);Math.abs(x-y)<1e-9?t++:x>y?w++:l++;});return [w,l,t];}
const ZERO=()=>new Array(10).fill(0);

// ---- players: projections plus everything the stats feed has seen ----
function buildDir(){
  DIR={};DAYLINES={};INJ=(NBA&&NBA.inj)||{};
  POOL_RAW.forEach(([n,t,el,rk,tot])=>DIR[n]={n,t,el:[...new Set([...el,11])],rk,pj:tot});
  const ss={};
  Object.keys(STATS).map(Number).sort((a,b)=>a-b).forEach(sp=>{const S=STATS[sp];
    for(const [n,info] of Object.entries(S.info||{})){if(!DIR[n])DIR[n]={n,t:info[0],el:POS_EL[info[1]]||[2,3,6,11],rk:null,pj:null};else if(info[0])DIR[n].t=info[0];}
    for(const [n,l] of Object.entries(S.lines||{})){(DAYLINES[n]=DAYLINES[n]||{})[sp]=l;if(sp<TODAY||S.final){const a=ss[n]||(ss[n]=new Array(12).fill(0));l.forEach((v,i)=>{if(i<11)a[i]+=v;});a[11]++;}}});
  for(const [n,a] of Object.entries(ss))if(DIR[n])DIR[n].ss=a;
  // players on ESPN rosters the projection pool doesn't know (rookies, two-ways)
  if(mirror())Object.keys(ESPNDAYS).map(Number).sort((a,b)=>a-b).forEach(sp=>Object.values(ESPNDAYS[sp].r||{}).forEach(es=>es.forEach(([n,,t,el])=>{
    if(!DIR[n])DIR[n]={n,t:t||"FA",el:[...new Set([...(el||[]),11])],rk:null,pj:null};else if(t&&t!=="FA")DIR[n].t=t;})));
  Object.values(DIR).forEach(p=>{const f=p.el.find(e=>e<5);p.p=(f??2)+1;});
  seasonRanks();
}
// Season rank: sum of z-scores across the league's categories from per-game stats (FG%/FT% weighted by attempts).
function seasonRanks(){
  const ps=Object.values(DIR).filter(p=>p.ss&&p.ss[11]);if(ps.length<10)return;
  const pg=p=>p.ss.map((v,i)=>i===11?v:v/p.ss[11]);const sc=new Map(ps.map(p=>[p,0]));
  CATS.forEach(c=>{let v;if(c[1]==="pct"){const m=ps.reduce((s,p)=>s+p.ss[c[2]],0),a=ps.reduce((s,p)=>s+p.ss[c[3]],0)||1;v=ps.map(p=>{const g=pg(p);return g[c[2]]-m/a*g[c[3]];});}else v=ps.map(p=>pg(p)[c[2]]);
    const mean=v.reduce((s,x)=>s+x,0)/v.length,sd=Math.sqrt(v.reduce((s,x)=>s+(x-mean)**2,0)/v.length)||1;ps.forEach((p,i)=>sc.set(p,sc.get(p)+(v[i]-mean)/sd));});
  ps.sort((a,b)=>sc.get(b)-sc.get(a)).forEach((p,i)=>p.srk=i+1);
}

// ---- ownership: draft picks, then adds, drops and accepted trades in order ----
const ownerNow=n=>{const iv=(OWN[n]||[]).find(i=>i.to===Infinity);return iv?iv.team:0;};
const ownerOn=(n,sp)=>{const iv=(OWN[n]||[]).find(i=>i.from<=sp&&sp<i.to);return iv?iv.team:0;};
const rosterNow=T=>Object.keys(OWN).filter(n=>ownerNow(n)===T);
const rosterOn=(T,sp)=>Object.keys(OWN).filter(n=>OWN[n].some(i=>i.team===T&&i.from<=sp&&sp<i.to));
function buildOwnership(){
  OWN={};TXLOG=[];
  if(mirror()){mirrorOwnership();return;}
  const add=(n,T,from)=>(OWN[n]=OWN[n]||[]).push({team:T,from,to:Infinity});
  const end=(n,T,day)=>{const iv=(OWN[n]||[]).find(i=>i.team===T&&i.to===Infinity);if(iv)iv.to=day;};
  PICKS.slice().sort((a,b)=>a.n-b.n).forEach(p=>{if(!ownerNow(p.player))add(p.player,tnum(p.team),0);});
  // pickup limit per matchup week (commissioner adds don't count)
  const lim=+L.addLimit||0,used={},wkKey=(T,d)=>T+"_"+weekOf(d)[0];
  TXS.filter(t=>t.type!=="trade"||t.status==="accepted").sort((a,b)=>(a.eff||a.at)-(b.eff||b.at)).forEach(t=>{
    const day=t.day||TODAY;let ok=true,why="";
    if(t.type==="add"||t.type==="drop"){const T=tnum(t.team);
      if(t.add&&ownerNow(t.add)){ok=false;why=`${t.add} was already on a roster`;}
      else if(t.drop&&ownerNow(t.drop)!==T){ok=false;why=`${t.drop} wasn't on the roster`;}
      else if(t.add&&rosterNow(T).length-(t.drop?1:0)+1>ROSTER_MAX){ok=false;why="The roster was full";}
      else if(t.add&&lim&&t.role!=="commish"&&(used[wkKey(T,day)]||0)>=lim){ok=false;why="The pickup limit for that matchup was used up";}
      if(ok&&t.add&&t.role!=="commish")used[wkKey(T,day)]=(used[wkKey(T,day)]||0)+1;
      if(ok){if(t.drop)end(t.drop,T,t.dropDay??day);if(t.add)add(t.add,T,t.addDay??day);}}
    else if(t.type==="trade"){const A=tnum(t.from),B=tnum(t.to);
      if(t.give.some(n=>ownerNow(n)!==A)||t.get.some(n=>ownerNow(n)!==B)){ok=false;why="A player had already moved";}
      else if(rosterNow(A).length-t.give.length+t.get.length>ROSTER_MAX||rosterNow(B).length-t.get.length+t.give.length>ROSTER_MAX){ok=false;why="A roster would be over the limit";}
      if(ok){t.give.forEach(n=>{end(n,A,day);add(n,B,day);});t.get.forEach(n=>{end(n,B,day);add(n,A,day);});}}
    TXLOG.push({...t,ok,why});});
}

// mirror: each player belongs to the team ESPN listed on the latest snapshot day; the first snapshot also covers the days before it
function mirrorOwnership(){
  const days=Object.keys(ESPNDAYS).map(Number).sort((a,b)=>a-b);let prev={};
  days.forEach((sp,i)=>{const cur={};for(const [T,es] of Object.entries(ESPNDAYS[sp].r||{}))es.forEach(e=>cur[e[0]]=tnum(T));
    for(const [n,T] of Object.entries(prev))if(cur[n]!==T){const iv=OWN[n].find(v=>v.to===Infinity);if(iv)iv.to=sp;}
    for(const [n,T] of Object.entries(cur))if(prev[n]!==T)(OWN[n]=OWN[n]||[]).push({team:T,from:i?sp:0,to:Infinity});
    prev=cur;});
}
// ---- daily lineups: the latest saved lineup on or before the day; new players fill open starting slots ----
function lineupFor(T,sp,ros){
  if(mirror()){let bd=-1;for(const k in ESPNDAYS){const d=+k;if(d<=sp&&d>bd&&ESPNDAYS[k].r?.["t"+T])bd=d;}
    if(bd<0)for(const k in ESPNDAYS){const d=+k;if(ESPNDAYS[k].r?.["t"+T]&&(bd<0||d<bd))bd=d;}
    const m={};if(bd>=0)ESPNDAYS[bd].r["t"+T].forEach(e=>m[e[0]]=e[1]);const out={};
    if(bd<0||sp<=bd){ros.forEach(n=>out[n]=m[n]??12);return out;}
    // a day ESPN hasn't saved yet: assume the best lineup (healthy players with a game start, by rank), IR stays on IR
    const plays=n=>!!gameOn(DIR[n]?.t,sp)&&INJ[n]!=="OUT",rank=n=>DIR[n]?.srk||DIR[n]?.rk||999;
    const cand=ros.filter(n=>m[n]!==13).sort((a,b)=>(plays(b)-plays(a))||(rank(a)-rank(b))),owner=new Array(LINEUP.length).fill(null);
    const tryA=(n,seen)=>{for(let j=0;j<LINEUP.length;j++){if(seen[j]||!canPlayN(n,LINEUP[j]))continue;seen[j]=1;if(owner[j]==null||tryA(owner[j],seen)){owner[j]=n;return true;}}return false;};
    cand.filter(plays).forEach(n=>tryA(n,[]));cand.filter(n=>!plays(n)).forEach(n=>tryA(n,[]));
    ros.forEach(n=>out[n]=m[n]===13?13:12);owner.forEach((n,j)=>{if(n)out[n]=LINEUP[j];});return out;}
  const snaps=(LUDOCS[T]||{}).snaps||{};let base=null,bd=-1;
  for(const k in snaps){const d=+k;if(d<=sp&&d>bd){bd=d;base=snaps[k];}}
  const out={},used={},take=(n,s)=>{out[n]=s;used[s]=(used[s]||0)+1;};
  if(base)ros.forEach(n=>{const s=base[n];if(s==null||s===12)return;if((used[s]||0)<(CAP[s]||0)&&canPlayN(n,s))take(n,s);});
  ros.forEach(n=>{if(out[n]!=null)return;if(base&&base[n]!=null){out[n]=12;return;}
    const s=FILL_ORDER.find(s=>(used[s]||0)<(CAP[s]||0)&&canPlayN(n,s));if(s!=null)take(n,s);else out[n]=12;});
  return out;
}
function mkP(n){const D=DIR[n]||{n,t:"FA",el:[11],p:3};
  return {n,t:D.t,p:D.p,el:D.el,st:INJ[n]||"ACTIVE",d:DAYLINES[n]||{},sl:{},ss:D.ss||null,pj:D.pj||null,rk:[D.srk||0,D.rk||0]};}
function buildTeams(){
  TEAMS={};
  L.teams.forEach(t=>{const T=tnum(t.id),P={};
    for(let sp=0;sp<=SEASON_END;sp++){const ros=rosterOn(T,sp);if(!ros.length)continue;const lu=lineupFor(T,sp,ros);ros.forEach(n=>{(P[n]=P[n]||mkP(n)).sl[sp]=lu[n];});}
    Object.values(P).forEach(p=>{for(let sp=0;sp<=SEASON_END;sp++)if(!(sp in p.sl))p.sl[sp]=null;p.s=p.sl[Math.min(TODAY,SEASON_END)];});
    TEAMS[T]={id:T,name:t.name,P:Object.values(P)};});
}

// ---- schedule, standings and playoffs ----
function buildSchedule(){
  W={};BYES={};
  // a schedule copied from ESPN (mirror mode) wins over the generated round robin
  if(L.schedule){for(const [n,ps] of Object.entries(L.schedule))W[+n]=ps.map(p=>[+p[0],+p[1]]);return;}
  const ids=L.teams.map(t=>tnum(t.id)),start=Math.max(1,+L.startWeek||1),reg=regWeeks();
  roundRobin(ids,Math.max(0,reg-start+1)).forEach((pairs,i)=>{W[start+i]=pairs.filter(([a,b])=>a&&b);pairs.forEach(([a,b])=>{if(!a||!b)BYES[start+i]=a||b;});});
}
const wt=(id,n)=>dayTotals(id,weekDaysAll(n))||ZERO();
function weekRec(r){return L.format==="most"?(r[0]>r[1]?[1,0,0]:r[0]<r[1]?[0,1,0]:[0,0,1]):r;}
function buildStandings(){
  STAND={};Object.keys(TEAMS).forEach(id=>STAND[id]={rec:[0,0,0],vbs:ZERO()});
  for(let n=1;n<=regWeeks();n++){if(!weekDone(n))break;
    (W[n]||[]).forEach(([a,b])=>{const r=weekRec(h2h(wt(a,n),wt(b,n)));[0,1,2].forEach(i=>{STAND[a].rec[i]+=r[i];STAND[b].rec[i]+=r[i===2?2:1-i];});});}
  const past=[];for(let sp=1;sp<Math.min(TODAY,SEASON_END+1);sp++)past.push(sp);
  Object.keys(TEAMS).forEach(id=>{STAND[id].vbs=dayTotals(+id,past)||ZERO();});
}
const pctW=r=>{const g=r[0]+r[1]+r[2];return g?(r[0]+r[2]/2)/g:0;};
function standOrder(){return Object.keys(TEAMS).map(Number).sort((x,y)=>pctW(STAND[y].rec)-pctW(STAND[x].rec)||STAND[y].rec[0]-STAND[x].rec[0]||TEAMS[x].name.localeCompare(TEAMS[y].name));}
function bracketOrder(B){let o=[1];while(o.length<B){const m=o.length*2+1;o=o.flatMap(s=>[s,m-s]);}return o;}
function buildPlayoffs(){
  PO=null;const reg=regWeeks();if(!weekDone(reg))return;
  const order=standOrder(),P=Math.min(+L.playoffTeams||4,order.length),R=playoffRounds(),B=2**R;
  let slots=bracketOrder(B).map(s=>s<=P?order[s-1]:null);const rounds=[];
  for(let r=1;r<=R;r++){const n=reg+r,pairs=[],next=[];
    for(let i=0;i<slots.length;i+=2){const a=slots[i],b=slots[i+1];let win;
      if(a&&b){if(weekDone(n)){const x=h2h(wt(a,n),wt(b,n));win=x[0]>x[1]?a:x[0]<x[1]?b:(order.indexOf(a)<order.indexOf(b)?a:b);}}
      else if(a===undefined||b===undefined)win=undefined;else win=a||b||null;
      pairs.push({a,b,win});next.push(win);}
    rounds.push({n,pairs});W[n]=pairs.filter(p=>p.a&&p.b).map(p=>[p.a,p.b]);slots=next;}
  PO={rounds,champ:slots[0]||null,seeds:order.slice(0,P)};
}
function rebuild(){
  if(!L)return;
  CATS=(L.cats||DEFAULT_CATS).map(k=>CATDEF[k]).filter(Boolean);
  LINEUP=[];CAP={};SLOT_KEYS.forEach(k=>{const id=SLOT_ID[k],c=+L.slots[k]||0;CAP[id]=(CAP[id]||0)+c;if(id<12)for(let i=0;i<c;i++)LINEUP.push(id);});
  ROSTER_MAX=SLOT_KEYS.reduce((s,k)=>s+(+L.slots[k]||0),0);
  buildDir();buildOwnership();buildTeams();buildSchedule();buildStandings();buildPlayoffs();
  LIVE=NBA&&NBA.live&&NBA.live.day===TODAY?NBA.live:null;UPDATED=NBA?.at||0;
}

/* ============================================================================
   STORE: the artifact's shared database now; one Google Sheet tab per
   collection after the port. Collections: league/<season> (commissioner),
   picks, tx, lineups, stats/<season>_d<day>, nba/<season>,
   badges/<code hash> (who a code logs in as), secret/codes (commissioner only),
   chat/<time>_<rand> (league chat and direct messages).
   ============================================================================ */
const Store={db:null,user:null,uid:null,local:false,canAdmin:false,
  async init(){
    try{this.db=await claude.use("db");}catch(e){this.db=null;}
    try{this.user=await claude.use("user");}catch(e){this.user=null;}
    if(this.user){try{this.uid=await this.user.id();}catch(e){}try{this.canAdmin=!!(await this.user.canEdit());}catch(e){}}
    if(!this.db){this.local=true;this.canAdmin=true;this.uid=this.uid||"local";}
  },
  _l(){try{return JSON.parse(localStorage.getItem("dfa2")||"{}");}catch(e){return {};}},
  _ls(o){try{localStorage.setItem("dfa2",JSON.stringify(o));}catch(e){}},
  _subs:[],_emit(){this._subs.slice().forEach(f=>f());},
  watch(col,season,cb){
    if(this.local){const f=()=>{const c=this._l()[col]||{};cb(Object.entries(c).map(([id,d])=>({id,...d})).filter(d=>season==null||d.season===season));};this._subs.push(f);f();return ()=>{this._subs=this._subs.filter(x=>x!==f);};}
    let q=this.db.collection(col);if(season!=null)q=q.where("season","==",season);
    return q.onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))),e=>showErr(e));
  },
  // filtered, newest-first window: where = [[field, "=="|"array-contains", value]]
  watchQ(col,where,lim,cb){
    if(this.local){const ok=d=>where.every(([f,op,v])=>op==="array-contains"?Array.isArray(d[f])&&d[f].includes(v):d[f]===v);
      const f=()=>{const c=this._l()[col]||{};cb(Object.entries(c).map(([id,d])=>({id,...d})).filter(ok).sort((a,b)=>b.at-a.at).slice(0,lim));};this._subs.push(f);f();return ()=>{this._subs=this._subs.filter(x=>x!==f);};}
    let q=this.db.collection(col);where.forEach(([f,op,v])=>q=q.where(f,op,v));
    return q.orderBy("at","desc").limit(lim).onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))),e=>showErr(e));
  },
  async get(col,id){if(this.local)return (this._l()[col]||{})[id]||null;const d=await this.db.doc(col+"/"+id).get();return d.exists?d.data():null;},
  async set(col,id,data){if(this.local){const o=this._l();(o[col]=o[col]||{})[id]=data;this._ls(o);this._emit();return;}await this.db.doc(col+"/"+id).set(data);},
  async update(col,id,data){if(this.local){const o=this._l(),c=(o[col]=o[col]||{});c[id]=merge(c[id]||{},data);this._ls(o);this._emit();return;}await this.db.doc(col+"/"+id).update(data);},
  async del(col,id){if(this.local){const o=this._l();delete (o[col]||{})[id];this._ls(o);this._emit();return;}await this.db.doc(col+"/"+id).delete();},
  // set only when the document is absent or check(existing) allows it, under a short lease so two people can't both win
  async claimSet(col,id,data,check){
    if(this.local){const o=this._l(),c=(o[col]=o[col]||{});if(c[id]&&!check(c[id]))throw {code:"taken"};c[id]=data;this._ls(o);this._emit();return;}
    const ref=this.db.doc(col+"/"+id),ls=await ref.acquire({holder:this.uid||"anon",ttlMs:4000});if(!ls.acquired)throw {code:"taken"};
    const cur=await ref.get();if(cur.exists&&!check(cur.data()))throw {code:"taken"};await ref.set(data);
  },
  async names(ids){if(!this.user||!ids.length)return {};try{return await this.user.profiles(ids);}catch(e){return {};}}
};
function merge(a,b){const o={...a};for(const [k,v] of Object.entries(b))o[k]=v&&typeof v==="object"&&!Array.isArray(v)&&o[k]&&typeof o[k]==="object"?merge(o[k],v):v;return o;}
