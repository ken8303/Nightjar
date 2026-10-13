import {validObservingDate} from './observing-time';

export function photographyWindowLabels(start:Date,end:Date,timezone:string){
 if(!validObservingDate(start)||!validObservingDate(end)||+end<=+start)throw Error('Invalid photography window label.');
 const era=start.getUTCFullYear()<=1||end.getUTCFullYear()<=1;
 const clock=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:timezone,timeZoneName:'shortOffset'});
 const day=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:timezone,...(era?{era:'short' as const}:{})});
 const endpoint=(date:Date)=>{const parts=clock.formatToParts(date),field=(type:string)=>parts.find(part=>part.type===type)!.value;return {time:`${field('hour')}:${field('minute')}`,offset:field('timeZoneName')}};
 const first=day.format(start),last=day.format(end);
 return {start:endpoint(start),end:endpoint(end),date:first===last?first:`${first} – ${last}`};
}
