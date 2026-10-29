import {validObservingDate} from './observing-time';

// Use the same dated labels for deep-sky peaks, hourly samples and comparisons.
// UTC year 1 can begin in local 1 BC.
export function deepSkyTimestampFormatter(start:Date,timezone:string,locale='en-GB'){
 if(!validObservingDate(start))throw Error('Invalid deep-sky planning date.');
 return new Intl.DateTimeFormat(locale,{
  day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',
  hourCycle:'h23',timeZone:timezone,timeZoneName:'shortOffset',
  ...(start.getUTCFullYear()<=1?{era:'short' as const}:{}),
 });
}
