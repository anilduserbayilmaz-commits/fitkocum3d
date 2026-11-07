/* FitKoçum v3.2.1 — offline Turkish/English exercise search.
 * Shared by the main library, weekly exercise picker, and custom editor.
 * No network calls or dependencies. Search is case/diacritic insensitive.
 */
(function(root){
'use strict';
function normalize(value){
 return String(value == null ? '' : value)
  .replace(/ı/g,'i').replace(/İ/g,'I')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/ı/g,'i')
  .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
const aliases=[
 ['gogus',['chest','pectoral','pecs','pec','bench press']],
 ['ust gogus',['upper chest']],
 ['alt gogus',['lower chest']],
 ['sirt',['back','lat','lats','rowing','row','pulldown','pull up']],
 ['kanat',['lat','lats','pulldown','pull up']],
 ['omuz',['shoulder','deltoid','delts','delt']],
 ['bacak',['leg','legs','quad','quads','hamstring','calf','thigh','squat']],
 ['on bacak',['quadriceps','quads','leg extension']],
 ['arka bacak',['hamstring','leg curl']],
 ['kalca',['glute','glutes','hip','hips','bridge']],
 ['karin',['abdominal','abs','waist','core','crunch','plank']],
 ['arka kol',['triceps','tricep','pushdown']],
 ['on kol',['biceps','bicep','curl']],
 ['biseps',['biceps','bicep','curl']],
 ['triseps',['triceps','tricep','pushdown']],
 ['barfiks',['pull up','pullup','chin up']],
 ['sinav',['push up','pushup']],
 ['halter',['barbell']],
 ['dambil',['dumbbell','dumbell']],
 ['kablo',['cable']],
 ['makine',['machine','lever','sled','smith']],
 ['cekis',['pulldown','pull down','row','pull up']],
 ['bisiklet',['bike','bicycle','cycling']],
 ['kosu',['treadmill','running']],
 ['yuruyus',['walking','treadmill']]
];
const exerciseAliases={
 bench:'yatay gogus press bench press halter',
 pulldown:'lat pulldown sirt cekis kanat',
 incline:'ust gogus incline dambil press',
 row:'oturarak sirt cekis cable row',
 legpress:'bacak pres leg press makine',
 triceps:'arka kol triseps pushdown',
 'lib_squat':'squat comelme bacak',
 'lib_bicep_curl':'pazu biceps on kol curl'
};
function contains(text,term){
 return (' '+text+' ').includes(' '+term+' ')||text.includes(term+' ');
}
function searchable(m){
 const name=normalize(m.name),base=normalize([
  m.name,m.group,m.id,m.bodyPart,m.equipment,m.target,m.category,
  ...(Array.isArray(m.aliases)?m.aliases:[])
 ].filter(Boolean).join(' '));
 const tags=aliases.filter(([,matches])=>matches.some(word=>contains(base,normalize(word))))
    .map(([key])=>key);
 if(contains(base,'incline') && (contains(base,'gogus')||contains(base,'chest')||
    contains(base,'pectoral')||contains(base,'press')||contains(base,'fly')||
    contains(base,'push up'))) tags.push('ust gogus');
 if(contains(base,'decline') && (contains(base,'gogus')||contains(base,'chest')||
    contains(base,'pectoral')||contains(base,'press')||contains(base,'fly')||
    contains(base,'push up'))) tags.push('alt gogus');
 return {name,text:normalize(base+' '+tags.join(' ')+' '+(exerciseAliases[m.id]||''))};
}
function score(m,query){
 const q=normalize(query);
 if(!q)return 0;
 const s=searchable(m);
 const parts=q.split(' ');
 if(!parts.every(part=>s.text.split(' ').some(word=>word.startsWith(part))))return -1;
 if(s.name===q)return 1000;
 if(s.name.startsWith(q))return 800;
 if(contains(s.name,q))return 600;
 if(contains(s.text,q))return 350;
 return 200+Math.min(parts.length,5)*10;
}
function filter(items,query,getMeta){
 const get=typeof getMeta==='function'?getMeta:x=>x;
 if(!normalize(query))return items.slice();
 return items.map((item,i)=>({item,i,value:score(get(item),query)}))
   .filter(row=>row.value>=0)
   .sort((a,b)=>b.value-a.value||a.i-b.i)
   .map(row=>row.item);
}
root.FitExerciseSearch={normalize,score,filter};
})(window);
