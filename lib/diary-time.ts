import type {Observation} from './observing-diary';
const formatters=new Map<string,Intl.DateTimeFormat>();
export function diaryLocalTime(entry:Pick<Observation,'observedAt'|'place'>){
 const instant=new Date(entry.observedAt),timezone=entry.place.timezone||'UTC',fraction=instant.getUTCMilliseconds()!==0,era=instant.getUTCFullYear()<=1;
 const key=JSON.stringify([timezone,fraction,era]);
 let format=formatters.get(key);
 if(!format){
  format=new Intl.DateTimeFormat('en-GB',{calendar:'gregory',numberingSystem:'latn',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:timezone,timeZoneName:'shortOffset',...(fraction?{fractionalSecondDigits:3 as const}:{}),...(era?{era:'short' as const}:{})});
  if(formatters.size>=32)formatters.delete(formatters.keys().next().value!);
  formatters.set(key,format);
 }
 return format.format(instant);
}
// Keep the compact minute display only when it is the exact stored instant.
export function diaryUtcTime(instant:string){return instant.replace('T',' ').replace(/:00\.000Z$/,' UTC').replace(/\.000Z$/,' UTC').replace(/Z$/,' UTC')}
