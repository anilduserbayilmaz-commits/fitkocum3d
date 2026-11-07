/* Experimental watch-only 5-MP4 playlist. Not yet tested on hardware.
 * Local set counting does NOT synchronize to the Android app.
 */
var moves=[
 {title:'BENCH PRESS',file:'/common/videos/0025.mp4'},
 {title:'LAT PULLDOWN',file:'/common/videos/drv-cable-bar-lateral-pulldown-wide-shoulder-grip.mp4'},
 {title:'SQUAT',file:'/common/videos/1435.mp4'},
 {title:'INCLINE PRESS',file:'/common/videos/0314.mp4'},
 {title:'BICEPS CURL',file:'/common/videos/0294.mp4'}
];
export default {
 data:{title:'BENCH PRESS',videoSrc:moves[0].file,setCount:0,targetSets:3,restText:'Hazır',status:'Video testi · Yerel MP4',moveIndex:0},
 onInit(){this.loadMove(0);},
 onDestroy(){if(this._restHandle)clearInterval(this._restHandle);},
 loadMove(i){
   if(i<0||i>=moves.length)return;
   this.moveIndex=i;this.title=moves[i].title;this.videoSrc=moves[i].file;
   this.setCount=0;this.restText='Hazır';this.status='Video '+(i+1)+' / '+moves.length;
   if(this._restHandle){clearInterval(this._restHandle);this._restHandle=null;}
 },
 previous(){this.loadMove((this.moveIndex+moves.length-1)%moves.length);},
 next(){this.loadMove((this.moveIndex+1)%moves.length);},
 completeSet(){
   if(this.setCount<this.targetSets)this.setCount++;
   var self=this;
   if(this._restHandle)clearInterval(this._restHandle);
   this._restEnd=Date.now()+90000;this.restText='01:30';
   this.status='Set yalnızca saatte sayıldı';
   this._restHandle=setInterval(function(){
      var left=Math.max(0,Math.ceil((self._restEnd-Date.now())/1000));
      self.restText=('0'+Math.floor(left/60)).slice(-2)+':'+('0'+(left%60)).slice(-2);
      if(left===0){clearInterval(self._restHandle);self._restHandle=null;self.status='Dinlenme tamamlandı';}
   },1000);
 },
 loopVideo(){
   try{this.$refs.exerciseVideo.start();}catch(e){this.status='Video döngüsü desteklenmedi';}
 },
 videoError(){this.status='Bu saatte uygulama içi MP4 desteklenmeyebilir';}
};
