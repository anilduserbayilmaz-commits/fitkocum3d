const { chromium } = require('playwright-core');
setTimeout(()=>{ console.error('FAIL: 3D browser test timed out'); process.exit(1); },90000).unref();
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..', 'app', 'src', 'main', 'assets');
const port = 8671;
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.png':'image/png','.glb':'model/gltf-binary'};
const server = http.createServer((req,res)=>{
  const name=decodeURIComponent(req.url.split('?')[0]);
  const filepath=path.resolve(ROOT,'.'+name);
  if(name==='/favicon.ico'){res.writeHead(204).end();return}
  if(!filepath.startsWith(ROOT+path.sep)) {res.writeHead(403).end();return}
  fs.readFile(filepath,(err,data)=>{if(err){res.writeHead(404).end();return}
    res.writeHead(200,{'Content-Type':types[path.extname(filepath)]||'application/octet-stream'}).end(data)
  })
});
(async()=>{
 await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const models={};
 for(const id of ['plank','squat','deadlift','romanian_deadlift','sumo_squat']){
  models[id]=fs.readFileSync(path.join(ROOT,'models',id+'.glb')).toString('base64');
 }
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:393,height:851},deviceScaleFactor:1});
 const consoleErrors=[];
 page.on('pageerror',e=>consoleErrors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
 await page.addInitScript(p=>{
  window.FitAndroid={loadModelBase64:id=>p[id]||'',shareData:()=>{},analyzeMeal:()=>{}};
 },models);
 await page.goto('http://127.0.0.1:'+port+'/index.html');
 assert.equal(await page.locator('#choose3d').count(),1);
 assert.equal(await page.locator('[data-tab="library"]').count(),0,'No separate 3D tab');
 assert.equal(await page.locator('#moveList .move').count(),6);
 for(const day of ['A','B','C']){
   await page.locator('[data-day="'+day+'"]').click();
   const ids=await page.locator('#moveList .watch').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
   assert.equal(ids.length,6,day+' must show six program moves');
   assert.ok(ids.every(id=>id.startsWith('lib_')),day+' must exclusively use real 3D models');
   console.log('PROGRAM '+day+': '+ids.join(','));
   const first=ids[0].slice(4);
   await page.locator('#moveList [data-id="'+ids[0]+'"]').click();
   await page.waitForFunction(name=>typeof scene!=='undefined'&&scene.mode==='real'&&scene.real.modelName===name,first,{timeout:20000});
   assert.equal(await page.locator('#gymRealCanvas').evaluate(el=>el.style.display),'block');
   await page.locator('#close').click();
 }
 await page.locator('[data-day="A"]').click();
 await page.screenshot({path:'/tmp/fitkocum-program.png',fullPage:true});
 await page.locator('#chooseClassic').click();
 assert.equal((await page.locator('#moveList .watch').first().getAttribute('data-id')),'squat');
 await page.locator('#choose3d').click();
 await page.locator('#exerciseLibrary').evaluate(el=>el.open=true);

 const screenshots=[];
 for(const id of ['plank','squat','deadlift','romanian_deadlift','sumo_squat']){
  await page.locator('[data-id="lib_'+id+'"]').first().click();
  await page.waitForFunction((expected)=>typeof scene!=='undefined'&&scene?.real?.modelName===expected,id,{timeout:20000});
  await page.waitForTimeout(500);
  const state=await page.evaluate(()=>({
     mode:scene.mode,
     loaded:scene.real.modelName,
     original:document.querySelector('#modelCanvas').style.display,
     real:document.querySelector('#gymRealCanvas').style.display,
     time:scene.real.mixer?.time,
     clips:scene.real.actions?.length,
     fail:scene.real.fail,
     equipment:scene.real.equipment?.children?.length||0,
     wrists:scene.real.wrists?.map(x=>x?.name||null)||[],
     rect:scene.real.canvas.getBoundingClientRect().toJSON(),
     error:document.querySelector('#real3dStatus').textContent
  }));
  assert.equal(state.mode,'real');
  assert.equal(state.loaded,id);
  assert.equal(state.original,'none','Low-poly canvas must be hidden');
  assert.equal(state.real,'block','Real anatomy must be visible');
  assert.ok(state.time >= 0);
  assert.ok(state.clips >= 1);
  assert.equal(state.fail,false);
  if(id==='deadlift')assert.ok(state.equipment>0,'Deadlift barbell must be present');
  console.log(id,JSON.stringify(state));
  const imageBefore=await page.locator('.scene').screenshot({path:'/tmp/fitkocum-'+id+'.png'});
  screenshots.push(id);
  const before=state.time;
  await page.waitForTimeout(720);
  if(id!=='plank'){
    const imageAfter=await page.locator('.scene').screenshot();
    assert.notEqual(Buffer.compare(imageBefore,imageAfter),0,'Animated body must visibly change in '+id);
  }
  const after=await page.evaluate(()=>scene.real.mixer.time);
  assert.ok(after>before,'Animation must advance');
  await page.locator('#close').click();
 }
 if(consoleErrors.length)throw new Error('Browser errors: '+consoleErrors.slice(0,5).join('\n'));
 console.log('PASS: all 3 realistic 3D animations visible and advancing');
 await browser.close();
})().then(()=>server.close(()=>process.exit(0))).catch(e=>{console.error(e);process.exit(1)});
