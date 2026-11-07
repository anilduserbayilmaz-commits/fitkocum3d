/* FitKoçum Watch v4.2 core.
 * Pure state transitions: no Bluetooth, UI or storage dependency.
 * The phone remains authoritative for confirmed strength-training records.
 */
const MOVES=[
 {id:'0025',title:'BENCH PRESS',video:'/common/videos/0025.mp4',poster:'/common/posters/0025.png',target:3},
 {id:'drv-cable-bar-lateral-pulldown-wide-shoulder-grip',title:'LAT PULLDOWN',video:'/common/videos/drv-cable-bar-lateral-pulldown-wide-shoulder-grip.mp4',poster:'/common/posters/drv-cable-bar-lateral-pulldown-wide-shoulder-grip.png',target:3},
 {id:'1435',title:'SQUAT',video:'/common/videos/1435.mp4',poster:'/common/posters/1435.png',target:3},
 {id:'0314',title:'INCLINE PRESS',video:'/common/videos/0314.mp4',poster:'/common/posters/0314.png',target:3},
 {id:'0294',title:'BICEPS CURL',video:'/common/videos/0294.mp4',poster:'/common/posters/0294.png',target:3}
];
const limit=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
const validId=x=>MOVES.some(m=>m.id===x);
const packKey='fitkocum_v42';
function fresh(){
 return {index:0,counts:[0,0,0,0,0],restUntil:0,sequence:0,processed:[],pending:[]};
}
function fromSaved(raw){
 const state=fresh();
 if(typeof raw!=='string'||raw.length>128||raw.indexOf('4;')!==0)return state;
 const parts=raw.split(';');
 if(parts.length!==5)return state;
 const nums=parts[2].split(',');
 if(nums.length!==MOVES.length||nums.some(x=>!/^\d+$/.test(x)))return state;
 if(!/^\d+$/.test(parts[1])||!/^\d+$/.test(parts[3])||!/^\d+$/.test(parts[4]))return state;
 state.index=limit(+parts[1],0,MOVES.length-1);
 state.counts=nums.map(x=>limit(+x,0,10));
 state.restUntil=limit(+parts[3],0,9999999999999);
 state.sequence=limit(+parts[4],0,999999999);
 return state;
}
function toSaved(state){
 const compact=['4',limit(state.index,0,MOVES.length-1),state.counts.map(x=>limit(x,0,10)).join(','),
  Math.floor(limit(state.restUntil,0,9999999999999)),Math.floor(limit(state.sequence,0,999999999))].join(';');
 if(compact.length>128)throw Error('Storage exceeds Lite Wearable limit');
 return compact;
}
function current(state){return MOVES[limit(state.index,0,MOVES.length-1)];}
function choose(state,index){
 const next={...state,index:((Math.trunc(index)%MOVES.length)+MOVES.length)%MOVES.length};
 return next;
}
function restRemaining(state,now){return Math.max(0,Math.ceil((state.restUntil-now)/1000));}
function restFormat(seconds){
 return ('0'+Math.floor(seconds/60)).slice(-2)+':'+('0'+seconds%60).slice(-2);
}
function complete(state,now,origin='watch'){
 const updated={...state,counts:state.counts.slice()};
 const move=current(state),i=updated.index;
 if(updated.counts[i]>=10)return {state:updated,event:null};
 updated.counts[i]++;
 updated.restUntil=now+90000;
 updated.sequence++;
 const event={
  v:1,type:'set.completed',
  messageId:origin+'-'+now+'-'+updated.sequence,
  payload:{exerciseId:move.id,setNumber:updated.counts[i],occurredAt:now}
 };
 updated.pending=[...state.pending,event].slice(-30);
 return {state:updated,event};
}
function validateMessage(message){
 if(!message||message.v!==1||typeof message.type!=='string'
   ||typeof message.messageId!=='string'||message.messageId.length<4||message.messageId.length>100
   ||!message.payload||typeof message.payload!=='object')return false;
 const p=message.payload;
 switch(message.type){
  case 'exercise.select':return validId(p.exerciseId);
  case 'rest.start':return Number.isInteger(p.seconds)&&p.seconds>=0&&p.seconds<=300;
  case 'ack':return typeof p.messageId==='string'&&p.messageId.length>=4&&p.messageId.length<=100;
  case 'session.next':return p.direction===1||p.direction===-1;
  case 'set.completed':return validId(p.exerciseId)&&Number.isInteger(p.setNumber)&&p.setNumber>=1&&p.setNumber<=10&&Number.isFinite(p.occurredAt);
  default:return false;
 }
}
function onMessage(state,message,now){
 if(!validateMessage(message))return {state,accepted:false,reason:'invalid'};
 if(state.processed.includes(message.messageId))return {state,accepted:false,reason:'duplicate'};
 let next={...state,processed:[...state.processed,message.messageId].slice(-30)};
 const p=message.payload;
 if(message.type==='exercise.select')next.index=MOVES.findIndex(m=>m.id===p.exerciseId);
 if(message.type==='session.next')next=choose(next,next.index+p.direction);
 if(message.type==='rest.start')next.restUntil=now+p.seconds*1000;
 if(message.type==='ack')next.pending=state.pending.filter(e=>e.messageId!==p.messageId);
 // Incoming set.completed never overwrites local counts: the phone decides
 // whether a set is accepted, and sends an ACK separately.
 return {state:next,accepted:true};
}
export default {
 MOVES,packKey,fresh,fromSaved,toSaved,current,choose,restRemaining,restFormat,complete,
 validateMessage,onMessage
};
