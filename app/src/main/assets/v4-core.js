/* FitKoçum v4 — offline training engine; pure functions for testability.
 * No network access. Existing set records are never migrated or deleted.
 */
(function(root){
'use strict';
const DAYS=['pzt','sal','car','per','cum','cmt','paz'];
const KEY_ACTIVE='fitkocum_v4_active_session';
const KEY_COMPLETE='fitkocum_v4_completed_sessions';
const KEY_REST='fitkocum_v4_rest_default';
const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
const finite=v=>Number.isFinite(Number(v));
function safeDate(value){const d=new Date(value);return Number.isFinite(d.getTime())?d:null}
function dateStamp(value){const d=safeDate(value);return d?[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'):null}
function monday(value){
 const d=safeDate(value);if(!d)return null;
 d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));
 return dateStamp(d);
}
function sessionId(now=Date.now(),suffix=''){return 'fk4-'+now+'-'+String(suffix).replace(/[^a-z0-9]/gi,'').slice(0,16)}
function parseGoal(value,type='strength'){
 const raw=String(value||'');
 const groups=raw.match(/^\s*(\d+)\s*[×x]\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*(dk|min|sn)?/i);
 if(type==='cardio'){
   const duration=raw.match(/(\d+)\s*dk/i);
   return {sets:1,min:1,max:300,duration:duration?clamp(+duration[1],1,300):30};
 }
 if(groups)return {
  sets:clamp(+groups[1],1,10),
  min:clamp(+groups[2],1,100),
  max:clamp(+(groups[3]||groups[2]),1,100)
 };
 return {sets:3,min:8,max:12};
}
function start({dayKey,title,type,exerciseIds,goals={},now=new Date(),id=null}){
 if(!DAYS.includes(dayKey))throw Error('Unknown training day');
 if(type!=='strength'&&type!=='cardio')throw Error('Rest days have no guided session');
 const items=[...new Set((exerciseIds||[]).filter(x=>typeof x==='string'&&/^[a-z0-9_-]{1,96}$/i.test(x)))].slice(0,20);
 if(items.length===0)throw Error('There are no exercises for this day');
 const nowDate=safeDate(now);if(!nowDate)throw Error('Invalid start date');
 return {id:id||sessionId(nowDate.getTime(),Math.random().toString(36).slice(2,8)),
  dayKey,title:String(title||'Antrenman').slice(0,100),
  type,exerciseIds:items,goals:Object.fromEntries(items.map(x=>[x,parseGoal(goals[x],type)])),
  startedAt:nowDate.toISOString(),currentIndex:0,sets:[],restUntil:null,pausedRest:null};
}
function validate(data){
 if(!data||!/^fk4-[\w-]{2,90}$/.test(String(data.id))||!DAYS.includes(data.dayKey)
  ||!['strength','cardio'].includes(data.type)||!safeDate(data.startedAt)
  ||!Array.isArray(data.exerciseIds)||!data.exerciseIds.length||data.exerciseIds.length>20
  ||!Array.isArray(data.sets))return null;
 const allowed=new Set(data.exerciseIds);
 const sets=data.sets.filter(s=>s&&allowed.has(s.id)&&safeDate(s.date)&&typeof s.uid==='string'
  &&finite(s.reps)&&Number(s.reps)>0&&Number(s.reps)<=300&&finite(s.weight));
 return {...data,sets:sets.slice(-500),currentIndex:clamp(Number(data.currentIndex)||0,0,data.exerciseIds.length-1),
  restUntil:finite(data.restUntil)&&Number(data.restUntil)>0?Number(data.restUntil):null,
  pausedRest:finite(data.pausedRest)&&Number(data.pausedRest)>0?Number(data.pausedRest):null};
}
function createSet({id,weight,reps,rir=null,type='strength',uid,date=new Date(),sessionId:session}){
 const w=Number(weight),r=Number(reps),R=rir===''||rir===null?null:Number(rir),isCardio=type==='cardio';
 if(typeof id!=='string'||!id||!Number.isFinite(w)||w<0||w>500||
    !Number.isInteger(r)||r<1||r>(isCardio?300:100)||
    (!isCardio&&(R!==null&&(!Number.isInteger(R)||R<0||R>5))))throw Error('Invalid set values');
 const d=safeDate(date);if(!d)throw Error('Invalid set date');
 return {id,weight:isCardio?0:w,reps:r,rir:isCardio?null:R,unit:isCardio?'min':'reps',date:d.toISOString(),
   sessionId:session,uid:String(uid||sessionId(d.getTime(),Math.random().toString(36).slice(2,8)))};
}
function sessionStats(session,allRecords){
 const log=(allRecords||[]).filter(r=>r.sessionId===session.id);
 const volume=log.reduce((n,x)=>n+(x.unit==='min'?0:Number(x.weight||0)*Number(x.reps||0)),0);
 const duration=log.filter(x=>x.unit==='min').reduce((n,x)=>n+Number(x.reps||0),0);
 const countByExercise=Object.fromEntries(session.exerciseIds.map(id=>[id,log.filter(x=>x.id===id).length]));
 let target=0;
 for(const id of session.exerciseIds)target+=session.goals?.[id]?.sets||3;
 const achieved=Object.values(countByExercise).reduce((a,n)=>a+n,0);
 return {setCount:log.length,volume:Math.round(volume),cardioMinutes:duration,targetSets:target,
  completedSets:achieved,countByExercise,percent:target?clamp(Math.round(achieved/target*100),0,100):0};
}
function finish(session,records,at=new Date()){
 const d=safeDate(at);if(!d)throw Error('Invalid finish date');
 const stats=sessionStats(session,records);
 if(stats.setCount===0)throw Error('Save at least one set before finishing');
 return {id:session.id,dayKey:session.dayKey,type:session.type,title:session.title,
  startedAt:session.startedAt,finishedAt:d.toISOString(),
  exerciseIds:[...session.exerciseIds],setCount:stats.setCount,
  volume:stats.volume,cardioMinutes:stats.cardioMinutes};
}
function weeklyOverview(completed,now=new Date()){
 const start=monday(now),rows=DAYS.map(dayKey=>({
   dayKey,done:(completed||[]).some(x=>x.dayKey===dayKey&&monday(x.finishedAt)===start)
 }));
 return {weekOf:start,days:rows,completedCount:rows.filter(x=>x.done).length,
  target:5,percentage:Math.round(rows.filter(x=>x.done).length/5*100)};
}
function estimate1RM(record){
 const w=Number(record?.weight),r=Number(record?.reps);
 // Epley estimate is not useful for high repetitions, cardio or bodyweight.
 if(record?.unit==='min'||!Number.isFinite(w)||w<=0||!Number.isInteger(r)||r<1||r>10)return null;
 return Math.round((w*(1+r/30))*10)/10;
}
function bestFor(records,id){
 const rows=(records||[]).filter(x=>x.id===id&&x.unit!=='min'&&Number(x.weight)>0);
 if(!rows.length)return null;
 const bestWeight=Math.max(...rows.map(x=>Number(x.weight)));
 const estimates=rows.map(estimate1RM).filter(x=>x!==null);
 return {bestWeight,bestE1RM:estimates.length?Math.max(...estimates):null,sets:rows.length};
}
function trend(records,now=new Date(),weeks=8){
 const d=safeDate(now)||new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));
 const count=clamp(Number(weeks)||8,2,16);
 return Array.from({length:count},(_,i)=>{
  const dt=new Date(d);dt.setDate(dt.getDate()-7*(count-i-1));
  const stamp=dateStamp(dt);
  const sets=(records||[]).filter(x=>monday(x.date)===stamp);
  return {week:stamp,sets:sets.filter(x=>x.unit!=='min').length,
   volume:Math.round(sets.reduce((s,x)=>s+(x.unit==='min'?0:Number(x.weight||0)*Number(x.reps||0)),0)),
   cardioMinutes:sets.filter(x=>x.unit==='min').reduce((s,x)=>s+Number(x.reps||0),0)};
 });
}
function weeklyStreak(completed,now=new Date()){
 const d=safeDate(now)||new Date(),thisWeek=monday(d);
 const weeks=new Set((completed||[]).map(x=>monday(x.finishedAt)).filter(Boolean));
 let streak=0;
 for(let i=0;i<100;i++){
  const dt=new Date(thisWeek+'T12:00:00');dt.setDate(dt.getDate()-7*i);
  if(weeks.has(dateStamp(dt)))streak++;else if(i===0)continue;else break;
 }
 return streak;
}
root.FitV4Core={DAYS,KEY_ACTIVE,KEY_COMPLETE,KEY_REST,dateStamp,monday,parseGoal,start,validate,
 createSet,sessionStats,finish,weeklyOverview,estimate1RM,bestFor,trend,weeklyStreak};
})(window);
