import * as THREE from 'three';

// Educational muscle-region overlay positioned from the *animated skeleton*.
// Muscle shapes are approximate, not medical anatomy or a scan of the user.
// Orange = primary movers; teal = supporting/stabilizing muscle regions.
export const EXERCISE_MUSCLES = Object.freeze({
 squat:{primary:['quads','glutes'],secondary:['hamstrings','core']},
 sumo_squat:{primary:['quads','glutes'],secondary:['adductors','core']},
 deadlift:{primary:['glutes','hamstrings','erectors'],secondary:['quads','lats','core']},
 romanian_deadlift:{primary:['hamstrings','glutes'],secondary:['erectors','core']},
 bent_over_row:{primary:['lats','upper_back'],secondary:['biceps','erectors']},
 dumbbell_shoulder_press:{primary:['delts','triceps'],secondary:['upper_back','core']},
 overhead_press:{primary:['delts','triceps'],secondary:['upper_back','core']},
 lateral_raise:{primary:['delts'],secondary:['upper_back']},
 front_raise:{primary:['delts'],secondary:['chest']},
 bicep_curl:{primary:['biceps'],secondary:['forearms']},
 hammer_curl:{primary:['biceps','forearms'],secondary:[]},
 overhead_tricep_extension:{primary:['triceps'],secondary:['delts']},
 push_up:{primary:['chest','triceps'],secondary:['delts','core']},
 plank:{primary:['core'],secondary:['glutes','delts']},
 lunge:{primary:['quads','glutes'],secondary:['hamstrings','core']},
 reverse_lunge:{primary:['quads','glutes'],secondary:['hamstrings','core']},
 glute_bridge:{primary:['glutes'],secondary:['hamstrings','core']},
 calf_raise:{primary:['calves'],secondary:[]},
 crunch:{primary:['core'],secondary:[]},
 superman:{primary:['erectors','glutes'],secondary:['upper_back']},
 wall_sit:{primary:['quads'],secondary:['glutes','core']},
 good_morning:{primary:['hamstrings','glutes'],secondary:['erectors']},
 jumping_jack:{primary:['calves','delts'],secondary:['quads','core']},
 high_knees:{primary:['quads','core'],secondary:['calves']},
 bench:{primary:['chest','triceps'],secondary:['delts']},
 pulldown:{primary:['lats','upper_back'],secondary:['biceps']},
 legpress:{primary:['quads','glutes'],secondary:['hamstrings']},
 row:{primary:['lats','upper_back'],secondary:['biceps']},
 triceps:{primary:['triceps'],secondary:['delts']}
});
export const MUSCLE_NAMES=Object.freeze({
 quads:'Ön bacak (quadriceps)',
 glutes:'Kalça',
 hamstrings:'Arka bacak (hamstring)',
 erectors:'Omurga çevresi',
 lats:'Kanat (latissimus)',
 upper_back:'Üst sırt',
 delts:'Omuz',
 triceps:'Arka kol (triceps)',
 biceps:'Ön kol (biceps)',
 forearms:'Önkol',
 chest:'Göğüs',
 core:'Karın / merkez bölgesi',
 adductors:'İç bacak',
 calves:'Baldır'
});
const normalize=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
// Approximate bone-driven muscle regions. Colors conform to the actual
// skin vertex positions rather than placing disconnected 3D shapes above them.
const REGION_BONES=Object.freeze({
 quads:['upperleg','thigh'],
 hamstrings:['upperleg','thigh'],
 adductors:['upperleg','thigh'],
 glutes:['upperleg','pelvis','hip','spine01'],
 calves:['lowerleg','calf'],
 biceps:['upperarm','arm'],
 triceps:['upperarm','arm'],
 forearms:['lowerarm','forearm'],
 delts:['shoulder','clavicle'],
 chest:['spine04','spine03','chest'],
 lats:['spine03','spine04','shoulder'],
 upper_back:['spine04','shoulder','clavicle'],
 core:['spine02','spine03','abdomen'],
 erectors:['spine02','spine03'],
});
const COLOR_PRIMARY=[1,.36,.17];
const COLOR_SECONDARY=[.25,.77,.77];

export function getMuscleProfile(id){return EXERCISE_MUSCLES[id]||null}

/**
 * Recolors the original skinned GLB surface using its skin weights.
 * The vertex buffer is updated ONLY when the user changes mode/exercise;
 * skinning then keeps colored muscle regions attached to the animation.
 */
