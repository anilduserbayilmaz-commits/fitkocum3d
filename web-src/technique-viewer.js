import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Custom original 3D technical animations. Technique diagrams, NOT motion-captured anatomy.
export class Technique3D {
  constructor(scene) {
    this.scene=scene;this.root=new THREE.Group();scene.add(this.root);
    this.meshes=new Map();this.kind='bench';this.duration=3.2;
    this.formMode='correct';
    this.sphere=new THREE.SphereGeometry(1,26,20);
    this.cylinder=new THREE.CylinderGeometry(1,1,1,24);
    this.taper=new THREE.CylinderGeometry(.78,1,1,24);
    this.rounded=new RoundedBoxGeometry(1,1,1,4,.075);
    const mat=(color,metalness=0,roughness=.65)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
    this.skin=mat(0xe0cebb,.04,.76);this.shirt=mat(0xa6c1ce,.06,.58);
    this.pants=mat(0x45576b,.04,.67);this.orange=mat(0xfc9750,.1,.44);
    this.metal=mat(0xc5d2db,.7,.25);this.black=mat(0x2e3a45,.44,.55);
    this.pad=mat(0x3c5361,.02,.86);this.green=mat(0xbaf47c,.1,.48);
    this.red=mat(0xff5c62,.05,.45);
    this.pathMaterial=this.green;
  }
  get(id,geo,mat){
    let item=this.meshes.get(id);
    if(!item){item=new THREE.Mesh(geo,mat);item.castShadow=true;item.receiveShadow=true;this.root.add(item);this.meshes.set(id,item);}
    item.material=mat;item.visible=true;return item;
  }
  ball(id,p,scale,mat){
    const o=this.get(id,this.sphere,mat);o.position.set(...p);o.quaternion.identity();o.scale.set(...scale);
  }
  bar(id,a,b,r,mat){
    const o=this.get(id,this.cylinder,mat);
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b);
    const vec=to.clone().sub(from),len=vec.length();
    o.position.copy(from.add(to).multiplyScalar(.5));
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vec.normalize());
    o.scale.set(r,len,r);
  }
  anatomicalLimb(id,a,b,r,material){
    const o=this.get(id,this.taper,material);
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b);
    const vec=to.clone().sub(from);
    const len=vec.length();
    o.position.copy(from.add(to).multiplyScalar(.5));
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vec.normalize());
    o.scale.set(r,len,r);
  }
  box(id,p,scale,mat,rx=0){
    let o=this.meshes.get(id);
    if(!o){o=new THREE.Mesh(this.rounded,mat);o.castShadow=true;o.receiveShadow=true;this.root.add(o);this.meshes.set(id,o);}
    o.material=mat;o.visible=true;o.position.set(...p);o.scale.set(...scale);o.rotation.set(rx,0,0);
  }
  lerp(a,b,t){return a.map((n,i)=>n+(b[i]-n)*t)}
  trail(a,b,id){
    for(let i=0;i<10;i+=2)this.bar(id+i,this.lerp(a,b,i/10),this.lerp(a,b,(i+1)/10),.025,this.pathMaterial);
  }
  figure(p){
    const shoulderMid=this.lerp(p.sl,p.sr,.5);
    const upper=(id,a,b,mat)=>this.anatomicalLimb(id,a,b,.12,mat);
    this.ball('head',p.head,[.15,.18,.15],this.skin);
    this.ball('hair',[p.head[0],p.head[1]+.09,p.head[2]-.055],[.15,.075,.14],this.black);
    this.bar('neck',p.head,p.neck,.10,this.skin);
    this.bar('shoulderBridge',p.sl,p.sr,.16,this.shirt);
    this.anatomicalLimb('torso',shoulderMid,p.hips,.30,this.shirt);
    this.ball('ribcage',this.lerp(shoulderMid,p.hips,.24),[.31,.18,.20],this.shirt);
    this.ball('abdomen',this.lerp(shoulderMid,p.hips,.72),[.225,.18,.17],this.shirt);
    this.ball('pelvis',p.hips,[.29,.23,.23],this.pants);
    for(const [prefix,sh,el,wr,hip,knee,ankle] of [
      ['L',p.sl,p.el,p.wl,p.hl,p.kl,p.al],['R',p.sr,p.er,p.wr,p.hr,p.kr,p.ar]
    ]){
      this.ball('deltoid'+prefix,sh,[.15,.17,.15],p.focus==='shoulder'?this.orange:this.shirt);
      upper('upperarm'+prefix,sh,el,p.focus==='triceps'?this.orange:this.skin);
      this.ball('elbow'+prefix,el,[.085,.085,.085],this.skin);
      this.anatomicalLimb('forearm'+prefix,el,wr,.085,this.skin);
      this.ball('hand'+prefix,wr,[.074,.08,.075],this.skin);
      this.anatomicalLimb('thigh'+prefix,hip,knee,.158,p.focus==='legs'?this.orange:this.pants);
      this.ball('knee'+prefix,knee,[.105,.11,.105],this.pants);
      this.anatomicalLimb('shin'+prefix,knee,ankle,.115,this.pants);
      this.ball('foot'+prefix,[ankle[0],ankle[1]-.02,ankle[2]+.08],[.13,.085,.20],this.black);
    }
    if(p.focus==='chest'){
      const c=this.lerp(shoulderMid,p.hips,.24);
      for(let side of [-1,1])this.ball('pec'+side,[c[0]+side*.16,c[1]+(p.supine?.12:0),c[2]+(p.supine?0:.22)],[.17,.12,.09],this.orange);
    }
    if(p.focus==='back'){
      const c=this.lerp(shoulderMid,p.hips,.41);
      for(let side of [-1,1])this.ball('lat'+side,[side*.25,c[1],c[2]-.11],[.10,.22,.09],this.orange);
    }
  }
  base(kind){this.kind=kind;this.root.visible=true;this.setFormMode('correct');this.frame(0)}
  setFormMode(mode){this.formMode=mode==='mistake'?'mistake':'correct';this.pathMaterial=this.formMode==='mistake'?this.red:this.green;}
  landmark(name,pos){this.ball('jointCue'+name,pos,[.103,.103,.103],this.pathMaterial);}
  frame(progress){
    for(const m of this.meshes.values())m.visible=false;
    const q=.5-.5*Math.cos(2*Math.PI*progress);
    this.pathMaterial=this.formMode==='mistake'?this.red:this.green;
    if(this.kind==='bench')this.bench(q);
    else if(this.kind==='pulldown')this.pulldown(q);
    else if(this.kind==='legpress')this.legpress(q);
    else if(this.kind==='row')this.row(q);
    else if(this.kind==='triceps')this.triceps(q);
  }
  bench(q){
    this.box('benchSeat',[0,.57,-.32],[.63,.14,2.13],this.pad);
    for(const z of [-1.05,.39])this.box('benchSupport'+z,[0,.28,z],[.09,.5,.09],this.metal);
    for(const x of [-.98,.98])this.box('rack'+x,[x,.79,-.93],[.08,1.40,.08],this.metal);
    const bad=this.formMode==='mistake';
    const height=.97+q*.69,depth=bad?-.78+q*.06:-.29-q*.23;
    const elbowWidth=bad?.84:.64;
    this.figure({head:[0,.9,-1.1],neck:[0,.79,-.92],hips:[0,.74,.11],supine:true,focus:'chest',
      hl:[-.22,.70,.17],hr:[.22,.70,.17],sl:[-.32,.84,-.74],sr:[.32,.84,-.74],
      el:[-elbowWidth,.9+q*.38,depth+.08],er:[elbowWidth,.9+q*.38,depth+.08],
      wl:[-.54,height,depth],wr:[.54,height,depth],
      kl:[-.3,.81,.76],kr:[.3,.81,.76],al:[-.31,.17,1.16],ar:[.31,.17,1.16]});
    this.bar('benchBar',[-1.17,height,depth],[1.17,height,depth],.029,this.metal);
    for(const sign of [-1,1])this.bar('benchPlate'+sign,[sign*1.02,height,depth],[sign*1.11,height,depth],.16,this.black);
    this.trail(bad?[-.18,.98,-.78]:[-.18,.98,-.29],bad?[-.18,1.67,-.72]:[-.18,1.67,-.52],'benchPath');
    this.landmark('benchElbowL',[-elbowWidth,.9+q*.38,depth+.08]);
    this.landmark('benchElbowR',[elbowWidth,.9+q*.38,depth+.08]);
  }
  pulldown(q){
    this.box('seat',[0,.65,-.09],[.69,.12,.69],this.pad);
    this.box('seatSupport',[0,.31,-.08],[.1,.57,.1],this.metal);
    this.box('tower',[0,1.43,-.90],[.15,2.86,.15],this.black);
    this.box('top',[0,2.84,-.67],[1.34,.13,.55],this.metal);
    this.box('thighPad',[0,.99,.32],[.84,.14,.24],this.pad);
    const bad=this.formMode==='mistake';
    let barY=2.62-q*(bad?.54:.68),barZ=bad?-.55:.24+q*.04;
    this.figure({head:[0,2.05,-.18],neck:[0,1.84,-.15],hips:[0,.82,-.11],focus:'back',
      hl:[-.21,.82,-.11],hr:[.21,.82,-.11],sl:[-.31,1.75,-.15],sr:[.31,1.75,-.15],
      el:[-.62,2.03-q*.51,bad?-.40:.15],er:[.62,2.03-q*.51,bad?-.40:.15],wl:[-.68,barY,barZ],wr:[.68,barY,barZ],
      kl:[-.26,.76,.56],kr:[.26,.76,.56],al:[-.28,.11,.76],ar:[.28,.11,.76]});
    this.bar('pulldownBar',[-.92,barY,barZ],[.92,barY,barZ],.027,this.metal);
    this.bar('pulldownCable',[0,2.83,-.68],[0,barY,barZ],.012,this.metal);
    this.trail(bad?[-.9,2.64,-.55]:[-.9,2.64,.24],bad?[-.9,2.08,-.55]:[-.9,1.95,.28],'pulldownPath');
    this.landmark('latLeft',[-.62,2.03-q*.51,bad?-.40:.15]);
    this.landmark('latRight',[.62,2.03-q*.51,bad?-.40:.15]);
  }
  legpress(q){
    this.box('legSeat',[0,.63,-.56],[.67,.14,.9],this.pad,-.25);
    this.box('backrest',[0,1.04,-.92],[.7,1,.14],this.pad,-.40);
    for(const x of [-.66,.66])this.bar('rail'+x,[x,.44,-.15],[x,2.29,1.94],.048,this.metal);
    const point=(a,b)=>this.lerp(a,b,q);
    const bad=this.formMode==='mistake';
    const kl=point([-.32,1.11,.23],[bad?-.09:-.32,1.24,.94]),kr=point([.32,1.11,.23],[bad?.09:.32,1.24,.94]);
    const al=point([-.32,1.40,.58],[-.32,1.84,1.56]),ar=point([.32,1.40,.58],[.32,1.84,1.56]);
    this.figure({head:[0,1.64,-1.04],neck:[0,1.44,-.96],hips:[0,.80,-.50],focus:'legs',
      hl:[-.22,.79,-.48],hr:[.22,.79,-.48],sl:[-.31,1.34,-.85],sr:[.31,1.34,-.85],
      el:[-.43,.99,-.55],er:[.43,.99,-.55],wl:[-.27,.76,-.34],wr:[.27,.76,-.34],kl,kr,al,ar});
    this.box('legPlatform',[0,1.50+q*.47,.64+q*.9],[1.15,.84,.075],this.black,-.40);
    this.trail([.57,1.5,.64],[.57,1.97,1.54],'legpressPath');
    this.landmark('legKneeL',kl);this.landmark('legKneeR',kr);
  }
  row(q){
    this.box('rowSeat',[0,.62,-.52],[.65,.12,.68],this.pad);
    this.box('rowFoot',[0,.28,.86],[1.04,.08,.35],this.black,-.31);
    this.box('rowMachine',[0,.72,1.47],[.13,1.42,.14],this.metal);
    const bad=this.formMode==='mistake';
    const z=.79-q*.80;
    const swing=bad?-.48+q*.88:0;
    this.figure({head:[0,1.84,-.57+swing],neck:[0,1.65,-.52+swing],hips:[0,.81,-.52],focus:'back',
      hl:[-.22,.79,-.52],hr:[.22,.79,-.52],sl:[-.31,1.49,-.49+swing],sr:[.31,1.49,-.49+swing],
      el:[-.34,1.22,.33-q*.56],er:[.34,1.22,.33-q*.56],wl:[-.21,1.22,z],wr:[.21,1.22,z],
      kl:[-.33,.58,.17],kr:[.33,.58,.17],al:[-.36,.27,.90],ar:[.36,.27,.90]});
    this.bar('rowGrip',[-.24,1.22,z],[.24,1.22,z],.024,this.metal);
    this.bar('rowCable',[0,.99,1.47],[0,1.22,z],.012,this.metal);
    this.trail([.25,1.22,.78],[.25,1.22,-.01],'rowPath');
    this.landmark('rowShoulderL',[-.31,1.49,-.49+swing]);
    this.landmark('rowShoulderR',[.31,1.49,-.49+swing]);
  }
  triceps(q){
    this.box('cableTower',[0,1.40,-.86],[.17,2.78,.17],this.black);
    this.box('cableHeader',[0,2.77,-.50],[.60,.10,.68],this.metal);
    const bad=this.formMode==='mistake';
    const h=1.48-q*.58;
    const elbowZ=bad?.17+q*.55:.17;
    this.figure({head:[0,2.12,-.16],neck:[0,1.93,-.15],hips:[0,.99,-.11],focus:'triceps',
      hl:[-.21,.99,-.10],hr:[.21,.99,-.10],sl:[-.30,1.78,-.09],sr:[.30,1.78,-.09],
      el:[-.27,1.50,elbowZ],er:[.27,1.50,elbowZ],wl:[-.25,h,.30],wr:[.25,h,.30],
      kl:[-.22,.55,-.05],kr:[.22,.55,-.05],al:[-.24,.08,.07],ar:[.24,.08,.07]});
    this.bar('tricepsHandle',[-.36,h,.30],[.36,h,.30],.025,this.metal);
    this.bar('tricepsCable',[0,2.76,-.37],[0,h,.30],.012,this.metal);
    this.trail([-.43,1.5,.30],[-.43,.90,.30],'tricepsPath');
    this.landmark('tricepsElbowL',[-.27,1.5,elbowZ]);
    this.landmark('tricepsElbowR',[.27,1.5,elbowZ]);
  }
  destroy(){
    this.scene.remove(this.root);
    this.sphere.dispose();this.cylinder.dispose();this.taper.dispose();this.rounded.dispose();
    for(const key of ['skin','shirt','pants','orange','metal','black','pad','green','red'])this[key].dispose();
  }
}
