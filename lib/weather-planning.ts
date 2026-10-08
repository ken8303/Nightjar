import {type Place,scoreAt} from './sky';
import {type weatherHours} from './weather-hours';
type Hour=ReturnType<typeof weatherHours>[number];
const validCloud=(value:number|null):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const validScore=(value:number|null):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
export function forecastPlanning(hours:readonly Hour[],date:Date,place:Place){
 const current=hours.find(hour=>+hour.date<=+date&&+date<+hour.date+3600000),score=current&&validCloud(current.cloud)?scoreAt(current.cloud,date,place):null;
 let best:Hour|null=null,scored=0;
 for(const hour of hours){
  if(hour!==current&&+hour.date<+date)continue;
  const candidate=hour===current?{...hour,date:new Date(+date),score}:hour;
  if(!validCloud(candidate.cloud)||!validScore(candidate.score))continue;
  scored++;
  if(!best||best.score===null||candidate.score>best.score)best=candidate;
 }
 return {current,score,best,total:hours.length,scored,missing:hours.length-scored};
}
export function forecastHourLabel(date:Date,timezone:string){
 const formatter=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:timezone,timeZoneName:'shortOffset'});
 const parts=formatter.formatToParts(date),part=(type:string)=>parts.find(value=>value.type===type)?.value||'';
 return {time:`${part('hour')}:${part('minute')}`,detail:`${part('day')} ${part('month')} · ${part('timeZoneName')}`,full:formatter.format(date)};
}
