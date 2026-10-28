
/* ============================================================================
   PASSWORD LOGINS (GitHub app, 2.6). Pick your team, then your password. The
   first time, the team proves itself with the commissioner's 6-digit code and
   picks a password (plus an email for resets). Forgot password emails a
   6-digit code. The server checks every change against the logged-in team.
   ============================================================================ */
document.head.insertAdjacentHTML("beforeend",`<style>
.pwbox[hidden]{display:none}.pwbox{width:100%;max-width:340px;margin:8px auto 0;text-align:left}
.pwbox form{display:flex;flex-direction:column;gap:10px}
.pwbox input{width:100%;font-size:16px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}
.pwbox .btn{width:100%;justify-content:center;padding:12px}
.pwteams{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:52vh;overflow:auto}
.pwbox *{box-sizing:border-box}.pwteams .btn{width:100%;min-width:0;margin:0;white-space:normal;line-height:1.2;min-height:48px}
.pwteams .cm{grid-column:1/-1}
.pwlinks{display:flex;justify-content:space-between;gap:10px;margin-top:12px;flex-wrap:wrap}
.linkbtn{background:none;border:0;padding:4px 0;color:var(--accent,#2b6ef2);font:inherit;font-size:14px;cursor:pointer}
.pwform{display:flex;flex-direction:column;gap:10px}.pwform label{display:flex;flex-direction:column;gap:4px;font-size:13px}
.pwform input,.pwtab input{font-size:16px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink)}
.pwtab td{padding:6px 8px;vertical-align:middle}.pwtab input{width:100%;min-width:170px;font-size:14px}
</style>`);
let ACCTS=null;const PW={step:"pick",k:null,h:null,msg:"",err:false,busy:false,sent:""};
async function loadAccts(){try{const j=await Store._call("accts",{});ACCTS=j.accts||{};}catch(e){}if(!gate.hidden)renderGate();}
const acctName=k=>k==="commish"?"Commissioner":teamName(k);
// the password screens only take over once a commissioner exists (a fresh Sheet still sets one up on the dial pad)
const pwMode=()=>!Store.local&&!!BADGES&&hasCommish();
function pwGo(step,o){Object.assign(PW,{step,msg:"",err:false,busy:false},o||{});GATE.buf="";renderGate();setTimeout(()=>gate.querySelector(".pwbox input")?.focus(),30);}
function pwFail(msg){PW.busy=false;PW.msg=msg;PW.err=true;renderGate();}
async function pwCall(op,body){PW.busy=true;PW.msg="";renderGate();try{return await Store._call(op,{k:PW.k,...body});}catch(e){pwFail(e.message||"Something went wrong. Try again.");return null;}}
function pwLogin(j){if(!j?.s)return;const r=j.k==="commish"?{role:"commish",team:null}:{role:"team",team:j.k};PW.busy=false;PW.step="pick";loadAccts();login({s:j.s,h:null,...r});}

