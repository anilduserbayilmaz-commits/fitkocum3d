/* FitKoçum 3D+ v3.2.2 — shared muscle + equipment filtering.
 * Exercise metadata comes from the actual embedded library. No invented
 * difficulty labels. Helpers are side-effect free and work offline.
 */
(function(root){
'use strict';
const muscles=[
 {value:'all',label:'Tüm kas grupları'},
 {value:'Göğüs',label:'Göğüs'},
 {value:'Sırt',label:'Sırt'},
 {value:'Omuz',label:'Omuz'},
 {value:'Kol',label:'Kol'},
 {value:'Ön Kol',label:'Ön kol'},
 {value:'Bacak',label:'Bacak'},
 {value:'Baldır',label:'Baldır'},
 {value:'Kalça',label:'Kalça'},
 {value:'Karın',label:'Karın'},
 {value:'Kardiyo',label:'Kardiyo'}
];
const equipment=[
 {value:'all',label:'Tüm ekipmanlar'},
 {value:'dumbbell',label:'Dambıl'},
 {value:'barbell',label:'Bar / Halter'},
 {value:'cable',label:'Kablo'},
 {value:'machine',label:'Makine'},
 {value:'bodyweight',label:'Vücut ağırlığı'},
 {value:'band',label:'Direnç bandı'},
 {value:'other',label:'Diğer ekipman'}
];
const norm=value=>(root.FitExerciseSearch?.normalize||((s)=>String(s||'').toLowerCase()))(value||'');
function muscleOf(m){
 if(!m)return null;
 const group=norm(m.group||m.bodyPart);
 const token=group.split(' ');
 const matches=muscles.slice(1).filter(x=>norm(x.value)===group||token.includes(norm(x.value)));
 if(matches.length) return matches.sort((a,b)=>b.value.length-a.value.length)[0].value;
 if(m.category==='cardio'||m.kind==='cardio')return 'Kardiyo';
 if(group.includes('triceps')||group.includes('biceps'))return 'Kol';
 return null;
}
function equipmentOf(m){
 if(!m)return null;
 const raw=norm(m.equipment);
 if(!raw)return null;
 if(raw.includes('dumbbell'))return 'dumbbell';
 if(raw.includes('ez barbell')||raw.includes('barbell'))return 'barbell';
 if(raw.includes('cable'))return 'cable';
 if(raw.includes('smith')||raw.includes('machine')||raw.includes('lever')||raw.includes('sled'))return 'machine';
 if(raw.includes('body weight')||raw.includes('bodyweight'))return 'bodyweight';
 if(raw.includes('band'))return 'band';
 return 'other';
}
function matches(m,selection={}){
 const muscle=selection.muscle||'all',itemMuscle=muscleOf(m);
 const equip=selection.equipment||'all',itemEquip=equipmentOf(m);
 return (muscle==='all'||muscle===itemMuscle||muscle==='Kol'&&itemMuscle==='Ön Kol')
    &&(equip==='all'||equip===itemEquip);
}
function filter(items,search='',selection={},getter){
 const read=typeof getter==='function'?getter:x=>x;
 return root.FitExerciseSearch.filter(items.filter(x=>matches(read(x),selection)),search,read);
}
function labelEquipment(m){
 const key=equipmentOf(m);
 return equipment.find(x=>x.value===key)?.label||(m?.kind==='cardio'?'Kardiyo':'Ekipman bilgisi yok');
}
function labelMuscle(m){return muscleOf(m)||m?.group||'Diğer'}
root.FitExerciseFilters={
 muscles,equipment,muscleOf,equipmentOf,matches,filter,labelEquipment,labelMuscle
};
})(window);
