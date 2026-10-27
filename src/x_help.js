/* ============================================================================
   HELP (2.3, 2026-10-27): the Rules section is written from the league's own
   settings each time Help opens, so it can't drift from League › Settings.
   The search box shows only the sections that mention what you type.
   ============================================================================ */
function helpRulesHtml(){
  if(!L)return "<p>Rules show here once the league loads.</p>";
  const n=k=>+L.slots?.[k]||0,cats=(L.cats||DEFAULT_CATS).map(k=>CATDEF[k]?.[0]||k);
  const slots=SLOT_KEYS.filter(k=>n(k)).map(k=>{const lbl=k==="BE"?"bench":k;return n(k)>1?`${n(k)} ${lbl}`:lbl;}).join(", ");
  const w=wcfg(),days=(w.days?.length?w.days:[0,1,2,3,4,5,6]),hr=+w.hour,hh=`${hr%12||12} ${hr<12?"AM":"PM"} ET`;
  const wtype=(WTYPES.find(x=>x[0]===w.type)||WTYPES[0])[1];
  const reg=regWeeks(),R=playoffRounds(),P=Math.min(+L.playoffTeams||4,L.teams.length);
  const lim=+L.addLimit||0;
  return `<dl class="hterms">
    <dt>Scoring</dt><dd>Head-to-head, ${cats.length} categories: ${cats.join(", ")}. ${L.format==="most"?"The team that wins more categories wins the week.":"Every category counts as a W, L or T in the standings."}</dd>
    <dt>Roster</dt><dd>${slots}. At most <b>${ROSTER_MAX}</b> players in total and <b>${activeMax()}</b> off IR. Only players listed OUT can be on IR.</dd>
    <dt>Legal rosters</dt><dd>A team over a limit, or with a player on IR who isn't OUT anymore, gets ⚠. Until it's fixed, it can only drop players or move them off IR. Its stats still count.</dd>
    <dt>Pickups</dt><dd>${lim?`${lim} per matchup.`:"No limit."}</dd>
    <dt>Waivers</dt><dd>A dropped player stays on waivers for at least ${+w.hours} hours. Claims run ${days.length===7?"every day":"on "+days.map(d=>DOW_FULL[d]).join(", ")} at ${hh}. Order: ${esc(wtype)}${w.type==="faab"?`, $${+w.budget} budget`:""}.</dd>
    <dt>Trades</dt><dd>48-hour league vote after both teams accept. A majority settles it early. The commissioner can approve, veto or reverse any move.</dd>
    <dt>Season</dt><dd>${reg} regular-season weeks. The top <b>${P}</b> make the playoffs, seeded by record, ${R} round${R>1?"s":""} of one week each (weeks ${reg+1}–${reg+R}).</dd>
  </dl>`;
}
(function(){
  const dlg=document.getElementById("helpDlg");if(!dlg)return;
  const fill=()=>{const el=document.getElementById("hRules");if(el)try{el.innerHTML=helpRulesHtml();}catch(e){}};
  new MutationObserver(()=>{if(dlg.open)fill();}).observe(dlg,{attributes:true,attributeFilter:["open"]});
  const q=document.getElementById("helpQ");if(!q)return;
  q.addEventListener("input",()=>{const t=q.value.trim().toLowerCase();fill();
    dlg.querySelectorAll(".hbody>section").forEach(s=>{s.hidden=!!t&&!s.textContent.toLowerCase().includes(t);});
    dlg.querySelector(".htoc").hidden=!!t;
    let none=dlg.querySelector(".hnone");if(!none){none=document.createElement("p");none.className="hnone hint";dlg.querySelector(".hbody").prepend(none);}
    none.hidden=!t||[...dlg.querySelectorAll(".hbody>section")].some(s=>!s.hidden);none.textContent=`Nothing in Help mentions “${q.value.trim()}”.`;});
})();