{const _rg=renderGate;renderGate=function(){_rg.apply(this,arguments);let box=gate.querySelector(".pwbox");
  const on=!gate.hidden&&pwMode()&&PW.step!=="code";
  if(!box){$("#gPad").insertAdjacentHTML("beforebegin",`<div class="pwbox"></div>`);box=gate.querySelector(".pwbox");}
  box.hidden=!on;$("#gPad").style.display=on?"none":"";$("#gDots").style.display=on?"none":"";
  if(gate.hidden||!pwMode())return;
  if(!ACCTS&&!loadAccts.p)loadAccts.p=loadAccts().finally(()=>loadAccts.p=null);
  const a=ACCTS?.[PW.k]||{},nm=PW.k?esc(acctName(PW.k)):"",msg=$("#gMsg");
  if(PW.step==="code"){$("#gTitle").textContent=acctName(PW.k);$("#gSub").textContent="First time on this app: enter the 6-digit code from the commissioner. Next you'll pick a password.";
    $("#gFoot").innerHTML=`<button class="btn ghost sm" data-pw="pick">Pick another team</button>`;return;}
  $("#gFoot").textContent="";msg.textContent=PW.msg;msg.classList.toggle("err",PW.err);
  const dis=PW.busy?"disabled":"";let h="";
  if(PW.step==="pick"){$("#gTitle").textContent="Log in";$("#gSub").textContent=ACCTS?"Pick your team.":"Loading teams…";
    h=`<div class="pwteams">${(L?.teams||[]).map(t=>`<button class="btn ghost" data-pwk="${esc(t.id)}">${esc(t.name)}</button>`).join("")}<button class="btn ghost cm" data-pwk="commish">Commissioner</button></div>`;}
  else if(PW.step==="pw"){$("#gTitle").textContent=acctName(PW.k);$("#gSub").textContent="Enter your password.";
    h=`<form data-pwf="login"><input type="password" name="pw" autocomplete="current-password" placeholder="Password" aria-label="Password" required ${dis}>
      <button class="btn" ${dis}>${PW.busy?"Checking…":"Log in"}</button></form>
      <div class="pwlinks"><button class="linkbtn" data-pw="forgot">Forgot password?</button><button class="linkbtn" data-pw="pick">Not ${nm}?</button></div>`;}
  else if(PW.step==="setpw"){$("#gTitle").textContent="Pick a password";$("#gSub").textContent=`For ${acctName(PW.k)}. You'll use it instead of the 6-digit code from now on.`;
    h=`<form data-pwf="claim"><input type="password" name="pw" autocomplete="new-password" placeholder="New password (6+ characters)" aria-label="New password" minlength="6" required ${dis}>
      <input type="password" name="pw2" autocomplete="new-password" placeholder="Same password again" aria-label="Same password again" required ${dis}>
      <input type="email" name="email" autocomplete="email" placeholder="Email for password resets" aria-label="Email for password resets" value="${esc(a.email&&!a.email.includes("•")?a.email:"")}" ${dis}>
      <span class="hint">Only used to email you a reset code if you forget your password.</span>
      <button class="btn" ${dis}>${PW.busy?"Saving…":"Save and log in"}</button></form>
      <div class="pwlinks"><button class="linkbtn" data-pw="pick">Cancel</button></div>`;}
  else if(PW.step==="forgot"){$("#gTitle").textContent="Forgot password";
    if(!a.email){$("#gSub").textContent=`There's no reset email on file for ${acctName(PW.k)}.`;h=`<p class="muted">Ask the commissioner to reset your password in League › Settings. Then log in with your 6-digit code and pick a new one.</p><div class="pwlinks"><button class="linkbtn" data-pw="pw">Back</button></div>`;}
    else{$("#gSub").textContent=`We'll email a 6-digit code to ${a.email}.`;h=`<button class="btn" data-pw="send" ${dis}>${PW.busy?"Sending…":"Email me a code"}</button><div class="pwlinks"><button class="linkbtn" data-pw="reset">I already have a code</button><button class="linkbtn" data-pw="pw">Back</button></div>`;}}
  else if(PW.step==="reset"){$("#gTitle").textContent="New password";$("#gSub").textContent=PW.sent?`Enter the code we sent to ${PW.sent} (check spam too) and pick a new password.`:"Enter the emailed code and pick a new password.";
    h=`<form data-pwf="reset"><input name="code" inputmode="numeric" autocomplete="one-time-code" placeholder="6-digit code" aria-label="6-digit code" maxlength="6" required ${dis}>
      <input type="password" name="pw" autocomplete="new-password" placeholder="New password (6+ characters)" aria-label="New password" minlength="6" required ${dis}>
      <input type="password" name="pw2" autocomplete="new-password" placeholder="Same password again" aria-label="Same password again" required ${dis}>
      <button class="btn" ${dis}>${PW.busy?"Saving…":"Save and log in"}</button></form>
      <div class="pwlinks"><button class="linkbtn" data-pw="forgot">Send a new code</button><button class="linkbtn" data-pw="pw">Back</button></div>`;}
  const keep=box.dataset.v===h;if(!keep){box.innerHTML=h;box.dataset.v=h;}};}
document.getElementById("gate").addEventListener("click",e=>{const t=e.target.closest("[data-pwk],[data-pw]");if(!t)return;e.preventDefault();
  if(t.dataset.pwk){const k=t.dataset.pwk;return pwGo(ACCTS?.[k]?.pw?"pw":"code",{k});}
  const a=t.dataset.pw;if(a==="send")return pwSend();pwGo(a);});
async function pwSend(){const j=await pwCall("forgot",{});if(j)pwGo("reset",{sent:j.sent});}
document.getElementById("gate").addEventListener("submit",async e=>{const f=e.target.closest("[data-pwf]");if(!f)return;e.preventDefault();if(PW.busy)return;
  const v=Object.fromEntries(new FormData(f).entries()),kind=f.dataset.pwf;
  if(kind!=="login"&&v.pw!==v.pw2)return pwFail("The two passwords don't match.");
  if(kind!=="login"&&String(v.pw).length<6)return pwFail("Use at least 6 characters.");
  if(kind==="login")pwLogin(await pwCall("login",{pw:v.pw}));
  else if(kind==="claim")pwLogin(await pwCall("claim",{h:PW.h,pw:v.pw,email:v.email||""}));
  else if(kind==="reset")pwLogin(await pwCall("reset",{code:v.code,pw:v.pw}));});
// the dial pad is only for the first-time code
{const _gs=gateSubmit;gateSubmit=async function(){if(!pwMode())return _gs.apply(this,arguments);
  if(PW.step!=="code")return;const code=GATE.buf;GATE.busy=true;renderGate();
  try{const h=await badgeHash(code),b=BADGES?.[bid(h)];GATE.busy=false;
    const ok=b&&(PW.k==="commish"?b.role==="commish":b.team===PW.k);
    if(!ok){if(++GATE.fails>=5){GATE.fails=0;GATE.until=Date.now()+30000;}return gateFail(`That code doesn't match ${acctName(PW.k)}.`);}
    GATE.fails=0;pwGo("setpw",{h});}
  catch(e){GATE.busy=false;gateFail("Something went wrong. Try again.");}};}
{const _gk=gateKey;gateKey=function(k){if(pwMode()&&PW.step!=="code")return;return _gk.apply(this,arguments);};}
// a logged-out phone starts at the team list
{const _lo=logout;logout=function(msg){if(SESSION?.s)Store._call("logout",{}).catch(()=>{});PW.step="pick";PW.k=null;_lo.apply(this,arguments);if(msg){PW.msg=msg;PW.err=true;renderGate();}};}
// server answers: a stale session or a retired code means log in again; another team's data just says so
{const _se=showErr;showErr=function(e){
  if(e&&(e.code==="session"||e.code==="retired")){logout(e.message);return;}
  if(e&&e.code==="denied"&&e.message){toast(e.message);return;}
  return _se.apply(this,arguments);};}

