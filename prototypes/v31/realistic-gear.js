import * as THREE from 'three';
export class PrototypeGymGear {
  constructor(scene,characterBones,exercise) {
    this.group=new THREE.Group();
    this.group.name='RealisticPrototypeEquipment';
    scene.add(this.group);
    this.kind=exercise==='bicep_curl'?'dumbbell':exercise==='deadlift'?'barbell':'none';
    this.bones=characterBones;
    this.plastic=new THREE.MeshStandardMaterial({color:0x191e23,metalness:.18,roughness:.73});
    this.shaft=new THREE.MeshStandardMaterial({color:0x9dabb3,metalness:.85,roughness:.25});
    this.accent=new THREE.MeshStandardMaterial({color:0x627c80,metalness:.37,roughness:.5});
    this.geometries=[];
    this.meshes=[];
    this.tmp=new THREE.Vector3();
    const cyl=(parent,radius,height,material,segments=24,rotateX=true)=>{
      const g=new THREE.CylinderGeometry(radius,radius,height,segments);
      this.geometries.push(g);
      const m=new THREE.Mesh(g,material);
      if(rotateX)m.rotation.z=Math.PI/2;
      m.castShadow=true;m.receiveShadow=true;
      parent.add(m);this.meshes.push(m);return m;
    };
    if(this.kind==='dumbbell'){
      this.dumbbells=[];
      for(let i=0;i<2;i++){
        const bar=new THREE.Group();bar.name='Dumbbell'+i;this.group.add(bar);
        cyl(bar,.025,.37,this.shaft,20);
        for(const end of [-1,1]){
          const side=cyl(bar,.112,.082,this.plastic,6);side.position.x=end*.138;
          const rim=cyl(bar,.07,.01,this.accent,18);rim.position.x=end*.183;
        }
        this.dumbbells.push(bar);
      }
    }
    if(this.kind==='barbell'){
      const bar=new THREE.Group();bar.name='OlympicBarbell';
      cyl(bar,.025,1.65,this.shaft,24);
      for(const sign of [-1,1]){
        const plate=cyl(bar,.24,.07,this.plastic,40);plate.position.x=sign*.63;
        const small=cyl(bar,.17,.06,this.accent,32);small.position.x=sign*.71;
        const lock=cyl(bar,.06,.035,this.shaft,24);lock.position.x=sign*.78;
      }
      this.group.add(bar);
      this.bar=bar;
    }
  }
  hand(side){
    const b=this.bones.get('hand_'+side);
    const p=new THREE.Vector3();
    b?.getWorldPosition(p);
    return p;
  }
  update(){
    const left=this.hand('l'),right=this.hand('r');
    if(this.kind==='dumbbell'){
      this.dumbbells[0].position.copy(left);
      this.dumbbells[1].position.copy(right);
      this.dumbbells[0].position.z+=.032;
      this.dumbbells[1].position.z+=.032;
    }
    if(this.kind==='barbell'){
      this.bar.position.copy(left).add(right).multiplyScalar(.5);
      this.bar.position.z+=.036;
    }
  }
  dispose(){
    this.group.parent?.remove(this.group);
    for(const m of this.geometries)m.dispose();
    for(const mat of [this.plastic,this.shaft,this.accent])mat.dispose();
  }
}
