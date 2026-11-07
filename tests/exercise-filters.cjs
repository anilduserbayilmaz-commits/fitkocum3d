'use strict';
// Real-data regression test: muscle/equipment filters for 317 embedded demos.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{}};
for(const name of ['exercise-search-v321.js','exercise-filters-v322.js','free-exercise-data.js']){
 vm.runInNewContext(fs.readFileSync('app/src/main/assets/'+name,'utf8'),context,{filename:name,timeout:20000});
}
const {FitExerciseFilters:filters,FitFreeExerciseData:items}=context.window;
assert.equal(items.length,317);
for(const t of [
 {muscle:'Göğüs',equipment:'barbell',query:'bench press',id:'free_0025'},
 {muscle:'Göğüs',equipment:'dumbbell',query:'incline',id:'free_0314'},
 {muscle:'Sırt',equipment:'cable',query:'pulldown',id:'free_0198'},
 {muscle:'Bacak',equipment:'machine',query:'leg press',id:'free_2611'},
 {muscle:'Karın',equipment:'bodyweight',query:'plank',id:'free_0464'},
 {muscle:'Kol',equipment:'band',query:'triceps',id:'free_new-band-triceps-pushdown'},
 {muscle:'Bacak',equipment:'barbell',query:'squat',id:'free_1435'}
]){
 const a=filters.filter(items,t.query,{muscle:t.muscle,equipment:t.equipment});
 if(!a.some(x=>x.id===t.id))throw Error('No result for '+JSON.stringify(t));
 for(const x of a){
   assert.equal(filters.matches(x,{muscle:t.muscle,equipment:t.equipment}),true);
 }
 console.log(t.muscle+' | '+t.equipment+' | '+t.query+' => '+a.length);
}
assert.equal(filters.filter(items,'',{muscle:'Göğüs'}).length,28);
assert.equal(filters.filter(items,'',{equipment:'dumbbell'}).length,66);
assert.equal(filters.filter(items,'',{equipment:'cable'}).length,28);
assert.equal(filters.filter(items,'',{equipment:'machine'}).length,43);
assert.equal(filters.filter(items,'',{equipment:'bodyweight'}).length,111);
assert.equal(filters.filter(items,'',{muscle:'all',equipment:'all'}).length,317);
assert.equal(filters.filter(items,'',{muscle:'Göğüs',equipment:'cable'}).some(x=>x.name==='Barbell Bench Press'),false);
// Tuples used by the weekly replacement picker must be supported as well.
const tuples=items.map(x=>[x.id,x]);
const selected=filters.filter(tuples,'göğüs',{muscle:'Göğüs',equipment:'dumbbell'},([id,m])=>({...m,id}));
assert.ok(selected.some(([id])=>id==='free_0314'));
assert.equal(filters.equipmentOf({equipment:'smith machine'}),'machine');
assert.equal(filters.equipmentOf({equipment:'ez barbell'}),'barbell');
assert.equal(filters.muscleOf({group:'Ön Kol'}),'Ön Kol');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const weekly=fs.readFileSync('app/src/main/assets/weekly-v31.js','utf8');
assert.ok(html.includes('<script src="exercise-filters-v322.js"></script>'));
assert.ok(html.includes('FitExerciseFilters.filter(categoryEntries'));
assert.ok(weekly.includes('FitExerciseFilters.filter(available,query'));
assert.ok(html.includes('id="libraryMuscleFilter"'));
assert.ok(html.includes('id="libraryEquipmentFilter"'));
assert.ok(weekly.includes('v31PickerMuscle'));
assert.ok(weekly.includes('v31PickerEquipment'));
console.log('PASS: filters and UI wired; no fabricated difficulty data');
