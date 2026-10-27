import {darknessSummaryLines} from './darkness-remaining';
import {validObservingDate} from './observing-time';
import {isAstronomicalNight,nextAstronomicalDarkness,type Place} from './sky';

// The offline page supplies an explicitly selected saved snapshot, not live weather.
export function offlineDarknessDetails(time:string,place:Place){
 const date=new Date(time);
 if(!validObservingDate(date)||date.toISOString()!==time||!Number.isFinite(place.latitude)||Math.abs(place.latitude)>90||!Number.isFinite(place.longitude)||Math.abs(place.longitude)>180)throw Error('A valid saved time and site are required.');
 const lines=darknessSummaryLines(date,place);
 let next:string|null=null;
 if(!isAstronomicalNight(date,place)){
  const candidate=nextAstronomicalDarkness(date,place);next=candidate?.toISOString()??null;
  lines.push(next?`Next fully dark time UTC: ${next}`:'No full darkness found within 48 hours or before the supported date limit.');
 }
 return {lines,next};
}
export function offlineDarkness(time:string,place:Place){return offlineDarknessDetails(time,place).lines}
