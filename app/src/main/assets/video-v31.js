/* FitKoçum 3D+ v3.2 — videos are physical MP4 files inside the APK.
   Only clips listed in the build-generated offline manifest may be shown.
   There are no online fallbacks and no large "video not added" placeholder.
*/
(function(){
'use strict';
const BUILD='4.0.0-watch-alpha';
const watchClips=window.FitWatchClips||{};
let watchCurrent=null;
const clips={
 movekit_pull_ups:MOVEKIT_CLIPS.movekit_pull_ups,
 movekit_dumbbell_chest_fly:MOVEKIT_CLIPS.movekit_dumbbell_chest_fly,
 ...window.FitFreeVideoClips,
 ...window.FitLegacyVideoMatches
};
const overlay=$('overlay'),sceneBox=$('modelCanvas').closest('.scene');
const viewer=document.createElement('video');
viewer.id='fitkocumVideo';
viewer.setAttribute('playsinline','');
viewer.setAttribute('webkit-playsinline','');
viewer.setAttribute('preload','metadata');
viewer.setAttribute('aria-label','Çevrimdışı egzersiz videosu');
viewer.controls=true;viewer.muted=true;viewer.loop=true;viewer.playsInline=true;
viewer.style.cssText='display:none;width:100%;height:100%;object-fit:contain;background:#090d12;border-radius:16px';
sceneBox.appendChild(viewer);
const indicator=document.createElement('div');
indicator.setAttribute('role','status');
indicator.style.cssText='display:none;position:absolute;bottom:9px;left:9px;right:9px;padding:8px 12px;background:#09141ce0;border-radius:10px;font-size:12px;color:#e5f4f0;pointer-events:none';
sceneBox.appendChild(indicator);
const controls=document.createElement('div');
controls.id='fitkocumVideoControls';
controls.style.cssText='display:none;gap:8px;margin:12px 0 15px';
controls.innerHTML='<button type="button" data-video-rate="0.5" class="viewbtn">0,5× Yavaş</button><button type="button" data-video-rate="1" class="viewbtn active">1× Normal</button><button type="button" data-video-rate="1.5" class="viewbtn">1,5× Hızlı</button>';
sceneBox.after(controls);
const watchBox=document.createElement('div');
watchBox.id='fitkocumWatchExport';
watchBox.style.cssText='display:none;margin:10px 0 16px;padding:14px;background:#173126;border:1px solid #4e8767;border-radius:14px;';
watchBox.innerHTML='<button id="fitkocumWatchExportBtn" type="button" style="width:100%;padding:14px;background:#bdef8e;border:0;border-radius:10px;color:#14261d;font-size:14px;font-weight:900">⌚ SAAT İÇİN VİDEOYU KAYDET</button>'
 +'<p style="font-size:12px;color:#d5e6d7;line-height:1.5;margin:10px 0 0">Watch Fit 5 Pro için kısa, sessiz MP4. Önce telefona kaydedilir. Huawei Sağlık → Cihazlar → Kadranlarım → Video yolundan saate yükle.</p>'
 +'<p id="fitkocumWatchExportStatus" role="status" style="margin:8px 0 0;font-size:12px;color:#bdef8e"></p>';
controls.after(watchBox);
const watchButton=watchBox.querySelector('#fitkocumWatchExportBtn');
const watchStatus=watchBox.querySelector('#fitkocumWatchExportStatus');
watchButton.addEventListener('click',()=>{
 if(!watchCurrent)return;
 if(!window.FitAndroid || typeof window.FitAndroid.exportWatchClip!=='function'){
   watchStatus.textContent='Saat videosunu dışa aktarmak için FitKoçum Android APK sürümünü kullan.';
   return;
 }
 watchButton.disabled=true;
 watchStatus.textContent='Saat videosu telefon galerisine kaydediliyor…';
 window.FitAndroid.exportWatchClip(watchCurrent);
});
window.FitWatchVideoExport={onResult:(ok,message)=>{
 watchButton.disabled=false;
 watchStatus.textContent=(ok?'✓ ':'⚠ ')+String(message||'');
}};
controls.querySelectorAll('[data-video-rate]').forEach(button=>button.onclick=()=>{
 viewer.playbackRate=Number(button.dataset.videoRate);
 controls.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));
});
const style=document.createElement('style');
style.textContent=[
 '#overlay.fitkocum-video-mode .viewcontrols,',
 '#overlay.fitkocum-video-mode .render-panel,',
 '#overlay.fitkocum-video-mode #athleteStudioPanel,',
 '#overlay.fitkocum-video-mode #musclePanel,',
 '#overlay.fitkocum-video-mode #techniqueCompare,',
 '#overlay.fitkocum-video-mode .scrub,',
 '#overlay.fitkocum-video-mode .formtips,',
 '#overlay.fitkocum-video-mode #real3dStatus,',
 '#overlay.fitkocum-video-mode #sceneError,',
 '#overlay.fitkocum-video-mode .scene-help,',
 '#overlay.fitkocum-video-mode .scene-label,',
 '#overlay.fitkocum-video-mode #pause,',
 '#overlay.fitkocum-video-mode #modelCanvas{display:none!important}',
 '#overlay.fitkocum-video-mode .scene{height:320px!important;display:flex;align-items:center;justify-content:center}',
 '#overlay.fitkocum-video-mode.fitkocum-text-only .scene{display:none!important}',
 '#overlay.fitkocum-video-mode .instructions{margin-top:17px}',
 '#fitkocumVideoControls .viewbtn{flex:1;padding:12px 5px;font-size:12px}'
].join('\n');
document.head.appendChild(style);
function stopVideo(){
 viewer.pause();
 viewer.removeAttribute('src');
 viewer.removeAttribute('poster');
 viewer.load();
 viewer.style.display='none';
 indicator.style.display='none';
 controls.style.display='none';
 watchBox.style.display='none';watchCurrent=null;watchButton.disabled=false;watchStatus.textContent='';
}
$('close').addEventListener('click',stopVideo);
overlay.addEventListener('click',e=>{if(e.target===overlay)stopVideo()});
function reset(){
 stopVideo();
 overlay.classList.add('fitkocum-video-mode');
 overlay.classList.remove('fitkocum-text-only');
 if(scene?.setPlaying)scene.setPlaying(false);
}
viewer.addEventListener('error',()=>{
 overlay.classList.add('fitkocum-text-only');
 controls.style.display='none';
 indicator.style.display='none';
 $('caution').textContent='Bu APK içindeki video oynatılamadı. Video dosyasını ve cihaz uyumluluğunu kontrol etmek gerekiyor; aşağıdaki hareket adımları kullanılabilir.';
});
viewer.addEventListener('playing',()=>{indicator.style.display='none'});
viewer.addEventListener('waiting',()=>{
 indicator.textContent='APK içindeki video açılıyor…';
 indicator.style.display='block';
});
openMove=function(id){
 const m=MOVES[id];if(!m)return;
 reset();
 selected=id;
 const clip=clips[id];
 $('title').textContent=m.name;
 $('sub').textContent=m.group+' · '+moveGoal(id);
 overlay.querySelector('.eyebrow').textContent=clip?'FitKoçum v'+BUILD+' · ÇEVRİMDIŞI VİDEO':'FitKoçum v'+BUILD+' · HAREKET ADIMLARI';
 $('steps').innerHTML=(m.steps||[]).map(s=>'<li>'+escapeText(s)+'</li>').join('');
 $('caution').textContent=clip?'Egzersiz videosu uygulamanın içinde kayıtlıdır. İnternet gerekmez. Video kişisel hareket tekniğini ölçmez.':'Bu hareketin teknik adımları aşağıdadır. Çevrimdışı video arşivindeki alternatifleri Hareket Değiştir bölümünden seçebilirsin.';
 $('techniqueCompare').hidden=true;$('athleteStudioPanel').hidden=true;$('musclePanel').hidden=true;
 const summary=refreshCoach(id);
 $('weight').value=summary.suggested.weight!==null?summary.suggested.weight:'';
 $('reps').value=summary.last?.reps??'';
 $('rir').value='';
 $('reps').closest('label').firstChild.nodeValue=id==='lib_plank'?'Süre (saniye)':'Tekrar';
 $('feedback').textContent='';
 overlay.hidden=false;
 document.body.style.overflow='hidden';
 if(!clip){
   overlay.classList.add('fitkocum-text-only');
   return;
 }
 const match=String(clip.video||'').match(/^offline-videos\/([a-z0-9-]+)\.mp4$/);
 watchCurrent=match && Object.prototype.hasOwnProperty.call(watchClips,match[1])?match[1]:null;
 watchBox.style.display=watchCurrent?'block':'none';
 watchStatus.textContent='';
 viewer.src=clip.video;
 if(clip.poster)viewer.poster=clip.poster;
 viewer.playbackRate=1;
 viewer.style.display='block';
 controls.style.display='flex';
 controls.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.videoRate==='1'));
 indicator.style.display='block';indicator.textContent='Çevrimdışı video açılıyor…';
 viewer.load();
 const result=viewer.play();
 if(result&&typeof result.catch==='function')
  result.catch(()=>{indicator.textContent='Videoyu başlatmak için oynat tuşuna dokun.';});
};
const previousUpdate=update;
update=function(){
 previousUpdate();
 document.querySelectorAll('#moveList .watch[data-id]').forEach(button=>{
  const m=MOVES[button.dataset.id];if(!m||m.kind==='cardio')return;
  button.textContent=clips[button.dataset.id]?'▶ VİDEO İZLE':'📖 ADIMLARI GÖR';
 });
};
const previousRender=renderLibrary;
renderLibrary=function(){
 previousRender();
 document.querySelectorAll('#realMoveList .watch[data-id]').forEach(button=>{
  button.textContent=clips[button.dataset.id]?'▶ VİDEO İZLE':'📖 ADIMLARI GÖR';
 });
};
renderLibrary();update();
})();