#!/usr/bin/env node
'use strict';
// Real exercise MP4 -> Huawei WATCH FIT 5/5 Pro video-watch-face pilot.
// Requires the 317 licensed-for-personal-test source clips already generated
// by tools/build-offline-videos.cjs. No fake/rendered exercise movements.
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const base=path.join('app','src','main','assets');
const source=path.join(base,'offline-videos'),dest=path.join(base,'watch-videos');
const clips=[
 ['0025','BENCH PRESS','FitKocum-Bench-Press.mp4'],
 ['drv-cable-bar-lateral-pulldown-wide-shoulder-grip','LAT PULLDOWN','FitKocum-Lat-Pulldown.mp4'],
 ['1435','SQUAT','FitKocum-Squat.mp4'],
 ['0314','INCLINE PRESS','FitKocum-Incline-Press.mp4'],
 ['0294','BICEPS CURL','FitKocum-Biceps-Curl.mp4']
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
 for(const [id,title,name] of clips){
  const input=path.join(source,id+'.mp4');
  const target=path.join(dest,id+'.mp4');
  if(!fs.existsSync(input)||fs.statSync(input).size<5000)throw Error('Missing embedded exercise MP4 '+input);
  // Huawei's 408x480 FIT 5 face resource size, H.264, 25 fps, 4 s, no audio.
  // Keep the full athlete visible, not cropped to fill the narrow screen.
  const label=title.replace(/[^A-Z ]/g,'');
  const vf=[
   'fps=25',
   'scale=396:315:force_original_aspect_ratio=decrease:force_divisible_by=2',
   'pad=408:480:(ow-iw)/2:(oh-ih)/2:color=0x101923',
   'format=yuv420p',
   "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='"+label+"':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=36",
   "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='FITKOCUM WATCH':fontcolor=0xBDE893:fontsize=16:x=(w-text_w)/2:y=427"
  ].join(',');
  await cmd('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-stream_loop','-1','-i',input,
   '-t','4','-vf',vf,'-an','-c:v','libx264','-preset','veryfast','-crf','24','-maxrate','1200k',
   '-bufsize','2400k','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart',target]);
  const bytes=fs.statSync(target).size;
  if(bytes<8000||bytes>10_000_000)throw Error('Invalid watch MP4 size '+name+' '+bytes);
  out[id]={id,title,file:'watch-videos/'+id+'.mp4',filename:name,bytes};
  console.log('WATCH_CLIP '+name+' '+bytes+' bytes');
 }
 const manifest="/* Generated from real embedded MP4 assets by tools/build-watch-videos.cjs */\nwindow.FitWatchClips="+JSON.stringify(out)+";\n";
 fs.writeFileSync(path.join(base,'watch-video-index.js'),manifest);
 fs.writeFileSync(path.join(dest,'README.txt'),
 'FitKocum Watch Fit 5 Pro video watch-face test: 408x480, 25 fps, 4 seconds, no sound, H264. These are watch face clips, not a watch app. Use Huawei Health > Devices > My faces > Video to apply one. Original workout source credited to Free Exercise DB with Videos. Redistribution permissions require independent verification before public release.\n');
 console.log('WATCH_PACK_READY '+Object.keys(out).length);
}
main().catch(e=>{console.error(e);process.exitCode=1});
