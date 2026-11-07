'use strict';
// The Lite Wearable watch app is an EXPERIMENTAL source-only prototype.
// This verifies source structure, not that a HAP can be installed on FIT 5 Pro.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='watch-lite/entry/src/main',p=path.join(root,'js/MainAbility/pages/index');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));
assert.equal(cfg.app.bundleName,'com.fitkocum.watchlite');
assert.ok(cfg.module.deviceType.includes('liteWearable'));
const main=fs.readFileSync(path.join(p,'index.js'),'utf8');
const hml=fs.readFileSync(path.join(p,'index.hml'),'utf8');
const css=fs.readFileSync(path.join(p,'index.css'),'utf8');
const app=fs.readFileSync(path.join(root,'js/MainAbility/app.js'),'utf8');
new vm.Script(main.replace('export default','const prototype ='),{filename:'watch-lite index.js'});
new vm.Script(app.replace('export default','const prototype ='),{filename:'watch-lite app.js'});
for(const word of ['completeSet','previous','next','loopVideo','videoError'])assert.ok(main.includes(word));
assert.ok(hml.includes('<video')&&hml.includes('src="{{videoSrc}}"'));
assert.ok(hml.includes('SET +')&&hml.includes('restText'));
assert.ok(css.includes('background-color: #101d2d'));
const clips=['0025','drv-cable-bar-lateral-pulldown-wide-shoulder-grip','1435','0314','0294'];
for(const id of clips)assert.ok(main.includes(id+'.mp4'),'Missing watch video ID '+id);
for(const id of clips){
 const movie=path.join(root,'js/MainAbility/common/videos/'+id+'.mp4');
 assert.ok(fs.existsSync(movie)&&fs.statSync(movie).size>8000,'Watch Lite prototype clip missing: '+id);
}
console.log('PASS: Lite Wearable v4.1 prototype source files and local playlist syntax; NOT hardware-validated');
