
/* ============================================================================
   GITHUB APP: the league lives in a Google Sheet behind an Apps Script web
   app (Store above). A 1-minute Google timer pulls ESPN during games, so
   Refresh only asks the server for anything new; the commissioner's Refresh
   also starts a full ESPN pull right away.
   ============================================================================ */
// badges come back keyed by sha256(code hash), so the list can't be used to log in
function bid(h){if(!h)return "";if(bid.m[h])return bid.m[h];
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const b=[...new TextEncoder().encode(h)],l=b.length*8;b.push(0x80);while(b.length%64!==56)b.push(0);for(let i=7;i>=0;i--)b.push(i>3?0:(l>>>(i*8))&255);
  const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],r=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let o=0;o<b.length;o+=64){const w=[];for(let i=0;i<16;i++)w[i]=(b[o+i*4]<<24)|(b[o+i*4+1]<<16)|(b[o+i*4+2]<<8)|b[o+i*4+3];
    for(let i=16;i<64;i++){const s0=r(w[i-15],7)^r(w[i-15],18)^(w[i-15]>>>3),s1=r(w[i-2],17)^r(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0;}
    let [a,c,d,e,f,g,k,m]=H;for(let i=0;i<64;i++){const t1=(m+(r(f,6)^r(f,11)^r(f,25))+((f&g)^(~f&k))+K[i]+w[i])|0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&c)^(a&d)^(c&d)))|0;m=k;k=g;g=f;f=(e+t1)|0;e=d;d=c;c=a;a=(t1+t2)|0;}
    [a,c,d,e,f,g,k,m].forEach((x,i)=>H[i]=(H[i]+x)|0);}
  return bid.m[h]=H.map(x=>(x>>>0).toString(16).padStart(8,"0")).join("");}
bid.m={};
ERR.cloud="Data updates from ESPN automatically: every minute while games are on, hourly otherwise.";
async function refresh(){
  if(busy||!L)return;const btn=$("#refreshBtn");
  if(Store.local){showUpdated("Preview mode: no league server is set.",true);return;}
  busy=true;btn.disabled=true;
  try{
    if(isCommish()){showUpdated("Pulling ESPN now…");const r=await Store._call("pull",{});await Store.poll();showUpdated();toast(/already running/.test(r.msg||"")?r.msg:"ESPN data refreshed.");}
    else{showUpdated("Checking for updates…");await Store.poll();showUpdated();toast(ERR.cloud);}
  }catch(e){showUpdated(e?.message||"Couldn't reach the league server.",true);}
  finally{busy=false;btn.disabled=false;}
}
