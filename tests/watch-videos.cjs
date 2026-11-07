'use strict';
// Verify that the actual H264 watch videos, not only links, are in Android assets.
const assert=require('node:assert/strict');
const fs=require('node:fs'),cp=require('node:child_process'),vm=require('node:vm');
const root='app/src/main/assets',scope={window:{}};
vm.runInNewContext(fs.readFileSync(root+'/watch-video-index.js','utf8'),scope);
const entries=Object.values(scope.window.FitWatchClips||{});
assert.equal(entries.length,5,'Five physical watch clips required');
const expected=new Set(['0025','drv-cable-bar-lateral-pulldown-wide-shoulder-grip','1435','0314','0294']);
for(const e of entries){
 assert.ok(expected.has(e.id),'Unexpected video ID');
 const name=root+'/'+e.file;
 assert.ok(fs.statSync(name).size>8000 && fs.statSync(name).size<10_000_000,'Watch MP4 size invalid');
 const p=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,width,height,pix_fmt,r_frame_rate,codec_type:format=duration,size','-of','json',name],{encoding:'utf8'}));
 const video=p.streams.find(x=>x.codec_type==='video');
 assert.equal(video.codec_name,'h264');assert.equal(video.width,408);assert.equal(video.height,480);
 assert.equal(video.pix_fmt,'yuv420p');
 assert.equal(video.r_frame_rate,'25/1');
 assert.ok(Number(p.format.duration)>1 && Number(p.format.duration)<=5.05,'Incorrect watch length');
 assert.ok(!p.streams.some(x=>x.codec_type==='audio'),'Watch clip has audio');
 console.log('WATCH_TEST '+e.id+' '+Number(p.format.duration).toFixed(2)+'s '+p.format.size+' bytes');
}
const java=fs.readFileSync('app/src/main/java/com/fitkocum/app/MainActivity.java','utf8');
const html=fs.readFileSync(root+'/index.html','utf8');
const player=fs.readFileSync(root+'/video-v31.js','utf8');
assert.ok(java.includes('exportWatchClip(String clipId)'));
assert.ok(java.includes('MediaStore.Video.Media.RELATIVE_PATH'));
assert.ok(html.includes('<script src="watch-video-index.js"></script>'));
assert.ok(player.includes('FitAndroid.exportWatchClip(watchCurrent)'));
console.log('PASS: Five real Huawei 408x480 watch clips, Android export bridge, 4-second H264 MP4');
