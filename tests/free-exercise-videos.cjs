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
console.log('PASS: 317 records, 317 MP4 URLs, 6 core exercise matches');
