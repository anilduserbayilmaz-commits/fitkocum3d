#!/usr/bin/env node
// v3.1 R&D only: inspect meshes, skeleton names and animation clip bindings.
// This intentionally does not ship untested assets in the Android app.
const fs=require('node:fs');
const path=require('node:path');
function readGlb(file) {
 const b=fs.readFileSync(file);
 if(b.toString('ascii',0,4)!=='glTF')throw Error('Not binary glTF: '+file);
 const version=b.readUInt32LE(4);
 const length=b.readUInt32LE(8);
 if(version!==2||length!==b.length)throw Error('Malformed GLB: '+file);
 let at=12,json=null;
 while(at+8<=b.length){
  const len=b.readUInt32LE(at),type=b.readUInt32LE(at+4);
  at+=8;
  if(type===0x4e4f534a){json=JSON.parse(b.toString('utf8',at,at+len).replace(/\x00+$/g,''));break}
  at+=len;
 }
 if(!json)throw Error('Missing GLB JSON: '+file);
 return {json,bytes:b.length};
}
function summarize(file){
 const {json:g,bytes}=readGlb(file);
 const nodes=g.nodes||[],skins=g.skins||[],meshes=g.meshes||[];
 const jointSets=skins.map(s=>(s.joints||[]).map(i=>nodes[i]?.name||'#'+i));
 const clips=(g.animations||[]).map(x=>({
  name:x.name||'unnamed',durationHint:Math.max(...(x.samplers||[]).map(s=>g.accessors?.[s.input]?.max?.[0]||0),0),
  channels:x.channels?.length||0,
  targetNames:[...new Set((x.channels||[]).map(c=>nodes[c.target.node]?.name||''))].slice(0,50),
  paths:[...new Set((x.channels||[]).map(c=>c.target.path))]
 }));
 const items=meshes.map(m=>({name:m.name||'',primitives:(m.primitives||[]).map(p=>({
  verts:g.accessors?.[p.attributes.POSITION]?.count||0,
  hasSkin:p.attributes.JOINTS_0!==undefined,
  hasNormal:p.attributes.NORMAL!==undefined,
  hasUV:p.attributes.TEXCOORD_0!==undefined,
  hasVertexColor:p.attributes.COLOR_0!==undefined,
  material:p.material!==undefined?g.materials?.[p.material]?.name:null
 }))}));
 return {file:path.basename(file),bytes,
   bones:jointSets.map((j,i)=>({skin:i,count:j.length,names:j})),
   animations:clips,meshes:items,images:g.images?.length||0,
   textures:g.textures?.length||0,materials:(g.materials||[]).map(m=>m.name||'?'),
   extensions:g.extensionsUsed||[]};
}
const files=process.argv.slice(2);
if(!files.length)throw Error('Provide GLBs');
const reports=files.map(summarize);
fs.writeFileSync('v31-rig-audit.json',JSON.stringify(reports,null,2));
for(const r of reports){
 console.log('RIG_AUDIT',JSON.stringify({
  file:r.file,bytes:r.bytes,boneCounts:r.bones.map(b=>b.count),
  boneNames:r.bones[0]?.names||[],
  animationNames:r.animations.map(a=>a.name),
  firstAnim:r.animations[0],meshes:r.meshes.slice(0,5),
  images:r.images,textures:r.textures,materials:r.materials,extensions:r.extensions
 }));
}
if(!reports.some(x=>x.bones.some(y=>y.count>15)))throw Error('No rigged character in audit');
