import * as THREE from 'three';

// A provisional visual fallback, NOT physically tailored clothing. Paint the
// original skinned body surface instead of placing detached geometry above it.
// This avoids holes and polygon clipping during animation retargeting.
export function createFittedTrainingKit(body){
 if(!body?.isSkinnedMesh)throw Error('Body is not a skinned mesh');
 const geometry=body.geometry;
 const p=geometry.getAttribute('position'),j=geometry.getAttribute('skinIndex'),w=geometry.getAttribute('skinWeight');
 if(!p||!j||!w)throw Error('Missing rig attributes');
 geometry.computeBoundingBox();
 const min=geometry.boundingBox.min,max=geometry.boundingBox.max;
 const total=Math.max(.001,max.y-min.y);
 const boneNames=body.skeleton.bones.map(x=>x.name.toLowerCase());
 const main={
   shirt:boneNames.map(n=>['spine_','clavicle','upperarm'].some(q=>n.includes(q))),
   shorts:boneNames.map(n=>['pelvis','thigh'].some(q=>n.includes(q))),
   shoes:boneNames.map(n=>['foot','ball'].some(q=>n.includes(q)))
 };
 function influence(i,bones){
   let acc=0;
   for(let t=0;t<4;t++){
     const b=t===0?j.getX(i):t===1?j.getY(i):t===2?j.getZ(i):j.getW(i);
     const a=t===0?w.getX(i):t===1?w.getY(i):t===2?w.getZ(i):w.getW(i);
     if(bones[b])acc+=a;
   }
   return acc;
 }
 const jersey=new THREE.Color('#214b55'),shorts=new THREE.Color('#2a303f'),shoes=new THREE.Color('#e1e8e6');
 const rgb=new Float32Array(p.count*3);
 const counts={jersey:0,shorts:0,shoes:0};
 for(let i=0;i<p.count;i++){
   const y=(p.getY(i)-min.y)/total;
   const x=Math.abs(p.getX(i));
   const torso=influence(i,main.shirt),hip=influence(i,main.shorts),feet=influence(i,main.shoes);
   const isShirt=(y>.53&&y<.84&&torso>.18&& (x<.42||y>.71));
   const isShorts=(y>.38&&y<.62&&hip>.18);
   const isShoes=(y<.20&&feet>.16);
   let tone=new THREE.Color(0xffffff);
   if(isShirt){tone=jersey;counts.jersey++}
   else if(isShorts){tone=shorts;counts.shorts++}
   else if(isShoes){tone=shoes;counts.shoes++}
   rgb[i*3]=tone.r;rgb[i*3+1]=tone.g;rgb[i*3+2]=tone.b;
 }
 const before=geometry.getAttribute('color');
 const beforeMat=body.material;
 const attribute=new THREE.BufferAttribute(rgb,3);
 geometry.setAttribute('color',attribute);
 // Multiply original licensed skin textures with our clothing-region colors.
 const materials=(Array.isArray(beforeMat)?beforeMat:[beforeMat]).map(m=>{
   const n=m.clone();
   n.vertexColors=true;
   n.needsUpdate=true;
   return n;
 });
 body.material=Array.isArray(beforeMat)?materials:materials[0];
 const group=new THREE.Group();group.name='IntegratedSportswearSurface';
 return {group,counts,method:'native surface tint',dispose(){
   if(before)geometry.setAttribute('color',before);else geometry.deleteAttribute('color');
   body.material=beforeMat;materials.forEach(m=>m.dispose());
 }};
}
