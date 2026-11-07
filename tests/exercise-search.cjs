'use strict';
// Regression tests for the user-visible exercise search in FitKoçum v3.2.1.
// Searches use the real 317-exercise data, not fabricated UI fixtures.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{}};
for(const file of ['exercise-search-v321.js','free-exercise-data.js']){
 const source=fs.readFileSync('app/src/main/assets/'+file,'utf8');
 vm.runInNewContext(source,context,{filename:file,timeout:20000});
}
const {FitExerciseSearch:search,FitFreeExerciseData:items}=context.window;
assert.equal(items.length,317,'Database must contain 317 videos');
assert.equal(search.normalize('İncline'),search.normalize('incline'),'Turkish capitalization should work');
assert.equal(search.normalize('SıRT'),search.normalize('sirt'),'Dotless I should work');
const cases=[
 ['bench press','free_0025'],
 ['BENCH PRESS','free_0025'],
 ['göğüs','free_0025'],
 ['GOGUS','free_0025'],
 ['incline','free_0314'],
 ['İncline','free_0314'],
 ['üst göğüs','free_0314'],
 ['sırt','free_0208'],
 ['sirt','free_0208'],
 ['arka kol','free_1723'],
 ['triseps','free_1723'],
 ['barfiks','free_1429'],
 ['bacak','free_1435'],
 ['dambıl','free_0314'],
 ['omuz','free_0334']
];
for(const [query,expectedId] of cases){
 const result=search.filter(items,query);
 if(!result.some(x=>x.id===expectedId))throw Error('Search '+JSON.stringify(query)+' failed to find '+expectedId);
 console.log(query+': '+result.length+' result(s)');
}
assert.equal(search.filter(items,'randomxyz777').length,0,'Nonsense should return no results');
assert.ok(!search.filter(items,'göğüs').some(x=>x.name==='Band Resisted Decline Sit-Up'),
 'Abdominal sit-up should not appear in chest results');
const pickerEntries=items.map(x=>[x.id,x]);
const pickerResult=search.filter(pickerEntries,'Göğüs',([id,m])=>({...m,id}));
assert.ok(pickerResult.some(([id])=>id==='free_0025'),'Swap dialog should find bench');
assert.equal(search.filter(items,'').length,317,'Empty query must show full catalog');
console.log('PASS: multilingual main library, custom editor and exercise picker search');
