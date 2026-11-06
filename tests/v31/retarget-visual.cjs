const {chromium}=require('playwright-core');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
setTimeout(()=>{console.error('FAIL: realistic character test exceeded 90 seconds');process.exit(1)},90000).unref();
const root=path.resolve('/tmp/v31');
const source=path.resolve(__dirname,'../../prototypes/v31');
const server=http.createServer((req,res)=>{
 const u=decodeURI(req.url.split('?')[0]);
 const file=u==='/v31-retarget-bundle.js'?path.join(root,'v31-retarget-bundle.js'):
   u.startsWith('/assets/')?path.join(root,path.basename(u)):
   path.join(source,'preview.html');
 fs.readFile(file,(err,content)=>{if(err){res.writeHead(404).end();return}
   res.writeHead(200,{'Content-Type':file.endsWith('.glb')?'model/gltf-binary':file.endsWith('.js')?'application/javascript':'text/html'}).end(content)
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(8871,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,
 args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
       '--enable-unsafe-swiftshader','--disable-dev-shm-usage','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:750,height:1050},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',err=>errors.push(err.stack||String(err)));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.text().startsWith('RETARGET_MATCHES')||m.text().startsWith('RETARGET_ASSET_LOAD'))console.log(m.text())});
 const summaries=[];
 for(const move of ['bicep_curl','squat','deadlift']){
   errors.length=0;
   await page.goto('http://127.0.0.1:8871/?move='+move);
   await page.waitForFunction(()=>Boolean(window.__v31),null,{timeout:30000}).catch(async e=>{
     throw Error('Prototype '+move+' failed: '+JSON.stringify(errors)+' '+await page.locator('#error').textContent()+' '+String(e));
   });
   const r=await page.evaluate(()=>window.__v31);
   console.log('RETARGET_PROTOTYPE_REPORT '+JSON.stringify({exercise:move,status:r.status,tracks:r.retargetedTracks,
      outfit:r.fitCounts,gear:r.equipment,gearMeshes:r.equipmentMeshes,duration:r.duration,
      first:r.frames?.[0]?.limbs,last:r.frames?.[2]?.limbs}));
   assert.equal(r.status,'ok',String(r.message));
   assert.equal(r.appearance,'native surface tint');
   assert.ok(r.dressed>=2,'Gym clothing regions must cover torso and shorts');
   assert.equal(r.exercise,move);
   assert.ok(r.retargetedTracks>=20,'Expected major bones retargeted for '+move);
   assert.ok(r.fitCounts.jersey>100&&r.fitCounts.shorts>100,'Fitted workout clothes should have triangle geometry: '+move);
   assert.equal(r.equipment,move==='bicep_curl'?'dumbbell':move==='deadlift'?'barbell':'none');
   const start=r.frames[0].limbs,mid=r.frames[2].limbs;
   const movement=Object.keys(start).reduce((n,k)=>n+Math.sqrt(start[k].reduce((t,v,i)=>t+(v-mid[k][i])**2,0)),0);
   assert.ok(movement>.10,'Human skeleton must actually move: '+move);
   for(const [label,time] of [['start',0],['mid',.50],['finish',.75]]){
     await page.evaluate(t=>window.__v31Pose(t),time);
     await page.screenshot({path:'/tmp/v31/'+move+'-'+label+'.png'});
   }
   if(errors.length)throw Error('WebGL page errors for '+move+': '+errors.slice(0,3).join('; '));
   summaries.push({move,movement,tracks:r.retargetedTracks,outfit:r.fitCounts,gear:r.equipment});
 }
 console.log('THREE_EXERCISE_PROOF',JSON.stringify(summaries));
 await browser.close();
})().then(()=>server.close(()=>process.exit(0))).catch(e=>{console.error(e);process.exit(1)});
