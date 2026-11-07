// Check free-exercise catalogue integrity without needing the public media CDN.
const fs = require('fs');
const vm = require('vm');
const context = { window: {} };
const filename = 'app/src/main/assets/free-exercise-data.js';
vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, {filename,timeout:15000});
const {FitFreeExerciseData: list,FitFreeVideoClips: clips,FitLegacyVideoMatches: aliases} = context.window;
if (!Array.isArray(list) || list.length !== 317) throw Error('Unexpected catalogue size');
if (Object.keys(clips||{}).length!==317) throw Error('Exercise ID collision');
const allowed=/^https:\/\/pub-585d42eb1aa64a67aedf483ec328d3fe\.r2\.dev\/exercise-videos\/(male|female)\/[a-z0-9-]+\.mp4$/;
for(const x of list){
 if(!allowed.test(x.video||''))throw Error('Invalid video URL: '+x.id);
 if(!x.poster || !/^https:\/\//.test(x.poster))throw Error('Missing poster: '+x.id);
 if(!x.name || !x.steps?.length)throw Error('Missing metadata '+x.id);
}
for(const required of ['bench','pulldown','squat','incline','row','legpress']){
 if(!allowed.test(aliases?.[required]?.video||''))throw Error('Missing source clip for '+required);
}
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const player=fs.readFileSync('app/src/main/assets/video-v31.js','utf8');
const dataTag='<script src="free-exercise-data.js"></script>';
const searchTag='<script src="exercise-search-v321.js"></script>';
const weeklyTag='<script src="weekly-v31.js"></script>';
const playerTag='<script src="video-v31.js"></script>';
if(!(html.indexOf(dataTag)>=0 && html.indexOf(dataTag)<html.indexOf(searchTag)
  && html.indexOf(searchTag)<html.indexOf(weeklyTag)
  && html.indexOf(weeklyTag)<html.indexOf(playerTag))) throw Error('Video scripts are out of order');
if(!html.includes('Object.assign(MOVES,FREE_VIDEO_EXERCISES)'))throw Error('317 exercises not imported into program');
if(!player.includes('window.FitLegacyVideoMatches'))throw Error('Bench Press/Lat Pulldown mapping missing from player');
if(!player.includes("const BUILD='4.0.0-watch-alpha'"))throw Error('Offline video player version mismatch');
if(!html.includes('v4.0 · WATCH LAB'))throw Error('App version badge missing');
if(html.includes('Bu hareket için henüz onaylanmış MoveKit videosu yok')||
  player.includes('Bu hareket için henüz onaylanmış MoveKit videosu yok'))throw Error('Stale version UI warning');
const offline=fs.readFileSync('app/src/main/assets/offline-video-index.js','utf8');
const localFiles=fs.readdirSync('app/src/main/assets/offline-videos').filter(x=>x.endsWith('.mp4'));
if(localFiles.length<300)throw Error('Need 300+ embedded exercise videos. Got '+localFiles.length);
for(const id of ['0025','drv-cable-bar-lateral-pulldown-wide-shoulder-grip']){
 if(!localFiles.includes(id+'.mp4')||!offline.includes('offline-videos/'+id+'.mp4'))throw Error('Missing core offline video '+id);
}
if(player.includes('Bu hareket için video henüz eklenmedi'))throw Error('Legacy placeholder is still shown');
console.log('PASS: '+localFiles.length+' offline MP4 assets, main exercises mapped, v4.0 watch alpha');
