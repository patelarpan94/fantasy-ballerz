const http=require('http'),fs=require('fs'),path=require('path'),{makeEnv}=require('./gas');
const st={};if(process.env.BLOCK)st.fakeFetch=()=>({getResponseCode:()=>403,getContentText:()=>''});const G=makeEnv(st);const ROOT=path.join(__dirname,'../..');
if(process.env.SEED){const dump=require(process.env.SEED);const cm=dump.docs.find(d=>d.c==='badges'&&d.v.role==='commish').i;
  for(let i=0;i<dump.docs.length;i+=60)G.doPost({postData:{contents:JSON.stringify({op:'import',docs:dump.docs.slice(i,i+60),h:cm})}});}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer((q,s)=>{
  if(q.url.startsWith('/exec')){
    if(q.method==='OPTIONS'){s.writeHead(204,{'Access-Control-Allow-Origin':'*'});return s.end();}
    let b='';q.on('data',c=>b+=c);q.on('end',()=>{const t=Date.now();let out;
      try{out=q.method==='POST'?G.doPost({postData:{contents:b}}).content:G.doGet().content;}catch(e){out=JSON.stringify({error:'crash',message:String(e)});}
      if(process.env.LOG)console.log(q.method,b.slice(0,90),'->',out.length,'B',Date.now()-t,'ms');
      s.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});s.end(out);});return;}
  let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,p);
  fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);return s.end('nf');}s.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});s.end(d);});
}).listen(+process.env.PORT||8080,()=>console.log('listening'));
