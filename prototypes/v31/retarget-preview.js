import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {retargetClip} from 'three/addons/utils/SkeletonUtils.js';
import {createFittedTrainingKit} from './fitted-kit.js';
import {PrototypeGymGear} from './realistic-gear.js';

const MAP={
 'Root':'root','pelvis':'spine05','spine_01':'spine04',
 'spine_02':'spine03','spine_03':'spine02',
 'neck_01':'spine01','head':'head',
 'clavicle_l':'clavicle.L','upperarm_l':'upperarm01.L','lowerarm_l':'lowerarm01.L','hand_l':'wrist.L',
 'clavicle_r':'clavicle.R','upperarm_r':'upperarm01.R','lowerarm_r':'lowerarm01.R','hand_r':'wrist.R',
 'thigh_l':'upperleg01.L','calf_l':'lowerleg01.L','foot_l':'foot.L','ball_l':'toe1-1.L',
 'thigh_r':'upperleg01.R','calf_r':'lowerleg01.R','foot_r':'foot.R','ball_r':'toe1-1.R'
};
const gltf=new GLTFLoader();
const load=filename=>new Promise((resolve,reject)=>gltf.load('/assets/'+filename,resolve,undefined,reject));
const skinned=root=>{let x;root.traverse(o=>{if(!x&&o.isSkinnedMesh)x=o});return x};
const error=e=>{console.error('RETARGET_RIG_FAILURE',e.stack||String(e));document.querySelector('#error').textContent=String(e.stack||e);window.__v31={status:'error',message:String(e.stack||e)}};
async function run(){
 const exercise=new URL(location.href).searchParams.get('move')||'bicep_curl';
 if(!['bicep_curl','squat','deadlift'].includes(exercise))throw Error('Unsupported prototype '+exercise);
 const [real,source,shorts,shirt,shoes]=await Promise.all([
  load('realistic_body.glb'),load(exercise+'.glb'),load('realistic_shorts.glb'),load('realistic_tshirt.glb'),load('realistic_shoes.glb')
 ]);
 console.log('RETARGET_ASSET_LOAD',JSON.stringify([real,source,shorts,shirt,shoes].map((x,i)=>({i,hasScene:!!x?.scene,keys:Object.keys(x||{})}))));
 const realSkin=skinned(real.scene),sourceSkin=skinned(source.scene);
 if(!realSkin||!sourceSkin)throw Error('Missing skinned meshes');
 const realBones=new Map(realSkin.skeleton.bones.map(b=>[b.name,b]));
 // Source garments have non-matching morph/bind data. Do not export the
 // puffed-up clothing meshes. Generate fitted body-surface sports kit instead.
 const sportswear=createFittedTrainingKit(realSkin);
 real.scene.add(sportswear.group);
 const dressed=Object.values(sportswear.counts).filter(v=>v>20).length;
 const clip=source.animations.reduce((a,b)=>a.tracks.length>b.tracks.length?a:b);
 const runtimeBoneNames=new Set(sourceSkin.skeleton.bones.map(b=>b.name));
 const canonical=name=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
 const boneLookup=new Map([...runtimeBoneNames].map(name=>[canonical(name),name]));
 const resolvedMap=Object.fromEntries(Object.entries(MAP).map(([k,v])=>[k,boneLookup.get(canonical(v))||v]));
 console.log('RETARGET_MATCHES',JSON.stringify({target:realSkin.skeleton.bones.map(b=>b.name),source:[...runtimeBoneNames].slice(0,85),resolvedMap,
   matches:Object.values(resolvedMap).filter(v=>runtimeBoneNames.has(v)).length}));
 const targetClip=retargetClip(realSkin,sourceSkin,clip,{
   names:resolvedMap,
   hip:'spine05',
   fps:30,
   preserveBoneMatrix:true,
   preserveBonePositions:true,
   useFirstFramePosition:false
 });
 const model=real.scene;
 model.updateMatrixWorld(true);
 let box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const wrapper=new THREE.Group();
 const fit=2.25/size.y;
 model.scale.setScalar(fit);
 model.position.set(-center.x*fit,-box.min.y*fit,-center.z*fit);
 wrapper.add(model);
 const scene=new THREE.Scene();
 scene.background=new THREE.Color(0xedecea);
 scene.add(wrapper);
 const gear=new PrototypeGymGear(scene,realBones,exercise);
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 renderer.setSize(750,950);
 renderer.setPixelRatio(1);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.1;
 document.querySelector('#render').append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(37,750/950,.1,100);
 camera.position.set(3,2.25,4.9);
 camera.lookAt(0,1.1,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0x9a9a9a,2.1));
 const key=new THREE.DirectionalLight(0xffffff,3.5);key.position.set(-3,6,3);scene.add(key);
 const rim=new THREE.DirectionalLight(0xcfdfff,2);rim.position.set(3,4,-3);scene.add(rim);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(15,15),new THREE.MeshStandardMaterial({color:0xdedbd4,roughness:1}));
 floor.rotation.x=-Math.PI/2;floor.position.y=-.015;scene.add(floor);
 const mixer=new THREE.AnimationMixer(realSkin);
 const action=mixer.clipAction(targetClip);action.play();
 function pose(time){
   mixer.setTime(time);
   scene.updateMatrixWorld(true);
   // In the source rig, pelvis keys can translate vertically; correct
   // the floor contact to prevent the trainer's legs disappearing underground.
   const lf=realBones.get('foot_l'),rf=realBones.get('foot_r');
   const a=new THREE.Vector3(),b=new THREE.Vector3();
   lf.getWorldPosition(a);rf.getWorldPosition(b);
   const floor=Math.min(a.y,b.y);
   if(Number.isFinite(floor))wrapper.position.y+=.075-floor;
   scene.updateMatrixWorld(true);
   gear.update();
   renderer.render(scene,camera);
 }
 pose(0);
 const targetTracks=targetClip.tracks.map(t=>t.name);
 const times=[0,targetClip.duration*.25,targetClip.duration*.5,targetClip.duration*.75];
 const limbPose=()=>{
  const names=['upperarm_l','lowerarm_l','hand_l','upperarm_r','lowerarm_r','hand_r','thigh_l','calf_l'];
  return Object.fromEntries(names.map(n=>{
    const b=realBones.get(n);
    const p=new THREE.Vector3();b.getWorldPosition(p);
    return [n,p.toArray().map(v=>Math.round(v*1000)/1000)];
  }));
 };
 const frames=[];
 for(const t of times){pose(t);frames.push({time:t,limbs:limbPose()})}
 pose(targetClip.duration*.5);
 window.__v31Pose=(phase)=>pose(targetClip.duration*Math.max(0,Math.min(1,phase)));
 const result={
  status:'ok',exercise,character:'CC0 MakeHuman textured with fitted gym outfit',originalClip:clip.name,
  sourceTracks:clip.tracks.length,retargetedTracks:targetTracks.length,
  targetTracks:targetTracks.slice(0,40),
  duration:targetClip.duration,dressed,appearance:sportswear.method,equipment:gear.kind,equipmentMeshes:gear.meshes.length,fitCounts:sportswear.counts,
  skeletonMapped:Object.keys(MAP).length,
  frames,
  size:size.toArray(),images:real.parser.json.images?.length||0
 };
 document.querySelector('#status').textContent=exercise+' · '+result.retargetedTracks+' tracks · fitted sports kit';
 window.__v31=result;
}
run().catch(error);
