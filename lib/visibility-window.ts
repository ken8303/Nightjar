import {A,bodyPosition,skyBodies,type Place} from '@/lib/sky';
import {validObservingDate} from './observing-time';
export const minimumTargetAltitude=30;
export type VisibilitySample={time:Date;sun:number;altitude:number;azimuth:number};
export type VisibilitySamples={body:A.Body;positions:VisibilitySample[]};

// Rank the whole sampled window, including daylight. Twilight shortcuts are separate.
export function rankVisibilitySamples(rows:VisibilitySamples[]){
 return rows.flatMap(row=>{
  if(!row.positions.length)return [];
  const peakSample=row.positions.reduce((best,sample)=>sample.altitude>best.altitude?sample:best);
  if(!(peakSample.altitude>minimumTargetAltitude))return [];
  const best=row.positions.reduce<VisibilitySample|null>((best,sample)=>
   sample.sun<=-6&&sample.altitude>minimumTargetAltitude&&(!best||sample.altitude>best.altitude)?sample:best,null);
  return [{...row,peak:peakSample.altitude,peakSample,best}];
 }).sort((a,b)=>b.peak-a.peak||a.body.localeCompare(b.body));
}
export function planetVisibilityWindow(start:number,place:Place){
 if(!validObservingDate(new Date(start)))throw Error('Choose an observing time within UTC years 1–9999.');
 const times=Array.from({length:12},(_,i)=>new Date(start+i*3600000)).filter(validObservingDate);
 const hours=times.map(time=>{
  return {time,sun:bodyPosition(A.Body.Sun,time,place).altitude};
 });
 const samples=skyBodies.map(body=>({
  body,positions:hours.map(hour=>({...hour,...bodyPosition(body,hour.time,place)}))
 }));
 return {hours,rows:rankVisibilitySamples(samples)};
}