export class AnimatedMuscleHighlights{
 constructor(scene,model,id){
   this.scene=scene;this.model=model;this.id=id;
   this.profile=getMuscleProfile(id);
   this.group=new THREE.Group();
   this.group.name='NativeSkinMuscleHighlighter';
   this.scene.add(this.group);
   this.mode='primary';
   this.muscles=[];
   this.targets=[];
   if(this.profile){
     for(const role of ['primary','secondary'])
       for(const region of this.profile[role])
         this.muscles.push({region,role});
   }
   model.traverse(mesh=>{
     if(!mesh.isSkinnedMesh||!mesh.skeleton||!this.profile)return;
     const geo=mesh.geometry;
     const originalAttr=geo.getAttribute('color');
     const skinIndex=geo.getAttribute('skinIndex');
     const skinWeight=geo.getAttribute('skinWeight');
     if(!originalAttr||originalAttr.itemSize<3||!skinIndex||!skinWeight)return;
     const count=originalAttr.count,size=originalAttr.itemSize;
     const original=new Float32Array(count*size);
     for(let i=0;i<count;i++){
       original[i*size]=originalAttr.getX(i);
       original[i*size+1]=originalAttr.getY(i);
       original[i*size+2]=originalAttr.getZ(i);
       if(size>3)original[i*size+3]=originalAttr.getW(i);
     }
     const primaryNames=new Set(this.profile.primary.flatMap(x=>REGION_BONES[x]||[]));
     const secondaryNames=new Set(this.profile.secondary.flatMap(x=>REGION_BONES[x]||[]));
     const skeleton=mesh.skeleton.bones;
     const matches=(set,name)=>[...set].some(t=>name.includes(t));
     const primaryBones=skeleton.map(b=>matches(primaryNames,normalize(b.name)));
     const secondaryBones=skeleton.map(b=>matches(secondaryNames,normalize(b.name)));
     const primary=new Float32Array(count),secondary=new Float32Array(count);
     for(let i=0;i<count;i++){
       const indices=[skinIndex.getX(i),skinIndex.getY(i),skinIndex.getZ(i),skinIndex.getW(i)];
       const weights=[skinWeight.getX(i),skinWeight.getY(i),skinWeight.getZ(i),skinWeight.getW(i)];
       let p=0,h=0;
       for(let j=0;j<4;j++){
         const k=indices[j]|0,w=weights[j];
         if(w<=.03)continue;
         if(primaryBones[k])p+=w;
         else if(secondaryBones[k])h+=w;
       }
       primary[i]=Math.min(1,p);
       secondary[i]=Math.min(1,h);
     }
     const out=original.slice();
     const attribute=new THREE.BufferAttribute(out,size);
     geo.setAttribute('color',attribute);
     this.targets.push({geo,originalAttr,original,out,attribute,count,size,primary,secondary});
   });
   this.available=this.targets.length>0&&this.muscles.length>0;
   this.setMode('primary');
 }
 setMode(value){
   this.mode=['off','primary','all'].includes(value)?value:'primary';
   this.group.visible=this.mode!=='off'&&this.available;
   for(const t of this.targets){
     const {out,original,count,size,primary,secondary,attribute}=t;
     for(let i=0;i<count;i++){
       const base=i*size;
       const p=this.mode==='off'?0:Math.min(.76,primary[i]*.7);
       const h=this.mode==='all'?Math.min(.63,secondary[i]*.62):0;
       const color=h>.035&&h>p
         ?COLOR_SECONDARY:COLOR_PRIMARY;
       const alpha=h>p?h:p;
       for(let c=0;c<3;c++){
         const src=original[base+c];
         out[base+c]=Math.max(0,Math.min(1,src*(1-alpha)+color[c]*alpha));
       }
       if(size>3)out[base+3]=original[base+3];
     }
     attribute.needsUpdate=true;
   }
 }
 update(){
   // Native skeletal animation performs the deformation, including during
   // scrubbing and while the correct/common-error mode changes the joint pose.
 }
 countAffected(role='primary'){
   const prop=role==='secondary'?'secondary':'primary';
   return this.targets.reduce((n,t)=>n+t[prop].filter(v=>v>.28).length,0);
 }
 dispose(){
   for(const t of this.targets){
     t.geo.setAttribute('color',t.originalAttr);
     t.attribute.dispose?.();
   }
   this.targets.length=0;
   this.scene.remove(this.group);
 }
}
