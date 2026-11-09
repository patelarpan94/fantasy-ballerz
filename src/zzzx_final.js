/* ============================================================================
   FINISHED MATCHUPS SAY WON / LOST / TIED (2.64, 2026-11-09, Arp: "I dont see
   the past weeks (Win, lose or tie). No confetti or anything").
   - The matchup card on a finished week read "now" and "projected" with a win %,
     like a week still in play. It now says Final with a Won / Lost / Tied badge
     in every look (New Era keeps its W/L/T stamp too).
   - The win confetti never fired on phones: the phone score layout draws the
     matchup card itself and skipped the older hook. It now fires from the last
     hook in every layout, once per won matchup per device.
   ============================================================================ */
{const _rh=renderHero;renderHero=function(){const out=_rh.apply(this,arguments);try{
  if(nav!=="matchup"||!L||!wk||!weekDone(wk[0])||!M||!M.opp||!TEAMS[cur]||!TEAMS[M.opp])return out;
  const r=weekRec(h2h(wt(cur,wk[0]),wt(M.opp,wk[0]))),res=r[0]>r[1]?"won":r[0]<r[1]?"lost":"tied",rec=r.slice(0,r[2]?3:2).join("-");
  const h=document.querySelector("#heroWrap .hero");
  if(h&&!h.dataset.fin){h.dataset.fin=res;h.classList.add("hdone");
    const mid=h.querySelector(".hmid");if(mid){const labs=mid.querySelectorAll(".hlab");if(labs[0])labs[0].textContent="final";mid.querySelectorAll(".hproj").forEach(x=>x.remove());if(labs[1])labs[1].remove();
      if(STYLE!=="arp")mid.insertAdjacentHTML("beforeend",`<span class="hfin ${res}">${res==="won"?"Won":res==="lost"?"Lost":"Tied"}</span>`);}
    const pc=h.querySelectorAll(".hpct"),me=res==="won"?"Won":res==="lost"?"Lost":"Tied",op=res==="won"?"Lost":res==="lost"?"Won":"Tied";
    if(pc[0]){pc[0].textContent=me;pc[0].className="hpct "+(res==="won"?"up":res==="lost"?"down":"");}if(pc[1]){pc[1].textContent=op;pc[1].className="hpct "+(res==="lost"?"up":res==="won"?"down":"");}
    h.querySelectorAll(".hbar").forEach(x=>x.style.visibility="hidden");
    h.setAttribute("aria-label",`Final: ${TEAMS[cur].name} ${res} ${rec}`);}
  // confetti once per won matchup per device, in every layout (same key as the older hook, so never twice)
  if(res==="won"&&!NOMO()&&(!myTeamNum()||myTeamNum()===cur)){const k=`dfConf_${SEASON}_${cur}_${wk[0]}`;let seen=false;try{seen=!!localStorage.getItem(k);if(!seen)localStorage.setItem(k,"1");}catch(e){}
    if(!seen){confetti();toast(`You won ${weekName(wk[0])}!`);}}
}catch(e){}return out;};}
(()=>{const s=document.createElement("style");s.textContent=`
.hero .hfin{margin-top:6px;padding:3px 12px;border-radius:999px;font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:#64748b}
.hero .hfin.won{background:#16a34a}.hero .hfin.lost{background:#dc2626}.hero .hfin.tied{background:#64748b}`;document.head.appendChild(s);})();
