import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const PACK = new Set([
  'bent_over_row','bicep_curl','calf_raise','crunch','deadlift',
  'dumbbell_shoulder_press','front_raise','glute_bridge','good_morning','hammer_curl',
  'high_knees','jumping_jack','lateral_raise','lunge','overhead_press',
  'overhead_tricep_extension','plank','push_up','reverse_lunge','romanian_deadlift',
  'squat','sumo_squat','superman','wall_sit'
]);
const MODEL_MAP = {
  press:'dumbbell_shoulder_press',plank:'plank',deadlift:'deadlift',
  lateral:'lateral_raise',crunch:'crunch',curl:'bicep_curl'
};
const legacy = window.FitScene3D;
const RAD=Math.PI/180;

class RealisticViewer {
  constructor(canvas){
    this.canvas=canvas;
    this.ready=false;
    this.fail=false;
    this.progress=0;
    this.playing=true;
    this.lastTime=0;
    this.token=0;
    this.active=false;
    this.modelName='';
    this.modelRoot=null;
    this.mixer=null;
    this.actions=[];
    this.clipDuration=2.5;
    try{this.init()}catch(e){console.error('[FitKoçum 3D+]',e);this.fail=true}
  }
  init(){
    const c=this.canvas;
    this.renderer=new THREE.WebGLRenderer({canvas:c,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.25;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color('#111a23');
    this.scene.fog=new THREE.Fog('#111a23',6.8,16);
    this.camera=new THREE.PerspectiveCamera(42,1,.05,100);
    this.camera.position.set(3.3,2.7,4.0);
    this.controls=new OrbitControls(this.camera,c);
    this.controls.target.set(0,1.13,0);
    this.controls.minDistance=2.6;
    this.controls.maxDistance=7.4;
    this.controls.minPolarAngle=.15;
    this.controls.maxPolarAngle=Math.PI*.83;
    this.controls.enablePan=false;
    this.controls.enableDamping=true;
    this.controls.dampingFactor=.055;
    this.controls.update();
    this.scene.add(new THREE.HemisphereLight(0xe4f5ff,0x293944,1.6));
    const key=new THREE.DirectionalLight(0xffffff,3.0);
    key.position.set(-2.5,6,4.5);key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);
    key.shadow.camera.left=-4;key.shadow.camera.right=4;
    key.shadow.camera.top=5;key.shadow.camera.bottom=-4;
    key.shadow.normalBias=.028;key.shadow.bias=-.00016;
    this.scene.add(key);
    const rim=new THREE.DirectionalLight(0xbad8ff,1.8);
    rim.position.set(3,3,-2.7);this.scene.add(rim);
    const fill=new THREE.PointLight(0xb9ff96,15,9,2);
    fill.position.set(3,3,4);this.scene.add(fill);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(18,18),new THREE.MeshStandardMaterial({color:0x17222b,roughness:.92,metalness:.04}));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.025;
    this.scene.add(floor);
    const grid=new THREE.GridHelper(10,24,0x415360,0x273740);
    grid.position.y=-.01;this.scene.add(grid);
    const disc=new THREE.Mesh(new THREE.RingGeometry(1.42,1.44,96),new THREE.MeshBasicMaterial({color:0x8ecc71,transparent:true,opacity:.34,side:THREE.DoubleSide}));
    disc.rotation.x=-Math.PI/2;disc.position.y=.012;this.scene.add(disc);
    this.loader=new GLTFLoader();
    this.ready=true;
    this.animate=this.animate.bind(this);
    this.requestId=requestAnimationFrame(this.animate);
  }
  showStatus(message,isError=false){
    const el=document.getElementById('real3dStatus');
    if(!el)return;
    el.hidden=!message;
    if(message){el.textContent=message;el.style.color=isError?'#ffc6b4':'#d1f3b4';}
  }
  async setExercise(name){
    if(!PACK.has(name)){this.fail=true;this.showStatus('Bu hareket için ayrıntılı model bulunamadı.',true);return}
    this.active=true;this.playing=true;this.progress=0;
    this.setCamera('angle');this.showStatus('Anatomik 3D model yükleniyor…');
    if(this.modelName===name && this.modelRoot){
      this.mixer.setTime(0);this.showStatus('');return;
    }
    const stamp=++this.token;
    try{
      const bridge=window.FitAndroid;
      if(!bridge || typeof bridge.loadModelBase64!=='function')throw new Error('Model dosyaları Android APK içinde açılır.');
      const encoded=bridge.loadModelBase64(name);
      if(typeof encoded!=='string'||encoded.length<1000)throw new Error('Model okunamadı.');
      const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
      const gltf=await new Promise((res,rej)=>this.loader.parse(bytes.buffer,'',res,rej));
      if(this.token!==stamp)return;
      if(this.modelRoot){
        this.scene.remove(this.modelRoot);
        this.modelRoot.traverse(o=>{
          if(o.geometry)o.geometry.dispose();
          if(o.material){
            const list=Array.isArray(o.material)?o.material:[o.material];
            for(const m of list)if(m.dispose)m.dispose();
          }
        });
      }
      const container=new THREE.Group();
      const model=gltf.scene;
      model.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(model);
      const size=box.getSize(new THREE.Vector3());
      if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Model boyutları geçersiz.');
      const scale=Math.min(1.3,2.28/size.y);
      model.scale.multiplyScalar(scale);
      model.position.set(-box.getCenter(new THREE.Vector3()).x*scale,-box.min.y*scale,-box.getCenter(new THREE.Vector3()).z*scale);
      model.traverse(o=>{
        if(o.isMesh||o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true;}
      });
      container.add(model);this.modelRoot=container;
      this.scene.add(container);
      this.createWeights(name,model);
      this.mixer=new THREE.AnimationMixer(model);
      this.actions=[];
      const clips=gltf.animations||[];
      this.clipDuration=Math.max(1,...clips.map(c=>c.duration||1));
      for(const clip of clips){
        const action=this.mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat,Infinity);action.play();
        this.actions.push(action);
      }
      this.modelName=name;this.progress=0;this.playing=true;
      if(this.mixer)this.mixer.setTime(0);
      this.showStatus(clips.length?'':'Modelde hareket animasyonu bulunamadı.',clips.length===0);
    }catch(e){
      console.error('3D model error',e);
      this.fail=true;
      this.showStatus('3D model açılamadı: '+String(e.message||e),true);
    }
  }
  createWeights(name,model){
    if(this.equipment){this.scene.remove(this.equipment);this.equipment=null}
    this.wrists=[model.getObjectByName('wrist.L'),model.getObjectByName('wrist.R')];
    if(!this.wrists[0]||!this.wrists[1])return;
    const bars=new Set(['deadlift','romanian_deadlift','bent_over_row','overhead_press']);
    const dumbbells=new Set(['bicep_curl','hammer_curl','dumbbell_shoulder_press','front_raise','lateral_raise','overhead_tricep_extension']);
    if(!bars.has(name)&&!dumbbells.has(name))return;
    this.equipment=new THREE.Group();
    this.scene.add(this.equipment);
    const metal=new THREE.MeshStandardMaterial({color:0xb8c7cf,metalness:.82,roughness:.21});
    const grip=new THREE.MeshStandardMaterial({color:0x30393f,metalness:.4,roughness:.43});
    const plates=new THREE.MeshStandardMaterial({color:0x242d37,metalness:.57,roughness:.29});
    if(bars.has(name)){
      const root=new THREE.Group();
      const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,2.12,18),metal);
      root.add(shaft);
      for(const side of [-1,1]){
        const weight=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.082,28),plates);
        weight.position.y=side*.84;root.add(weight);
        const collar=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.04,20),metal);
        collar.position.y=side*.94;root.add(collar);
      }
      this.equipment.add(root);this.equipKind='bar';
    } else {
      this.equipKind='dumbbell';
      for(const side of [-1,1]){
        const root=new THREE.Group();
        root.add(new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.38,14),metal));
        for(const y of [-.155,.155]){
          const p=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.055,20),plates);
          p.position.y=y;root.add(p);
        }
        this.equipment.add(root);
      }
    }
  }
  updateWeights(){
    if(!this.equipment||!this.wrists||!this.modelRoot)return;
    this.modelRoot.updateMatrixWorld(true);
    const a=new THREE.Vector3(),b=new THREE.Vector3();
    this.wrists[0].getWorldPosition(a);
    this.wrists[1].getWorldPosition(b);
    const axis=new THREE.Vector3().subVectors(b,a).normalize();
    const rot=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis);
    if(this.equipKind==='bar'){
      this.equipment.children[0].position.copy(a).add(b).multiplyScalar(.5);
      this.equipment.children[0].quaternion.copy(rot);
    } else {
      [a,b].forEach((p,i)=>{
        const g=this.equipment.children[i];
        if(!g)return;
        g.position.copy(p);
        g.quaternion.copy(rot);
      });
    }
  }
  setPlaying(v){this.playing=Boolean(v)}
  setCamera(mode){
    if(!this.camera)return;
    const theta=mode==='front'?0:mode==='side'?Math.PI/2:Math.PI/4;
    const distance=3.55;
    this.controls.target.set(0,1.15,0);
    this.camera.position.set(Math.sin(theta)*distance,2.15,Math.cos(theta)*distance);
    this.controls.update();
  }
  setManualProgress(p){
    this.playing=false;
    this.progress=Math.max(0,Math.min(1,Number(p)||0));
    if(this.mixer)this.mixer.setTime(this.progress*this.clipDuration);
  }
  animate(now){
    this.requestId=requestAnimationFrame(this.animate);
    const dt=this.lastTime?Math.min(.06,(now-this.lastTime)/1000):0;
    this.lastTime=now;
    if(!this.active || !this.renderer)return;
    const rect=this.canvas.getBoundingClientRect();
    if(rect.width<2||rect.height<2)return;
    if(this.playing && this.mixer){
      this.mixer.update(dt);
      this.progress=(this.mixer.time%this.clipDuration)/this.clipDuration;
      const scrub=document.getElementById('poseRange');
      if(scrub && document.getElementById('overlay')?.hidden===false){
        scrub.value=String(Math.round(this.progress*100));
        const stage=document.getElementById('poseStage');
        if(stage)stage.textContent='Oynatılıyor';
      }
    }
    const w=Math.round(rect.width),h=Math.round(rect.height);
    if(w!==this.lastW||h!==this.lastH){
      this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.lastW=w;this.lastH=h;
    }
    this.updateWeights();
    this.controls.update();
    this.renderer.render(this.scene,this.camera);
  }
  stop(){
    cancelAnimationFrame(this.requestId);
    this.controls?.dispose();
    this.renderer?.dispose();
    this.active=false;
  }
}
class Hybrid3D{
  constructor(canvas){
    this.canvas=canvas;
    this.original=new legacy(canvas);
    this.canvasReal=document.createElement('canvas');
    this.canvasReal.id='gymRealCanvas';
    this.canvasReal.setAttribute('aria-label','Ayrıntılı anatomik egzersiz modeli, parmakla döndürülebilir');
    Object.assign(this.canvasReal.style,{width:'100%',height:'100%',touchAction:'none',display:'none'});
    canvas.parentNode.insertBefore(this.canvasReal,canvas.nextSibling);
    this.real=new RealisticViewer(this.canvasReal);
    this.mode='old';
    this.fail=false;
    this.playing=true;
  }
  setExercise(type){
    const model=type.startsWith('library:')?type.split(':')[1]:MODEL_MAP[type];
    if(model && PACK.has(model)&&!this.real.fail){
      this.mode='real';this.canvas.style.display='none';this.canvasReal.style.display='block';
      this.original.setPlaying(false);
      this.real.setExercise(model);
    }else{
      this.mode='old';this.canvas.style.display='block';this.canvasReal.style.display='none';
      this.real.active=false;
      this.original.setExercise(type);
      this.real.showStatus('');
    }
    this.playing=true;
    const badge=document.querySelector('.scene-label');
    if(badge)badge.textContent=this.mode==='real'?'● ANATOMİK 3D · MIT MODEL':'● ŞEMATİK 3D MODEL';
  }
  setCamera(mode){this.mode==='real'?this.real.setCamera(mode):this.original.setCamera(mode)}
  setManualProgress(v){this.mode==='real'?this.real.setManualProgress(v):this.original.setManualProgress(v);this.playing=false;}
  setPlaying(v){
    this.playing=Boolean(v);
    if(this.mode==='real'){this.real.active=Boolean(v)||this.real.active;this.real.setPlaying(v);}
    else this.original.setPlaying(v);
  }
  stop(){this.real.stop();this.original.stop()}
}
window.FitScene3D=Hybrid3D;
