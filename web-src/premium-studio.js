import * as THREE from 'three';

// Entirely procedural, self-contained gym stage. No external network assets.
// Props stay outside the subject's orbit so 360-degree study remains possible.
export class PremiumStudio {
  constructor(scene) {
    this.scene=scene;
    this.group=new THREE.Group();
    this.group.name='FitKocumPremiumGymStage';
    scene.add(this.group);
    this.materials=[];
    this.geometries=[];
    this.textures=[];
    this.visible=true;
    this._create();
  }
  material(params) {
    const m=new THREE.MeshStandardMaterial(params);
    this.materials.push(m);
    return m;
  }
  mesh(geometry,material,pos,scale=null,rot=null) {
    this.geometries.push(geometry);
    const mesh=new THREE.Mesh(geometry,material);
    if(pos)mesh.position.set(...pos);
    if(scale)mesh.scale.set(...scale);
    if(rot)mesh.rotation.set(...rot);
    mesh.receiveShadow=true;
    this.group.add(mesh);
    return mesh;
  }
  box(width,height,depth,pos,material) {
    return this.mesh(new THREE.BoxGeometry(width,height,depth),material,pos);
  }
  _create() {
    const floorColor=this.material({color:0x222c32,roughness:.96,metalness:.02});
    const wall=this.material({color:0x18232d,roughness:.78,metalness:.10});
    const wallDark=this.material({color:0x101a23,roughness:.79,metalness:.12});
    const trim=this.material({color:0x455760,roughness:.36,metalness:.56});
    const steel=this.material({color:0x657781,roughness:.28,metalness:.75});
    const plate=this.material({color:0x1c2228,roughness:.79,metalness:.13});
    const green=this.material({color:0x83dc8a,roughness:.40,metalness:.08,emissive:0x204d22,emissiveIntensity:.65});
    const white=this.material({color:0xc1e2dd,roughness:.45,metalness:.12,emissive:0x597a72,emissiveIntensity:.42});
    this.floor=this.mesh(new THREE.PlaneGeometry(15,15),floorColor,[0,-.034,0],null,[-Math.PI/2,0,0]);
    this.floor.receiveShadow=true;
    // Rubber gym flooring with discreet seams: a repeating offline texture.
    const cv=document.createElement('canvas');
    cv.width=256;cv.height=256;
    const ctx=cv.getContext('2d');
    if(ctx){
      ctx.fillStyle='#222b31';ctx.fillRect(0,0,256,256);
      ctx.strokeStyle='#344149';ctx.lineWidth=2;ctx.strokeRect(0,0,256,256);
      for(let x=8;x<256;x+=25)for(let y=8;y<256;y+=29){
        ctx.fillStyle=((x+y)%3===0)?'#303940':'#283137';
        ctx.fillRect(x,y,2,2);
      }
      const tx=new THREE.CanvasTexture(cv);
      tx.wrapS=THREE.RepeatWrapping;tx.wrapT=THREE.RepeatWrapping;
      tx.repeat.set(8,8);
      tx.colorSpace=THREE.SRGBColorSpace;
      this.textures.push(tx);
      floorColor.map=tx;floorColor.needsUpdate=true;
    }
    // Back wall is distant enough to keep the animated body fully readable.
    this.box(14,4.8,.14,[0,2.38,-5.45],wall);
    this.box(14,.23,.25,[0,.13,-5.32],wallDark);
    for(let x=-6;x<=6;x+=2){
      this.box(.07,4.15,.17,[x,2.3,-5.32],trim);
      this.box(1.76,3.9,.04,[x+.89,2.3,-5.26],wallDark);
    }
    // Diffuse light bars and ceiling shadow boxes.
    for(let x of [-3.5,3.5]){
      this.box(.085,2.6,.08,[x,2.55,-5.12],green);
      this.box(.36,.06,.11,[x,3.86,-5.06],steel);
    }
    this.box(3.5,.08,.10,[0,3.7,-5.12],white);
    // Plate storage intentionally pushed to the far left of frame.
    for(let x of [-5.3,5.3]){
      const horizontal=x<0?-1:1;
      this.box(.065,2.25,.065,[x,1.12,-4.27],steel);
      this.box(.85,.09,.55,[x,.085,-4.27],steel);
      for(let h of [.57,.96,1.35]){
        const peg=this.mesh(new THREE.CylinderGeometry(.034,.034,.58,12),steel,
          [x+horizontal*.21,h,-4.26],null,[0,0,Math.PI/2]);
        peg.castShadow=true;
        for(let i=0;i<3;i++){
          const p=this.mesh(new THREE.CylinderGeometry(.2-i*.018,.2-i*.018,.075,30),plate,
            [x+horizontal*(.35+i*.082),h,-4.26],null,[0,0,Math.PI/2]);
          p.castShadow=true;
        }
      }
    }
    this._brand();
    // Faint, centered rubber mat, below the feet. No visual intersection.
    const mat=this.material({color:0x1a282e,roughness:.96,metalness:0});
    this.mesh(new THREE.CylinderGeometry(1.68,1.68,.012,64),mat,[0,-.008,0]);
    const halo=this.material({color:0x6bb67d,roughness:.48,metalness:.25,emissive:0x315f38,emissiveIntensity:.55});
    const ring=this.mesh(new THREE.TorusGeometry(1.64,.012,7,88),halo,[0,.005,0],null,[-Math.PI/2,0,0]);
    ring.receiveShadow=false;
  }
  _brand() {
    const cv=document.createElement('canvas');
    cv.width=1024;cv.height=256;
    const ctx=cv.getContext('2d');
    if(!ctx)return;
    ctx.clearRect(0,0,1024,256);
    ctx.fillStyle='#d6f2dd';ctx.textAlign='center';
    ctx.font='bold 107px system-ui, sans-serif';
    ctx.fillText('FİTKOÇUM',512,132);
    ctx.font='bold 29px system-ui, sans-serif';
    ctx.fillStyle='#87cfa1';ctx.fillText('3D MOVEMENT STUDIO',512,188);
    const tx=new THREE.CanvasTexture(cv);
    tx.colorSpace=THREE.SRGBColorSpace;
    this.textures.push(tx);
    const mat=new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
    this.materials.push(mat);
    this.mesh(new THREE.PlaneGeometry(2.85,.71),mat,[0,2.98,-5.17]);
  }
  setVisible(value){this.visible=Boolean(value);this.group.visible=this.visible;}
  dispose(){
    this.scene.remove(this.group);
    for(const m of this.materials)m.dispose();
    for(const g of this.geometries)g.dispose();
    for(const t of this.textures)t.dispose();
  }
}
