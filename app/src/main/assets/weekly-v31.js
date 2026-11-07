/* FitKoçum 3D+ v3.1 — seven-day training program and direct exercise replacement.
   Loaded after the existing app script so previous set history and 3D viewer are retained. */
(function () {
  'use strict';
  const OVERRIDES_KEY = 'fitkocum_v31_weekly_overrides';
  const CUSTOM_V31_KEY = 'fitkocum_custom_program_v31';
  const WEEK = [
    {key:'pzt',name:'Pazartesi',short:'Pzt',type:'strength',title:'Göğüs · Omuz · Triceps',ids:['bench','incline','lib_dumbbell_shoulder_press','lib_lateral_raise','triceps','lib_overhead_tricep_extension','movekit_dumbbell_chest_fly']},
    {key:'sal',name:'Salı',short:'Sal',type:'cardio',title:'Kardiyo · Dayanıklılık',ids:['cardio_treadmill','cardio_bike']},
    {key:'car',name:'Çarşamba',short:'Çar',type:'strength',title:'Sırt · Biceps',ids:['pulldown','row','lib_bent_over_row','lib_bicep_curl','lib_hammer_curl','lib_plank','movekit_pull_ups']},
    {key:'per',name:'Perşembe',short:'Per',type:'rest',title:'Dinlenme',ids:[]},
    {key:'cum',name:'Cuma',short:'Cum',type:'strength',title:'Bacak · Kalça · Karın',ids:['lib_squat','legpress','lib_romanian_deadlift','legcurl','lib_calf_raise','lib_crunch']},
    {key:'cmt',name:'Cumartesi',short:'Cmt',type:'rest',title:'Dinlenme',ids:[]},
    {key:'paz',name:'Pazar',short:'Paz',type:'cardio',title:'Kardiyo · Aktif Gün',ids:['cardio_elliptical','cardio_walk']}
  ];
  const weekMap = Object.fromEntries(WEEK.map(d=>[d.key,d]));
  const cleanIds = (raw,type) => {
    if (!Array.isArray(raw)) return null;
    const allowed = id=>typeof id==='string' && Object.prototype.hasOwnProperty.call(MOVES,id)
      && (type!=='cardio' || MOVES[id].kind==='cardio' || (id.startsWith('mobility_') && window.FitMotionMeta?.[id.slice(9)]?.category==='cardio'));
    return [...new Set(raw.filter(allowed))].slice(0,16);
  };

  Object.keys(DAYS).forEach(k=>delete DAYS[k]);
  for(const d of WEEK)DAYS[d.key]={title:d.name+' · '+d.title,ids:[...d.ids],type:d.type};
  let savedOverrides={};
  try{savedOverrides=JSON.parse(localStorage.getItem(OVERRIDES_KEY)||'{}')||{}}catch{}
  for(const d of WEEK){
    const ids=cleanIds(savedOverrides[d.key],d.type);
    if(d.type!=='rest' && ids)DAYS[d.key].ids=ids;
  }

  // v3.0 A/B/C custom programs stay stored under their old key; v3.1 uses a
  // different key and always keeps the user's seven calendar days.
  let savedCustom={};
  try{savedCustom=JSON.parse(localStorage.getItem(CUSTOM_V31_KEY)||'{}')||{}}catch{}
  customDays={};
  for(const d of WEEK){
    const raw=savedCustom[d.key];
    const ids=d.type==='rest'?[]:(cleanIds(raw?.ids,d.type)||[...DAYS[d.key].ids]);
    const goals={};
    for(const id of ids){
      const g=raw?.goals?.[id];
      if(g && Number.isInteger(+g.sets) && +g.sets>=1 && +g.sets<=10 && typeof g.reps==='string')
        goals[id]={sets:+g.sets,reps:g.reps.slice(0,22)};
    }
    customDays[d.key]={title:typeof raw?.title==='string'?raw.title.slice(0,48):DAYS[d.key].title,ids,goals};
  }
  saveCustom=function(){
    try{localStorage.setItem(CUSTOM_V31_KEY,JSON.stringify(customDays));$('customStatus').textContent='✓ Kaydedildi.'}
    catch{$('customStatus').textContent='Kayıt alanına ulaşılamadı.'}
  };
  if(programMode==='classic'){
    programMode='3d';
    try{localStorage.setItem('fitkocum_program_mode','3d')}catch{}
  }
  const todayKey=['paz','pzt','sal','car','per','cum','cmt'][new Date().getDay()];
  if(!weekMap[day])day=todayKey;
  // Old A/B/C saved day is intentionally not reused.
  try{const old=localStorage.getItem('fitkocum3d_day');if(weekMap[old])day=old}catch{}
  const style=document.createElement('style');
  style.textContent=[
    '.days{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}',
    '.day{padding:10px 3px;font-size:12px;min-height:59px}',
    '.day .v31-tag{display:block;font-size:9px;font-weight:650;margin-top:4px;opacity:.74}',
    '.day.v31-rest{border-style:dashed}',
    '.day.v31-cardio:not(.active){background:#182d34}',
    '.v31-mini-btn{border:1px solid #526675;color:#d8ebf0;background:#21323f;border-radius:10px;font-size:11px;padding:8px 9px;font-weight:800}',
    '.v31-bottom{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;padding:8px 2px 10px}',
    '.v31-modal[hidden]{display:none!important}',
    '.v31-modal{position:fixed;inset:0;background:#050a0dcc;z-index:9999;display:grid;place-items:end center;padding:12px}',
    '.v31-dialog{background:#17232d;color:#f3f8f9;border:1px solid #526170;border-radius:22px 22px 16px 16px;width:min(520px,100%);max-height:88dvh;display:flex;flex-direction:column;padding:18px;box-shadow:0 15px 45px #0008}',
    '.v31-dialog h3{margin:0 0 6px;font-size:19px}',
    '.v31-dialog p{font-size:12px;color:#afc1cb;line-height:1.5}',
    '.v31-dialog input{width:100%;background:#0e1922;border:1px solid #506270;color:white;border-radius:12px;padding:13px;font-size:15px}',
    '.v31-results{overflow:auto;min-height:50px;max-height:47dvh;margin-top:12px}',
    '.v31-option{width:100%;text-align:left;background:#22313c;border:1px solid #405361;border-radius:12px;padding:12px 13px;color:#f5f9fa;margin:0 0 8px}',
    '.v31-option b{display:block;font-size:13px}.v31-option small{display:block;color:#aec0c8;margin-top:4px}',
    '.v31-dialog-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px}',
    '.v31-primary{background:#bdf18a;color:#142019;border:0;border-radius:12px;font-weight:850;padding:12px 16px}',
    '.v31-muted{color:#aac0c4;font-size:12px}',
    '@media(max-width:365px){.day{font-size:11px}.days{gap:5px}}'
  ].join('\n');
  document.head.appendChild(style);

  const picker=document.createElement('div');
  picker.className='v31-modal';picker.id='v31Picker';picker.hidden=true;
  picker.innerHTML='<section class="v31-dialog" role="dialog" aria-modal="true" aria-labelledby="v31PickerTitle">'
    +'<h3 id="v31PickerTitle">Hareket değiştir</h3><p id="v31PickerHint"></p>'
    +'<input id="v31PickerSearch" type="search" placeholder="390 hareket arasında ara…" autocomplete="off" aria-label="Hareket ara">'
    +'<div class="v31-results" id="v31PickerList"></div>'
    +'<div class="v31-dialog-actions"><small class="v31-muted" id="v31PickerCount"></small><button class="v31-mini-btn" id="v31PickerClose">Vazgeç</button></div>'
    +'</section>';
  document.body.appendChild(picker);
  const cardioModal=document.createElement('div');
  cardioModal.className='v31-modal';cardioModal.id='v31CardioModal';cardioModal.hidden=true;
  cardioModal.innerHTML='<section class="v31-dialog" role="dialog" aria-modal="true" aria-labelledby="v31CardioTitle">'
    +'<h3 id="v31CardioTitle">Kardiyo süresi</h3><p id="v31CardioHint">Tamamladığın süreyi dakika olarak gir.</p>'
    +'<label for="v31Minutes" style="font-size:12px;color:#b8cdd4">Dakika</label>'
    +'<input id="v31Minutes" type="number" min="1" max="300" value="30" inputmode="numeric">'
    +'<div id="v31CardioStatus" class="feedback" role="status"></div>'
    +'<div class="v31-dialog-actions"><button class="v31-mini-btn" id="v31CardioClose">İptal</button><button class="v31-primary" id="v31CardioSave">✓ Süreyi kaydet</button></div>'
    +'</section>';
  document.body.appendChild(cardioModal);
  let swapIndex=-1,cardioId=null;
  const persist=()=>{
    if(programMode==='custom'){saveCustom();return}
    const data={};
    for(const d of WEEK)if(d.type!=='rest' && JSON.stringify(DAYS[d.key].ids)!==JSON.stringify(d.ids))data[d.key]=DAYS[d.key].ids;
    try{localStorage.setItem(OVERRIDES_KEY,JSON.stringify(data))}catch{}
  };
  const targetDays=()=>programMode==='custom'?customDays:DAYS;
  const isCardio=id=>MOVES[id]?.kind==='cardio';
  function openPicker(index){
    if(weekMap[day].type==='rest')return;
    swapIndex=index;
    $('v31PickerTitle').textContent=index<0?'Hareket ekle':'Hareket değiştir';
    $('v31PickerHint').textContent=weekMap[day].name+' · '+(weekMap[day].type==='cardio'?'Yalnızca kardiyo hareketleri gösteriliyor.':'Kütüphanedeki hareketlerden istediğini seç.');
    $('v31PickerSearch').value='';
    picker.hidden=false;document.body.style.overflow='hidden';
    showChoices();$('v31PickerSearch').focus();
  }
  function closePicker(){picker.hidden=true;document.body.style.overflow='';}
  function showChoices(){
    const query=$('v31PickerSearch').value.toLocaleLowerCase('tr-TR').trim();
    const ids=targetDays()[day].ids;
    const all=Object.entries(MOVES).filter(([id,m])=>
       (weekMap[day].type!=='cardio' ? m.kind!=='cardio' :
         (m.kind==='cardio'||id.startsWith('mobility_')&&window.FitMotionMeta?.[id.slice(9)]?.category==='cardio')) &&
       (m.name+' '+m.group).toLocaleLowerCase('tr-TR').includes(query) &&
       (swapIndex>=0 ? (id===ids[swapIndex]||!ids.includes(id)) : !ids.includes(id))
    );
    $('v31PickerCount').textContent=all.length+' seçenek · ilk 45 gösteriliyor';
    $('v31PickerList').innerHTML=all.slice(0,45).map(([id,m])=>'<button type="button" class="v31-option" data-pick="'+escapeText(id)+'"><b>'
      +escapeText(m.name)+'</b><small>'+escapeText(m.group)+' · '+escapeText(m.sets||'')+'</small></button>').join('')
      ||'<p>Sonuç bulunamadı. Başka bir hareket adı deneyebilirsin.</p>';
    $('v31PickerList').querySelectorAll('[data-pick]').forEach(button=>button.onclick=()=>{
      const id=button.dataset.pick,entry=targetDays()[day];
      if(!MOVES[id]||entry.ids.includes(id)&&entry.ids[swapIndex]!==id)return;
      if(swapIndex<0){if(entry.ids.length>=16)return;entry.ids.push(id)}
      else {const old=entry.ids[swapIndex];entry.ids[swapIndex]=id;if(programMode==='custom'){delete entry.goals[old];entry.goals[id]={sets:3,reps:'8–12'}}}
      persist();closePicker();update();
    });
  }
  $('v31PickerSearch').addEventListener('input',showChoices);
  $('v31PickerClose').onclick=closePicker;
  picker.onclick=e=>{if(e.target===picker)closePicker()};
  $('v31CardioClose').onclick=()=>{cardioModal.hidden=true;document.body.style.overflow=''};
  cardioModal.onclick=e=>{if(e.target===cardioModal)$('v31CardioClose').click()};
  function openCardio(id){
    cardioId=id;
    $('v31CardioTitle').textContent=MOVES[id].name;
    $('v31CardioHint').textContent='Tamamladığın süreyi dakika olarak kaydet. Burada gerçek 3D animasyon yok.';
    $('v31CardioStatus').textContent='';
    $('v31Minutes').value=String(Number(MOVES[id].sets.match(/(\d+)\s*dk/)?.[1]||30));
    cardioModal.hidden=false;document.body.style.overflow='hidden';
    $('v31Minutes').focus();
  }
  $('v31CardioSave').onclick=()=>{
    if(!cardioId)return;
    const n=Number($('v31Minutes').value);
    if(!Number.isInteger(n)||n<1||n>300){$('v31CardioStatus').textContent='1 ile 300 arasında dakika gir.';return}
    const next=[...records,{id:cardioId,weight:0,reps:n,rir:null,unit:'min',date:new Date().toISOString()}];
    try{localStorage.setItem('fitkocum3d_records',JSON.stringify(next))}catch{$('v31CardioStatus').textContent='Telefona kayıt yapılamadı.';return}
    records=next;cardioModal.hidden=true;document.body.style.overflow='';update();
  };

  renderDayTabs=function(){
    const ds=currentDays();
    if(!ds[day])day=todayKey;
    $('dayTabs').innerHTML=WEEK.map(d=>'<button type="button" class="day'+(d.key===day?' active':'')+
      (d.type==='rest'?' v31-rest':d.type==='cardio'?' v31-cardio':'')+
      '" data-day="'+d.key+'" aria-label="'+d.name+' '+(d.type==='rest'?'Dinlenme':d.type==='cardio'?'Kardiyo':'Ağırlık')+'">'
      +d.short+'<span class="v31-tag">'+(d.type==='rest'?'DİNLEN':d.type==='cardio'?'KARDİYO':'AĞIR')+'</span></button>').join('');
    $('dayTabs').querySelectorAll('[data-day]').forEach(button=>button.onclick=()=>{
      day=button.dataset.day;try{localStorage.setItem('fitkocum3d_day',day)}catch{}update();
    });
  };
  const originalUpdate=update;
  update=function(){
    originalUpdate();
    $('chooseClassic').hidden=true;
    $('chooseClassic').style.display='none';
    $('customAddDay').style.display='none';
    $('customRemoveDay').style.display='none';
    $('modeInfo').textContent=programMode==='custom'?'Kendi haftalık programın: her günün hareketlerini ve hedeflerini değiştirebilirsin.':'Haftada 5 antrenman: Pzt/Çrş/Cum ağırlık, Sal/Paz kardiyo. Perşembe ve Cumartesi dinlenme.';
    const info=weekMap[day];
    $('dayCaption').textContent=info.name+' · '+info.title+' · '+(info.type==='rest'?'Dinlenme':targetDays()[day].ids.length+' hareket');
    // A cardio session uses "minutes", not repetitions or a loaded weight.
    $('logs').querySelectorAll('.history-item').forEach(el=>{
      const name=el.querySelector('strong')?.textContent||'';
      const cardio=Object.entries(MOVES).find(([id,m])=>m.kind==='cardio'&&m.name===name);
      if(!cardio)return;
      const small=el.querySelector('small');if(small)small.textContent=small.textContent.replace(/0 kg × (\d+) tekrar/, '$1 dk');
    });
    if(info.type==='rest'){
      $('moveList').innerHTML='<article class="panel" style="margin-top:12px"><h3>🌙 Dinlenme günü</h3><p>Bugün programlı ağırlık veya kardiyo yok. Uyku, beslenme ve toparlanmaya odaklan.</p></article>';
      return;
    }
    const cards=$('moveList').querySelectorAll('article.move');
    const ids=targetDays()[day].ids;
    cards.forEach((card,index)=>{
      const id=ids[index];
      if(!id)return;
      const actions=card.querySelector('.move-actions');
      const button=card.querySelector('button.watch');
      if(isCardio(id) && button){
        const last=exerciseSummary(id).last;
        const mini=card.querySelector('.coach-mini');
        if(mini)mini.textContent=last?'Son: '+last.reps+' dk':'';
        button.textContent='⏱ Süre kaydet';
        button.onclick=()=>openCardio(id);
        const art=card.querySelector('.move-art');
        if(art)art.innerHTML='<span>❤️</span>';
      }
      if(actions){
        const change=document.createElement('button');change.type='button';
        change.className='v31-mini-btn';change.textContent='↔ Değiştir';
        change.setAttribute('aria-label',MOVES[id].name+' hareketini değiştir');
        change.onclick=()=>openPicker(index);actions.appendChild(change);
      }
    });
    const footer=document.createElement('div');footer.className='v31-bottom';
    footer.innerHTML='<button type="button" class="v31-mini-btn" id="v31Add">+ Hareket ekle</button>'
      +'<button type="button" class="v31-mini-btn" id="v31Reset">↺ Günü sıfırla</button>';
    $('moveList').appendChild(footer);
    $('v31Add').onclick=()=>openPicker(-1);
    $('v31Reset').onclick=()=>{
      const target=targetDays()[day];target.ids=[...weekMap[day].ids];
      if(programMode==='custom')target.goals={};
      persist();update();
    };

  };
  update();
})();