import * as THREE from 'three';

// V3.1 preview: skin-tight sports kit generated from the exact animated body
// surface. This avoids the severe deformation of independent garment meshes
// until their bind spaces/morphs can be reconciled.
export function createFittedTrainingKit(body){
  if(!body?.isSkinnedMesh)throw Error('Body is not a skinned mesh');
  const source=body.geometry;
  const positions=source.getAttribute('position');
  const joints=source.getAttribute('skinIndex');
  const weights=source.getAttribute('skinWeight');
  if(!positions||!joints||!weights)throw Error('Missing skinned body vertex data');
  source.computeBoundingBox();
  const {min,max}=source.boundingBox;
  const height=max.y-min.y;
  const boneNames=body.skeleton.bones.map(b=>b.name.toLowerCase());
  const nameMatches=(name,search)=>search.some(x=>name.includes(x));
  const bones={
    jersey:boneNames.map(n=>nameMatches(n,['spine','clavicle','upperarm','neck'])&&!n.includes('neck')),
    shorts:boneNames.map(n=>nameMatches(n,['pelvis','thigh'])),
    shoes:boneNames.map(n=>nameMatches(n,['foot','ball']))
  };
  const themes={
    jersey:{color:0x143c42,roughness:.86,metalness:.01},
    shorts:{color:0x20262f,roughness:.92,metalness:.01},
    shoes:{color:0xeeeeed,roughness:.50,metalness:.0}
  };
  const masks={jersey:new Uint8Array(positions.count),shorts:new Uint8Array(positions.count),shoes:new Uint8Array(positions.count)};
  const getInfluence=(i,m)=>{let s=0;for(let c=0;c<4;c++){const idx=joints.array[i*joints.itemSize+c]||0,weight=weights.array[i*weights.itemSize+c]||0;if(m[idx])s+=weight;}return s;};
  for(let i=0;i<positions.count;i++){
    const y=(positions.getY(i)-min.y)/height;
    // Keep face, bare arms and hands, lower legs uncovered.
    masks.jersey[i]=(y>.45&&y<.82&&getInfluence(i,bones.jersey)>.52)?1:0;
    masks.shorts[i]=(y>.29&&y<.51&&getInfluence(i,bones.shorts)>.52)?1:0;
    masks.shoes[i]=(y<.19&&getInfluence(i,bones.shoes)>.58)?1:0;
  }
  const layerRoot=new THREE.Group();
  layerRoot.name='FittedSportswear';
  const counts={};
  const originalIndex=source.index;
  const vertexCount=positions.count;
  const indices=originalIndex?.array||null;
  const totalTriangles=indices?Math.floor(indices.length/3):Math.floor(vertexCount/3);
  for(const region of Object.keys(masks)){
    const chosen=[];
    const mask=masks[region];
    for(let f=0;f<totalTriangles;f++){
      const a=indices?indices[f*3]:f*3;
      const b=indices?indices[f*3+1]:f*3+1;
      const c=indices?indices[f*3+2]:f*3+2;
      if(mask[a]&&mask[b]&&mask[c])chosen.push(a,b,c);
    }
    const geo=source.clone();
    const type=vertexCount>65535?Uint32Array:Uint16Array;
    geo.setIndex(new THREE.BufferAttribute(new type(chosen),1));
    const mat=new THREE.MeshStandardMaterial({
      ...themes[region],side:THREE.DoubleSide,
      polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1
    });
    const mesh=new THREE.SkinnedMesh(geo,mat);
    mesh.name='Fitted_'+region;
    mesh.frustumCulled=false;
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    mesh.bind(body.skeleton,body.bindMatrix.clone());
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
    mesh.scale.copy(body.scale);
    layerRoot.add(mesh);
    counts[region]=chosen.length/3;
  }
  return {group:layerRoot,counts};
}
