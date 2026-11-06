const {chromium}=require('playwright-core');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
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
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8871/');
 await page.waitForFunction(()=>Boolean(window.__v31),null,{timeout:45000});
 const result=await page.evaluate(()=>window.__v31);
 console.log('RETARGET_PROTOTYPE_REPORT',JSON.stringify(result));
 await page.screenshot({path:'/tmp/v31/retarget-preview.png',fullPage:true});
 if(result.status!=='ok')throw Error('Retarget preview failed: '+result.message);
 assert.ok(result.retargetedTracks>=10,'At least 10 mapped motion tracks required');
 assert.equal(result.dressed,3,'Body must be dressed');
 const a=result.frames[0].limbs,b=result.frames[2].limbs;
 const displacement=Object.keys(a).reduce((s,k)=>s+Math.sqrt(a[k].reduce((t,n,i)=>t+(n-b[k][i])**2,0)),0);
 console.log('RETARGET_DISPLACEMENT',displacement);
 assert.ok(displacement>.12,'Joints must visibly animate and not freeze');
 if(errors.length)throw Error('Browser errors: '+errors.slice(0,5).join('\n'));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
