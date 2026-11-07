/* FitKoçum 3D+ v3.1: video-first exercise viewer.
 * MoveKit's free sample grants use within apps; assets are packaged by CI
 * directly from the publisher. No raw clips are checked into this repository.
 * Only the two included sample videos are playable. All other exercises show
 * written coaching, without fake or biomechanically incorrect 3D animation.
 */
(function(){
'use strict';
const videoClips={
  movekit_pull_ups:MOVEKIT_CLIPS.movekit_pull_ups,
  movekit_dumbbell_chest_fly:MOVEKIT_CLIPS.movekit_dumbbell_chest_fly
};
Object.assign(videoClips, window.FitFreeVideoClips || {});
const overlay=$('overlay');
const sceneBox=$('modelCanvas').closest('.scene');
const dialog=overlay.querySelector('.dialog');
const viewer=document.createElement('video');
viewer.id='fitkocumVideo';
viewer.setAttribute('playsinline','');
viewer.setAttribute('webkit-playsinline','');
viewer.setAttribute('preload','metadata');
viewer.setAttribute('aria-label','Egzersiz gösterim videosu');
viewer.muted=true;
viewer.loop=true;
viewer.controls=true;
viewer.playsInline=true;
viewer.style.cssText='display:none;width:100%;height:100%;object-fit:contain;background:#090d12;border-radius:16px;';
sceneBox.appendChild(viewer);
const placeholder=document.createElement('div');
placeholder.id='fitkocumVideoPlaceholder';
placeholder.style.cssText='display:none;width:100%;height:100%;padding:32px 23px;box-sizing:border-box;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;color:#d4e1e6;background:radial-gradient(circle at 50% 45%,#223642,#0b141c);';
placeholder.innerHTML='<div style="font-size:38px;line-height:1">📖</div><strong style="font-size:18px">Bu hareket için video henüz eklenmedi</strong><span style="font-size:13px;line-height:1.6;color:#aec4cd">Önceki 3D canlandırmayı kaldırdık çünkü bazı hareketler gerçeği yansıtmıyordu. Aşağıdaki teknik adımlarını kullanabilirsin.</span>';
sceneBox.appendChild(placeholder);
const indicator=document.createElement('div');
indicator.id='fitkocumVideoStatus';
indicator.setAttribute('role','status');
indicator.style.cssText='display:none;position:absolute;bottom:12px;left:12px;right:12px;padding:9px 12px;background:#0b141ce8;border-radius:12px;font-size:12px;color:#e5f4f0;';
sceneBox.appendChild(indicator);
const controls=document.createElement('div');
controls.id='fitkocumVideoControls';
controls.style.cssText='display:none;gap:8px;margin:12px 0 15px;';
controls.innerHTML='<button type="button" data-video-rate="0.5" class="viewbtn">0,5× Yavaş</button><button type="button" data-video-rate="1" class="viewbtn active">1× Normal</button><button type="button" data-video-rate="1.5" class="viewbtn">1,5× Hızlı</button>';
sceneBox.after(controls);
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
 '#fitkocumVideoControls .viewbtn{flex:1;padding:12px 5px;font-size:12px}',
 '#overlay.fitkocum-video-mode .instructions{margin-top:17px}'
].join('\n');
document.head.appendChild(style);
function stopVideo(){
  viewer.pause();
  viewer.removeAttribute('src');
  viewer.removeAttribute('poster');
  viewer.load();
  indicator.style.display='none';
  viewer.style.display='none';
}
$('close').addEventListener('click',stopVideo);
overlay.addEventListener('click',e=>{if(e.target===overlay)stopVideo();});
function resetPlayer(){
  stopVideo();
  placeholder.style.display='none';
  controls.style.display='none';
  overlay.classList.add('fitkocum-video-mode');
  if(scene?.setPlaying)scene.setPlaying(false);
}
viewer.addEventListener('error',()=>{
  viewer.style.display='none';
  controls.style.display='none';
  placeholder.style.display='flex';
  placeholder.querySelector('strong').textContent='Video açılamadı';
  placeholder.querySelector('span').textContent='Video oynatılamadı. İnternet bağlantısını kontrol et veya başka bir hareket seç.';
});
viewer.addEventListener('playing',()=>{indicator.style.display='none'});
viewer.addEventListener('waiting',()=>{indicator.textContent='Video yükleniyor…';indicator.style.display='block'});
const defaultPlaceholderTitle='Bu hareket için video henüz eklenmedi';
const defaultPlaceholderText='Önceki 3D canlandırmayı kaldırdık çünkü bazı hareketler gerçeği yansıtmıyordu. Aşağıdaki teknik adımlarını kullanabilirsin.';
openMove=function(id){
  const m=MOVES[id];if(!m)return;
  resetPlayer();
  selected=id;
  const clip=videoClips[id];
  $('title').textContent=m.name;
  $('sub').textContent=m.group+' · '+moveGoal(id);
  overlay.querySelector('.eyebrow').textContent=clip?(clip.source?'ÜCRETSİZ VİDEO · ONLINE':'MOVEKIT · EGZERSİZ VİDEOSU'):'HAREKET REHBERİ';
  $('steps').innerHTML=(m.steps||[]).map(s=>'<li>'+escapeText(s)+'</li>').join('');
  $('caution').textContent=clip?
    (clip.source?'Ücretsiz çevrimiçi egzersiz videosu. Oynatmak için internet gereklidir. Teknik doğruluğu bağımsız olarak onaylanmamıştır.':'MoveKit tarafından hazırlanan lisanslı örnek video. Teknik, kişisel hareket açıklığı ve yük seçimin için bir uzman görüşü gerekebilir.'):
    'Bu hareket için uygun ücretsiz video henüz eşleştirilmedi. Teknik adımlar metin olarak sunulur; hatalı eski 3D model gösterilmez.';
  $('techniqueCompare').hidden=true;
  $('athleteStudioPanel').hidden=true;
  $('musclePanel').hidden=true;
  const summary=refreshCoach(id);
  $('weight').value=summary.suggested.weight!==null?summary.suggested.weight:'';
  $('reps').value=summary.last?.reps??'';
  $('rir').value='';
  $('reps').closest('label').firstChild.nodeValue=id==='lib_plank'?'Süre (saniye)':'Tekrar';
  $('feedback').textContent='';
  overlay.hidden=false;
  document.body.style.overflow='hidden';
  if(clip){
    placeholder.style.display='none';
    viewer.style.display='block';
    viewer.poster=clip.poster;
    viewer.src=clip.video;
    viewer.playbackRate=1;
    controls.style.display='flex';
    controls.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.videoRate==='1'));
    indicator.style.display='block';
    indicator.textContent='MoveKit video açılıyor…';
    viewer.load();
    const promise=viewer.play();
    if(promise && typeof promise.catch==='function')
      promise.catch(()=>{indicator.textContent='Başlatmak için videonun oynat tuşuna dokun.';});
  } else {
    placeholder.querySelector('strong').textContent=defaultPlaceholderTitle;
    placeholder.querySelector('span').textContent=defaultPlaceholderText;
    placeholder.style.display='flex';
  }
};
const priorUpdate=update;
update=function(){
  priorUpdate();
  // Weekly v3.1 still owns calendar, replacement and cardio buttons.
  document.querySelectorAll('#moveList .watch[data-id]').forEach(button=>{
    const m=MOVES[button.dataset.id];if(!m || m.kind==='cardio')return;
    button.textContent=videoClips[button.dataset.id]?'▶ VİDEO İZLE':'📖 HAREKET ADIMLARI';
  });
};
const priorRenderLibrary=renderLibrary;
renderLibrary=function(){
  priorRenderLibrary();
  document.querySelectorAll('#realMoveList .watch[data-id]').forEach(button=>{
    button.textContent=videoClips[button.dataset.id]?'▶ VİDEO İZLE':'📖 HAREKET ADIMLARI';
  });
};
renderLibrary();
update();
})();