import {A, Place, bodyPosition, hourBelowAltitude, moonInfo, scoreAt} from './sky';

import {utcDate} from './utc-date';

type Hourly={time:number[];cloud_cover:(number|null)[]};
export type NightOutlook={key:string;darkHours:number;forecastHours:number;best:{date:Date;hours:number;score:number;cloud:number;moonAbove:boolean;moonIllumination:number}|null};

function localNightKey(date:Date,formatter:Intl.DateTimeFormat){
 const parts=formatter.formatToParts(date);
 const number=(type:string)=>Number(parts.find(part=>part.type===type)?.value);
 const localYear=parts.find(part=>part.type==='era')?.value==='BC'?1-number('year'):number('year');
 const night=utcDate(localYear,number('month')-1,number('day')-(number('hour')<12?1:0));
 return night.toISOString().slice(0,10);
}
export function sevenNightOutlook(hourly:Hourly,place:Place,from=new Date()):NightOutlook[]{
 const formatter=new Intl.DateTimeFormat('en-US',{timeZone:place.timezone||'UTC',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',hourCycle:'h23',era:'short'});
 const groups=new Map<string,{date:Date;cloud:number|null;score:number|null}[]>();
 for(let i=0;i<hourly.time.length;i++){
  const date=new Date(hourly.time[i]*1000);
  if(!Number.isFinite(+date)||+date<+from||bodyPosition(A.Body.Sun,date,place).altitude>=-18)continue;
  const key=localNightKey(date,formatter);
  const cloud=hourly.cloud_cover?.[i],valid=typeof cloud==='number'&&Number.isFinite(cloud)&&cloud>=0&&cloud<=100;
  const samples=groups.get(key)||[];
  samples.push({date,cloud:valid?cloud:null,score:valid?scoreAt(cloud,date,place):null});
  groups.set(key,samples);
 }
 const fullHours=new Map<number,boolean>();
 function fullDarkHour(start:Date){
  const instant=+start;
  if(!fullHours.has(instant)){
   // Include the interval end: a dark hourly sample can still precede dawn.
   fullHours.set(instant,hourBelowAltitude(A.Body.Sun,start,place,-18));
  }
  return fullHours.get(instant)!;
 }
 return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).slice(0,7).map(([key,samples])=>{
  let choice:{date:Date;hours:number;score:number;cloud:number}|null=null;
  for(let i=0;i<samples.length;i++){
   const first=samples[i],second=samples[i+1];
   if(first.score===null||first.cloud===null||!fullDarkHour(first.date))continue;
   const adjacent=Boolean(second&&second.score!==null&&second.cloud!==null&&+second.date-+first.date===3600000&&fullDarkHour(second.date));
   const hours=adjacent?2:1;
   const score=adjacent?Math.round((first.score+second.score!)/2):first.score;
   const cloud=adjacent?Math.round((first.cloud+second.cloud!)/2):first.cloud;
   if(!choice||hours>choice.hours||(hours===choice.hours&&score>choice.score))choice={date:first.date,hours,score,cloud};
  }
  const moon=choice?moonInfo(choice.date,place):null;
  return {key,darkHours:samples.length,forecastHours:samples.filter(sample=>sample.score!==null).length,best:choice&&moon?{...choice,moonAbove:moon.altitude>0,moonIllumination:moon.illumination}:null};
 });
}

export function bestNightWindow(nights:NightOutlook[]):NightOutlook|null{
 return nights.reduce<NightOutlook|null>((best,night)=>{
  if(!night.best)return best;
  if(!best?.best||night.best.score>best.best.score||night.best.score===best.best.score&&night.best.hours>best.best.hours)return night;
  return best;
 },null);
}
