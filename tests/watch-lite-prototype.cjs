'use strict';
// Source + physical media validation, not a substitute for DevEco/HAP or watch testing.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='watch-lite/entry/src/main',p=path.join(root,'js/MainAbility/pages/index');
const config=JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));
assert.equal(config.app.bundleName,'com.fitkocum.watchlite');
assert.equal(config.app.version.name,'4.2.0');
assert.ok(config.module.deviceType.includes('liteWearable'));
const index=fs.readFileSync(path.join(p,'index.js'),'utf8');
const hml=fs.readFileSync(path.join(p,'index.hml'),'utf8');
const css=fs.readFileSync(path.join(p,'index.css'),'utf8');
const app=fs.readFileSync(path.join(root,'js/MainAbility/app.js'),'utf8');
const state=fs.readFileSync(path.join(root,'js/MainAbility/utils/watch-state.js'),'utf8');
const adapter=fs.readFileSync(path.join(root,'js/MainAbility/utils/wear-link.js'),'utf8');
const parseCode=s=>s.replace(/^import .+$/gm,'').replace(/export default\s+function/,'function').replace(/export default/g,'const example =');
for(const [name,code] of [['app.js',app],['index.js',index],['state.js',state],['wear-link.js',adapter]]){
 new vm.Script(parseCode(code),{filename:name});
}
for(const word of ['completeSet','previous','next','loopVideo','videoError','saveProgress','receivePhonePacket']){
 assert.ok(index.includes(word),'Missing watch action '+word);
}
assert.ok(hml.includes('<video')&&hml.includes('src="{{videoSrc}}"')&&hml.includes('onfinish="loopVideo"'));
assert.ok(hml.includes('SET +')&&hml.includes('restText')&&hml.includes('showPoster'));
assert.ok(css.includes('background-color:#101d2d'));
const clips=['0025','drv-cable-bar-lateral-pulldown-wide-shoulder-grip','1435','0314','0294'];
for(const id of clips){
 const video=path.join(root,'js/MainAbility/common/videos/'+id+'.mp4');
 const poster=path.join(root,'js/MainAbility/common/posters/'+id+'.png');
 assert.ok(fs.existsSync(video)&&fs.statSync(video).size>8000,'Missing bundled video '+id);
 assert.ok(fs.existsSync(poster)&&fs.statSync(poster).size>1000,'Missing bundled poster '+id);
 assert.ok(state.includes('/common/videos/'+id+'.mp4'));
}
const sandbox={};
vm.runInNewContext(adapter.replace('export default function','globalThis.Adapter = function'),sandbox);
const factory=sandbox.Adapter;
let lastClient;
class P2pClient{
 constructor(){lastClient=this}
 setPeerPkgName(x){this.peer=x}
 setPeerFingerPrint(x){this.fingerprint=x}
 registerReceiver(x){this.receiver=x;x.onSuccess()}
 send(message,cb){this.lastMessage=message.builder.content;cb.onSuccess();cb.onSendResult({code:207})}
 unregisterReceiver(x){this.receiver=null;x.onSuccess()}
}
class Builder{setDescription(value){this.content=value}}
class Message{}
const info=[],received=[];
assert.throws(()=>factory({P2pClient,Builder,Message},{packageName:'',fingerprint:''}));
const link=factory({P2pClient,Builder,Message},{packageName:'com.fitkocum.plus',fingerprint:'TEST-ONLY'},p=>received.push(p),s=>info.push(s));
link.start();link.start();
const packet={v:1,type:'exercise.select',messageId:'msg-test-1',payload:{exerciseId:'0025'}};
link.send(packet);
assert.deepEqual(JSON.parse(lastClient.lastMessage),packet);
lastClient.receiver.onReceiveMessage({isFileType:false,data:JSON.stringify(packet)});
assert.equal(received.length,1);
link.stop();assert.equal(lastClient.receiver,null);
console.log('PASS: v4.2 Lite source + 5 bundled MP4/posters + mocked Wear Engine adapter; NOT INSTALLABLE YET');
