import {validObservingDate} from './observing-time';

// One formatter is shared by the rolling comparison, including its timeline
// and calendar action names. UTC year 1 can begin in local 1 BC.
export function deepSkyComparisonFormatter(start:Date,timezone:string){
 if(!validObservingDate(start))throw Error('Invalid deep-sky comparison date.');
 return new Intl.DateTimeFormat('en-GB',{
  day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',
  hourCycle:'h23',timeZone:timezone,timeZoneName:'shortOffset',
  ...(start.getUTCFullYear()<=1?{era:'short' as const}:{}),
 });
}
