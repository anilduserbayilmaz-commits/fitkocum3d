import * as THREE from 'three';

// Interactive EXAMPLES of common technique mistakes, not a personalized medical
// or biomechanics assessment. Based on the same rigged anatomy as the correct clip.
// Original GLB animations remain intact; joint offsets are visual teaching aids.
const RULES={
  squat:{title:'Squat',joint:['lowerleg01.L','lowerleg01.R'],edits:[['upperleg01.L','z',-.30],['upperleg01.R','z',.30]],label:'Dizlerin içeri kapanması',phase:1},
  sumo_squat:{title:'Sumo Squat',joint:['lowerleg01.L','lowerleg01.R'],edits:[['upperleg01.L','z',-.24],['upperleg01.R','z',.24]],label:'Dizlerin ayak yönünden sapması',phase:1},
  deadlift:{title:'Deadlift',joint:['spine03','spine04'],edits:[['spine03','x',.26],['spine04','x',.20]],label:'Bel ve sırtın aşırı yuvarlanması',phase:1},
  romanian_deadlift:{title:'Romanian Deadlift',joint:['spine03','spine04'],edits:[['spine03','x',.28],['spine04','x',.19]],label:'Kalça menteşesinde sırtın yuvarlanması',phase:1},
  bent_over_row:{title:'Bent Over Row',joint:['spine03','spine04'],edits:[['spine03','x',-.25],['spine04','x',-.19]],label:'Gövdeyi savurarak ağırlık çekmek',phase:1},
  dumbbell_shoulder_press:{title:'Dumbbell Shoulder Press',joint:['spine02','spine03'],edits:[['spine02','x',-.26],['spine03','x',-.20]],label:'Belin aşırı çukurlaşması',phase:1},
  overhead_press:{title:'Overhead Press',joint:['spine02','spine03'],edits:[['spine02','x',-.26],['spine03','x',-.20]],label:'Aşırı geriye yaslanmak',phase:1},
  lateral_raise:{title:'Lateral Raise',joint:['shoulder01.L','shoulder01.R'],edits:[['shoulder01.L','x',-.23],['shoulder01.R','x',-.23]],label:'Omuzları kulaklara doğru çekmek',phase:1},
  bicep_curl:{title:'Biceps Curl',joint:['spine03','wrist.L'],edits:[['spine03','x',-.34],['spine04','x',-.14]],label:'Gövdeyi geriye savurmak',phase:1},
  push_up:{title:'Push-Up',joint:['spine02','spine03'],edits:[['spine02','x',-.24],['spine03','x',-.15]],label:'Gövde çizgisinin bozulması',phase:1},
  plank:{title:'Plank',joint:['spine02','spine03'],edits:[['spine02','x',-.26],['spine03','x',-.17]],label:'Belin aşağı sarkması',phase:1},
  lunge:{title:'Lunge',joint:['lowerleg01.L','lowerleg01.R'],edits:[['upperleg01.L','z',-.22],['upperleg01.R','z',.16]],label:'Ön dizin içeri kaçması',phase:1}
};
export const GUIDED_ANATOMY_IDS=Object.keys(RULES);

export class RigFormGuide {
  constructor(scene,model,id){
    if(!RULES[id])throw new Error('Anatomi rehberi tanımlı değil: '+id);
    this.scene=scene;
    this.model=model;
    this.id=id;
    this.rule=RULES[id];
    this.mode='correct';
    this.nodes=new Map();
    model.traverse(node=>{
      if(node.isBone && node.name){
        const key=node.name.toLowerCase().replace(/[^a-z0-9]/g,'');
        this.nodes.set(key,node);
      }
    });
    this.bones=this.rule.edits.map(([name,axis,amount])=>({
      bone:this.find(name),axis,amount
    })).filter(x=>x.bone);
    this.landmarks=this.rule.joint.map(name=>this.find(name)).filter(Boolean);
    this.group=new THREE.Group();
    scene.add(this.group);
    const ball=new THREE.SphereGeometry(1,16,12);
    const good=new THREE.MeshBasicMaterial({color:0xc0fb8a,transparent:true,opacity:.92,depthTest:false});
    const bad=new THREE.MeshBasicMaterial({color:0xff5269,transparent:true,opacity:.94,depthTest:false});
    this.geometry=ball;
    this.materials={correct:good,mistake:bad};
    this.markers=this.landmarks.map((_,i)=>{
      const o=new THREE.Mesh(ball,good);
      o.scale.setScalar(.075);
      o.renderOrder=5;
      this.group.add(o);return o;
    });
    this.sparks=Array.from({length:9},(_,i)=>{
      const o=new THREE.Mesh(ball,good);
      o.scale.setScalar(.025+i%3*.007);
      o.renderOrder=5;
      this.group.add(o);return o;
    });
    this.tmpA=new THREE.Vector3();this.tmpB=new THREE.Vector3();
    this.isAvailable=this.landmarks.length>=1&&this.bones.length>=1;
    if(!this.isAvailable)this.group.visible=false;
    this.render(0);
  }
  find(name){return this.nodes.get(name.toLowerCase().replace(/[^a-z0-9]/g,''))||null;}
  setMode(mode){this.mode=mode==='mistake'?'mistake':'correct';}
  apply(phase){
    if(!this.isAvailable)return;
    if(this.mode==='mistake'){
      const strength=.60+.40*Math.sin(Math.PI*Math.max(0,Math.min(1,phase)));
      // AnimationMixer resets the animated quaternion before every update.
      // These are deliberate small local-space pose offsets, not angle measurements.
      for(const x of this.bones)x.bone.rotation[x.axis]+=x.amount*strength;
    }
    this.render(phase);
  }
  render(phase){
    if(!this.isAvailable)return;
    this.model.updateMatrixWorld(true);
    const m=this.materials[this.mode];
    for(let i=0;i<this.markers.length;i++){
      const obj=this.markers[i],bone=this.landmarks[i];
      bone.getWorldPosition(this.tmpA);
      obj.position.copy(this.tmpA);
      obj.material=m;
    }
    const from=this.landmarks[0],to=this.landmarks[1]||this.landmarks[0];
    from.getWorldPosition(this.tmpA);to.getWorldPosition(this.tmpB);
    if(this.tmpA.distanceTo(this.tmpB)<.01)this.tmpB.copy(this.tmpA).add(new THREE.Vector3(.32,0,0));
    for(let i=0;i<this.sparks.length;i++){
      const t=(i+1)/(this.sparks.length+1);
      this.sparks[i].position.copy(this.tmpA).lerp(this.tmpB,t);
      // Lift the line a little off the body so it stays visible as the model rotates.
      this.sparks[i].position.z+=.085;
      this.sparks[i].material=m;
    }
  }
  dispose(){
    this.scene.remove(this.group);
    this.geometry.dispose();
    this.materials.correct.dispose();this.materials.mistake.dispose();
  }
}
