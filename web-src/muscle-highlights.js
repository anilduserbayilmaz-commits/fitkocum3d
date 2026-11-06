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
const SIDES=['L','R'];

// Simple, continuously re-positioned muscle-region ellipsoids.
const REGION_DESCRIPTORS={
 quads:['upperleg01','lowerleg01',.145,.80, .015],
 hamstrings:['upperleg01','lowerleg01',.105,.77,-.085],
 adductors:['upperleg01','lowerleg01',.085,.63, -.018],
 calves:['lowerleg01','foot',.105,.75,-.02],
 biceps:['upperarm01','lowerarm01',.085,.75, .055],
 triceps:['upperarm01','lowerarm01',.082,.74,-.065],
 forearms:['lowerarm01','wrist',.07,.74,.015],
 delts:['shoulder01','upperarm01',.14,.65,.055]
};
const CENTERS={
 glutes:['upperleg01','spine01',.22,.18,-.06],
 chest:['shoulder01','spine04',.17,.60,.11],
 lats:['shoulder01','spine02',.15,.55,-.11],
 upper_back:['shoulder01','spine04',.17,.55,-.085],
 core:['spine02','spine04',.22,.73,.12],
 erectors:['spine02','spine04',.17,.73,-.12]
};
export function getMuscleProfile(id){return EXERCISE_MUSCLES[id]||null}

export class AnimatedMuscleHighlights{
 constructor(scene,model,id){
   this.scene=scene;this.model=model;this.id=id;
   this.profile=getMuscleProfile(id);
   this.group=new THREE.Group();this.group.name='AnimatedMuscleRegions';
   scene.add(this.group);
   this.mode='primary';
   this.nodes=new Map();
   model.traverse(n=>{if(n.isBone&&n.name)this.nodes.set(normalize(n.name),n)});
   this.geometry=new THREE.SphereGeometry(1,20,16);
   this.materials={
     primary:new THREE.MeshPhysicalMaterial({
       color:0xff965d,emissive:0xe14c23,emissiveIntensity:.32,
       roughness:.46,metalness:0,clearcoat:.35,transparent:true,opacity:.78,
       depthTest:false,depthWrite:false,side:THREE.DoubleSide
     }),
     secondary:new THREE.MeshPhysicalMaterial({
       color:0x7be2df,emissive:0x1c727d,emissiveIntensity:.30,
       roughness:.50,metalness:0,clearcoat:.25,transparent:true,opacity:.65,
       depthTest:false,depthWrite:false,side:THREE.DoubleSide
     })
   };
   this.muscles=[];
   this._a=new THREE.Vector3();this._b=new THREE.Vector3();
   this._axis=new THREE.Vector3();this._temp=new THREE.Vector3();
   this._y=new THREE.Vector3(0,1,0);
   if(this.profile){
     for(const role of ['primary','secondary']){
       for(const region of this.profile[role]){
         const pair=(CENTERS[region]||REGION_DESCRIPTORS[region]);
         if(!pair)continue;
         const bilateral=region!=='core'&&region!=='erectors';
         for(const side of bilateral?SIDES:[null]){
           const start=this.bone(pair[0],side);
           const end=this.bone(pair[1],side);
           if(!start||!end)continue;
           const mesh=new THREE.Mesh(this.geometry,this.materials[role]);
           mesh.name='Muscle_'+region+'_'+(side||'center');
           mesh.userData={region,role};
           mesh.renderOrder=7;
           mesh.frustumCulled=false;
           this.group.add(mesh);
           this.muscles.push({mesh,role,region,start,end,side,params:pair});
         }
       }
     }
   }
   this.available=this.muscles.length>0;
   this.setMode('primary');
 }
 bone(prefix,side){
   const key=normalize(prefix+(side?'.'+side:''));
   if(this.nodes.has(key))return this.nodes.get(key);
   const a=[key,normalize(prefix),normalize(prefix+'01')];
   for(const s of a)if(this.nodes.has(s))return this.nodes.get(s);
   const p=normalize(prefix);
   for(const [k,v] of this.nodes){
     if(k.startsWith(p)&&(side===null||side===undefined||k.endsWith(side.toLowerCase())))return v;
   }
   return null;
 }
 setMode(mode){
   this.mode=['off','primary','all'].includes(mode)?mode:'primary';
   this.group.visible=this.mode!=='off'&&this.available;
   for(const entry of this.muscles){
     entry.mesh.visible=this.mode==='all'||this.mode==='primary'&&entry.role==='primary';
   }
 }
 update(){
   if(!this.group.visible)return;
   this.model.updateMatrixWorld(true);
   for(const entry of this.muscles){
     if(!entry.mesh.visible)continue;
     const {mesh,start,end,params,region,side}=entry;
     start.getWorldPosition(this._a);
     end.getWorldPosition(this._b);
     this._axis.subVectors(this._b,this._a);
     let length=this._axis.length();
     if(!Number.isFinite(length)||length<.008){mesh.visible=false;continue}
     const from=this._a,to=this._b;
     mesh.position.copy(from).lerp(to,.46);
     mesh.quaternion.setFromUnitVectors(this._y,this._axis.multiplyScalar(1/length));
     // The region sits near the animated limb/torso. Offsets are illustrative,
     // not a biomechanical coordinate system.
     const radius=params[2];
     const stretch=params[3];
     const bias=params[4]||0;
     const edge=side==='L'?-1:side==='R'?1:0;
     mesh.position.x+=region==='adductors'?-edge*.035:0;
     mesh.position.z+=bias;
     mesh.scale.set(radius,length*stretch*.5,radius*.91);
   }
 }
 dispose(){
   this.scene.remove(this.group);
   this.geometry.dispose();
   for(const m of Object.values(this.materials))m.dispose();
   this.muscles=[];
 }
}
