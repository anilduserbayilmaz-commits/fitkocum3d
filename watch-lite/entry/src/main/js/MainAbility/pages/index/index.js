/* FitKoçum Watch v4.2 Lite Wearable app prototype.
 * Local MP4 playback is UNVERIFIED on Watch Fit 5 Pro.
 * The watch face was verified, but a watch-app video decoder is distinct.
 * Phone sync needs a signed Wear Engine peer; not connected yet.
 */
import storage from '@system.storage';
import core from '../../utils/watch-state.js';

export default {
 data:{
  title:'BENCH PRESS',videoSrc:'/common/videos/0025.mp4',posterSrc:'/common/posters/0025.png',
  setCount:0,targetSets:3,restText:'Hazır',status:'Saat uygulaması test modu',
  moveIndex:0,showPoster:false,showRest:false,
  linkStatus:'Telefon bağlantısı henüz yok'
 },
 onInit(){
  this._state=core.fresh();
  this._saving=false;
  this._lastTap=0;
  this.renderMove();
  const self=this;
  storage.get({
   key:core.packKey,default:'',success:function(data){
    self._state=core.fromSaved(data);
    self.renderMove();
    self.refreshRest();
   },fail:function(){self.status='Kayıt okunamadı, yeni program açıldı';}
  });
  this._timer=setInterval(function(){self.refreshRest();},1000);
 },
 onDestroy(){
  if(this._timer)clearInterval(this._timer);
  this.saveProgress();
 },
 saveProgress(){
  if(!this._state)return;
  const value=core.toSaved(this._state);
  storage.set({key:core.packKey,value:value,
   fail:()=>{this.status='Set sayısı kaydedilemedi';}});
 },
 renderMove(){
  const item=core.current(this._state);
  this.title=item.title;
  this.videoSrc=item.video;
  this.posterSrc=item.poster;
  this.moveIndex=this._state.index;
  this.setCount=this._state.counts[this._state.index];
  this.targetSets=item.target;
  this.showPoster=false;
  this.refreshRest();
 },
 loadMove(index){
  this._state=core.choose(this._state,index);
  this.renderMove();
  this.saveProgress();
  this.status='Hareket '+(this._state.index+1)+' / '+core.MOVES.length;
 },
 previous(){this.loadMove(this._state.index-1);},
 next(){this.loadMove(this._state.index+1);},
 completeSet(){
  const now=Date.now();
  if(now-this._lastTap<650)return;
  this._lastTap=now;
  const result=core.complete(this._state,now);
  if(!result.event){
   this.status='Bu hareket için en fazla 10 set tutulabilir';
   return;
  }
  this._state=result.state;
  this.setCount=this._state.counts[this._state.index];
  this.status='Set yerel olarak sayıldı; telefon eşitlenmedi';
  this.saveProgress();
  this.refreshRest();
 },
 refreshRest(){
  if(!this._state)return;
  const left=core.restRemaining(this._state,Date.now());
  this.showRest=left>0;
  this.restText=left>0?core.restFormat(left):'Hazır';
  if(left===0&&this.status==='Dinleniyor')this.status='Dinlenme tamamlandı';
 },
 videoPrepared(){
  this.showPoster=false;
  this.status='Video hazır';
 },
 loopVideo(){
  try{this.$element('exerciseVideo').start();}
  catch(e){this.status='Video yeniden başlayamadı';}
 },
 videoError(){
  this.showPoster=true;
  this.status='Video bu saatte desteklenmeyebilir';
 },
 // Message interface is deliberately not attached to Bluetooth yet.
 // Configure Huawei Wear Engine SDK, App ID and fingerprints first.
 receivePhonePacket(raw){
  let event;
  try{event=typeof raw==='string'?JSON.parse(raw):raw;}catch(e){return false;}
  const result=core.onMessage(this._state,event,Date.now());
  if(!result.accepted)return false;
  this._state=result.state;
  this.renderMove();
  this.saveProgress();
  this.status='Test mesajı: '+event.type;
  return true;
 }
};