// Account › Password and email
document.addEventListener("click",e=>{if(!e.target.closest("#whoBtn")||!SESSION?.s)return;setTimeout(()=>{const a=$("#sheetBody .acctl");if(!a||a.querySelector('[data-acct="pw"]'))return;
  a.insertAdjacentHTML("beforeend",`<button class="btn ghost" data-acct="pw">🔑 Password and email</button>`);},0);},true);
document.addEventListener("click",e=>{const b=e.target.closest('[data-acct="pw"]');if(!b)return;e.stopImmediatePropagation();
  const k=isCommish()?"commish":SESSION.team,em=ACCTS?.[k]?.email||"";
  openSheet("Password and email",`<form class="pwform" data-acctf="1">
    <label>New password<input type="password" name="pw" autocomplete="new-password" minlength="6" placeholder="Leave empty to keep it"></label>
    <label>Same password again<input type="password" name="pw2" autocomplete="new-password"></label>
    <label>Email for password resets<input type="email" name="email" autocomplete="email" value="${esc(em.includes("•")?"":em)}" placeholder="${esc(em.includes("•")?em+" (on file)":"you@example.com")}"></label>
    <div class="sheetacts"><button class="btn ghost" type="button" data-sheet="close">Close</button><button class="btn">Save</button></div></form>`);},true);
document.addEventListener("submit",async e=>{const f=e.target.closest("[data-acctf]");if(!f)return;e.preventDefault();
  const v=Object.fromEntries(new FormData(f).entries()),body={};
  if(v.pw){if(v.pw!==v.pw2)return toast("The two passwords don't match.");if(v.pw.length<6)return toast("Use at least 6 characters.");body.pw=v.pw;}
  if(v.email)body.email=v.email;if(!Object.keys(body).length)return toast("Nothing to change.");
  try{await Store._call("acctme",body);sheet().close();toast(body.pw?"Password changed.":"Email saved.");loadAccts();}catch(x){toast(x.message||"Couldn't save. Try again.");}});

// League › Settings › Passwords (commissioner)
{const _sv=setupView;setupView=function(){const h=_sv();if(!L||!isCommish()||Store.local)return h;if(!ACCTS){loadAccts().then(()=>{if(nav==="league"&&SUB.league==="setup")renderRosters();});}
  const rows=["commish",...L.teams.map(t=>t.id)].map(k=>{const a=ACCTS?.[k]||{};return `<tr><td>${esc(acctName(k))}</td><td>${a.pw?"✓ Set":"<span class='muted'>Not yet (uses code)</span>"}</td>
    <td><input type="email" data-pwem="${esc(k)}" value="${esc(a.email||"")}" placeholder="No email" aria-label="Reset email for ${esc(acctName(k))}"></td>
    <td>${a.pw&&k!=="commish"?`<button class="btn ghost sm" data-pwreset="${esc(k)}">Reset</button>`:""}</td></tr>`;}).join("");
  const sec=`<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Passwords</h2><span class="hint">Each team logs in with its own password</span></div><div class="pbody">
    <p class="hint">The first time, a team enters its 6-digit code and picks a password; after that the code stops working for that team. Reset sends a team back to its code. Emails are only used for "Forgot password" codes, and saving one here doesn't email anyone.</p>
    <div class="scroll"><table class="pwtab"><thead><tr><th>Team</th><th>Password</th><th>Reset email</th><th></th></tr></thead><tbody>${ACCTS?rows:`<tr><td colspan="4">Loading…</td></tr>`}</tbody></table></div></div></section>`;
  const at='<section class="panel" style="grid-column:1/-1"><div class="phead"><h2>Seasons</h2>';return h.includes(at)?h.replace(at,sec+at):h+sec;};}
document.addEventListener("change",async e=>{const i=e.target.closest("[data-pwem]");if(!i)return;
  try{await Store._call("acctadmin",{k:i.dataset.pwem,email:i.value.trim()});toast("Email saved.");loadAccts();}catch(x){toast(x.message||"Couldn't save. Try again.");}});
document.addEventListener("click",async e=>{const b=e.target.closest("[data-pwreset]");if(!b)return;const k=b.dataset.pwreset;
  if(!confirm(`Reset ${acctName(k)}'s password? Their phones get logged out and they log in again with their 6-digit code.`))return;
  try{await Store._call("acctadmin",{k,reset:true});toast("Password reset. They log in with their code now.");loadAccts();}catch(x){toast(x.message||"Couldn't reset. Try again.");}});
