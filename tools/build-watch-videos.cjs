#!/usr/bin/env node
'use strict';
/* FitKoçum Watch v4.1: real exercise MP4 -> bright-background-free, athlete-focused video faces.
 * Manually approved safe crops use the bounding box union across every frame
 * of each of the five sample exercise videos. No regenerated/fictional motion.
 * The exact clips were already displayed on a real Watch Fit 5 Pro.
 */
const fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const base=path.join('app','src','main','assets');
const source=path.join(base,'offline-videos'),dest=path.join(base,'watch-videos');
const clips=[
 {id:'0025',title:'BENCH PRESS',name:'FitKocum-Bench-Press.mp4',crop:[364,348,162,6]},
 {id:'drv-cable-bar-lateral-pulldown-wide-shoulder-grip',title:'LAT PULLDOWN',name:'FitKocum-Lat-Pulldown.mp4',crop:[286,350,194,6]},
 {id:'1435',title:'SQUAT',name:'FitKocum-Squat.mp4',crop:[260,345,182,12]},
 {id:'0314',title:'INCLINE PRESS',name:'FitKocum-Incline-Press.mp4',crop:[264,356,194,0]},
 {id:'0294',title:'BICEPS CURL',name:'FitKocum-Biceps-Curl.mp4',crop:[194,336,269,18]}
];
fs.mkdirSync(dest,{recursive:true});
function cmd(program,args){
 return new Promise((resolve,reject)=>{
  const cp=spawn(program,args,{stdio:['ignore','ignore','pipe']});
  let stderr='';cp.stderr.on('data',d=>stderr=(stderr+d.toString()).slice(-3000));
  cp.on('error',reject);
  cp.on('close',code=>code===0?resolve():reject(Error(program+' exited '+code+' '+stderr)));
 });
}
async function main(){
 const out={};
 for(const {id,title,name,crop} of clips){
  const input=path.join(source,id+'.mp4'),target=path.join(dest,id+'.mp4');
  if(!fs.existsSync(input)||fs.statSync(input).size<5000)throw Error('Missing embedded exercise MP4 '+input);
  const label=title.replace(/[^A-Z ]/g,'');
  const [w,h,x,y]=crop;
  // Preserve the source video geometry and movement.
  // Remove white studio background by compositing it onto the dark watch UI.
  // Keep 408x480 (Huawei's previously confirmed video-face aspect).
  const fc=[
   '[0:v]fps=25,crop='+[w,h,x,y].join(':')+
    ',scale=368:344:force_original_aspect_ratio=decrease:force_divisible_by=2'+
    ',format=rgba,colorkey=0xffffff:0.06:0.04[fg]',
   'color=c=0x101d2d:s=408x480:r=25,format=rgba[bg]',
   '[bg][fg]overlay=(W-w)/2:78:shortest=1,'+
    "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='"+label+"':fontcolor=0xECF8F1:fontsize=24:x=(w-text_w)/2:y=27,"+
    "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='FITKOCUM WATCH':fontcolor=0xBDE893:fontsize=16:x=(w-text_w)/2:y=441,"+
    'format=yuv420p[out]'
  ].join(';');
  await cmd('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-stream_loop','-1','-i',input,
   '-filter_complex',fc,'-map','[out]','-t','4','-an','-c:v','libx264','-preset','veryfast','-crf','22','-maxrate','1200k',
   '-bufsize','2400k','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart',target]);
  const bytes=fs.statSync(target).size;
  if(bytes<8000||bytes>10_000_000)throw Error('Invalid watch MP4 size '+name+' '+bytes);
  out[id]={id,title,file:'watch-videos/'+id+'.mp4',filename:name,bytes,style:'v4.1-dark-cropped'};
  console.log('WATCH_V41_CLIP '+name+' '+bytes+' bytes');
 }
 fs.writeFileSync(path.join(base,'watch-video-index.js'),
  "/* Generated, verified watch-face clips: actual bundled MP4 assets. */\n"+
  'window.FitWatchClips='+JSON.stringify(out)+';\n');
 fs.writeFileSync(path.join(dest,'README.txt'),
  'FitKocum Watch v4.1 test videos. Five real gym exercise demonstrations, enlarged subject, white studio background removed and dark interface. MP4 H.264 408x480 25fps 4sec no sound. These are VIDEO WATCH FACES, not a Wear Engine app. Huawei Health > Devices > Watch faces > My faces > Video. Demo video licensing and redistribution remain subject to original rights. Personal test only.\n');
 console.log('WATCH_V41_PACK_READY '+Object.keys(out).length);
}
main().catch(e=>{console.error(e);process.exitCode=1});
