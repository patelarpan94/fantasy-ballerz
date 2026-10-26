const Store={db:null,user:null,uid:null,local:false,canAdmin:true,url:"",
  _d:{},_rev:{},_w:[],_t:null,_busy:null,_dirty:false,
  async init(){
    this.url=(window.DF_CONFIG||{}).backend||"";
    try{const k="dfBackend_"+((window.DF_CONFIG||{}).env||""),q=new URLSearchParams(location.search).get("backend");if(q)localStorage.setItem(k,q);if(!this.url)this.url=localStorage.getItem(k)||"";}catch(e){}
    try{this.uid=localStorage.getItem("dfDevice");if(!this.uid){this.uid="dev_"+Math.random().toString(36).slice(2,12);localStorage.setItem("dfDevice",this.uid);}}catch(e){this.uid="dev";}
    if(!this.url){this.local=true;this.uid=this.uid||"local";return;}
    this.db={backend:this.url};
    await this._loadCache();
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)this.poll();});
    addEventListener("online",()=>this.poll());
  },
  // one POST per call; text/plain keeps it a "simple" request (no CORS preflight)
  async _call(op,body){
    const r=await fetch(this.url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({op,h:SESSION?.h||null,...body}),redirect:"follow"});
    if(!r.ok)throw {code:"network",message:`Server error ${r.status}`};
    const j=await r.json();if(j.error)throw {code:j.error,message:j.message||j.error};return j;
  },
  _l(){try{return JSON.parse(localStorage.getItem("dfa2")||"{}");}catch(e){return {};}},
  _ls(o){try{localStorage.setItem("dfa2",JSON.stringify(o));}catch(e){}},
  _list(col){const c=this._d[col]||{};return Object.entries(c).map(([id,x])=>({id,...x.v}));},
  _emit(cols){this._w.slice().forEach(w=>{if(!cols||cols.has(w.col))w.run();});},
  _apply(docs){const cols=new Set();
    for(const x of docs){const c=this._d[x.c]||(this._d[x.c]={});const cur=c[x.i];if(cur&&cur.r>x.r)continue;
      if(x.d)delete c[x.i];else c[x.i]={r:x.r,v:x.v};cols.add(x.c);}
    if(cols.size){this._dirty=true;this._saveCache();}return cols;},
  _watch(col,run){
    const w={col,run};this._w.push(w);
    if(this.local){this._subs.push(run);run();return ()=>{this._subs=this._subs.filter(x=>x!==run);};}
    if(col in this._rev)run();else{this._rev[col]=0;this.poll(true);}
    return ()=>{this._w=this._w.filter(x=>x!==w);};
  },
  _subs:[],
  watch(col,season,cb){
    const run=()=>{const all=this.local?Object.entries(this._l()[col]||{}).map(([id,d])=>({id,...d})):this._list(col);cb(all.filter(d=>season==null||d.season===season));};
    return this._watch(col,run);
  },
  // filtered, newest-first window: where = [[field, "=="|"array-contains", value]]
  watchQ(col,where,lim,cb){
    const ok=d=>where.every(([f,op,v])=>op==="array-contains"?Array.isArray(d[f])&&d[f].includes(v):d[f]===v);
    const run=()=>{const all=this.local?Object.entries(this._l()[col]||{}).map(([id,d])=>({id,...d})):this._list(col);cb(all.filter(ok).sort((a,b)=>b.at-a.at).slice(0,lim));};
    return this._watch(col,run);
  },
  // ask the server for everything newer than what this device has, in every watched collection
  poll(now){
    if(this.local)return Promise.resolve();
    if(this._busy){this._again=true;return this._busy;}
    clearTimeout(this._t);
    this._busy=(async()=>{
      try{const req={...this._rev},j=await this._call("sync",{cols:req});
        // the server was reset (a new Sheet behind the same address): start over
        if((j.rev||0)<Math.max(0,...Object.values(req))){this._d={};for(const c of Object.keys(this._rev))this._rev[c]=0;this._seen=new Set();this._again=true;return;}
        const cols=this._apply(j.docs||[]);for(const c of Object.keys(req))this._rev[c]=Math.max(this._rev[c]||0,j.rev||0);
        this._ok=Date.now();this._fails=0;
        // collections asked for the first time get one callback even when they're empty
        const seen=this._seen||(this._seen=new Set());Object.keys(req).forEach(c=>{if(!seen.has(c)){seen.add(c);cols.add(c);}});
        if(cols.size)this._emit(cols);}
      catch(e){this._fails=(this._fails||0)+1;if(this._fails===3)toast("Can't reach the league server. Retrying…");}
      finally{this._busy=null;const again=this._again;this._again=false;
        // every 15 s while the app is open, slower when it's in the background or the server is down
        const wait=again?50:document.hidden?120e3:Math.min(120e3,15e3*2**Math.max(0,(this._fails||0)-1));
        this._t=setTimeout(()=>this.poll(),wait);}
    })();
    return this._busy;
  },
  async get(col,id){if(this.local)return (this._l()[col]||{})[id]||null;const j=await this._call("get",{c:col,i:id});return j.v||null;},
  async set(col,id,data){if(this.local){const o=this._l();(o[col]=o[col]||{})[id]=data;this._ls(o);this._emitLocal();return;}
    const j=await this._call("set",{c:col,i:id,v:data});this._mine(col,j.i||id,j.r,data);},
  async update(col,id,data){if(this.local){const o=this._l(),c=(o[col]=o[col]||{});c[id]=merge(c[id]||{},data);this._ls(o);this._emitLocal();return;}
    const j=await this._call("update",{c:col,i:id,v:data});this._mine(col,id,j.r,j.v);},
  async del(col,id){if(this.local){const o=this._l();delete (o[col]||{})[id];this._ls(o);this._emitLocal();return;}
    const j=await this._call("del",{c:col,i:id});this._mine(col,j.i||id,j.r,null);},
  // a write shows here right away; other devices get it on their next poll
  _mine(col,id,r,v){if(col==="badges"&&v){this.poll();return;}const cols=this._apply([{c:col,i:id,r,d:v==null?1:0,v}]);this._emit(cols);this.poll();},
  _emitLocal(){this._subs.slice().forEach(f=>f());},
  // set only when the document is absent or check(existing) allows it; the server refuses if someone else wrote it first
  async claimSet(col,id,data,check){
    if(this.local){const o=this._l(),c=(o[col]=o[col]||{});if(c[id]&&!check(c[id]))throw {code:"taken"};c[id]=data;this._ls(o);this._emitLocal();return;}
    const cur=await this._call("get",{c:col,i:id});if(cur.v&&!check(cur.v))throw {code:"taken"};
    const j=await this._call("set",{c:col,i:id,v:data,ifRev:cur.r||0});this._mine(col,id,j.r,data);
  },
  async names(){return {};},
  // this device keeps a copy of the league so the app opens instantly; the poll then fetches only what changed
  _db(){return this._dbp||(this._dbp=new Promise((res,rej)=>{const q=indexedDB.open("fantasyBallerz",1);q.onupgradeneeded=()=>q.result.createObjectStore("c");q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);}));},
  async _loadCache(){
    try{const db=await this._db(),v=await new Promise((res,rej)=>{const r=db.transaction("c").objectStore("c").get(this.url);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
      if(v&&v.d&&v.rev){this._d=v.d;this._cacheRev=v.rev;}}catch(e){}
  },
  _saveCache(){clearTimeout(this._ct);this._ct=setTimeout(async()=>{
    if(!this._dirty)return;this._dirty=false;
    try{const d={...this._d};delete d.secret;const rev={};for(const c of Object.keys(d))rev[c]=this._rev[c]||0;
      const db=await this._db();db.transaction("c","readwrite").objectStore("c").put({d,rev},this.url);}catch(e){}},2000);}
};
// a collection already in this device's copy only needs what changed since then
{const w=Store._watch;Store._watch=function(col,run){if(!this.local&&!(col in this._rev)&&this._cacheRev?.[col]){this._rev[col]=this._cacheRev[col];(this._seen||(this._seen=new Set())).add(col);const off=w.call(this,col,run);this.poll(true);return off;}return w.call(this,col,run);};}
