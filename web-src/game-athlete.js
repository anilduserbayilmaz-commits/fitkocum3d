import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Self-contained game-styled athletic trainer for the MIT desk-break skeleton.
// The original 435 verified animations remain unchanged. This character uses
// those original skinned vertices, upgrading texture, clothing and facial detail.
const LOOKS={
  arena:{skin:'#bc8568',jersey:'#184254',shorts:'#23313b',shoes:'#d2e8df',hair:'#282321',accent:'#a8ef9b'},
  pulse:{skin:'#9b6b50',jersey:'#403b6b',shorts:'#22263a',shoes:'#e5d8f3',hair:'#201a1c',accent:'#e3adff'},
  carbon:{skin:'#c49a7c',jersey:'#28302f',shorts:'#152322',shoes:'#dfe9db',hair:'#171a1a',accent:'#89dfc2'}
};
const normalized=n=>String(n||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cssColor=s=>new THREE.Color(s);
export class GameAthlete {
 constructor(model){
   this.model=model;
   this.look='arena';
   this.enabled=true;
   this.originals=[];
   this.attachments=[];
   this.geometries=new Set();
   this.materials=new Set();
   this.textures=new Set();
   this.skeleton=null;
   this._create();
 }
 _texture(){
   const cv=document.createElement('canvas');
   cv.width=128;cv.height=128;
   const ctx=cv.getContext('2d');
   if(!ctx)return null;
   const data=ctx.createImageData(128,128);
   for(let i=0;i<128*128;i++){
     const noise=Math.round(115+22*Math.sin(i*.381)*Math.cos(i*1.73)+10*Math.sin(i*.1));
     const k=i*4;
     data.data[k]=noise;data.data[k+1]=noise;data.data[k+2]=noise;data.data[k+3]=255;
   }
   ctx.putImageData(data,0,0);
   const tx=new THREE.CanvasTexture(cv);
   tx.wrapS=THREE.RepeatWrapping;tx.wrapT=THREE.RepeatWrapping;
   tx.repeat.set(5,5);
   this.textures.add(tx);
   return tx;
 }
 _mat(props){
   const m=new THREE.MeshPhysicalMaterial(props);
   this.materials.add(m);
   return m;
 }
 _create(){
   this.micro=this._texture();
   this.surface=this._mat({
     color:0xffffff,vertexColors:true,roughness:.66,metalness:.02,
     clearcoat:.07,clearcoatRoughness:.8,sheen:.13,sheenRoughness:.86,
     bumpMap:this.micro,bumpScale:.0029
   });
   this.skinMaterial=this._mat({color:'#bc8568',roughness:.64,metalness:0,clearcoat:.07});
   this.hairMaterial=this._mat({color:'#282321',roughness:.94,metalness:0});
   this.shoeMaterial=this._mat({color:'#e0eae7',roughness:.47,metalness:.08,clearcoat:.16});
   this.irisMaterial=this._mat({color:'#527c6d',roughness:.23,metalness:.12,clearcoat:1});
   this.whiteMaterial=this._mat({color:0xf5efe6,roughness:.28});
   this.blackMaterial=this._mat({color:0x10171a,roughness:.52});
   this.accentMaterial=this._mat({color:'#a8ef9b',roughness:.49,metalness:.12,emissive:0x244d29,emissiveIntensity:.27});
   this.model.traverse(obj=>{
     if(!obj.isSkinnedMesh||!obj.geometry?.attributes?.skinIndex||!obj.skeleton)return;
     const geo=obj.geometry;
     const pos=geo.getAttribute('position'),skinIndex=geo.getAttribute('skinIndex'),skinWeight=geo.getAttribute('skinWeight');
     const bones=obj.skeleton.bones;
     const oldColor=geo.getAttribute('color');
     const out=new Float32Array(pos.count*3);
     const attr=new THREE.BufferAttribute(out,3);
     const resized=new Float32Array(pos.count*3);
     for(let i=0;i<pos.count;i++){
       const name=normalized(bones[skinIndex.getX(i)|0]?.name||'');
       const z=pos.getZ(i);
       const sign=name.endsWith('l')?1:name.endsWith('r')?-1:0;
       const cx=name.startsWith('arm')||name.startsWith('elbow')||name.startsWith('hand')?sign*.205:
         name.startsWith('leg')||name.startsWith('knee')||name.startsWith('foot')?sign*.09:0;
       let mx=1,my=1;
       if(name==='spine'){mx=1.18;my=1.30}
       else if(name==='hips'){mx=1.18;my=1.20}
       else if(name.startsWith('arm')){mx=1.33;my=1.33}
       else if(name.startsWith('elbow')){mx=1.28;my=1.28}
       else if(name.startsWith('leg')){mx=1.43;my=1.43}
       else if(name.startsWith('knee')){mx=1.29;my=1.29}
       else if(name.startsWith('neck')&&z>1.55){mx=1.07;my=1.04}
       const base=i*3;
       resized[base]=cx+(pos.getX(i)-cx)*mx;
       resized[base+1]=pos.getY(i)*my;
       resized[base+2]=z;
     }
     const shapeAttr=new THREE.BufferAttribute(resized,3);
     this.originals.push({obj,geo,oldColor,oldMaterial:obj.material,out,attr,bones,skinIndex,skinWeight,pos,shapeAttr});
     geo.setAttribute('position',shapeAttr);
     geo.computeBoundingBox();geo.computeBoundingSphere();
     obj.frustumCulled=false;
     geo.setAttribute('color',attr);
     obj.material=Array.isArray(obj.material)?obj.material.map(()=>this.surface):this.surface;
     obj.castShadow=true;obj.receiveShadow=true;
     if(!this.skeleton)this.skeleton={mesh:obj,bones};
   });
   this._addFaceAndOutfitDetails();
   this.setLook('arena');
 }
 _attach(boneName,position,geometry,material,scale=null,rotation=null){
   if(!this.skeleton)return null;
   const {mesh,bones}=this.skeleton;
   const bone=bones.find(x=>normalized(x.name)===normalized(boneName));
   if(!bone)return null;
   mesh.updateMatrixWorld(true);
   bone.updateMatrixWorld(true);
   const anchor=mesh.localToWorld(new THREE.Vector3(...position));
   const local=bone.worldToLocal(anchor.clone());
   const obj=new THREE.Mesh(geometry,material);
   obj.position.copy(local);
   if(scale)obj.scale.set(...scale);
   if(rotation)obj.rotation.set(...rotation);
   obj.castShadow=true;
   bone.add(obj);
   this.attachments.push(obj);
   this.geometries.add(geometry);
   return obj;
 }
 _sphere(bone,pos,r,material,scale=null){
   return this._attach(bone,pos,new THREE.SphereGeometry(r,24,18),material,scale);
 }
 _addFaceAndOutfitDetails(){
   if(!this.skeleton)return;
   // The motion rig and its torso/limbs come from the original GLB; face
   // and clothes details are bound to the SAME bones.
   const hair=this._attach('neck',[0,-.009,1.682],
     new THREE.SphereGeometry(.094,32,24,0,Math.PI*2,0,Math.PI*.46),
     this.hairMaterial,[.85,1.06,1],[Math.PI/2,0,0]);
   this.hair=hair;
   for(const sign of [-1,1]){
     const x=sign*.038;
     this._sphere('neck',[x,-.105,1.657],.012,this.whiteMaterial,[1,.62,1]);
     this._sphere('neck',[x,-.114,1.657],.006,this.irisMaterial,[1,.66,1]);
     this._sphere('neck',[x,-.119,1.657],.0031,this.blackMaterial);
     this._sphere('neck',[x,-.107,1.678],.022,this.hairMaterial,[1,.24,.15]);
     this._sphere('neck',[sign*.079,-.015,1.63],.018,this.skinMaterial,[.54,.63,1]);
     // A subtle dark fade at the temples.
     this._sphere('neck',[sign*.067,-.012,1.708],.022,this.hairMaterial,[.66,.68,1]);
   }
   this._sphere('neck',[0,-.126,1.628],.016,this.skinMaterial,[.72,.72,1.3]);
   this._sphere('neck',[0,-.103,1.598],.026,this.skinMaterial,[1,.21,.20]);
   this._sphere('neck',[0,-.106,1.601],.019,this.hairMaterial,[1,.09,.08]);
   for(const sign of [-1,1]){
     const x=sign*.09;
     // Athletic shoe shells and small rubber outsole.
     const shell=new RoundedBoxGeometry(.13,.245,.084,4,.018);
     this._attach('foot'+(sign===1?'L':'R'),[x,-.065,.042],shell,this.shoeMaterial);
     const sole=new RoundedBoxGeometry(.134,.247,.024,3,.008);
     this._attach('foot'+(sign===1?'L':'R'),[x,-.065,.012],sole,this.blackMaterial);
     for(let n=0;n<3;n++){
       const stitch=new RoundedBoxGeometry(.075,.006,.003,2,.001);
       this._attach('foot'+(sign===1?'L':'R'),[x,-.090+n*.028,.091],stitch,this.accentMaterial);
     }
   }
   const cv=document.createElement('canvas');
   cv.width=256;cv.height=96;
   const ctx=cv.getContext('2d');
   if(ctx){
     ctx.clearRect(0,0,256,96);
     ctx.fillStyle='#d7ffe2';
     ctx.font='900 60px Arial, sans-serif';
     ctx.textAlign='center';
     ctx.fillText('FK',128,67);
     const tx=new THREE.CanvasTexture(cv);
     tx.colorSpace=THREE.SRGBColorSpace;
     this.textures.add(tx);
     const mat=new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
     this.materials.add(mat);
     this._attach('spine',[0,-.103,1.309],new THREE.PlaneGeometry(.13,.048),mat,null,[Math.PI/2,0,0]);
   }
 }
 setLook(name){
   this.look=LOOKS[name]?name:'arena';
   const look=LOOKS[this.look];
   this.skinMaterial.color.set(look.skin);
   this.hairMaterial.color.set(look.hair);
   this.shoeMaterial.color.set(look.shoes);
   this.accentMaterial.color.set(look.accent);
   const palette={
     skin:cssColor(look.skin),jersey:cssColor(look.jersey),
     shorts:cssColor(look.shorts),shoe:cssColor(look.shoes),hair:cssColor(look.hair),accent:cssColor(look.accent)
   };
   for(const t of this.originals){
     const {out,pos,skinIndex,skinWeight,bones,attr}=t;
     for(let i=0;i<pos.count;i++){
       const z=pos.getZ(i),name=normalized(bones[skinIndex.getX(i)|0]?.name||'');
       let key='skin';
       if(name==='hips')key='shorts';
       else if(name==='spine')key='jersey';
       else if(name==='neck')key=z>1.717?'hair':'skin';
       else if(name.startsWith('arm'))key=z>1.28?'jersey':'skin';
       else if(name.startsWith('leg'))key=z>.73?'shorts':'skin';
       else if(name.startsWith('foot'))key='shoe';
       else if(name==='prop')key='shorts';
       let c=palette[key];
       // Fine cloth/skin tone variation is deterministic and anchored to
       // rest vertices so it does not shimmer during animation.
       const n=Math.sin(i*.197+z*12)*Math.cos(i*.437+z*4)*.05;
       const idx=i*3;
       out[idx]=Math.max(0,Math.min(1,c.r*(1+n)));
       out[idx+1]=Math.max(0,Math.min(1,c.g*(1+n)));
       out[idx+2]=Math.max(0,Math.min(1,c.b*(1+n)));
       if(key==='jersey'&&z>1.28&&z<1.30){
         const ac=palette.accent;
         out[idx]=ac.r*.75;out[idx+1]=ac.g*.75;out[idx+2]=ac.b*.75;
       }
     }
     attr.needsUpdate=true;
   }
 }
 setVisible(value){
   this.enabled=!!value;
   for(const t of this.originals){
     t.obj.material=this.enabled
       ?(Array.isArray(t.oldMaterial)?t.oldMaterial.map(()=>this.surface):this.surface)
       :t.oldMaterial;
     t.geo.setAttribute('position',this.enabled?t.shapeAttr:t.pos);
     if(this.enabled)t.geo.setAttribute('color',t.attr);
     else if(t.oldColor)t.geo.setAttribute('color',t.oldColor);
     else t.geo.deleteAttribute('color');
   }
   for(const obj of this.attachments)obj.visible=this.enabled;
 }
 dispose(){
   for(const obj of this.attachments)obj.parent?.remove(obj);
   this.attachments.length=0;
   for(const t of this.originals){
     t.obj.material=t.oldMaterial;
     t.geo.setAttribute('position',t.pos);
     if(t.oldColor)t.geo.setAttribute('color',t.oldColor);
     else t.geo.deleteAttribute('color');
   }
   this.originals.length=0;
   for(const geo of this.geometries)geo.dispose();
   for(const m of this.materials)m.dispose();
   for(const tx of this.textures)tx.dispose();
   this.geometries.clear();this.materials.clear();this.textures.clear();
 }
}
