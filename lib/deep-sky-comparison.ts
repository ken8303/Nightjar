import {deepSkyPosition,bestDeepSkySample,type DeepSkyObject,type DeepSkySample} from './deep-sky';
import {deepSkyMoon} from './deep-sky-moon';
import {A,bodyPosition,type Place} from './sky';
export function deepSkyOpportunity(samples:(DeepSkySample&{moonAltitude?:number})[],moonBelowOnly=false){
 const eligible=(sample:DeepSkySample&{moonAltitude?:number})=>sample.altitude>30&&sample.sun<=-18&&(!moonBelowOnly||(sample.moonAltitude!==undefined&&sample.moonAltitude<=0));
 const windows:{start:Date;end:Date;minutes:number}[]=[];
 for(let index=1;index<samples.length;index++){
  const previous=samples[index-1],current=samples[index],minutes=(+current.time-+previous.time)/60000;
  if(!eligible(previous)||!eligible(current)||minutes!==15)continue;
  const last=windows.at(-1);
  if(last&&+last.end===+previous.time){last.end=current.time;last.minutes+=minutes}else windows.push({start:previous.time,end:current.time,minutes});
 }
 return {best:bestDeepSkySample(samples.filter(eligible)),windows,minutes:windows.reduce((total,window)=>total+window.minutes,0)};
}
export function compareDeepSky(targets:DeepSkyObject[],date:Date,place:Place,moonBelowOnly=false){
 if(targets.length>6)throw Error('Compare up to six deep-sky targets at once.');
 const times=Array.from({length:97},(_,index)=>{const time=new Date(+date+index*900000);return {time,sun:bodyPosition(A.Body.Sun,time,place).altitude,moonAltitude:bodyPosition(A.Body.Moon,time,place).altitude}});
 const rows=targets.map(target=>{const samples=times.map(sample=>({...sample,...deepSkyPosition(target,sample.time,place)}));const opportunity=deepSkyOpportunity(samples,moonBelowOnly);return {target,samples,...opportunity,moonAtBest:opportunity.best?deepSkyMoon(target,opportunity.best.time,place):null}});
 return rows.sort((a,b)=>(b.best?.altitude??-Infinity)-(a.best?.altitude??-Infinity)||a.target.id.localeCompare(b.target.id));
}
