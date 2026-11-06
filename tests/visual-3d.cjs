const { chromium } = require('playwright-core');
setTimeout(()=>{ console.error('FAIL: 3D browser test timed out'); process.exit(1); },230000).unref();
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
 models.mobility=fs.readFileSync(path.join(ROOT,'models','mobility.glb')).toString('base64');
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:393,height:851},deviceScaleFactor:1});
 const consoleErrors=[];
 page.on('pageerror',e=>consoleErrors.push(e.stack||String(e)));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
 await page.addInitScript(p=>{
  window.FitAndroid={loadModelBase64:id=>p[id]||'',shareData:()=>{},analyzeMeal:()=>{}};
 },models);
 await page.goto('http://127.0.0.1:'+port+'/index.html');
 // Smart-coach tests: v1.7 records remain readable, advice requires previous complete easy session.
 const yesterday=new Date(Date.now()-86400000);
 const fixture=[0,1,2].map(i=>({id:'bench',weight:50,reps:12,rir:2,date:new Date(yesterday.getTime()+i*60000).toISOString()}));
 await page.evaluate(entries=>{
   localStorage.setItem('fitkocum3d_records',JSON.stringify(entries));
   localStorage.setItem('fitkocum_program_mode','3d');
   localStorage.setItem('fitkocum_autorest','true');
 },fixture);
 await page.reload();
 await page.locator('#moveList .watch[data-id="bench"]').click();
 await page.waitForFunction(()=>document.getElementById('coachAdvice').textContent.includes('52,5 kg'));
 assert.equal(await page.locator('#weight').inputValue(),'52.5','Conservative 2.5 kg suggestion after 3 well-controlled sets');
 assert.match(await page.locator('#coachHistory').innerText(),/50 kg × 12 tekrar/);
 await page.locator('#rir').selectOption('1');
 await page.locator('#reps').fill('10');
 await page.locator('#save').click();
 const result=await page.evaluate(()=>{
   const rows=JSON.parse(localStorage.getItem('fitkocum3d_records'));
   return {count:rows.length,last:rows.at(-1),timer:typeof timerHandle!=='undefined'&&Boolean(timerHandle),text:document.getElementById('feedback').textContent};
 });
 assert.equal(result.count,4);
 assert.equal(result.last.rir,1);
 assert.equal(result.last.weight,52.5);
 assert.equal(result.last.reps,10);
 assert.equal(result.timer,true,'Auto rest must start');
 assert.match(result.text,/Set kaydedildi/);
 await page.locator('#quickRestToggle').click();
 assert.equal(await page.evaluate(()=>Boolean(timerHandle)),false);
 await page.locator('#autoRest').uncheck();
 await page.locator('#rir').selectOption('');
 await page.locator('#save').click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fitkocum3d_records')).at(-1).rir),null,'Unknown RIR stays null');
 assert.equal(await page.evaluate(()=>Boolean(timerHandle)),false,'Auto rest disabled');
 await page.locator('#close').click();
 await page.evaluate(()=>{localStorage.removeItem('fitkocum3d_records');localStorage.removeItem('fitkocum_autorest')});
 await page.reload();

 assert.equal(await page.locator('#choose3d').count(),1);
 assert.equal(await page.locator('#chooseCustom').count(),1);
 assert.equal(await page.locator('[data-tab="library"]').count(),0,'No separate 3D tab');
 assert.equal(await page.locator('#moveList .move').count(),6);
 for(const day of ['A','B','C']){
   await page.locator('[data-day="'+day+'"]').click();
   const ids=await page.locator('#moveList .watch').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
   assert.equal(ids.length,6,day+' must show six program moves');
   assert.ok(ids.every(id=>id.startsWith('lib_')||['bench','pulldown','legpress','row','triceps'].includes(id)),day+' must use real 3D or purpose-built equipment 3D');
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

 // Custom program builder must persist added days, set goals and ordering.
 await page.locator('#chooseCustom').click();
 await page.locator('#customAddDay').click();
 await page.waitForFunction(()=>document.querySelectorAll('#dayTabs .day').length===4);
 assert.equal(await page.locator('#dayTabs .day').count(),4);
 await page.locator('#customDayTitle').fill('Yeni program günüm');
 await page.locator('#customDayTitle').dispatchEvent('change');
 await page.locator('#customSearch').fill('leg press');
 await page.locator('#customMoveSelect').selectOption('legpress');
 await page.locator('#customAddMove').click();
 await page.waitForFunction(()=>document.querySelector('#moveList .watch')?.dataset.id==='legpress');
 assert.equal(await page.locator('#moveList .watch').first().getAttribute('data-id'),'legpress');
 await page.locator('[data-goal="sets"]').first().fill('4');
 await page.locator('[data-goal="sets"]').first().dispatchEvent('change');
 await page.locator('[data-goal="reps"]').first().fill('10–12');
 await page.locator('[data-goal="reps"]').first().dispatchEvent('change');
 await page.waitForFunction(()=>document.getElementById('moveList').innerText.includes('4 × 10–12'));
 assert.match(await page.locator('#moveList').innerText(),/4 × 10–12/);
 await page.reload();
 assert.equal(await page.locator('#dayTabs .day').count(),4);
 assert.equal(await page.locator('#moveList .watch').first().getAttribute('data-id'),'legpress');
 assert.match(await page.locator('#dayCaption').innerText(),/Yeni program günüm/);
 await page.locator('#choose3d').click();
 await page.locator('[data-day="A"]').click();
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

 // 24 anatomical + 36 distinct 3D mannequin exercises, with correct category filters.
 assert.equal(await page.locator('#moveFilters [data-move-filter]').count(),6);
 assert.equal(await page.locator('#realMoveList article').count(),65,'Total library count');
 for(const [category,count] of [['strength',24],['technique',5],['warmup',14],['mobility',14],['accessory',8]]){
   await page.locator('[data-move-filter="'+category+'"]').click();
   assert.equal(await page.locator('#realMoveList article').count(),count,category+' model count');
 }
 await page.locator('[data-move-filter="all"]').click();
 for(const id of ['arm-circles-small','standing-hip-circles','standing-cross-crunch']){
   await page.locator('#realMoveList [data-id="mobility_'+id+'"]').click();
   await page.waitForFunction(
     (expected)=>typeof scene!=='undefined'&&scene.mode==='mobility'&&scene.real.modelName==='mobility'&&scene.real.actions?.[0]?.getClip()?.name===expected,
     id,{timeout:35000}
   );
   await page.waitForTimeout(300);
   const state=await page.evaluate(()=>({
      mode:scene.mode,
      clip:scene.real.actions[0].getClip().name,
      progress:scene.real.mixer.time,
      loaded:scene.real.modelName,
      old:document.getElementById('modelCanvas').style.display,
      real:document.getElementById('gymRealCanvas').style.display
   }));
   assert.equal(state.mode,'mobility');
   assert.equal(state.clip,id);
   assert.equal(state.old,'none');
   assert.equal(state.real,'block');
   await page.locator('.scene').screenshot({path:'/tmp/fitkocum-mobility-'+id+'.png'});
   const before=await page.evaluate(()=>scene.real.mixer.time);
   await page.waitForTimeout(600);
   assert.ok((await page.evaluate(()=>scene.real.mixer.time))>before,'Mobility animation must advance');
   console.log('MOBILITY '+id+': '+JSON.stringify(state));
   await page.locator('#close').click();
 }
 // Five separate equipment models have their own moving human figure, machine geometry and exercise path.
 await page.locator('[data-move-filter="technique"]').click();
 for(const id of ['bench','pulldown','legpress','row','triceps']){
   await page.locator('#realMoveList [data-id="'+id+'"]').click();
   await page.waitForFunction(expected=>typeof scene!=='undefined'&&scene.mode==='technique'&&scene.real.modelName==='technique:'+expected,id,{timeout:15000});
   const a=await page.evaluate(()=>({
      mode:scene.mode,kind:scene.real.technique?.kind,
      meshCount:scene.real.technique?.meshes?.size||0,
      visible:scene.real.canvas.style.display,
      original:document.getElementById('modelCanvas').style.display,
      phase:scene.real.progress
   }));
   assert.equal(a.mode,'technique');assert.equal(a.kind,id);assert.ok(a.meshCount>18,id+' mesh count');
   assert.equal(a.visible,'block');assert.equal(a.original,'none');
   assert.equal(await page.locator('#techniqueCompare').isVisible(),true);
   assert.equal(await page.locator('#formCorrect').getAttribute('aria-pressed'),'true');
   await page.locator('[data-technique-phase="0.5"]').click();
   assert.equal(await page.evaluate(()=>scene.real.playing),false);
   await page.waitForTimeout(120);
   const good=await page.locator('.scene').screenshot({path:'/tmp/fitkocum-technique-'+id+'-good.png'});
   await page.locator('#formWrong').click();
   assert.equal(await page.locator('#formWrong').getAttribute('aria-pressed'),'true');
   assert.equal(await page.evaluate(()=>scene.real.technique.formMode),'mistake');
   assert.equal(await page.locator('#techniqueWarning').evaluate(el=>el.classList.contains('bad')),true);
   assert.match(await page.locator('#techniqueWarning').innerText(),/Örnek hata/);
   await page.waitForTimeout(120);
   const bad=await page.locator('.scene').screenshot({path:'/tmp/fitkocum-technique-'+id+'-mistake.png'});
   assert.notEqual(Buffer.compare(good,bad),0,'Correct and wrong technique must look visibly different: '+id);
   await page.locator('#formCorrect').click();
   assert.equal(await page.evaluate(()=>scene.real.technique.formMode),'correct');
   await page.locator('#pause').click();
   const frame1=await page.locator('.scene').screenshot({path:'/tmp/fitkocum-technique-'+id+'.png'});
   await page.waitForTimeout(750);
   const frame2=await page.locator('.scene').screenshot();
   assert.notEqual(Buffer.compare(frame1,frame2),0,'Model must visually animate: '+id);
   const r=await page.evaluate(()=>scene.real.progress);
   assert.notEqual(r,a.phase,'Progress must change: '+id);
   await page.locator('#poseRange').evaluate(el=>{el.value='45';el.dispatchEvent(new Event('input',{bubbles:true}));});
   assert.equal(await page.locator('#pause').innerText(),'▶ Oynat');
   console.log('TECHNIQUE '+id+' '+JSON.stringify(a));
   await page.locator('#close').click();
 }
 await page.locator('[data-move-filter="all"]').click();
 await page.locator('#realMoveList [data-id="mobility_arm-circles-small"]').click();
 assert.equal(await page.locator('#techniqueCompare').isVisible(),false,'Technique comparison only on validated strength and machine exercises');
 await page.locator('#close').click();
 await page.locator('#realMoveList [data-id="bench"]').click();
 assert.equal(await page.locator('#formCorrect').getAttribute('aria-pressed'),'true','Form mode resets to correct for each new exercise');
 await page.locator('#close').click();
 // Anatomical GLB form-guide regression: actual motion-captured rig plus
 // red/green training markers and physically distinct example joint offsets.
 await page.locator('[data-move-filter="all"]').click();
 for(const id of ['squat','deadlift','plank']){
   await page.locator('#realMoveList [data-id="lib_'+id+'"]').click();
   await page.waitForFunction(expected=>
      typeof scene!=='undefined'&&scene.mode==='real'
      &&scene.real.modelName===expected
      &&scene.real.rigGuide?.isAvailable, id,{timeout:20000});
   assert.equal(await page.locator('#techniqueCompare').isVisible(),true,'Anatomical teaching panel for '+id);
   await page.locator('[data-technique-phase="0.5"]').click();
   assert.equal(await page.evaluate(()=>scene.real.playing),false);
   const good=await page.locator('.scene').screenshot({path:'/tmp/fitkocum-anatomy-'+id+'-correct.png'});
   const base=await page.evaluate(()=>scene.real.rigGuide.bones[0].bone.quaternion.toArray());
   await page.locator('#formWrong').click();
   const bad=await page.locator('.scene').screenshot({path:'/tmp/fitkocum-anatomy-'+id+'-mistake.png'});
   const wrong=await page.evaluate(()=>({
      mode:scene.real.rigGuide.mode,
      quat:scene.real.rigGuide.bones[0].bone.quaternion.toArray(),
      color:scene.real.rigGuide.markers[0].material.color.getHexString(),
      hasOverlay:scene.real.rigGuide.group.visible
   }));
   assert.equal(wrong.mode,'mistake');
   assert.equal(wrong.hasOverlay,true);
   assert.notDeepEqual(base,wrong.quat,'Actual bone pose must change: '+id);
   assert.notEqual(Buffer.compare(good,bad),0,'Anatomical screenshots must differ: '+id);
   await page.locator('#formCorrect').click();
   const restored=await page.evaluate(()=>scene.real.rigGuide.bones[0].bone.quaternion.toArray());
   assert.ok(restored.every((v,i)=>Math.abs(v-base[i])<.005),'Original animation pose must restore: '+id);
   console.log('ANATOMICAL '+id+' correct/mistake/restored, accent '+wrong.color);
   await page.locator('#close').click();
 }
 if(consoleErrors.length)throw new Error('Browser errors: '+consoleErrors.slice(0,5).join('\n'));
 console.log('PASS: 12 anatomy guides (3 sampled visually), five machine comparisons, RIR smart coach, 65 3D and custom editing');
 await browser.close();
})().then(()=>server.close(()=>process.exit(0))).catch(e=>{console.error(e);process.exit(1)});
