import {aboveLocalHorizon,validLocalHorizon,type LocalHorizon} from './local-horizon';
import {isFullDarknessInterval} from './darkness-remaining';
import {deepSkySampleTimes,bestDeepSkySample,type DeepSkyObject,type DeepSkySample} from './deep-sky';
import {deepSkyMoon} from './deep-sky-moon';
import {A,bodyPosition,j2000Projector,type Place,sunAltitude} from './sky';
export function deepSkyOpportunity(samples:(DeepSkySample&{moonAltitude?:number})[],moonBelowOnly=false,intervalIsDark:(start:Date,end:Date)=>boolean=()=>true,horizon?:LocalHorizon){
 const eligible=(sample:DeepSkySample&{moonAltitude?:number})=>sample.altitude>30&&sample.sun< -18&&aboveLocalHorizon(sample.altitude,sample.azimuth,horizon)&&(!moonBelowOnly||(sample.moonAltitude!==undefined&&sample.moonAltitude<=0));
 const windows:{start:Date;end:Date;minutes:number}[]=[];
 for(let index=1;index<samples.length;index++){
  const previous=samples[index-1],current=samples[index],minutes=(+current.time-+previous.time)/60000;
  if(!eligible(previous)||!eligible(current)||minutes!==15||!intervalIsDark(previous.time,current.time))continue;
  const last=windows.at(-1);
  if(last&&+last.end===+previous.time){last.end=current.time;last.minutes+=minutes}else windows.push({start:previous.time,end:current.time,minutes});
 }
 return {best:bestDeepSkySample(samples.filter(eligible)),windows,minutes:windows.reduce((total,window)=>total+window.minutes,0)};
}
export function compareDeepSky(targets:DeepSkyObject[],date:Date,place:Place,moonBelowOnly=false,horizon?:LocalHorizon){
 if(horizon&&!validLocalHorizon(horizon))throw Error('Enter eight horizon heights between 0 and 90 degrees.');
 if(targets.length>6)throw Error('Compare up to six deep-sky targets at once.');
 if(!targets.length)return [];
 const times=deepSkySampleTimes(date).map(time=>{return {time,project:j2000Projector(time,place),sun:sunAltitude(time,place),moonAltitude:bodyPosition(A.Body.Moon,time,place).altitude}});
 // All targets share these times and site; search each interval only once.
 const darkIntervals=new Map<number,boolean>();
 const intervalIsDark=(start:Date,end:Date)=>{
  if(!darkIntervals.has(+start))darkIntervals.set(+start,isFullDarknessInterval(start,end,place));
  return darkIntervals.get(+start)!;
 };
 const rows=targets.map(target=>{const samples=times.map(({project,...sample})=>({...sample,...project(target.ra,target.dec)}));const opportunity=deepSkyOpportunity(samples,moonBelowOnly,intervalIsDark,horizon);return {target,samples,...opportunity,moonAtBest:opportunity.best?deepSkyMoon(target,opportunity.best.time,place):null}});
 return rows.sort((a,b)=>(b.best?.altitude??-Infinity)-(a.best?.altitude??-Infinity)||a.target.id.localeCompare(b.target.id));
}
