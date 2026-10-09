import {validObservingDate} from './observing-time';

export function observingWindowLabel(start:Date,hours:number,timezone:string){
 const end=new Date(+start+hours*3600000);
 if(!validObservingDate(start)||!validObservingDate(end)||!Number.isInteger(hours)||hours<1||hours>2)throw Error('Invalid observing window label.');
 const format=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:timezone,timeZoneName:'shortOffset',...(start.getUTCFullYear()<=1||end.getUTCFullYear()<=1?{era:'short' as const}:{})});
 return `${format.format(start)} – ${format.format(end)}`;
}
