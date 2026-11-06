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
    // Simple athletic sneakers for each animated foot instead of the bare
    // model feet. Both upper and sole remain on the foot's world position.
    this.sneakers=[];
    for(const side of ['l','r']){
      const shoe=new THREE.Group();
      shoe.name='TrainerSneaker_'+side;
      const upperGeo=new THREE.SphereGeometry(1,20,12);
      const soleGeo=new THREE.BoxGeometry(.31,.045,.44);
      this.geometries.push(upperGeo,soleGeo);
      const top=new THREE.Mesh(upperGeo,this.plastic);
      top.scale.set(.155,.090,.245);
      top.position.z=.09;
      const sole=new THREE.Mesh(soleGeo,this.accent);
      sole.position.set(0,-.069,.09);
      shoe.add(top,sole);
      this.group.add(shoe);
      this.sneakers.push({side,shoe});
    }
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
    for(const {side,shoe} of this.sneakers){
      const b=this.bones.get('foot_'+side);
      if(b){const p=new THREE.Vector3();b.getWorldPosition(p);shoe.position.copy(p);shoe.position.y-=.025;}
    }
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
