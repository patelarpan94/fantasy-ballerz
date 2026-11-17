/* ============================================================================
   2.81 (BUG-350, Arp 2026-11-16 "this cant be right": 95% to win and 8-0-0
   projected on the first night of the matchup, with four categories within a
   few percent). Each category's chance used a fixed curve on the relative margin
   (same answer on Monday as on Sunday night), which was too sure of FG%, BLK and
   STL leads with a whole week left. Now each category's chance comes from how
   much is still to be played: the projected margin against the spread a week of
   games really has (game-to-game swings plus projection error), so leads firm up
   as the week goes on. Used wherever a live matchup (with "now") is scored; other
   callers keep the old curve. The card also says how many projected category
   wins are close (under 65%).
   ============================================================================ */
// game-to-game spread of a counting stat, as variance per unit of total (roughly Poisson, points swing more)
const WP_DISP={PTS:2.6,REB:1.4,AST:1.1,STL:.9,BLK:1,"3PM":.95,FGM:1.2,FTM:1.4};
// projection error: share of what's left that a team's projection can be off by (minutes, rest days, injuries)
const WP_ERR=.07,WP_PCTERR=.012;
const wpPhi=z=>{const x=Math.abs(z)/Math.SQRT2,t=1/(1+.3275911*x),e=1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x);return z>=0?(1+e)/2:(1-e)/2;};
function wpCat(a,b,c){
  const rem=(s,k)=>Math.max(0,(+s.fin[k]||0)-(+s.now[k]||0)),x=val(a.fin,c),y=val(b.fin,c);let v=0;
  if(c[1]==="pct")[a,b].forEach(s=>{const A=+s.fin[c[3]]||0;if(!A)return;const ra=rem(s,c[3]),p=Math.min(.95,Math.max(.05,val(s.fin,c)||.5));
    v+=(ra*p*(1-p)*1.2+Math.pow(WP_PCTERR*ra,2))/(A*A);});
  else [a,b].forEach(s=>{const r=rem(s,c[2]);v+=(WP_DISP[c[0]]||1.2)*r+Math.pow(WP_ERR*r,2);});
  if(!(v>1e-12))return x>y?1:x<y?0:.5;
  return wpPhi((x-y)/Math.sqrt(v));}
const winProbRel=winProb;
winProb=function(a,b){
  if(!a||!b||!a.now||!b.now||(a.done&&b.done))return winProbRel(a,b);
  const ps=CATS.map(c=>wpCat(a,b,c));
  let d={0:1};ps.forEach(p=>{const n={};for(const k in d){n[+k+1]=(n[+k+1]||0)+d[k]*p;n[+k-1]=(n[+k-1]||0)+d[k]*(1-p);}d=n;});
  let w=0;for(const k in d)w+=+k>0?d[k]:+k===0?d[k]/2:0;return w;};
// projected categories that are close: the projected leader wins it less than 65% of the time
const wpClose=(a,b)=>{try{if(!a.now||!b.now||(a.done&&b.done))return 0;return CATS.filter(c=>{const p=wpCat(a,b,c);return p>.35&&p<.65;}).length;}catch(e){return 0;}};
